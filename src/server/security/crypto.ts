import crypto from 'node:crypto';

// Internal pepper for one-way hash lookups (does not expose raw national ID or phone)
const PEPPER = process.env.SECURITY_PEPPER || 'telegram-relationship-verification-pepper-v1';

/**
 * Creates a deterministic HMAC-SHA256 hash of a sensitive identifier (phone or national ID)
 * This allows exact-match indexing and lookups without ever storing or exposing plaintext.
 */
export function hashIdentifier(identifier: string): string {
  const normalized = identifier.trim().replace(/[\s-]/g, '');
  return crypto.createHmac('sha256', PEPPER).update(normalized).digest('hex');
}

/**
 * Generates a random cryptographic salt
 */
export function generateSalt(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hashes an OTP with a unique per-attempt salt
 */
export function hashOtp(otp: string, salt: string): string {
  return crypto
    .createHash('sha256')
    .update(`${otp}:${salt}:${PEPPER}`)
    .digest('hex');
}

/**
 * Verifies an OTP against a stored salted hash
 */
export function verifyOtpHash(otp: string, salt: string, storedHash: string): boolean {
  const calculated = hashOtp(otp, salt);
  return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(storedHash, 'hex'));
}

/**
 * Generates a secure 6-digit numeric OTP
 */
export function generateSecureOtp(): string {
  const num = crypto.randomInt(100000, 999999);
  return num.toString();
}

/**
 * Masks a phone number (e.g., 09121234567 -> 0912****567)
 */
export function maskPhoneNumber(phone: string): string {
  const cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (cleaned.length < 8) return '****';
  const start = cleaned.slice(0, 4);
  const end = cleaned.slice(-3);
  return `${start}****${end}`;
}

/**
 * Masks a national ID (e.g., 0012345678 -> 001****678)
 */
export function maskNationalId(nationalId: string): string {
  const cleaned = nationalId.trim().replace(/[^\d]/g, '');
  if (cleaned.length < 6) return '******';
  const start = cleaned.slice(0, 3);
  const end = cleaned.slice(-3);
  return `${start}****${end}`;
}

/**
 * Injects a slight jittered timing delay to equalize lookup durations and neutralize timing attacks
 */
export async function injectConstantTimeDelay(minMs = 250, maxMs = 400): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}
