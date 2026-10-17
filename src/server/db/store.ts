import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import type { VerificationState, SystemAuditEvent } from '../../types/index.ts';
import { hashIdentifier } from '../security/crypto.ts';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_URL !== 'REPLACE_WITH_SECRET' &&
  SUPABASE_SERVICE_KEY &&
  SUPABASE_SERVICE_KEY !== 'REPLACE_WITH_SECRET'
);

export let supabase: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
}

// Relational in-memory store representing Supabase tables
export interface DbUser {
  id: string;
  isActive: boolean;
  createdAt: number;
}

export interface DbTelegramAccount {
  id: string;
  userId: string;
  telegramUserId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  authDate: number;
  createdAt: number;
}

export interface DbProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  nationalIdHash?: string;
  phoneNumberHash: string;
  maskedPhone: string;
  isIdentityVerified: boolean;
  verifiedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface DbVerificationSession {
  id: string;
  userId: string;
  currentState: VerificationState;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface DbPhoneVerification {
  id: string;
  userId: string;
  sessionId: string;
  phoneNumberHash: string;
  maskedPhone: string;
  otpHash: string;
  otpSalt: string;
  expiresAt: number;
  cooldownUntil: number;
  attemptsCount: number;
  maxAttempts: number;
  isVerified: boolean;
  verifiedAt?: number;
  createdAt: number;
}

export interface DbIdentityVerification {
  id: string;
  userId: string;
  sessionId: string;
  nationalIdHash: string;
  phoneOwnershipVerified: boolean;
  providerReference?: string;
  documentValid: boolean;
  faceMatchPassed: boolean;
  livenessPassed: boolean;
  status: VerificationState;
  failureReason?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DbTemporaryUpload {
  id: string;
  sessionId: string;
  userId: string;
  objectKey: string;
  fileType: string;
  mimeType: string;
  fileSizeBytes: number;
  storageBucket: string;
  isDeleted: boolean;
  deletedAt?: number;
  expiresAt: number;
  createdAt: number;
}

export interface DbRelationshipCheck {
  id: string;
  requesterUserId: string;
  targetIdentifierHash: string;
  resultExists: boolean;
  ipAddress?: string;
  createdAt: number;
}

export type RelationshipStatus = 'PENDING_ACCEPTANCE' | 'ACTIVE' | 'TERMINATED' | 'REJECTED';

export interface DbRelationship {
  id: string;
  partner1UserId: string;
  partner2UserId: string;
  status: RelationshipStatus;
  startedAt?: number;
  terminatedAt?: number;
  initiatedBy: string;
  terminatedBy?: string;
  partner1TerminationReason?: string;
  partner2TerminationReason?: string;
  createdAt: number;
  updatedAt: number;
}

export type SubscriptionPlanType = 'MONTHLY' | 'ANNUAL';

export interface DbSubscription {
  id: string;
  userId: string;
  planType: SubscriptionPlanType;
  priceTomans: number;
  isActive: boolean;
  expiresAt: number;
  createdAt: number;
  paymentReference: string;
  smsExpiryAlertSent?: boolean;
  telegramExpiryAlertSent?: boolean;
  fcmExpiryAlertSent?: boolean;
}

export interface DbAuditEvent {
  id: string;
  userId?: string;
  eventType: string;
  severity: 'INFO' | 'WARN' | 'SECURITY';
  metadataJson?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: number;
}

class InMemoryDatabase {
  users = new Map<string, DbUser>();
  telegramAccounts = new Map<string, DbTelegramAccount>(); // indexed by telegramUserId string
  profiles = new Map<string, DbProfile>(); // indexed by userId
  sessions = new Map<string, DbVerificationSession>(); // indexed by sessionId
  phoneVerifications = new Map<string, DbPhoneVerification>(); // indexed by sessionId
  identityVerifications = new Map<string, DbIdentityVerification>(); // indexed by sessionId
  temporaryUploads = new Map<string, DbTemporaryUpload>(); // indexed by objectKey
  relationships = new Map<string, DbRelationship>(); // indexed by relationshipId
  subscriptions = new Map<string, DbSubscription>(); // indexed by userId
  relationshipChecks: DbRelationshipCheck[] = [];
  auditEvents: DbAuditEvent[] = [];

  constructor() {
    this.seedDemoData();
  }

  // Pre-seed an identity-verified account for testing relationship verification lookups
  private seedDemoData() {
    const demoUserId = 'demo-verified-user-0001';
    this.users.set(demoUserId, {
      id: demoUserId,
      isActive: true,
      createdAt: Date.now() - 30 * 86400 * 1000,
    });

    this.profiles.set(demoUserId, {
      id: 'demo-profile-0001',
      userId: demoUserId,
      firstName: 'Alireza',
      lastName: 'Tehrani',
      nationalIdHash: hashIdentifier('0012345679'),
      phoneNumberHash: hashIdentifier('09121112233'),
      maskedPhone: '0912****233',
      isIdentityVerified: true,
      verifiedAt: Date.now() - 7 * 86400 * 1000,
      createdAt: Date.now() - 30 * 86400 * 1000,
      updatedAt: Date.now() - 7 * 86400 * 1000,
    });

    // Seed active subscription for demo user
    this.subscriptions.set(demoUserId, {
      id: 'demo-sub-0001',
      userId: demoUserId,
      planType: 'ANNUAL',
      priceTomans: 600000,
      isActive: true,
      expiresAt: Date.now() + 365 * 86400 * 1000,
      createdAt: Date.now() - 7 * 86400 * 1000,
      paymentReference: 'DEMO-SHETAB-99281',
    });

    // Seed prior terminated relationship for demo user to demonstrate transparent mutual history
    const priorRelId = 'prior-demo-rel-0001';
    const exPartnerId = 'ex-partner-0002';
    this.relationships.set(priorRelId, {
      id: priorRelId,
      partner1UserId: demoUserId,
      partner2UserId: exPartnerId,
      status: 'TERMINATED',
      startedAt: Date.now() - 180 * 86400 * 1000,
      terminatedAt: Date.now() - 60 * 86400 * 1000,
      initiatedBy: demoUserId,
      terminatedBy: exPartnerId,
      partner1TerminationReason: 'عدم تفاهم اخلاقی و اهداف متفاوت در زندگی',
      partner2TerminationReason: 'توافق دوجانبه برای پایان رابطه به دلیل تفاوت در اولویت‌ها',
      createdAt: Date.now() - 180 * 86400 * 1000,
      updatedAt: Date.now() - 60 * 86400 * 1000,
    });
  }

  // Check and grant subscriptions
  hasActiveSubscription(userId: string): boolean {
    const sub = this.subscriptions.get(userId);
    if (!sub) return false;
    return sub.isActive && sub.expiresAt > Date.now();
  }

  getUserSubscription(userId: string): DbSubscription | undefined {
    return this.subscriptions.get(userId);
  }

  setUserSubscription(userId: string, planType: SubscriptionPlanType): DbSubscription {
    const isAnnual = planType === 'ANNUAL';
    const priceTomans = isAnnual ? 600000 : 100000;
    const durationDays = isAnnual ? 365 : 30;

    const sub: DbSubscription = {
      id: crypto.randomUUID(),
      userId,
      planType,
      priceTomans,
      isActive: true,
      expiresAt: Date.now() + durationDays * 86400 * 1000,
      createdAt: Date.now(),
      paymentReference: `DEMO-PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    };

    this.subscriptions.set(userId, sub);
    return sub;
  }

  // Active Monogamy Rules: A user can only be in AT MOST ONE active or pending relationship
  getActiveRelationship(userId: string): DbRelationship | undefined {
    for (const rel of this.relationships.values()) {
      if ((rel.partner1UserId === userId || rel.partner2UserId === userId) && rel.status === 'ACTIVE') {
        return rel;
      }
    }
    return undefined;
  }

  getPendingInvite(userId: string): DbRelationship | undefined {
    for (const rel of this.relationships.values()) {
      if (
        (rel.partner1UserId === userId || rel.partner2UserId === userId) &&
        rel.status === 'PENDING_ACCEPTANCE'
      ) {
        return rel;
      }
    }
    return undefined;
  }

  canEnterRelationship(userId: string): { allowed: boolean; reason?: string } {
    const active = this.getActiveRelationship(userId);
    if (active) {
      return {
        allowed: false,
        reason: 'USER_ALREADY_IN_ACTIVE_RELATIONSHIP: You must officially end your current relationship before committing to someone new.',
      };
    }
    const pending = this.getPendingInvite(userId);
    if (pending) {
      return {
        allowed: false,
        reason: 'USER_HAS_PENDING_INVITATION: You have an unconfirmed relationship invite pending response.',
      };
    }
    return { allowed: true };
  }

  createRelationshipInvite(senderId: string, receiverId: string): DbRelationship {
    const senderCheck = this.canEnterRelationship(senderId);
    if (!senderCheck.allowed) throw new Error(senderCheck.reason);

    const receiverCheck = this.canEnterRelationship(receiverId);
    if (!receiverCheck.allowed) throw new Error('TARGET_ALREADY_IN_RELATIONSHIP: This person is already in an active relationship with someone else.');

    const relId = crypto.randomUUID();
    const relationship: DbRelationship = {
      id: relId,
      partner1UserId: senderId,
      partner2UserId: receiverId,
      status: 'PENDING_ACCEPTANCE',
      initiatedBy: senderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.relationships.set(relId, relationship);
    return relationship;
  }

  acceptRelationshipInvite(relationshipId: string, receiverId: string): DbRelationship {
    const rel = this.relationships.get(relationshipId);
    if (!rel) throw new Error('RELATIONSHIP_NOT_FOUND');
    if (rel.partner2UserId !== receiverId) throw new Error('FORBIDDEN: You are not the invited partner');
    if (rel.status !== 'PENDING_ACCEPTANCE') throw new Error('INVITATION_NOT_PENDING');

    rel.status = 'ACTIVE';
    rel.startedAt = Date.now();
    rel.updatedAt = Date.now();

    return rel;
  }

  terminateRelationship(userId: string, relationshipId: string, reason: string): { relationship: DbRelationship; exPartnerId: string } {
    const rel = this.relationships.get(relationshipId);
    if (!rel) throw new Error('RELATIONSHIP_NOT_FOUND');
    if (rel.partner1UserId !== userId && rel.partner2UserId !== userId) {
      throw new Error('FORBIDDEN: You are not part of this relationship');
    }
    if (rel.status !== 'ACTIVE') {
      throw new Error('RELATIONSHIP_NOT_ACTIVE');
    }

    const exPartnerId = rel.partner1UserId === userId ? rel.partner2UserId : rel.partner1UserId;

    rel.status = 'TERMINATED';
    rel.terminatedAt = Date.now();
    rel.terminatedBy = userId;
    rel.updatedAt = Date.now();

    if (rel.partner1UserId === userId) {
      rel.partner1TerminationReason = reason;
    } else {
      rel.partner2TerminationReason = reason;
    }

    return { relationship: rel, exPartnerId };
  }

  addCounterReason(userId: string, relationshipId: string, reason: string): DbRelationship {
    const rel = this.relationships.get(relationshipId);
    if (!rel) throw new Error('RELATIONSHIP_NOT_FOUND');
    if (rel.partner1UserId !== userId && rel.partner2UserId !== userId) {
      throw new Error('FORBIDDEN: You are not part of this relationship');
    }

    if (rel.partner1UserId === userId) {
      rel.partner1TerminationReason = reason;
    } else {
      rel.partner2TerminationReason = reason;
    }
    rel.updatedAt = Date.now();
    return rel;
  }

  getRelationshipHistory(userId: string): DbRelationship[] {
    const history: DbRelationship[] = [];
    for (const rel of this.relationships.values()) {
      if ((rel.partner1UserId === userId || rel.partner2UserId === userId) && rel.status === 'TERMINATED') {
        history.push(rel);
      }
    }
    return history.sort((a, b) => (b.terminatedAt || 0) - (a.terminatedAt || 0));
  }

  // Find or create user via Telegram ID
  async getOrCreateTelegramUser(
    telegramUserId: number,
    userData: { username?: string; firstName?: string; lastName?: string; authDate: number }
  ): Promise<{ user: DbUser; telegramAccount: DbTelegramAccount; isNew: boolean }> {
    const key = String(telegramUserId);
    let tgAccount = this.telegramAccounts.get(key);

    if (tgAccount) {
      const user = this.users.get(tgAccount.userId)!;
      return { user, telegramAccount: tgAccount, isNew: false };
    }

    const userId = crypto.randomUUID();
    const newUser: DbUser = {
      id: userId,
      isActive: true,
      createdAt: Date.now(),
    };
    this.users.set(userId, newUser);

    tgAccount = {
      id: crypto.randomUUID(),
      userId,
      telegramUserId,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      authDate: userData.authDate,
      createdAt: Date.now(),
    };
    this.telegramAccounts.set(key, tgAccount);

    return { user: newUser, telegramAccount: tgAccount, isNew: true };
  }

  // Record audit log
  logAudit(event: SystemAuditEvent): void {
    this.auditEvents.push({
      id: crypto.randomUUID(),
      userId: event.userId,
      eventType: event.eventType,
      severity: event.severity,
      metadataJson: event.metadata,
      ipAddress: event.ipAddress,
      createdAt: Date.now(),
    });
  }
}

export const db = new InMemoryDatabase();
