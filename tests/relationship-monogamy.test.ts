import { describe, it, expect } from 'vitest';
import { db } from '../src/server/db/store.ts';

describe('Monogamous Relationship Binding & Breakup Lifecycle', () => {
  const userA = 'user_monogamy_test_a';
  const userB = 'user_monogamy_test_b';
  const userC = 'user_monogamy_test_c';

  it('allows single users with subscription to initiate and accept an invite', () => {
    // Grant subscriptions
    db.setUserSubscription(userA, 'MONTHLY');
    db.setUserSubscription(userB, 'ANNUAL');

    expect(db.hasActiveSubscription(userA)).toBe(true);
    expect(db.hasActiveSubscription(userB)).toBe(true);

    // Initial check: both are free to enter relationship
    expect(db.canEnterRelationship(userA).allowed).toBe(true);
    expect(db.canEnterRelationship(userB).allowed).toBe(true);

    // User A invites User B
    const rel = db.createRelationshipInvite(userA, userB);
    expect(rel.status).toBe('PENDING_ACCEPTANCE');
    expect(rel.initiatedBy).toBe(userA);

    // Pending check: cannot send another invite while pending
    expect(db.canEnterRelationship(userA).allowed).toBe(false);

    // User B accepts
    const activeRel = db.acceptRelationshipInvite(rel.id, userB);
    expect(activeRel.status).toBe('ACTIVE');
    expect(activeRel.startedAt).toBeDefined();

    // Active check
    expect(db.getActiveRelationship(userA)?.id).toBe(rel.id);
    expect(db.getActiveRelationship(userB)?.id).toBe(rel.id);
  });

  it('strictly blocks entering or inviting into a second relationship while already committed', () => {
    // User C tries to invite User A (who is already in an active relationship with User B)
    db.setUserSubscription(userC, 'MONTHLY');

    expect(() => db.createRelationshipInvite(userC, userA)).toThrow(
      /TARGET_ALREADY_IN_RELATIONSHIP/
    );

    // User A tries to invite User C
    expect(() => db.createRelationshipInvite(userA, userC)).toThrow(
      /USER_ALREADY_IN_ACTIVE_RELATIONSHIP/
    );
  });

  it('handles relationship termination with mutual reasons and unblocks future commitments', () => {
    const activeRel = db.getActiveRelationship(userA)!;
    expect(activeRel).toBeDefined();

    // User A terminates the relationship stating reason
    const { relationship: terminatedRel, exPartnerId } = db.terminateRelationship(
      userA,
      activeRel.id,
      'تفاوت در اولویت‌های زندگی و اهداف آینده'
    );

    expect(terminatedRel.status).toBe('TERMINATED');
    expect(terminatedRel.terminatedBy).toBe(userA);
    expect(terminatedRel.partner1TerminationReason).toBe('تفاوت در اولویت‌های زندگی و اهداف آینده');
    expect(exPartnerId).toBe(userB);

    // Ex-partner B records counter reason
    const updatedRel = db.addCounterReason(
      userB,
      activeRel.id,
      'توافق دوجانبه برای جدایی دوستانه'
    );
    expect(updatedRel.partner2TerminationReason).toBe('توافق دوجانبه برای جدایی دوستانه');

    // Both users are now unblocked to enter new relationships
    expect(db.getActiveRelationship(userA)).toBeUndefined();
    expect(db.getActiveRelationship(userB)).toBeUndefined();
    expect(db.canEnterRelationship(userA).allowed).toBe(true);
    expect(db.canEnterRelationship(userB).allowed).toBe(true);
  });

  it('correctly calculates subscription pricing and durations', () => {
    const subMonthly = db.setUserSubscription('sub_test_user_1', 'MONTHLY');
    expect(subMonthly.priceTomans).toBe(100000);
    expect(subMonthly.isActive).toBe(true);

    const subAnnual = db.setUserSubscription('sub_test_user_2', 'ANNUAL');
    expect(subAnnual.priceTomans).toBe(600000); // 50,000 Tomans / month * 12 months
    expect(subAnnual.isActive).toBe(true);
  });
});
