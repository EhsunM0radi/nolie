import crypto from 'node:crypto';
import type { TelegramUserData, AuthSession } from '../../types/index.ts';

const SESSION_SECRET = process.env.SESSION_SECRET || 'relationship-verification-session-secret-salt';
const MAX_AUTH_AGE_SECONDS = 86400; // 24 hours

export interface ParsedTelegramData {
  user: TelegramUserData;
  authDate: number;
  queryId?: string;
  hash: string;
}

/**
 * Validates Telegram Mini App initData according to official Telegram guidelines.
 * Returns the parsed user payload if valid, throws an Error if invalid or replayed.
 */
export function validateTelegramInitData(
  initData: string,
  botToken = process.env.TELEGRAM_BOT_TOKEN
): ParsedTelegramData {
  if (!initData || typeof initData !== 'string') {
    throw new Error('TELEGRAM_AUTH_INVALID: initData string is missing');
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');

  if (!hash) {
    throw new Error('TELEGRAM_AUTH_INVALID: Hash missing in initData');
  }

  // Check if development mode with placeholder token
  const isMockToken = !botToken || botToken === 'REPLACE_WITH_SECRET' || botToken.startsWith('mock_');

  // Parse user object
  const userJson = params.get('user');
  if (!userJson) {
    throw new Error('TELEGRAM_AUTH_INVALID: User object missing');
  }

  let user: TelegramUserData;
  try {
    user = JSON.parse(userJson);
    if (!user.id || typeof user.id !== 'number') {
      throw new Error('Invalid user ID in payload');
    }
  } catch {
    throw new Error('TELEGRAM_AUTH_MALFORMED: Failed to parse user JSON');
  }

  const authDateStr = params.get('auth_date');
  const authDate = authDateStr ? parseInt(authDateStr, 10) : 0;
  const nowInSeconds = Math.floor(Date.now() / 1000);

  // Freshness check: Reject tokens older than 24 hours
  if (!authDate || nowInSeconds - authDate > MAX_AUTH_AGE_SECONDS) {
    throw new Error('TELEGRAM_AUTH_EXPIRED: Authentication data is expired');
  }

  // Prevent future timestamp manipulations (clock drift > 5 min)
  if (authDate > nowInSeconds + 300) {
    throw new Error('TELEGRAM_AUTH_INVALID: Future auth_date detected');
  }

  // In test / mock mode where bot token is not provisioned, bypass cryptographic check if explicit
  if (isMockToken && process.env.NODE_ENV !== 'production') {
    return {
      user,
      authDate,
      queryId: params.get('query_id') || undefined,
      hash,
    };
  }

  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured on the server');
  }

  // Build sorted data-check-string (excluding hash)
  const items: string[] = [];
  params.forEach((value, key) => {
    if (key !== 'hash') {
      items.push(`${key}=${value}`);
    }
  });
  items.sort();
  const dataCheckString = items.join('\n');

  // secret_key = HMAC_SHA256("WebAppData", bot_token)
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  // calculated_hash = HMAC_SHA256(dataCheckString, secret_key)
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // Timing safe equality comparison
  const hashBuffer = Buffer.from(hash, 'hex');
  const calculatedBuffer = Buffer.from(calculatedHash, 'hex');

  if (hashBuffer.length !== calculatedBuffer.length || !crypto.timingSafeEqual(hashBuffer, calculatedBuffer)) {
    throw new Error('TELEGRAM_AUTH_FAILED: Hash verification mismatch');
  }

  return {
    user,
    authDate,
    queryId: params.get('query_id') || undefined,
    hash,
  };
}

/**
 * Creates a signed stateless bearer session token for internal API calls
 */
export function createSessionToken(userId: string, telegramUserId: number): string {
  const expiresAt = Math.floor(Date.now() / 1000) + 7 * 86400; // 7 days
  const payload = `${userId}:${telegramUserId}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');

  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

/**
 * Verifies and decodes a signed bearer session token
 */
export function verifySessionToken(token: string): { userId: string; telegramUserId: number } {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const parts = raw.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid token structure');
    }

    const [userId, telegramUserIdStr, expiresAtStr, signature] = parts;
    const telegramUserId = parseInt(telegramUserIdStr, 10);
    const expiresAt = parseInt(expiresAtStr, 10);

    const payload = `${userId}:${telegramUserId}:${expiresAt}`;
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');

    if (
      expectedBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
    ) {
      throw new Error('Signature mismatch');
    }

    if (Math.floor(Date.now() / 1000) > expiresAt) {
      throw new Error('Session token expired');
    }

    return { userId, telegramUserId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown auth error';
    throw new Error(`UNAUTHORIZED: ${message}`);
  }
}
