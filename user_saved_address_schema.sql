-- ==============================================================================
-- BAZAARPULSE: USER LOGIN & SAVED DELIVERY ADDRESS SCHEMA
-- Fixes: ERROR 42P01: relation "public.users" does not exist
-- Adds: saved_address (JSONB), phone, and automatic bidirectional sync
-- ==============================================================================

-- 1. Create or Update 'user_logins' table (Primary login table in Supabase)
CREATE TABLE IF NOT EXISTS public.user_logins (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  avatar TEXT,
  role VARCHAR(50) DEFAULT 'customer',
  password TEXT,
  status VARCHAR(50) DEFAULT 'active',
  saved_address JSONB DEFAULT NULL,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Safely add columns if user_logins already exists
ALTER TABLE public.user_logins ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.user_logins ADD COLUMN IF NOT EXISTS saved_address JSONB DEFAULT NULL;
ALTER TABLE public.user_logins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. Create or Update 'users' table (Prevents 42P01 error if any query targets 'users')
CREATE TABLE IF NOT EXISTS public.users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  avatar TEXT,
  role VARCHAR(50) DEFAULT 'customer',
  password TEXT,
  status VARCHAR(50) DEFAULT 'active',
  saved_address JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Safely add columns if users already exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS saved_address JSONB DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE public.user_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Reset policies for user_logins
DROP POLICY IF EXISTS "Public Read user_logins" ON public.user_logins;
DROP POLICY IF EXISTS "Public Insert user_logins" ON public.user_logins;
DROP POLICY IF EXISTS "Public Update user_logins" ON public.user_logins;
DROP POLICY IF EXISTS "Public Delete user_logins" ON public.user_logins;

CREATE POLICY "Public Read user_logins" ON public.user_logins FOR SELECT TO public USING (true);
CREATE POLICY "Public Insert user_logins" ON public.user_logins FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public Update user_logins" ON public.user_logins FOR UPDATE TO public USING (true);
CREATE POLICY "Public Delete user_logins" ON public.user_logins FOR DELETE TO public WITH CHECK (true);

-- Reset policies for users
DROP POLICY IF EXISTS "Public Read users" ON public.users;
DROP POLICY IF EXISTS "Public Insert users" ON public.users;
DROP POLICY IF EXISTS "Public Update users" ON public.users;
DROP POLICY IF EXISTS "Public Delete users" ON public.users;

CREATE POLICY "Public Read users" ON public.users FOR SELECT TO public USING (true);
CREATE POLICY "Public Insert users" ON public.users FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public Update users" ON public.users FOR UPDATE TO public USING (true);
CREATE POLICY "Public Delete users" ON public.users FOR DELETE TO public WITH CHECK (true);

-- 4. Automatic Address Sync Function & Trigger between user_logins and users
-- When user updates saved_address in user_logins, automatically mirror it to users table and vice versa!
CREATE OR REPLACE FUNCTION public.sync_user_address_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'user_logins' THEN
    UPDATE public.users 
    SET saved_address = NEW.saved_address,
        phone = COALESCE(NEW.phone, phone),
        name = COALESCE(NEW.name, name),
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.id OR LOWER(email) = LOWER(NEW.email);
  ELSIF TG_TABLE_NAME = 'users' THEN
    UPDATE public.user_logins 
    SET saved_address = NEW.saved_address,
        phone = COALESCE(NEW.phone, phone),
        name = COALESCE(NEW.name, name),
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.id OR LOWER(email) = LOWER(NEW.email);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trigger_sync_user_logins_address ON public.user_logins;
CREATE TRIGGER trigger_sync_user_logins_address
AFTER UPDATE OF saved_address ON public.user_logins
FOR EACH ROW EXECUTE FUNCTION public.sync_user_address_trigger();

DROP TRIGGER IF EXISTS trigger_sync_users_address ON public.users;
CREATE TRIGGER trigger_sync_users_address
AFTER UPDATE OF saved_address ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_address_trigger();

-- 5. Seed / Update Demo Accounts with sample Saved Delivery Address
INSERT INTO public.user_logins (id, name, email, role, phone, saved_address)
VALUES (
  'u4',
  'Rahim Ahmed',
  'customer@gmail.com',
  'customer',
  '01756482001',
  '{
    "fullName": "Rahim Ahmed",
    "phoneNumber": "01756482001",
    "district": "Dhaka",
    "thana": "মিরপুর",
    "addressDetails": "বাড়ি ১২, রোড ৫, সেকশন ১০, মিরপুর, ঢাকা",
    "altPhone": "01812345678",
    "addressType": "Home",
    "country": "বাংলাদেশ"
  }'::jsonb
)
ON CONFLICT (email) DO UPDATE SET
  saved_address = EXCLUDED.saved_address,
  phone = EXCLUDED.phone;

INSERT INTO public.users (id, name, email, role, phone, saved_address)
VALUES (
  'u4',
  'Rahim Ahmed',
  'customer@gmail.com',
  'customer',
  '01756482001',
  '{
    "fullName": "Rahim Ahmed",
    "phoneNumber": "01756482001",
    "district": "Dhaka",
    "thana": "মিরপুর",
    "addressDetails": "বাড়ি ১২, রোড ৫, সেকশন ১০, মিরপুর, ঢাকা",
    "altPhone": "01812345678",
    "addressType": "Home",
    "country": "বাংলাদেশ"
  }'::jsonb
)
ON CONFLICT (email) DO UPDATE SET
  saved_address = EXCLUDED.saved_address,
  phone = EXCLUDED.phone;

-- 6. Verification: Check the saved_address column in user_logins
SELECT id, name, email, phone, saved_address 
FROM public.user_logins;
