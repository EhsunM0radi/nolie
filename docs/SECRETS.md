# Secrets Policy & Environment Configuration

## 1. Secret Classifications & Location Matrix

| Secret / Environment Variable | Scope | Location | Client Exposure | Description |
|-------------------------------|-------|----------|-----------------|-------------|
| `DATABASE_URL` | Server Only | Vercel Env / GH Secrets | **NEVER** | Supabase Postgres direct connection string |
| `SUPABASE_URL` | Server/Public | Vercel Env / GH Secrets | Safe to expose | Supabase API URL endpoint |
| `SUPABASE_ANON_KEY` | Server/Public | Vercel Env / GH Secrets | Safe to expose | Supabase client anon key with RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only | Vercel Env / GH Secrets | **NEVER** | Supabase admin bypass key |
| `TELEGRAM_BOT_TOKEN` | Server Only | Vercel Env / GH Secrets | **NEVER** | Bot Father secret token for HMAC validation |
| `TELEGRAM_BOT_USERNAME` | Public | Vercel Env | Public | Telegram Bot handle (e.g. `@VerifyRelBot`) |
| `R2_ACCOUNT_ID` | Server Only | Vercel Env / GH Secrets | **NEVER** | Cloudflare account identifier |
| `R2_ACCESS_KEY_ID` | Server Only | Vercel Env / GH Secrets | **NEVER** | Cloudflare R2 S3-compatible Access Key ID |
| `R2_SECRET_ACCESS_KEY` | Server Only | Vercel Env / GH Secrets | **NEVER** | Cloudflare R2 Secret Access Key |
| `R2_BUCKET_NAME` | Server Only | Vercel Env / GH Secrets | Non-sensitive | Cloudflare R2 bucket name |
| `SMS_PROVIDER_API_KEY` | Server Only | Vercel Env / GH Secrets | **NEVER** | External SMS gateway API Key |
| `SMS_PROVIDER_API_SECRET` | Server Only | Vercel Env / GH Secrets | **NEVER** | External SMS gateway API Secret |
| `PHONE_IDENTITY_PROVIDER_API_KEY` | Server Only | Vercel Env / GH Secrets | **NEVER** | Shahkar / phone ownership API Key |
| `IDENTITY_PROVIDER_API_KEY` | Server Only | Vercel Env / GH Secrets | **NEVER** | External KYC & Liveness API Key |
| `WEBHOOK_SECRET` | Server Only | Vercel Env / GH Secrets | **NEVER** | Shared secret to verify webhook HMACs |
| `CRON_SECRET` | Server Only | Vercel Env / GH Secrets | **NEVER** | Bearer secret for Vercel Cron cleanup invocation |
| `ADMIN_API_KEY` | Server Only | Vercel Env / GH Secrets | **NEVER** | Master admin inspection key |
| `FCM_PROJECT_ID` | Server Only | Vercel Env / GH Secrets | **NEVER** | Firebase Cloud Messaging project ID |
| `FCM_CLIENT_EMAIL` | Server Only | Vercel Env / GH Secrets | **NEVER** | FCM service account email |
| `FCM_PRIVATE_KEY` | Server Only | Vercel Env / GH Secrets | **NEVER** | FCM service account private key |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Public / Client | Vercel Env | Public | Google Analytics 4 Measurement ID |

## 2. Hardening Directives

1. **Zero Secret Check-ins**:
   Git hooks and CI block any commits containing patterns resembling API keys, PEM headers, or unencrypted tokens.
2. **Never Echo in CI**:
   GitHub Actions workflow steps must NEVER print environment variables or secrets into stdout.
3. **Restricted Client Variables**:
   Only variables prefixed with `NEXT_PUBLIC_` or `VITE_` are bundled into the client build. All secrets MUST omit these prefixes.
