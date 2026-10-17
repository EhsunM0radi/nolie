# Architecture Documentation

## 1. System Overview

The **Telegram Relationship Verification Mini App** enables individuals to undergo a high-assurance identity verification process directly inside Telegram, and allows authorized users to verify whether a partner or acquaintance has an active, identity-verified record without compromising either party's privacy.

```
       [Telegram Client (Mini App WebApp)]
                        │
                        ▼ (initData HMAC validation)
          [Next.js / Vercel API Layer]
          │             │            │
          ▼             ▼            ▼
[Supabase PostgreSQL]  [Cloudflare R2]  [External Identity & SMS Providers]
- Users / Profiles     - Ephemeral uploads - SMS OTP Gateway
- Sessions & States    - Presigned URLs    - Iranian Mobile Ownership (Shahkar)
- Hashed Identifiers   - Auto-retention    - KYC, Document OCR & Liveness
- Audit & Security Logs
```

## 2. Core Architectural Principles

1. **Zero-Knowledge Relationship Verification**:
   When querying whether a person is verified, the system responds strictly with:
   ```json
   {
     "verifiedAccountExists": true
   }
   ```
   No personal identifiable information (name, national ID, phone, telegram ID, timestamps, or documents) is ever exposed.

2. **Ephemeral Document Lifecycle**:
   Identity documents and biometric face samples are held in Cloudflare R2 solely for the duration of the verification processing step (maximum TTL of 1 hour). Once verified, rejected, or expired, objects are immediately deleted from R2.

3. **Provider-Agnostic Adapter Pattern**:
   The verification layer delegates to abstract interfaces (`PhoneIdentityProvider`, `SmsProvider`, `IdentityVerificationProvider`). This prevents vendor lock-in and allows seamless switching between mock/sandbox environments and real production providers (e.g., Kavenegar, Shahkar API, FarazSMS, etc.).

4. **Layered Anti-Enumeration & Throttling**:
   - Sliding-window database and memory rate limiters.
   - Per-user limit (e.g., 5 queries per hour).
   - Global and per-IP throttles.
   - Consistent timing responses to eliminate side-channel enumeration.

## 3. Verification State Machine

```
UNSTARTED
   │
   ▼ (Start Registration)
PHONE_PENDING
   │
   ▼ (OTP Verified)
PHONE_VERIFIED
   │
   ▼ (Shahkar Match)
IDENTITY_PENDING
   │
   ▼ (Document Uploaded)
IDENTITY_SUBMITTED
   │
   ▼ (Face 3-Angle Samples Captured)
FACE_PENDING
   │
   ▼ (Submit for Verification)
VERIFICATION_PROCESSING
   │
   ├───> VERIFIED (Success)
   ├───> REJECTED (Fraud / Mismatch)
   ├───> MANUAL_REVIEW (Borderline Quality)
   └───> FAILED (Provider Timeout / Retry Allowed)
```

## 4. Storage Architecture (Cloudflare R2)

- Ephemeral storage layout:
  - `verification/{sessionId}/document`
  - `verification/{sessionId}/face-front`
  - `verification/{sessionId}/face-right`
  - `verification/{sessionId}/face-left`
- No public bucket access; all interaction is conducted via signed URLs or authenticated server proxies.
- Automatic object expiration lifecycle configured at the Cloudflare bucket level as defense in depth.
