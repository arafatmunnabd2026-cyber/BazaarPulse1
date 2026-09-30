-- ==============================================================================
-- BAZAARPULSE SUPABASE SQL SCHEMA & AUTO-CONNECT SCRIPT
-- Strictly non-destructive: Builds on top of existing 'products', 'users', 'cart', 'orders' tables.
-- Run this in your Supabase Project -> SQL Editor to enable instant automatic product saves.
-- ==============================================================================

-- 1. Ensure 'products' table exists with all fields required by AdminDashboard.tsx
CREATE TABLE IF NOT EXISTS public.products (
  id VARCHAR(255) PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  current_price NUMERIC DEFAULT 0,
  discount_price NUMERIC,
  stock INTEGER DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  category_id TEXT,
  category_name TEXT,
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  gallery_images JSONB DEFAULT '[]'::jsonb,
  sizes JSONB DEFAULT '[]'::jsonb,
  colors JSONB DEFAULT '[]'::jsonb,
  description TEXT DEFAULT '',
  vendor_id VARCHAR(255) DEFAULT 'v1',
  vendor_name VARCHAR(255) DEFAULT 'Platform Administrator',
  rating NUMERIC DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  total_sold INTEGER DEFAULT 0,
  is_flash_sale BOOLEAN DEFAULT false,
  flash_sale_ends VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Non-destructively ensure all columns exist if the table was already created
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS id VARCHAR(255);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS current_price NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_price NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS colors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vendor_id VARCHAR(255) DEFAULT 'v1';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255) DEFAULT 'Platform Administrator';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS total_sold INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_flash_sale BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS flash_sale_ends VARCHAR(255);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 3. Row Level Security (RLS) Configuration for 'products' table
-- Enables AdminDashboard.tsx to INSERT, SELECT, UPDATE, and DELETE products seamlessly
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on products" ON public.products;
DROP POLICY IF EXISTS "Allow insert on products" ON public.products;
DROP POLICY IF EXISTS "Allow update on products" ON public.products;
DROP POLICY IF EXISTS "Allow delete on products" ON public.products;

-- Allow everyone (customers & visitors) to view all products
CREATE POLICY "Allow public read access on products"
ON public.products FOR SELECT
TO public
USING (true);

-- Allow admin dashboard to insert products
CREATE POLICY "Allow insert on products"
ON public.products FOR INSERT
TO public
WITH CHECK (true);

-- Allow admin dashboard to update products
CREATE POLICY "Allow update on products"
ON public.products FOR UPDATE
TO public
USING (true);

-- Allow admin dashboard to delete products
CREATE POLICY "Allow delete on products"
ON public.products FOR DELETE
TO public
USING (true);

-- 4. Enable Supabase Realtime for instant live updates across storefront
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Publication supabase_realtime already exists or not supported: %', SQLERRM;
END $$;

-- 5. Supabase Storage Bucket setup for Device Photo Uploads ('product-images')
-- Allows uploading up to 8 device gallery photos directly from AdminDashboard.tsx
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public Read Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Product Images" ON storage.objects;

CREATE POLICY "Public Read Product Images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

CREATE POLICY "Public Upload Product Images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Public Update Product Images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'product-images');

CREATE POLICY "Public Delete Product Images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'product-images');

-- 6. Verify table columns and return confirmation
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Ensure 'users' table exists with 'saved_address' (JSONB) and full permissions
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ensure columns exist if table was already present
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS saved_address JSONB DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'customer';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Enable Row Level Security (RLS) & Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on users" ON public.users;
DROP POLICY IF EXISTS "Allow public insert on users" ON public.users;
DROP POLICY IF EXISTS "Allow public update on users" ON public.users;

CREATE POLICY "Allow public read access on users" ON public.users FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on users" ON public.users FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on users" ON public.users FOR UPDATE TO public USING (true);

-- 8. Add 'saved_address' and 'phone' to 'user_logins' table (as shown in Supabase Table Editor)
CREATE TABLE IF NOT EXISTS public.user_logins (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  avatar TEXT,
  role VARCHAR(50) DEFAULT 'customer',
  phone VARCHAR(50),
  saved_address JSONB DEFAULT NULL,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_logins ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.user_logins ADD COLUMN IF NOT EXISTS saved_address JSONB DEFAULT NULL;

-- Enable Row Level Security (RLS) & Policies for user_logins
ALTER TABLE public.user_logins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on user_logins" ON public.user_logins;
DROP POLICY IF EXISTS "Allow public insert on user_logins" ON public.user_logins;
DROP POLICY IF EXISTS "Allow public update on user_logins" ON public.user_logins;

CREATE POLICY "Allow public read access on user_logins" ON public.user_logins FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on user_logins" ON public.user_logins FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on user_logins" ON public.user_logins FOR UPDATE TO public USING (true);



