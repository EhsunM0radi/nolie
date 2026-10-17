-- Migration: Initial Schema for Telegram Relationship Verification Mini App
-- Target: Supabase PostgreSQL with RLS and Security Best Practices

-- Enable pgcrypto for UUID generation and cryptographic hashes
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to handle updated_at timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Telegram Accounts (never trust client username; link uniquely by telegram_user_id)
CREATE TABLE IF NOT EXISTS public.telegram_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    telegram_user_id BIGINT NOT NULL UNIQUE,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    auth_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_user_id ON public.telegram_accounts(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_user_mapping ON public.telegram_accounts(user_id);

CREATE TRIGGER update_telegram_accounts_updated_at
    BEFORE UPDATE ON public.telegram_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Profiles (Tokenized/Hashed PII)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    national_id_hash VARCHAR(64) NOT NULL,
    phone_number_hash VARCHAR(64) NOT NULL,
    masked_phone VARCHAR(32) NOT NULL,
    is_identity_verified BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_hash ON public.profiles(phone_number_hash);
CREATE INDEX IF NOT EXISTS idx_profiles_national_id_hash ON public.profiles(national_id_hash);

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Verification Sessions (State Machine Controller)
CREATE TABLE IF NOT EXISTS public.verification_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    current_state VARCHAR(64) NOT NULL DEFAULT 'UNSTARTED',
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_sessions_user ON public.verification_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_state ON public.verification_sessions(current_state);

CREATE TRIGGER update_verification_sessions_updated_at
    BEFORE UPDATE ON public.verification_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Phone Verifications (Salted & Hashed OTP, Expiration, Attempt Counter)
CREATE TABLE IF NOT EXISTS public.phone_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
    phone_number_hash VARCHAR(64) NOT NULL,
    masked_phone VARCHAR(32) NOT NULL,
    otp_hash VARCHAR(64) NOT NULL,
    otp_salt VARCHAR(32) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    cooldown_until TIMESTAMPTZ NOT NULL,
    attempts_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_session ON public.phone_verifications(session_id);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user ON public.phone_verifications(user_id);

-- 6. Identity Verifications (KYC / Biometric & Phone-National ID Ownership)
CREATE TABLE IF NOT EXISTS public.identity_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
    national_id_hash VARCHAR(64) NOT NULL,
    phone_ownership_verified BOOLEAN NOT NULL DEFAULT false,
    provider_reference VARCHAR(255),
    document_valid BOOLEAN NOT NULL DEFAULT false,
    face_match_passed BOOLEAN NOT NULL DEFAULT false,
    liveness_passed BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(64) NOT NULL DEFAULT 'IDENTITY_PENDING',
    failure_reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identity_verifications_session ON public.identity_verifications(session_id);
CREATE INDEX IF NOT EXISTS idx_identity_verifications_user ON public.identity_verifications(user_id);

CREATE TRIGGER update_identity_verifications_updated_at
    BEFORE UPDATE ON public.identity_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Verification Attempts (Granular Audit & Throttling Log)
CREATE TABLE IF NOT EXISTS public.verification_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
    attempt_type VARCHAR(64) NOT NULL, -- 'OTP', 'PHONE_OWNERSHIP', 'DOCUMENT_UPLOAD', 'FACE_SAMPLE', 'KYC_DECISION'
    status VARCHAR(32) NOT NULL,        -- 'SUCCESS', 'FAILED', 'THROTTLED', 'ERROR'
    error_code VARCHAR(64),
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_attempts_session ON public.verification_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_type ON public.verification_attempts(attempt_type, created_at);

-- 8. Temporary Uploads (R2 Tracking & Lifecycle Retention)
CREATE TABLE IF NOT EXISTS public.temporary_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    object_key VARCHAR(512) NOT NULL UNIQUE,
    file_type VARCHAR(32) NOT NULL, -- 'DOCUMENT', 'FACE_FRONT', 'FACE_RIGHT', 'FACE_LEFT'
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    storage_bucket VARCHAR(128) NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_temporary_uploads_retention ON public.temporary_uploads(is_deleted, expires_at);
CREATE INDEX IF NOT EXISTS idx_temporary_uploads_session ON public.temporary_uploads(session_id);

-- 9. Relationship Checks (Privacy-preserving lookup log with rate-limiting index)
CREATE TABLE IF NOT EXISTS public.relationship_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target_identifier_hash VARCHAR(64) NOT NULL,
    result_exists BOOLEAN NOT NULL,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relationship_checks_requester ON public.relationship_checks(requester_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_relationship_checks_target ON public.relationship_checks(target_identifier_hash, created_at);

-- 10. Audit Events (No sensitive PII, logs system & security activities)
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event_type VARCHAR(128) NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'INFO',
    metadata_json JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_type ON public.audit_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_user ON public.audit_events(user_id, created_at);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporary_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Helper RLS policies for auth.uid() mapping
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own verification sessions" 
    ON public.verification_sessions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own temporary uploads" 
    ON public.temporary_uploads FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own relationship queries" 
    ON public.relationship_checks FOR SELECT 
    USING (auth.uid() = requester_user_id);
