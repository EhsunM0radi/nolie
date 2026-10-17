import { describe, it, expect } from 'vitest';
import {
  generateSalt,
  hashOtp,
  verifyOtpHash,
  generateSecureOtp,
  maskPhoneNumber,
  maskNationalId,
  hashIdentifier,
} from '../src/server/security/crypto.ts';
import { checkRateLimit, RATE_LIMITS } from '../src/server/security/rate-limiter.ts';

describe('OTP Security & Crypto Primitives', () => {
  it('generates secure 6-digit numeric OTPs', () => {
    for (let i = 0; i < 20; i++) {
      const otp = generateSecureOtp();
      expect(otp).toMatch(/^\d{6}$/);
    }
  });

  it('correctly hashes and verifies OTP with salt', () => {
    const otp = '849201';
    const salt = generateSalt();
    const hash = hashOtp(otp, salt);

    expect(hash).toHaveLength(64); // SHA-256 hex length
    expect(verifyOtpHash(otp, salt, hash)).toBe(true);
    expect(verifyOtpHash('123456', salt, hash)).toBe(false);
  });

  it('produces different hashes for same OTP with different salts', () => {
    const otp = '555123';
    const salt1 = generateSalt();
    const salt2 = generateSalt();

    const hash1 = hashOtp(otp, salt1);
    const hash2 = hashOtp(otp, salt2);

    expect(hash1).not.toBe(hash2);
  });

  it('masks phone numbers and national IDs properly without leaking sensitive parts', () => {
    expect(maskPhoneNumber('09123456789')).toBe('0912****789');
    expect(maskPhoneNumber('+989123456789')).toBe('+989****789');
    expect(maskNationalId('0012345678')).toBe('001****678');
  });

  it('hashes identifiers deterministically for lookup without exposing plaintext', () => {
    const hash1 = hashIdentifier('09123456789');
    const hash2 = hashIdentifier('09123456789');
    const hash3 = hashIdentifier('09123456780');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).toHaveLength(64);
  });

  it('enforces OTP send rate limits and cooldown', () => {
    const testKey = `test_phone_${Date.now()}`;
    const limitConfig = { maxRequests: 2, windowSeconds: 60, cooldownSeconds: 10 };

    // Request 1: Allowed
    const res1 = checkRateLimit(testKey, limitConfig);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(1);

    // Request 2: Allowed
    const res2 = checkRateLimit(testKey, limitConfig);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(0);

    // Request 3: Blocked by rate limiter
    const res3 = checkRateLimit(testKey, limitConfig);
    expect(res3.allowed).toBe(false);
    expect(res3.retryAfterSeconds).toBeGreaterThan(0);
  });
});
