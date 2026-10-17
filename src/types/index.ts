/**
 * Core Domain Types for Telegram Relationship Verification Mini App
 * Biometric Flow: Phone OTP + 3-Angle Face Liveness + Right Thumb Fingerprint
 * Stored in Cloudflare R2
 */

export type VerificationState =
  | 'UNSTARTED'
  | 'PHONE_PENDING'
  | 'PHONE_VERIFIED'
  | 'BIOMETRIC_PENDING'
  | 'VERIFICATION_PROCESSING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'FAILED';

export interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramAuthPayload {
  initData: string;
}

export interface AuthSession {
  userId: string;
  telegramUserId: number;
  username?: string;
  firstName?: string;
  token: string;
  expiresAt: number;
}

export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  maskedPhone: string;
  isIdentityVerified: boolean;
  verifiedAt?: string;
  currentState: VerificationState;
}

export interface RegistrationInput {
  firstName: string;
  lastName: string;
  mobileNumber: string;
}

export interface OtpSendResponse {
  success: boolean;
  maskedPhone: string;
  cooldownSeconds: number;
  expiresInSeconds: number;
  debugMockOtp?: string; // Only provided in development mock mode
}

export interface OtpVerifyInput {
  code: string;
}

export interface UploadPresignedRequest {
  fileType: 'FACE_FRONT' | 'FACE_RIGHT' | 'FACE_LEFT' | 'THUMB_RIGHT';
  contentType: string;
  fileSizeBytes: number;
}

export interface UploadPresignedResponse {
  uploadUrl: string;
  objectKey: string;
  expiresInSeconds: number;
  method: 'PUT' | 'POST';
}

export interface BiometricSubmissionPayload {
  faceFrontKey: string;
  faceRightKey: string;
  faceLeftKey: string;
  thumbKey: string;
}

export interface NormalizedVerificationResult {
  status: 'verified' | 'rejected' | 'failed';
  thumbVerified: boolean;
  faceMatch: boolean;
  livenessPassed: boolean;
  storageBucket: string;
  providerReference: string;
  failureReason?: string;
}

export interface RelationshipCheckInput {
  targetIdentifier: string; // phone number or verification code
}

export interface RelationshipCheckResponse {
  verifiedAccountExists: boolean;
  rateLimitRemaining?: number;
  cooldownSeconds?: number;
}

export interface SystemAuditEvent {
  userId?: string;
  eventType: string;
  severity: 'INFO' | 'WARN' | 'SECURITY';
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}
