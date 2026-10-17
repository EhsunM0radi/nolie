import {
  MockSmsProvider,
  MockBiometricVerificationProvider,
} from './mock-providers.ts';
import type {
  SmsProvider,
  BiometricVerificationProvider,
} from './interfaces.ts';

export const mockSms = new MockSmsProvider();
export const mockBiometric = new MockBiometricVerificationProvider();

export function getSmsProvider(): SmsProvider {
  return mockSms;
}

export function getBiometricVerificationProvider(): BiometricVerificationProvider {
  return mockBiometric;
}
