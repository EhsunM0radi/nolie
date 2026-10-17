# Production Deployment Guide

## 1. Prerequisites

1. **Telegram Bot**:
   - Create a bot via `@BotFather` on Telegram.
   - Note down `TELEGRAM_BOT_TOKEN`.
   - Configure Mini App menu button via `/setmenubutton` pointing to `https://your-vercel-domain.vercel.app`.
2. **Supabase Project**:
   - Create a free project at [supabase.com](https://supabase.com).
   - In Database > SQL Editor, execute the migration file `supabase/migrations/20250101000000_initial_schema.sql`.
   - Copy `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
3. **Cloudflare R2 Bucket**:
   - Create a bucket named `relationship-verification-temp`.
   - Generate R2 API Tokens with Object Read & Write permissions.
   - Configure a Lifecycle rule on prefix `verification/` to expire/delete objects after 1 day as defense in depth.
4. **Vercel Account**:
   - Link the repository to Vercel.
   - Set all production environment variables from `.env.example`.

## 2. GitHub Actions Secrets Configuration

Add the following repository secrets under GitHub Settings > Secrets and variables > Actions:

```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
SMS_PROVIDER_API_KEY
SMS_PROVIDER_API_SECRET
PHONE_IDENTITY_PROVIDER_API_KEY
IDENTITY_PROVIDER_API_KEY
WEBHOOK_SECRET
CRON_SECRET
ADMIN_API_KEY
```

## 3. Deployment Pipeline

- Push code to a branch -> triggers `.github/workflows/ci.yml` (typecheck, lint, test suite).
- Merge to `main` -> triggers `.github/workflows/deploy.yml` which deploys production build to Vercel.

## 4. Scheduled Cleanup Configuration

In `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 */2 * * *"
    }
  ]
}
```
The endpoint checks `Authorization: Bearer ${CRON_SECRET}` before running idempotent database and R2 bucket cleanup.
