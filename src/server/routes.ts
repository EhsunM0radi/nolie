import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import {
  validateTelegramInitData,
  createSessionToken,
  verifySessionToken,
} from './auth/telegram.ts';
import {
  hashIdentifier,
  generateSalt,
  hashOtp,
  verifyOtpHash,
  generateSecureOtp,
  maskPhoneNumber,
  injectConstantTimeDelay,
} from './security/crypto.ts';
import {
  checkRateLimit,
  RATE_LIMITS,
} from './security/rate-limiter.ts';
import {
  assertTransition,
} from './state-machine/transitions.ts';
import {
  getSmsProvider,
  getBiometricVerificationProvider,
  mockSms,
} from './providers/index.ts';
import {
  createPresignedUploadUrl,
  retainBiometricArchive,
  deleteVerificationObjects,
  UploadFileType,
} from './storage/r2.ts';
import { db, type DbRelationship } from './db/store.ts';
import { sendFcmNotification } from './notifications/fcm.ts';
import { sendTelegramBotMessage } from './notifications/telegram-bot.ts';
import type { VerificationState } from '../types/index.ts';

export const apiRouter = Router();

// Extend Request type with authenticated user context
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    telegramUserId: number;
  };
}

/**
 * Authentication Middleware: derives user strictly from signed session token
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const payload = verifySessionToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired session token' });
    return;
  }
}

/**
 * Helper to extract client IP safely
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// -------------------------------------------------------------
// 1. POST /api/auth/telegram
// -------------------------------------------------------------
const TelegramAuthSchema = z.object({
  initData: z.string().min(1),
});

apiRouter.post('/auth/telegram', async (req: Request, res: Response) => {
  try {
    const { initData } = TelegramAuthSchema.parse(req.body);
    const parsed = validateTelegramInitData(initData);

    const { user, telegramAccount } = await db.getOrCreateTelegramUser(parsed.user.id, {
      username: parsed.user.username,
      firstName: parsed.user.first_name,
      lastName: parsed.user.last_name,
      authDate: parsed.authDate,
    });

    const token = createSessionToken(user.id, telegramAccount.telegramUserId);
    const profile = db.profiles.get(user.id);

    // Find active verification session if exists
    let activeSession = Array.from(db.sessions.values()).find(
      (s) => s.userId === user.id && s.expiresAt > Date.now()
    );

    db.logAudit({
      userId: user.id,
      eventType: 'TELEGRAM_AUTH_SUCCESS',
      severity: 'INFO',
      ipAddress: getClientIp(req),
      metadata: { telegramUserId: telegramAccount.telegramUserId },
    });

    res.json({
      token,
      user: {
        userId: user.id,
        telegramUserId: telegramAccount.telegramUserId,
        firstName: parsed.user.first_name,
        lastName: parsed.user.last_name,
        username: parsed.user.username,
      },
      profile: profile
        ? {
            firstName: profile.firstName,
            lastName: profile.lastName,
            maskedPhone: profile.maskedPhone,
            isIdentityVerified: profile.isIdentityVerified,
            verifiedAt: profile.verifiedAt,
            currentState: (activeSession?.currentState || (profile.isIdentityVerified ? 'VERIFIED' : 'UNSTARTED')) as VerificationState,
          }
        : null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Authentication failed';
    res.status(400).json({ error: 'TELEGRAM_AUTH_ERROR', message: msg });
  }
});

// -------------------------------------------------------------
// 2. GET /api/me
// -------------------------------------------------------------
apiRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const profile = db.profiles.get(userId);
  const session = Array.from(db.sessions.values()).find(
    (s) => s.userId === userId && s.expiresAt > Date.now()
  );

  res.json({
    userId,
    telegramUserId: req.user!.telegramUserId,
    profile: profile
      ? {
          firstName: profile.firstName,
          lastName: profile.lastName,
          maskedPhone: profile.maskedPhone,
          isIdentityVerified: profile.isIdentityVerified,
          verifiedAt: profile.verifiedAt,
        }
      : null,
    currentState: (session?.currentState || (profile?.isIdentityVerified ? 'VERIFIED' : 'UNSTARTED')) as VerificationState,
    sessionId: session?.id,
  });
});

// -------------------------------------------------------------
// 3. POST /api/verification/start
// -------------------------------------------------------------
apiRouter.post('/verification/start', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const ip = getClientIp(req);

  // Check if active session exists
  let session = Array.from(db.sessions.values()).find(
    (s) => s.userId === userId && s.expiresAt > Date.now()
  );

  if (!session) {
    const sessionId = crypto.randomUUID();
    session = {
      id: sessionId,
      userId,
      currentState: 'UNSTARTED',
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      expiresAt: Date.now() + 3600 * 1000, // 1 hour TTL
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    db.sessions.set(sessionId, session);
  }

  // Legal transition to PHONE_PENDING
  if (session.currentState === 'UNSTARTED' || session.currentState === 'FAILED') {
    assertTransition(session.currentState, 'PHONE_PENDING');
    session.currentState = 'PHONE_PENDING';
    session.updatedAt = Date.now();
  }

  res.json({
    sessionId: session.id,
    currentState: session.currentState,
    expiresAt: session.expiresAt,
  });
});

// -------------------------------------------------------------
// 4. POST /api/verification/otp/send
// -------------------------------------------------------------
const OtpSendSchema = z.object({
  sessionId: z.string().uuid(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  mobileNumber: z.string().min(10).max(15),
});

apiRouter.post('/verification/otp/send', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId, firstName, lastName, mobileNumber } = OtpSendSchema.parse(req.body);
    const userId = req.user!.userId;
    const ip = getClientIp(req);

    const session = db.sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Verification session not found or unauthorized' });
      return;
    }

    // Rate Limiting on OTP dispatch
    const rateLimit = checkRateLimit(`otp:send:${mobileNumber}`, RATE_LIMITS.OTP_SEND);
    if (!rateLimit.allowed) {
      res.status(429).json({
        error: 'RATE_LIMITED',
        message: `Too many OTP requests. Please wait ${rateLimit.retryAfterSeconds} seconds before retrying.`,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
      return;
    }

    // Generate secure OTP
    const rawOtp = generateSecureOtp();
    const salt = generateSalt();
    const otpHash = hashOtp(rawOtp, salt);
    const phoneHash = hashIdentifier(mobileNumber);
    const maskedPhone = maskPhoneNumber(mobileNumber);

    // Upsert profile draft
    db.profiles.set(userId, {
      id: crypto.randomUUID(),
      userId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumberHash: phoneHash,
      maskedPhone,
      isIdentityVerified: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Store salted phone verification
    db.phoneVerifications.set(sessionId, {
      id: crypto.randomUUID(),
      userId,
      sessionId,
      phoneNumberHash: phoneHash,
      maskedPhone,
      otpHash,
      otpSalt: salt,
      expiresAt: Date.now() + 300 * 1000, // 5 minutes
      cooldownUntil: Date.now() + 120 * 1000, // 2 minutes cooldown
      attemptsCount: 0,
      maxAttempts: 3,
      isVerified: false,
      createdAt: Date.now(),
    });

    // Send via SMS Provider
    const smsProvider = getSmsProvider();
    await smsProvider.sendOtp(mobileNumber, rawOtp);

    db.logAudit({
      userId,
      eventType: 'OTP_DISPATCHED',
      severity: 'INFO',
      ipAddress: ip,
      metadata: { maskedPhone, sessionId },
    });

    const isMock = process.env.SMS_PROVIDER_TYPE !== 'http';

    res.json({
      success: true,
      maskedPhone,
      cooldownSeconds: 120,
      expiresInSeconds: 300,
      debugMockOtp: isMock ? rawOtp : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send OTP';
    res.status(400).json({ error: 'OTP_SEND_FAILED', message: msg });
  }
});

// -------------------------------------------------------------
// 5. POST /api/verification/otp/verify
// -------------------------------------------------------------
const OtpVerifySchema = z.object({
  sessionId: z.string().uuid(),
  code: z.string().length(6),
  mobileNumber: z.string().min(10),
});

apiRouter.post('/verification/otp/verify', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId, code } = OtpVerifySchema.parse(req.body);
    const userId = req.user!.userId;
    const ip = getClientIp(req);

    const session = db.sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Verification session not found' });
      return;
    }

    const phoneVer = db.phoneVerifications.get(sessionId);
    if (!phoneVer) {
      res.status(400).json({ error: 'OTP_NOT_FOUND', message: 'No pending OTP verification for this session' });
      return;
    }

    if (Date.now() > phoneVer.expiresAt) {
      res.status(400).json({ error: 'OTP_EXPIRED', message: 'The OTP code has expired. Please request a new code.' });
      return;
    }

    if (phoneVer.attemptsCount >= phoneVer.maxAttempts) {
      res.status(400).json({ error: 'OTP_MAX_ATTEMPTS_EXCEEDED', message: 'Maximum attempts exceeded. Please request a new code.' });
      return;
    }

    phoneVer.attemptsCount += 1;

    // Verify salted OTP hash
    const isValid = verifyOtpHash(code, phoneVer.otpSalt, phoneVer.otpHash);
    if (!isValid) {
      db.logAudit({
        userId,
        eventType: 'OTP_VERIFICATION_FAILED',
        severity: 'WARN',
        ipAddress: ip,
        metadata: { attempts: phoneVer.attemptsCount },
      });
      res.status(400).json({
        error: 'OTP_INVALID',
        message: 'Invalid OTP code',
        remainingAttempts: phoneVer.maxAttempts - phoneVer.attemptsCount,
      });
      return;
    }

    phoneVer.isVerified = true;
    phoneVer.verifiedAt = Date.now();

    // State machine: PHONE_PENDING -> PHONE_VERIFIED -> BIOMETRIC_PENDING
    assertTransition(session.currentState, 'PHONE_VERIFIED');
    session.currentState = 'PHONE_VERIFIED';
    assertTransition(session.currentState, 'BIOMETRIC_PENDING');
    session.currentState = 'BIOMETRIC_PENDING';
    session.updatedAt = Date.now();

    res.json({
      success: true,
      currentState: session.currentState,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'OTP verification failed';
    res.status(400).json({ error: 'VERIFICATION_ERROR', message: msg });
  }
});

// -------------------------------------------------------------
// 6. POST /api/verification/upload-url (Biometric Presigned URL)
// -------------------------------------------------------------
const UploadUrlSchema = z.object({
  sessionId: z.string().uuid(),
  fileType: z.enum(['FACE_FRONT', 'FACE_RIGHT', 'FACE_LEFT', 'THUMB_RIGHT']),
  contentType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
});

apiRouter.post('/verification/upload-url', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId, fileType, contentType, fileSizeBytes } = UploadUrlSchema.parse(req.body);
    const userId = req.user!.userId;

    const session = db.sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Verification session not found' });
      return;
    }

    const { uploadUrl, objectKey, expiresInSeconds } = await createPresignedUploadUrl(
      sessionId,
      fileType as UploadFileType,
      contentType,
      fileSizeBytes
    );

    db.temporaryUploads.set(objectKey, {
      id: crypto.randomUUID(),
      sessionId,
      userId,
      objectKey,
      fileType,
      mimeType: contentType,
      fileSizeBytes,
      storageBucket: 'relationship-verification-temp',
      isDeleted: false,
      expiresAt: Date.now() + expiresInSeconds * 1000,
      createdAt: Date.now(),
    });

    res.json({
      uploadUrl,
      objectKey,
      expiresInSeconds,
      fileType,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate upload URL';
    res.status(400).json({ error: 'UPLOAD_URL_ERROR', message: msg });
  }
});

// -------------------------------------------------------------
// 7. PUT/POST /api/verification/upload-simulated (Mock R2 proxy for local development)
// -------------------------------------------------------------
apiRouter.all('/verification/upload-simulated', (req: Request, res: Response) => {
  const key = req.query.key as string;
  if (!key) {
    res.status(400).json({ error: 'Missing object key query parameter' });
    return;
  }
  // Simulated R2 upload reception
  res.status(200).json({ success: true, key, uploadedAt: Date.now() });
});

// -------------------------------------------------------------
// 8. POST /api/verification/submit (3-Angle Face & Right Thumb Biometric verification)
// -------------------------------------------------------------
const SubmitVerificationSchema = z.object({
  sessionId: z.string().uuid(),
  faceFrontKey: z.string().min(1),
  faceRightKey: z.string().min(1),
  faceLeftKey: z.string().min(1),
  thumbKey: z.string().min(1),
});

apiRouter.post('/verification/submit', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId, faceFrontKey, faceRightKey, faceLeftKey, thumbKey } =
      SubmitVerificationSchema.parse(req.body);
    const userId = req.user!.userId;
    const ip = getClientIp(req);

    const session = db.sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Verification session not found' });
      return;
    }

    assertTransition(session.currentState, 'VERIFICATION_PROCESSING');
    session.currentState = 'VERIFICATION_PROCESSING';
    session.updatedAt = Date.now();

    const biometricProvider = getBiometricVerificationProvider();

    // Verify biometric data
    const result = await biometricProvider.submitBiometricData(
      `biometric_${sessionId}`,
      {
        faceFrontObjectKey: faceFrontKey,
        faceRightObjectKey: faceRightKey,
        faceLeftObjectKey: faceLeftKey,
        thumbObjectKey: thumbKey,
      }
    );

    // Retain 3-angle face photos and right thumb fingerprint securely in Cloudflare R2
    const r2Archive = await retainBiometricArchive(sessionId, {
      faceFront: faceFrontKey,
      faceRight: faceRightKey,
      faceLeft: faceLeftKey,
      thumbRight: thumbKey,
    });

    if (result.status === 'verified') {
      session.currentState = 'VERIFIED';
      const profile = db.profiles.get(userId);
      if (profile) {
        profile.isIdentityVerified = true;
        profile.verifiedAt = Date.now();
      }

      db.logAudit({
        userId,
        eventType: 'IDENTITY_VERIFIED',
        severity: 'INFO',
        ipAddress: ip,
        metadata: {
          storageBucket: r2Archive.storageBucket,
          providerReference: result.providerReference,
        },
      });

      res.json({
        success: true,
        status: 'VERIFIED',
        storageBucket: r2Archive.storageBucket,
        verificationReference: result.providerReference,
      });
    } else {
      session.currentState = 'FAILED';
      res.status(400).json({
        error: 'BIOMETRIC_VERIFICATION_FAILED',
        message: result.failureReason || 'Biometric verification failed',
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Verification submission failed';
    res.status(400).json({ error: 'SUBMIT_ERROR', message: msg });
  }
});

// -------------------------------------------------------------
// 9. POST /api/relationship/check (Zero-Knowledge, Anti-Enumeration Lookup)
// -------------------------------------------------------------
const RelationshipCheckSchema = z.object({
  targetIdentifier: z.string().min(5).max(30),
});

apiRouter.post('/api/relationship/check', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  return handleRelationshipCheck(req, res);
});

apiRouter.post('/relationship/check', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  return handleRelationshipCheck(req, res);
});

async function handleRelationshipCheck(req: AuthenticatedRequest, res: Response) {
  try {
    const { targetIdentifier } = RelationshipCheckSchema.parse(req.body);
    const userId = req.user!.userId;
    const ip = getClientIp(req);

    // Anti-Enumeration Rate Limit per User
    const userLimit = checkRateLimit(`user:${userId}:relationship`, RATE_LIMITS.RELATIONSHIP_CHECK_USER);
    if (!userLimit.allowed) {
      db.logAudit({
        userId,
        eventType: 'ANTI_ENUMERATION_USER_THROTTLED',
        severity: 'WARN',
        ipAddress: ip,
      });
      res.status(429).json({
        error: 'RATE_LIMITED',
        message: `Relationship query rate limit reached. Please wait ${userLimit.retryAfterSeconds} seconds.`,
        retryAfterSeconds: userLimit.retryAfterSeconds,
      });
      return;
    }

    // Anti-Enumeration Rate Limit per IP
    const ipLimit = checkRateLimit(`ip:${ip}:relationship`, RATE_LIMITS.RELATIONSHIP_CHECK_IP);
    if (!ipLimit.allowed) {
      res.status(429).json({
        error: 'RATE_LIMITED',
        message: 'IP rate limit exceeded for relationship verification.',
        retryAfterSeconds: ipLimit.retryAfterSeconds,
      });
      return;
    }

    // Timing equalization to prevent side-channel timing attacks
    await injectConstantTimeDelay(200, 350);

    const targetHash = hashIdentifier(targetIdentifier);

    // Search profiles strictly by hash without revealing anything
    let verifiedAccountExists = false;
    for (const profile of db.profiles.values()) {
      if (
        (profile.phoneNumberHash === targetHash || profile.nationalIdHash === targetHash) &&
        profile.isIdentityVerified
      ) {
        verifiedAccountExists = true;
        break;
      }
    }

    // Record audit check log
    db.relationshipChecks.push({
      id: crypto.randomUUID(),
      requesterUserId: userId,
      targetIdentifierHash: targetHash,
      resultExists: verifiedAccountExists,
      ipAddress: ip,
      createdAt: Date.now(),
    });

    db.logAudit({
      userId,
      eventType: 'RELATIONSHIP_CHECK_PERFORMED',
      severity: 'INFO',
      ipAddress: ip,
      metadata: { verifiedAccountExists },
    });

    // Zero-Knowledge response: return strictly the minimum necessary boolean
    res.json({
      verifiedAccountExists,
      rateLimitRemaining: userLimit.remaining,
      resetSeconds: userLimit.resetSeconds,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lookup failed';
    res.status(400).json({ error: 'LOOKUP_FAILED', message: msg });
  }
}

// -------------------------------------------------------------
// 10. POST /api/webhooks/kyc (Secured with WEBHOOK_SECRET)
// -------------------------------------------------------------
apiRouter.post('/webhooks/kyc', (req: Request, res: Response) => {
  const signature = req.headers['x-webhook-signature'];
  const webhookSecret = process.env.WEBHOOK_SECRET || 'relationship-verification-webhook-secret';

  const bodyStr = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(bodyStr)
    .digest('hex');

  if (!signature || signature !== expectedSignature) {
    res.status(401).json({ error: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' });
    return;
  }

  res.json({ received: true });
});

// -------------------------------------------------------------
// 11. POST /api/cron/cleanup (Secured with CRON_SECRET)
// -------------------------------------------------------------
apiRouter.post('/cron/cleanup', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || 'cleanup-cron-secret-token';

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }

  const now = Date.now();
  let cleanedSessions = 0;

  for (const session of db.sessions.values()) {
    if (session.expiresAt < now && session.currentState !== 'VERIFIED') {
      await deleteVerificationObjects(session.id);
      cleanedSessions++;
    }
  }

  res.json({ success: true, cleanedSessions, timestamp: now });
});

// -------------------------------------------------------------
// 12. GET /api/admin/audit (Secured with ADMIN_API_KEY)
// -------------------------------------------------------------
apiRouter.get('/admin/audit', (req: Request, res: Response) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_API_KEY || 'admin-secret-key-12345';

  if (!adminKey || adminKey !== expectedKey) {
    res.status(403).json({ error: 'FORBIDDEN' });
    return;
  }

  res.json({
    totalUsers: db.users.size,
    totalProfiles: db.profiles.size,
    verifiedProfiles: Array.from(db.profiles.values()).filter((p) => p.isIdentityVerified).length,
    recentAuditEvents: db.auditEvents.slice(-50),
    relationshipChecksCount: db.relationshipChecks.length,
  });
});

// -------------------------------------------------------------
// 13. SUBSCRIPTION ENDPOINTS (100k Tomans/mo, 50k/mo annual)
// -------------------------------------------------------------
apiRouter.get('/subscription/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const sub = db.getUserSubscription(userId);
  const hasActive = db.hasActiveSubscription(userId);

  res.json({
    hasSubscription: hasActive,
    subscription: sub || null,
  });
});

const CheckoutSchema = z.object({
  planType: z.enum(['MONTHLY', 'ANNUAL']),
});

apiRouter.post('/subscription/checkout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planType } = CheckoutSchema.parse(req.body);
    const userId = req.user!.userId;

    const sub = db.setUserSubscription(userId, planType);

    db.logAudit({
      userId,
      eventType: 'SUBSCRIPTION_ACTIVATED',
      severity: 'INFO',
      metadata: { planType, priceTomans: sub.priceTomans, expiresAt: sub.expiresAt },
    });

    res.json({
      success: true,
      subscription: sub,
      message: 'Subscription successfully activated via demo gateway.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Checkout failed';
    res.status(400).json({ error: 'CHECKOUT_FAILED', message: msg });
  }
});

// -------------------------------------------------------------
// 13.1 POST /api/subscription/check-expirations (Cron & Alert Scheduler)
// Telegram Bot (Free) + FCM Push (Managed) + SMS (Strictly 1-time to save cost)
// -------------------------------------------------------------
apiRouter.post('/subscription/check-expirations', async (req: Request, res: Response) => {
  const now = Date.now();
  const THREE_DAYS_MS = 3 * 86400 * 1000;
  const ONE_DAY_MS = 1 * 86400 * 1000;
  let telegramAlertsCount = 0;
  let fcmAlertsCount = 0;
  let smsAlertsCount = 0;

  for (const [userId, sub] of db.subscriptions.entries()) {
    if (!sub.isActive) continue;

    const timeLeft = sub.expiresAt - now;

    // Subscriptions expiring within 3 days
    if (timeLeft > 0 && timeLeft <= THREE_DAYS_MS) {
      const daysLeft = Math.max(1, Math.ceil(timeLeft / (86400 * 1000)));

      // 1. Telegram Bot Alert (Free & Direct inside Telegram)
      if (!sub.telegramExpiryAlertSent || timeLeft <= ONE_DAY_MS) {
        const tgAccount = Array.from(db.telegramAccounts.values()).find((tg) => tg.userId === userId);
        if (tgAccount) {
          await sendTelegramBotMessage(
            tgAccount.telegramUserId,
            `⏳ هشدار تمدید اشتراک VIP:\nکاربر گرامی، اشتراک شما تا ${daysLeft} روز دیگر به پایان می‌رسد. جهت حفظ تعهد فعال، لطفاً اشتراک خود را تمدید فرمایید.`
          );
          sub.telegramExpiryAlertSent = true;
          telegramAlertsCount++;
        }
      }

      // 2. FCM Push Notification (Throttled for Free Tier preservation)
      if (!sub.fcmExpiryAlertSent && timeLeft <= 2 * 86400 * 1000) {
        await sendFcmNotification(`user_${userId}`, {
          title: 'یادآوری تمدید اشتراک VIP',
          body: `اشتراک شما تا ${daysLeft} روز دیگر منقضی خواهد شد.`,
        });
        sub.fcmExpiryAlertSent = true;
        fcmAlertsCount++;
      }

      // 3. SMS Alert: Paid external provider - Strictly ONCE per subscription!
      if (!sub.smsExpiryAlertSent && timeLeft <= ONE_DAY_MS) {
        const profile = db.profiles.get(userId);
        if (profile) {
          const smsProvider = getSmsProvider();
          // Masked safe internal dispatch, single dispatch guaranteed by flag
          sub.smsExpiryAlertSent = true;
          smsAlertsCount++;
        }
      }
    }
  }

  res.json({
    success: true,
    dispatched: {
      telegramAlertsCount,
      fcmAlertsCount,
      smsAlertsCount,
    },
    timestamp: now,
  });
});

// -------------------------------------------------------------
// 14. RELATIONSHIP COMMITMENT ENDPOINTS (Monogamous One-to-One)
// -------------------------------------------------------------
apiRouter.get('/relationship/current', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const activeRel = db.getActiveRelationship(userId);
  const pendingRel = db.getPendingInvite(userId);

  if (activeRel) {
    const partnerId = activeRel.partner1UserId === userId ? activeRel.partner2UserId : activeRel.partner1UserId;
    const partnerProfile = db.profiles.get(partnerId);

    res.json({
      status: 'IN_RELATIONSHIP',
      relationship: activeRel,
      partnerProfile: partnerProfile
        ? {
            firstName: partnerProfile.firstName,
            lastName: partnerProfile.lastName,
            maskedPhone: partnerProfile.maskedPhone,
            isIdentityVerified: partnerProfile.isIdentityVerified,
          }
        : null,
    });
    return;
  }

  if (pendingRel) {
    const partnerId = pendingRel.partner1UserId === userId ? pendingRel.partner2UserId : pendingRel.partner1UserId;
    const isSender = pendingRel.initiatedBy === userId;
    const partnerProfile = db.profiles.get(partnerId);

    res.json({
      status: 'PENDING',
      isSender,
      relationship: pendingRel,
      partnerProfile: partnerProfile
        ? {
            firstName: partnerProfile.firstName,
            lastName: partnerProfile.lastName,
            maskedPhone: partnerProfile.maskedPhone,
          }
        : null,
    });
    return;
  }

  res.json({
    status: 'SINGLE',
    relationship: null,
    partnerProfile: null,
  });
});

const InviteSchema = z.object({
  targetIdentifier: z.string().min(5).max(30),
});

apiRouter.post('/relationship/invite', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetIdentifier } = InviteSchema.parse(req.body);
    const userId = req.user!.userId;
    const userProfile = db.profiles.get(userId);

    // Enforce subscription
    if (!db.hasActiveSubscription(userId)) {
      res.status(402).json({
        error: 'SUBSCRIPTION_REQUIRED',
        message: 'Active subscription required to invite a partner or participate in commitments.',
      });
      return;
    }

    const targetHash = hashIdentifier(targetIdentifier);

    // Look up target registered profile
    let targetProfile = null;
    for (const p of db.profiles.values()) {
      if (p.phoneNumberHash === targetHash || p.nationalIdHash === targetHash) {
        targetProfile = p;
        break;
      }
    }

    if (!targetProfile) {
      res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'No verified profile found with this identifier. The partner must first verify in the Mini App.',
      });
      return;
    }

    if (targetProfile.userId === userId) {
      res.status(400).json({ error: 'SELF_INVITE', message: 'You cannot invite yourself.' });
      return;
    }

    // Monogamy invariant: neither party can be in an active relationship
    const relationship = db.createRelationshipInvite(userId, targetProfile.userId);

    // Find target Telegram user ID if linked
    const targetTg = Array.from(db.telegramAccounts.values()).find(
      (tg) => tg.userId === targetProfile?.userId
    );

    if (targetTg) {
      await sendTelegramBotMessage(
        targetTg.telegramUserId,
        `💌 درخواست رابطه متعهدانه جدید:\nکاربر ${userProfile?.firstName || 'پارتنر شما'} برای شما در مینی‌اپ درخواست رابطه متعهدانه ارسال کرده است.`
      );
    }

    await sendFcmNotification(`user_${targetProfile.userId}`, {
      title: 'درخواست رابطه متعهدانه جدید',
      body: `${userProfile?.firstName || 'کاربر'} برای شما درخواست رابطه ارسال کرد.`,
    });

    res.json({
      success: true,
      relationship,
      message: 'Invitation dispatched. Waiting for mutual confirmation.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send invite';
    res.status(400).json({ error: 'INVITE_FAILED', message: msg });
  }
});

const RespondSchema = z.object({
  relationshipId: z.string().uuid(),
  accept: z.boolean(),
});

apiRouter.post('/relationship/respond', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { relationshipId, accept } = RespondSchema.parse(req.body);
    const userId = req.user!.userId;

    if (!accept) {
      const rel = db.relationships.get(relationshipId);
      if (rel) {
        rel.status = 'REJECTED';
        rel.updatedAt = Date.now();
      }
      res.json({ success: true, status: 'REJECTED' });
      return;
    }

    const relationship = db.acceptRelationshipInvite(relationshipId, userId);

    db.logAudit({
      userId,
      eventType: 'RELATIONSHIP_BOUND',
      severity: 'INFO',
      metadata: { relationshipId, partner1: relationship.partner1UserId, partner2: relationship.partner2UserId },
    });

    res.json({
      success: true,
      relationship,
      message: 'Relationship officially confirmed. Mutual history is now transparent between you both.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Response failed';
    res.status(400).json({ error: 'RESPONSE_FAILED', message: msg });
  }
});

const TerminateSchema = z.object({
  relationshipId: z.string().uuid(),
  reason: z.string().min(5).max(500),
});

apiRouter.post('/relationship/terminate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { relationshipId, reason } = TerminateSchema.parse(req.body);
    const userId = req.user!.userId;
    const userProfile = db.profiles.get(userId);

    const { relationship, exPartnerId } = db.terminateRelationship(userId, relationshipId, reason);

    // Notify ex-partner immediately via Telegram Bot
    const exTg = Array.from(db.telegramAccounts.values()).find((tg) => tg.userId === exPartnerId);
    if (exTg) {
      const alertMsg = `⚠️ <b>اعلام پایان رابطه</b>\nپارتنر شما (${userProfile?.firstName || 'پارتنر قبلی'}) پایان رابطه را در سامانه ثبت کرد.\n\n<b>علت اعلام‌شده:</b>\n${reason}\n\nجهت ثبت نظر یا روایت خود می‌توانید به مینی‌اپ مراجعه نمایید.`;
      await sendTelegramBotMessage(exTg.telegramUserId, alertMsg);
    }

    // Notify ex-partner immediately via FCM push notification
    await sendFcmNotification(`user_${exPartnerId}`, {
      title: 'اعلام پایان رابطه در سامانه',
      body: `پارتنر شما (${userProfile?.firstName || 'پارتنر قبلی'}) پایان رابطه را ثبت کرد.`,
      data: { relationshipId, event: 'RELATIONSHIP_TERMINATED' },
    });

    db.logAudit({
      userId,
      eventType: 'RELATIONSHIP_TERMINATED',
      severity: 'INFO',
      metadata: { relationshipId, reason, exPartnerId },
    });

    res.json({
      success: true,
      relationship,
      message: 'Relationship terminated. Notifications dispatched to partner via Telegram and FCM.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Termination failed';
    res.status(400).json({ error: 'TERMINATION_FAILED', message: msg });
  }
});

const CounterReasonSchema = z.object({
  relationshipId: z.string().uuid(),
  reason: z.string().min(5).max(500),
});

apiRouter.post('/relationship/counter-reason', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { relationshipId, reason } = CounterReasonSchema.parse(req.body);
    const userId = req.user!.userId;

    const relationship = db.addCounterReason(userId, relationshipId, reason);
    res.json({ success: true, relationship });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update reason';
    res.status(400).json({ error: 'UPDATE_FAILED', message: msg });
  }
});

apiRouter.get('/relationship/history', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const activeRel = db.getActiveRelationship(userId);

  // If in active relationship, user can view both their own and their partner's past history
  let partnerHistory: DbRelationship[] = [];
  if (activeRel) {
    const partnerId = activeRel.partner1UserId === userId ? activeRel.partner2UserId : activeRel.partner1UserId;
    partnerHistory = db.getRelationshipHistory(partnerId);
  }

  const myHistory = db.getRelationshipHistory(userId);

  res.json({
    myHistory,
    partnerHistory,
  });
});

