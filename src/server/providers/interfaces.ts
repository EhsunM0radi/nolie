import type {
  NormalizedVerificationResult,
} from '../../types/index.ts';

/**
 * Pluggable SMS Provider Interface
 */
export interface SmsProvider {
  readonly providerName: string;
  sendOtp(
    mobileNumber: string,
    otpCode: string,
    template?: string
  ): Promise<{ success: boolean; messageId: string }>;
}

/**
 * Pluggable Biometric Verification Provider Interface
 * Handles 3-angle facial liveness & right-thumb fingerprint validation
 */
export interface BiometricVerificationProvider {
  readonly providerName: string;
  createVerificationSession(
    sessionId: string,
    metadata?: Record<string, unknown>
  ): Promise<{ providerReference: string }>;

  submitBiometricData(
    providerReference: string,
    payload: {
      faceFrontObjectKey: string;
      faceRightObjectKey: string;
      faceLeftObjectKey: string;
      thumbObjectKey: string;
      firstName?: string;
      lastName?: string;
    }
  ): Promise<NormalizedVerificationResult>;
}
