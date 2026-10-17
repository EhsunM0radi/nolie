-- Migration: One-to-One Monogamous Relationship Commitment, Subscriptions & FCM Alerts
-- Target: Supabase PostgreSQL with RLS and Monogamy Invariant Constraints

-- 1. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    plan_type VARCHAR(32) NOT NULL, -- 'MONTHLY' (100k Tomans) or 'ANNUAL' (50k/mo = 600k Tomans)
    price_tomans INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    payment_reference VARCHAR(64),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON public.subscriptions(user_id, is_active, expires_at);

-- 2. Relationships Table (Monogamous 1-to-1 commitment with breakup statements)
CREATE TABLE IF NOT EXISTS public.relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner1_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    partner2_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_ACCEPTANCE', -- 'PENDING_ACCEPTANCE', 'ACTIVE', 'TERMINATED', 'REJECTED'
    started_at TIMESTAMPTZ,
    terminated_at TIMESTAMPTZ,
    initiated_by UUID NOT NULL REFERENCES public.users(id),
    terminated_by UUID REFERENCES public.users(id),
    partner1_termination_reason TEXT,
    partner2_termination_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT different_partners CHECK (partner1_user_id <> partner2_user_id)
);

CREATE INDEX IF NOT EXISTS idx_relationships_partner1 ON public.relationships(partner1_user_id, status);
CREATE INDEX IF NOT EXISTS idx_relationships_partner2 ON public.relationships(partner2_user_id, status);

-- 3. FCM Device Tokens for Push Notifications
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL UNIQUE,
    platform VARCHAR(32) NOT NULL DEFAULT 'web',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user ON public.fcm_tokens(user_id);

-- RLS POLICIES
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Partners can view shared relationships"
    ON public.relationships FOR SELECT
    USING (auth.uid() = partner1_user_id OR auth.uid() = partner2_user_id);
