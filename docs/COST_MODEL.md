# Free-Tier Cost Model & Resource Consumption Analysis

This document details how the architecture operates strictly within the Free Tiers of Vercel, Supabase, and Cloudflare R2 under an initial production workload of **1,000 monthly active verifications** and **10,000 relationship queries**.

## 1. Provider Free-Tier Limits vs Projected Usage

### A. Vercel (Hobby Free Tier)
- **Included Monthly Limits**:
  - 100 GB Bandwidth
  - 100,000 Edge / Serverless Function Invocations per day (or 3M invocations/month)
  - 1 Cron Job
- **App Consumption (per 1,000 verifications + 10,000 checks)**:
  - Total function executions: ~18,000 / month (< 1% of free quota)
  - Cron cleanup frequency: Once per 2 hours (360 executions / month)
  - Bandwidth: < 3 GB (Images uploaded directly to R2 via presigned URLs, bypassing Vercel bandwidth!)
- **Cost**: **$0.00 / month**

### B. Supabase (Free Tier)
- **Included Monthly Limits**:
  - 500 MB Database Space
  - 50,000 Monthly Active Users (Auth)
  - 2 GB Egress Bandwidth
- **App Consumption**:
  - 1,000 users × ~4 KB row storage across relational tables = ~4 MB (< 1% of 500 MB quota)
  - Tokenized hashes (64-byte hex strings) are extremely compact
  - No permanent binary assets stored in PostgreSQL
  - Database queries: ~25,000 SELECT/INSERT operations
- **Cost**: **$0.00 / month**

### C. Cloudflare R2 (Free Tier)
- **Included Monthly Limits**:
  - 10 GB Storage per month
  - 1,000,000 Class A operations (writes: PutObject, ListObjects)
  - 10,000,000 Class B operations (reads: GetObject)
  - Zero egress fees
- **App Consumption**:
  - Average image size: 1.2 MB (compressed JPEG)
  - 4 images per verification (1 national ID + 3 face poses) = 4.8 MB per session
  - Retention period: Instant deletion upon verification conclusion (retention < 10 minutes)
  - Maximum concurrent storage at any hour: < 50 MB (< 0.5% of 10 GB free quota)
  - Class A writes: ~4,000 PutObject operations
- **Cost**: **$0.00 / month**

## 2. Third-Party Verification Unit Economics (Variable Pass-Through)

The application infrastructure remains $0.00. Verification provider charges are external per-transaction fees:
- **SMS OTP**: ~0.003 - 0.008 USD per OTP (1-2 messages per registration)
- **Shahkar Match**: ~0.01 - 0.03 USD per query
- **KYC / Biometric Liveness**: ~0.05 - 0.15 USD per verified user

Because these third-party services are modularized via adapter interfaces, tests and development environments utilize the included Mock Provider with zero financial footprint.
