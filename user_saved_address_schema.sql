-- ==============================================================================
-- BAZAARPULSE: FINAL FIX FOR USER LOGIN & SAVED DELIVERY ADDRESS
-- Resolves: ERROR 42P01: relation "public.users" does not exist
-- Ensures: 'saved_address' column exists in BOTH 'user_logins' and 'users'
-- Logic: Automatic bi-directional sync between login and profile tables.
-- ==============================================================================

-- 1. Create 'users' table FIRST (to prevent relation does not exist errors)
CREATE TABLE IF NOT EXISTS public.users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'customer',
  avatar TEXT,
  password TEXT,
  status VARCHAR(50) DEFAULT 'active',
  saved_address JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create 'user_logins' table (The table you see in your reference)
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

-- 3. Safety Check: Force add 'saved_address' and 'phone' if they are missing
DO $$ 
BEGIN 
    -- For user_logins
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_logins' AND column_name='saved_address') THEN
        ALTER TABLE public.user_logins ADD COLUMN saved_address JSONB DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_logins' AND column_name='phone') THEN
        ALTER TABLE public.user_logins ADD COLUMN phone VARCHAR(50);
    END IF;

    -- For users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='saved_address') THEN
        ALTER TABLE public.users ADD COLUMN saved_address JSONB DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
        ALTER TABLE public.users ADD COLUMN phone VARCHAR(50);
    END IF;
END $$;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.user_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Clear and Recreate Policies (Ensures full access for Bazar Plus)
DROP POLICY IF EXISTS "Allow public read" ON public.user_logins;
DROP POLICY IF EXISTS "Allow public insert" ON public.user_logins;
DROP POLICY IF EXISTS "Allow public update" ON public.user_logins;
DROP POLICY IF EXISTS "Allow public delete" ON public.user_logins;

CREATE POLICY "Allow public read" ON public.user_logins FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert" ON public.user_logins FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.user_logins FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete" ON public.user_logins FOR DELETE TO public USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.users;
DROP POLICY IF EXISTS "Allow public insert" ON public.users;
DROP POLICY IF EXISTS "Allow public update" ON public.users;
DROP POLICY IF EXISTS "Allow public delete" ON public.users;

CREATE POLICY "Allow public read" ON public.users FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert" ON public.users FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.users FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete" ON public.users FOR DELETE TO public USING (true);

-- 6. Bi-directional Sync Function
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

-- 7. Apply Sync Triggers
DROP TRIGGER IF EXISTS trigger_sync_user_logins_address ON public.user_logins;
CREATE TRIGGER trigger_sync_user_logins_address
AFTER UPDATE OF saved_address, phone, name ON public.user_logins
FOR EACH ROW EXECUTE FUNCTION public.sync_user_address_trigger();

DROP TRIGGER IF EXISTS trigger_sync_users_address ON public.users;
CREATE TRIGGER trigger_sync_users_address
AFTER UPDATE OF saved_address, phone, name ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_address_trigger();

-- 8. [REMOVED DEMO SEEDING AS PER USER REQUEST]
-- 9. Final Verification Query
SELECT id, name, email, phone, saved_address FROM public.user_logins;
