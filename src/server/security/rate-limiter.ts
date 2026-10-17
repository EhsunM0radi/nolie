/**
 * In-Memory & Database-Ready Sliding-Window Rate Limiter
 * Provides anti-enumeration, brute-force mitigation, and request throttling.
 */

interface RateLimitBucket {
  timestamps: number[];
  cooldownUntil?: number;
}

const buckets = new Map<string, RateLimitBucket>();

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  cooldownSeconds?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
  resetSeconds: number;
}

/**
 * Checks rate limit for a specific key (e.g. `user:${userId}:relationship` or `ip:${ip}:otp`)
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  // Check active cooldown penalty
  if (bucket.cooldownUntil && bucket.cooldownUntil > now) {
    const retryAfterSeconds = Math.ceil((bucket.cooldownUntil - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      resetSeconds: retryAfterSeconds,
    };
  }

  // Filter timestamps within sliding window
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);

  if (bucket.timestamps.length >= config.maxRequests) {
    // Apply cooldown if configured
    if (config.cooldownSeconds) {
      bucket.cooldownUntil = now + config.cooldownSeconds * 1000;
    }
    const oldest = bucket.timestamps[0];
    const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: config.cooldownSeconds || resetSeconds,
      resetSeconds,
    };
  }

  // Record hit
  bucket.timestamps.push(now);
  const remaining = config.maxRequests - bucket.timestamps.length;
  const oldest = bucket.timestamps[0];
  const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);

  return {
    allowed: true,
    remaining,
    resetSeconds,
  };
}

/**
 * Clears expired buckets periodically to avoid memory leaks
 */
export function purgeExpiredRateLimitBuckets(): void {
  const now = Date.now();
  const maxRetentionMs = 3600 * 1000; // 1 hour
  for (const [key, bucket] of buckets.entries()) {
    bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < maxRetentionMs);
    if (bucket.timestamps.length === 0 && (!bucket.cooldownUntil || bucket.cooldownUntil <= now)) {
      buckets.delete(key);
    }
  }
}

// Default presets for the application
export const RATE_LIMITS = {
  // Anti-enumeration: strictly limits relationship lookups to 5 queries per hour per user
  RELATIONSHIP_CHECK_USER: {
    maxRequests: 5,
    windowSeconds: 3600,
    cooldownSeconds: 900, // 15 min cooldown on limit breach
  },
  // Anti-enumeration IP fallback: 15 queries per hour per IP
  RELATIONSHIP_CHECK_IP: {
    maxRequests: 15,
    windowSeconds: 3600,
    cooldownSeconds: 900,
  },
  // OTP dispatch limit: 3 requests per 10 minutes per phone
  OTP_SEND: {
    maxRequests: 3,
    windowSeconds: 600,
    cooldownSeconds: 120, // 2 minutes cooldown between dispatches
  },
  // OTP verify brute-force limit: 5 attempts per session
  OTP_VERIFY_ATTEMPT: {
    maxRequests: 5,
    windowSeconds: 300,
    cooldownSeconds: 300,
  },
  // Document and face upload limits
  PRESIGNED_UPLOAD: {
    maxRequests: 10,
    windowSeconds: 600,
  },
};
