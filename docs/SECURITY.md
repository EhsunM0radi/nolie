# Security Specifications & Hardening

## 1. Telegram initData Authentication

1. The client sends `initData` provided by Telegram WebApp SDK (`Telegram.WebApp.initData`).
2. Server validates the data using the Telegram Bot Token:
   - Parse key-value query string into sorted parameters, excluding `hash`.
   - Compute `secret_key = HMAC-SHA256("WebAppData", bot_token)`.
   - Compute `expected_hash = HMAC-SHA256(data_check_string, secret_key)`.
   - Compare `expected_hash` with client `hash` using timing-safe comparison (`crypto.timingSafeEqual`).
3. Replay attack mitigation:
   - Validate `auth_date`. Reject tokens older than 86,400 seconds (24 hours).
4. Session authorization:
   - Upon successful verification, issue a cryptographically signed session token bound to the internal user ID.

## 2. PII Tokenization & Storage

- **National IDs**: Never stored in plaintext. Stored as `HMAC-SHA256(national_id, PEPPER)`.
- **Phone Numbers**: Never logged or stored in plaintext in the profiles lookup table. Only masked format (e.g. `0912****123`) is retained for user display.
- **OTPs**: Never stored in plaintext. Generated as 6-digit cryptographically secure pseudorandom numbers, hashed with unique per-attempt salt using SHA-256 before insertion. Max 3 validation attempts per OTP before session invalidation.

## 3. Anti-Enumeration Countermeasures

- **Minimalist Response Schema**: Relationship check returns only `{ "verifiedAccountExists": boolean }`.
- **Timing Equalization**: Queries enforce synthetic delay smoothing to neutralize timing attack discrepancies between cache hits and database misses.
- **Query Quotas**:
  - Maximum 5 lookups per user per rolling 60 minutes.
  - Maximum 15 lookups per IP per rolling 60 minutes.
  - Exceeding quota returns HTTP 429 (`RATE_LIMITED`).
- **Audit Logging**: All lookup attempts are logged with requester ID, target identifier hash, and client IP for fraud detection.

## 4. Temporary File Retention & Cloudflare R2 Security

- R2 credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) are kept strictly server-side.
- Presigned upload URLs have a maximum validity window of 15 minutes.
- Image uploads are inspected for MIME type and binary magic numbers (`image/jpeg`, `image/png`, `image/webp`). Maximum upload limit is strictly enforced at 8MB.
- Deletion is triggered immediately after verification conclusion.
- Scheduled cleanup cron (`/api/cron/cleanup`) operates as an idempotent fallback to remove abandoned or stale files.

## 5. Webhook & Administrative Endpoints

- All incoming provider webhooks must supply an HMAC-SHA256 signature in the headers verified against `WEBHOOK_SECRET`.
- Administrative inspection endpoints require `Authorization: Bearer <ADMIN_API_KEY>` or elevated role verification.
