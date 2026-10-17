import type {
  SmsProvider,
  BiometricVerificationProvider,
} from './interfaces.ts';
import type {
  NormalizedVerificationResult,
} from '../../types/index.ts';
import { maskPhoneNumber } from '../security/crypto.ts';

/**
 * Standard Iranian Mobile format check (starts with 09... or +989... length 11)
 */
export function validateIranianMobileNumber(mobile: string): boolean {
  const clean = mobile.trim().replace(/[^\d+]/g, '');
  return /^(09\d{9}|\+989\d{9})$/.test(clean);
}

/**
 * High-fidelity Mock SMS Provider for local development & testing
 */
export class MockSmsProvider implements SmsProvider {
  readonly providerName = 'MockSmsProvider';
  private dispatchedMessages: Array<{ phoneMasked: string; code: string; timestamp: number }> = [];

  async sendOtp(mobileNumber: string, otpCode: string): Promise<{ success: boolean; messageId: string }> {
    const masked = maskPhoneNumber(mobileNumber);
    const messageId = `mock_sms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    this.dispatchedMessages.push({
      phoneMasked: masked,
      code: otpCode,
      timestamp: Date.now(),
    });

    // Simulated network latency
    await new Promise((r) => setTimeout(r, 60));

    return { success: true, messageId };
  }

  getLastDispatchedCode(): string | undefined {
    return this.dispatchedMessages[this.dispatchedMessages.length - 1]?.code;
  }
}

/**
 * High-fidelity Biometric Verification Provider
 * Validates 3-angle facial liveness & Right-Thumb Biometric scan
 * Stored in Cloudflare R2
 */
export class MockBiometricVerificationProvider implements BiometricVerificationProvider {
  readonly providerName = 'MockBiometricVerificationProvider';

  async createVerificationSession(
    sessionId: string
  ): Promise<{ providerReference: string }> {
    return { providerReference: `biometric_session_${sessionId}` };
  }

  async submitBiometricData(
    providerReference: string,
    payload: {
      faceFrontObjectKey: string;
      faceRightObjectKey: string;
      faceLeftObjectKey: string;
      thumbObjectKey: string;
      firstName?: string;
      lastName?: string;
    }
  ): Promise<NormalizedVerificationResult> {
    await new Promise((r) => setTimeout(r, 100));

    // Simulation hook: if key contains 'reject', simulate failure
    if (payload.faceFrontObjectKey.includes('reject') || payload.thumbObjectKey.includes('reject')) {
      return {
        status: 'rejected',
        thumbVerified: false,
        faceMatch: false,
        livenessPassed: false,
        storageBucket: 'relationship-verification-biometrics',
        providerReference,
        failureReason: 'BIOMETRIC_MISMATCH: Biometric data quality insufficient',
      };
    }

    return {
      status: 'verified',
      thumbVerified: true,
      faceMatch: true,
      livenessPassed: true,
      storageBucket: 'relationship-verification-biometrics',
      providerReference,
    };
  }
}
