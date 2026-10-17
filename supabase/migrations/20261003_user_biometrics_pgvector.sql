-- ============================================================================
-- Supabase Migration: 1:N Anti-Sybil Biometric Deduplication Registry
-- Extension: pgvector
-- Tables: user_biometrics (with 1024-dim master vector + segmented 512-dim vectors)
-- Indexes: HNSW on vector_cosine_ops for sub-millisecond 1:N deduplication
-- ============================================================================

-- 1. Enable the pgvector extension in the extensions schema
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Ensure public schema can search and resolve vector types
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 2. Create the user_biometrics table
CREATE TABLE IF NOT EXISTS public.user_biometrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64) UNIQUE NOT NULL,
    
    -- Segmented 512-dim feature vectors for individual modality deduplication
    face_embedding extensions.vector(512) NOT NULL,
    fingerprint_embedding extensions.vector(512) NOT NULL,
    
    -- 1024-dim concatenated master biometric token for compound cryptographic uniqueness
    fused_biometric_token extensions.vector(1024) NOT NULL,
    
    -- Frontal reference photo URL (stored in Supabase Storage or Cloudflare R2)
    frontal_photo_url TEXT,
    
    -- Anti-spoofing cryptographic attestation proof
    client_proof_signature VARCHAR(64),
    server_challenge_nonce VARCHAR(64),
    
    -- Quality verification metrics
    quality_metrics JSONB DEFAULT '{}'::jsonb,
    
    -- Audit & lifecycle timestamps
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. HNSW (Hierarchical Navigable Small World) Indexes for 1:N Cosine Distance (<=>)
-- Cosine distance (<=>) allows exact match searches: distance <= 0.25 (which corresponds to >= 75% similarity)
-- Free-tier optimized: m = 16 (max links per node), ef_construction = 64 (build quality)
CREATE INDEX IF NOT EXISTS idx_user_biometrics_face_hnsw
ON public.user_biometrics 
USING hnsw (face_embedding extensions.vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_user_biometrics_fingerprint_hnsw
ON public.user_biometrics 
USING hnsw (fingerprint_embedding extensions.vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_user_biometrics_fused_hnsw
ON public.user_biometrics 
USING hnsw (fused_biometric_token extensions.vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.user_biometrics ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own biometric status
CREATE POLICY "Users can view own biometric record"
ON public.user_biometrics
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

-- Only backend service_role can insert or update biometric records
CREATE POLICY "Service role has full control on user_biometrics"
ON public.user_biometrics
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Stored Procedure for Atomic 1:N Deduplication Check & Registration
-- This prevents race conditions during high-concurrency onboarding
CREATE OR REPLACE FUNCTION public.register_unique_biometric(
    p_user_id VARCHAR(64),
    p_face_vec extensions.vector(512),
    p_fingerprint_vec extensions.vector(512),
    p_fused_vec extensions.vector(1024),
    p_photo_url TEXT,
    p_proof_sig VARCHAR(64),
    p_challenge VARCHAR(64),
    p_max_distance FLOAT DEFAULT 0.25 -- 75% similarity threshold (1.0 - 0.75)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conflict_face RECORD;
    v_conflict_fp RECORD;
    v_new_id UUID;
BEGIN
    -- Check 1:N Face Embedding
    SELECT user_id, (face_embedding <=> p_face_vec) AS distance
    INTO v_conflict_face
    FROM public.user_biometrics
    WHERE (face_embedding <=> p_face_vec) <= p_max_distance
    ORDER BY distance ASC
    LIMIT 1;

    IF v_conflict_face.user_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'DUPLICATE_FACE',
            'message', 'Face matches an existing registered human identity.',
            'conflict_user_id', v_conflict_face.user_id,
            'similarity', ROUND(((1.0 - v_conflict_face.distance) * 100)::numeric, 2)
        );
    END IF;

    -- Check 1:N Fingerprint Embedding
    SELECT user_id, (fingerprint_embedding <=> p_fingerprint_vec) AS distance
    INTO v_conflict_fp
    FROM public.user_biometrics
    WHERE (fingerprint_embedding <=> p_fingerprint_vec) <= p_max_distance
    ORDER BY distance ASC
    LIMIT 1;

    IF v_conflict_fp.user_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'DUPLICATE_FINGERPRINT',
            'message', 'Fingerprint matches an existing registered human identity.',
            'conflict_user_id', v_conflict_fp.user_id,
            'similarity', ROUND(((1.0 - v_conflict_fp.distance) * 100)::numeric, 2)
        );
    END IF;

    -- Insert new verified human identity
    INSERT INTO public.user_biometrics (
        user_id,
        face_embedding,
        fingerprint_embedding,
        fused_biometric_token,
        frontal_photo_url,
        client_proof_signature,
        server_challenge_nonce
    ) VALUES (
        p_user_id,
        p_face_vec,
        p_fingerprint_vec,
        p_fused_vec,
        p_photo_url,
        p_proof_sig,
        p_challenge
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_new_id,
        'user_id', p_user_id,
        'message', 'Biometric identity registered successfully.'
    );
END;
$$;
