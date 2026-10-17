import { describe, it, expect } from 'vitest';
import { checkRateLimit, RATE_LIMITS } from '../src/server/security/rate-limiter.ts';

describe('Anti-Enumeration Safeguards', () => {
  it('enforces maximum 5 relationship lookups per user per sliding window', () => {
    const testUserId = `user_test_${Date.now()}`;
    const userKey = `user:${testUserId}:relationship`;

    // 5 checks allowed
    for (let i = 1; i <= 5; i++) {
      const res = checkRateLimit(userKey, RATE_LIMITS.RELATIONSHIP_CHECK_USER);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(5 - i);
    }

    // 6th check must be throttled
    const throttled = checkRateLimit(userKey, RATE_LIMITS.RELATIONSHIP_CHECK_USER);
    expect(throttled.allowed).toBe(false);
    expect(throttled.remaining).toBe(0);
    expect(throttled.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('enforces IP-based throttling for distributed attempts', () => {
    const testIp = `192.0.2.${Math.floor(Math.random() * 200) + 1}`;
    const ipKey = `ip:${testIp}:relationship`;

    for (let i = 1; i <= 15; i++) {
      const res = checkRateLimit(ipKey, RATE_LIMITS.RELATIONSHIP_CHECK_IP);
      expect(res.allowed).toBe(true);
    }

    const throttled = checkRateLimit(ipKey, RATE_LIMITS.RELATIONSHIP_CHECK_IP);
    expect(throttled.allowed).toBe(false);
  });
});
