import { describe, it, expect } from 'vitest';
import {
  canTransition,
  assertTransition,
} from '../src/server/state-machine/transitions.ts';

describe('Verification State Machine Transitions', () => {
  it('allows standard forward sequential transitions', () => {
    expect(canTransition('UNSTARTED', 'PHONE_PENDING')).toBe(true);
    expect(canTransition('PHONE_PENDING', 'PHONE_VERIFIED')).toBe(true);
    expect(canTransition('PHONE_VERIFIED', 'BIOMETRIC_PENDING')).toBe(true);
    expect(canTransition('BIOMETRIC_PENDING', 'VERIFICATION_PROCESSING')).toBe(true);
    expect(canTransition('VERIFICATION_PROCESSING', 'VERIFIED')).toBe(true);
  });

  it('allows legitimate terminal branches from VERIFICATION_PROCESSING', () => {
    expect(canTransition('VERIFICATION_PROCESSING', 'REJECTED')).toBe(true);
    expect(canTransition('VERIFICATION_PROCESSING', 'FAILED')).toBe(true);
  });

  it('blocks invalid transitions and skipped stages', () => {
    expect(canTransition('UNSTARTED', 'VERIFIED')).toBe(false);
    expect(canTransition('PHONE_PENDING', 'VERIFIED')).toBe(false);
    expect(canTransition('BIOMETRIC_PENDING', 'VERIFIED')).toBe(false);
    expect(canTransition('VERIFIED', 'UNSTARTED')).toBe(false);
  });

  it('allows retry paths from FAILED or REJECTED states', () => {
    expect(canTransition('FAILED', 'PHONE_PENDING')).toBe(true);
    expect(canTransition('REJECTED', 'PHONE_PENDING')).toBe(true);
  });

  it('assertTransition throws informative error on illegal jump', () => {
    expect(() => assertTransition('UNSTARTED', 'VERIFIED')).toThrow(
      /INVALID_STATE_TRANSITION/
    );
  });
});
