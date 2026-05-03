-- SQL migration for WebAuthn Biometric Authentication

CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter BIGINT DEFAULT 0,
    transports TEXT, -- Stores JSON array as string
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'webauthn_credentials' AND policyname = 'Users can view their own credentials'
    ) THEN
        CREATE POLICY "Users can view their own credentials" 
        ON public.webauthn_credentials FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'webauthn_credentials' AND policyname = 'Users can delete their own credentials'
    ) THEN
        CREATE POLICY "Users can delete their own credentials" 
        ON public.webauthn_credentials FOR DELETE 
        USING (auth.uid() = user_id);
    END IF;
END $$;
