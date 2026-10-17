import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  validateTelegramInitData,
  createSessionToken,
  verifySessionToken,
} from '../src/server/auth/telegram.ts';

describe('Telegram WebApp Authentication', () => {
  const testBotToken = '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ_1234567';

  // Helper to generate genuine Telegram initData string with valid HMAC
  function generateValidInitData(userObj: object, authDate = Math.floor(Date.now() / 1000)): string {
    const params = new Map<string, string>();
    params.set('auth_date', String(authDate));
    params.set('query_id', 'AAHdF6IQAAAAAN0XohC_123456');
    params.set('user', JSON.stringify(userObj));

    const items: string[] = [];
    params.forEach((value, key) => items.push(`${key}=${value}`));
    items.sort();
    const dataCheckString = items.join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(testBotToken)
      .digest();

    const hash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const searchParams = new URLSearchParams();
    params.forEach((val, key) => searchParams.set(key, val));
    searchParams.set('hash', hash);

    return searchParams.toString();
  }

  it('successfully validates authentic Telegram initData', () => {
    const user = { id: 987654321, first_name: 'Sara', username: 'sara_test' };
    const initData = generateValidInitData(user);

    const result = validateTelegramInitData(initData, testBotToken);
    expect(result.user.id).toBe(987654321);
    expect(result.user.first_name).toBe('Sara');
    expect(result.user.username).toBe('sara_test');
  });

  it('rejects tampered or forged hash', () => {
    const user = { id: 987654321, first_name: 'Sara' };
    const initData = generateValidInitData(user);
    const forgedInitData = initData.replace('hash=', 'hash=0000000000000000000000000000000000000000000000000000000000000000');

    expect(() => validateTelegramInitData(forgedInitData, testBotToken)).toThrow(/TELEGRAM_AUTH_FAILED/);
  });

  it('rejects expired auth_date older than 24 hours (anti-replay)', () => {
    const expiredTimestamp = Math.floor(Date.now() / 1000) - (86400 + 100);
    const user = { id: 111222333, first_name: 'OldSession' };
    const initData = generateValidInitData(user, expiredTimestamp);

    expect(() => validateTelegramInitData(initData, testBotToken)).toThrow(/TELEGRAM_AUTH_EXPIRED/);
  });

  it('rejects malformed or empty initData', () => {
    expect(() => validateTelegramInitData('', testBotToken)).toThrow(/TELEGRAM_AUTH_INVALID/);
    expect(() => validateTelegramInitData('random=garbage', testBotToken)).toThrow(/Hash missing/);
  });

  it('generates and verifies signed session tokens', () => {
    const token = createSessionToken('user_uuid_123', 987654321);
    expect(typeof token).toBe('string');

    const decoded = verifySessionToken(token);
    expect(decoded.userId).toBe('user_uuid_123');
    expect(decoded.telegramUserId).toBe(987654321);
  });

  it('rejects tampered session tokens', () => {
    const token = createSessionToken('user_uuid_123', 987654321);
    const tampered = token.slice(0, -4) + 'abcd';
    expect(() => verifySessionToken(tampered)).toThrow(/UNAUTHORIZED/);
  });
});
