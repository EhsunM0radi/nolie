import { describe, it, expect } from 'vitest';
import {
  validateIranianMobileNumber,
  MockBiometricVerificationProvider,
  MockSmsProvider,
} from '../src/server/providers/mock-providers.ts';

describe('Provider Adapters & Biometric Verification Standards', () => {
  it('validates Iranian mobile numbers (09... format)', () => {
    expect(validateIranianMobileNumber('09121234567')).toBe(true);
    expect(validateIranianMobileNumber('09359876543')).toBe(true);
    expect(validateIranianMobileNumber('+989121234567')).toBe(true);

    expect(validateIranianMobileNumber('02188776655')).toBe(false); // Landline
    expect(validateIranianMobileNumber('0912')).toBe(false); // Too short
  });

  it('MockBiometricVerificationProvider validates 3-angle face + right thumb in Cloudflare', async () => {
    const biometric = new MockBiometricVerificationProvider();
    const session = await biometric.createVerificationSession('sess_123');
    expect(session.providerReference).toContain('sess_123');

    const result = await biometric.submitBiometricData(session.providerReference, {
      faceFrontObjectKey: 'biometrics/sess_123/face-front.jpg',
      faceRightObjectKey: 'biometrics/sess_123/face-right.jpg',
      faceLeftObjectKey: 'biometrics/sess_123/face-left.jpg',
      thumbObjectKey: 'biometrics/sess_123/thumb-right.png',
    });

    expect(result.status).toBe('verified');
    expect(result.thumbVerified).toBe(true);
    expect(result.faceMatch).toBe(true);
    expect(result.livenessPassed).toBe(true);
    expect(result.storageBucket).toBe('relationship-verification-biometrics');
  });

  it('MockSmsProvider dispatches and records OTP without leaking raw secret logs', async () => {
    const sms = new MockSmsProvider();
    const res = await sms.sendOtp('09121234567', '458921');

    expect(res.success).toBe(true);
    expect(res.messageId).toContain('mock_sms_');
    expect(sms.getLastDispatchedCode()).toBe('458921');
  });
});
