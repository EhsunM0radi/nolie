import type { VerificationState } from '../../types/index.ts';

/**
 * Strict transition map for Verification State Machine.
 * Flow: UNSTARTED -> PHONE_PENDING -> PHONE_VERIFIED -> BIOMETRIC_PENDING -> VERIFICATION_PROCESSING -> VERIFIED
 */
export const VALID_TRANSITIONS: Record<VerificationState, VerificationState[]> = {
  UNSTARTED: ['PHONE_PENDING'],
  PHONE_PENDING: ['PHONE_VERIFIED', 'FAILED', 'EXPIRED'],
  PHONE_VERIFIED: ['BIOMETRIC_PENDING', 'FAILED', 'EXPIRED'],
  BIOMETRIC_PENDING: ['VERIFICATION_PROCESSING', 'FAILED', 'EXPIRED'],
  VERIFICATION_PROCESSING: [
    'VERIFIED',
    'REJECTED',
    'FAILED',
    'EXPIRED',
  ],
  // Terminal and recovery states:
  VERIFIED: [], // Terminal success
  REJECTED: ['PHONE_PENDING', 'BIOMETRIC_PENDING'],
  FAILED: ['PHONE_PENDING', 'BIOMETRIC_PENDING'],
  EXPIRED: ['PHONE_PENDING', 'BIOMETRIC_PENDING'],
};

/**
 * Validates whether transition from currentState to targetState is legal.
 */
export function canTransition(current: VerificationState, target: VerificationState): boolean {
  if (current === target) return true;
  const allowed = VALID_TRANSITIONS[current];
  return allowed ? allowed.includes(target) : false;
}

/**
 * Asserts legal transition, throws standard descriptive domain error if illegal.
 */
export function assertTransition(current: VerificationState, target: VerificationState): void {
  if (!canTransition(current, target)) {
    throw new Error(
      `INVALID_STATE_TRANSITION: Cannot transition from '${current}' to '${target}'.`
    );
  }
}
