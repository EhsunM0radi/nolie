# Telegram Relationship Verification Mini App

A production-ready, privacy-first, zero-knowledge relationship verification application built for the **Telegram Mini App** ecosystem.

Designed specifically to operate reliably within the free tiers of **Vercel**, **Supabase (PostgreSQL + RLS)**, and **Cloudflare R2**.

---

## Key Features

1. **Telegram WebApp Authentication**:
   - Cryptographic server-side verification of Telegram `initData` HMAC-SHA256 signatures.
   - Freshness checks and anti-replay protection.
   - Bound securely to internal user IDs without exposing Telegram usernames as primary keys.

2. **Multi-Stage Verification State Machine**:
   - `UNSTARTED` → `PHONE_PENDING` → `PHONE_VERIFIED` → `IDENTITY_PENDING` → `IDENTITY_SUBMITTED` → `FACE_PENDING` → `VERIFICATION_PROCESSING` → `VERIFIED`.
   - Strict transition constraints preventing bypassed stages or invalid skips.

3. **Secure OTP & Ownership Matching**:
   - Salted SHA-256 OTP hashes (never stored in plaintext).
   - Strict 3-attempt limit, 120-second cooldown, 5-minute expiry.
   - Pluggable Iranian Mobile-National ID ownership verification (Shahkar adapter).

4. **Biometric Face Capture & Document Validation**:
   - Mobile-first interactive camera with oval guide.
   - Captures 3 distinct facial poses (Frontal, Turned Right, Turned Left).
   - Automatic image compression and validation before upload.
   - Ephemeral upload to Cloudflare R2 via presigned URLs.
   - Immediate post-verification cleanup with automated R2 lifecycle and Vercel Cron.

5. **Zero-Knowledge Relationship Verification**:
   - Query whether another person has an identity-verified account.
   - Returns strictly `{ "verifiedAccountExists": boolean }`.
   - Zero leakage of names, phone numbers, national IDs, Telegram handles, or documents.

6. **Anti-Enumeration & Throttling**:
   - Sliding-window rate limiting per authenticated user and IP address.
   - Timing equalization to eliminate side-channel enumeration.
   - Comprehensive audit logging without recording sensitive PII.

---

## Directory Structure

```
├── .github/
│   └── workflows/
│       ├── ci.yml               # Lint, typecheck, test, and build validation
│       └── deploy.yml           # Automated Vercel production deployment
├── docs/
│   ├── ARCHITECTURE.md          # Architectural flow and component diagram
│   ├── SECURITY.md              # Crypto verification, anti-enumeration, and RLS
│   ├── SECRETS.md               # Environment variables and secrets matrix
│   ├── COST_MODEL.md            # Free-tier consumption analysis
│   └── DEPLOYMENT.md            # Step-by-step production rollout guide
├── src/
│   ├── server/                  # Backend API routes, services, adapters
│   │   ├── auth/                # Telegram initData validator & JWT sessions
│   │   ├── providers/           # SMS, Shahkar, and Face/KYC adapters
│   │   ├── storage/             # Cloudflare R2 presigned URLs and cleanup
│   │   ├── state-machine/       # Verification state transitions
│   │   ├── security/            # Rate limiting, anti-enumeration, hashing
│   │   └── db/                  # Supabase client and repository helpers
│   ├── components/              # Telegram Mini App UI screens
│   ├── types/                   # Unified TypeScript domain definitions
│   ├── App.tsx                  # Main Mini App UI with 10 screens
│   └── index.css                # Tailwind styling
├── supabase/
│   └── migrations/              # Deterministic PostgreSQL schema and RLS policies
├── tests/                       # Complete Vitest test suite
├── server.ts                    # Full-stack API server entry point
├── package.json
└── vite.config.ts
```

---

## Quickstart (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
In development, mock adapters (`SMS_PROVIDER_TYPE=mock`, `PHONE_IDENTITY_PROVIDER_TYPE=mock`, `IDENTITY_PROVIDER_TYPE=mock`) are active by default, allowing complete end-to-end testing without external API expenses.

### 3. Run the Development Server
```bash
npm run dev
```
Open `http://localhost:3000` to interact with the Mini App interface or test API endpoints directly.

### 4. Run the Test Suite
```bash
npm test
```
Runs the automated tests covering Telegram signature validation, OTP hashing, state machine logic, anti-enumeration limits, and provider adapters.

---

## Production Deployment Checklist

1. Run Supabase migration: `supabase/migrations/20250101000000_initial_schema.sql`.
2. Configure Cloudflare R2 bucket with 1-day lifecycle expiration.
3. Configure Telegram Bot with `/setmenubutton` pointing to the deployed domain.
4. Set required secrets in GitHub Actions and Vercel project settings.
