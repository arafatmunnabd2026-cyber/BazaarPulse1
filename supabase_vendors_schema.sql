-- =========================================================================
-- BazaarPulse - Supabase SQL Schema for Seller/Vendor Management & Approvals
-- Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- =========================================================================

-- 1. Create Vendors Table with NID & Mobile Banking Payout Columns
CREATE TABLE IF NOT EXISTS public.vendors (
    id TEXT PRIMARY KEY,
    store_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    nid_number TEXT,
    nid_front_image TEXT,
    nid_back_image TEXT,
    payment_method TEXT DEFAULT 'bkash',
    payment_number TEXT,
    account_type TEXT DEFAULT 'Personal',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
    commission_rate NUMERIC DEFAULT 10.0,
    balance NUMERIC DEFAULT 0.0,
    total_sales NUMERIC DEFAULT 0.0,
    rating NUMERIC DEFAULT 5.0,
    logo TEXT DEFAULT 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=150',
    banner TEXT DEFAULT 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for Fast Queries (Status, Email, Phone)
CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_email ON public.vendors(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_vendors_phone ON public.vendors(phone);

-- 3. Row Level Security (RLS) Policies
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Allow public to register a new vendor (INSERT)
DROP POLICY IF EXISTS "Allow public vendor registration" ON public.vendors;
CREATE POLICY "Allow public vendor registration" 
ON public.vendors 
FOR INSERT 
WITH CHECK (true);

-- Allow public/admin to select vendor info (SELECT)
DROP POLICY IF EXISTS "Allow public select vendors" ON public.vendors;
CREATE POLICY "Allow public select vendors" 
ON public.vendors 
FOR SELECT 
USING (true);

-- Allow updates to vendors (UPDATE)
DROP POLICY IF EXISTS "Allow updates to vendors" ON public.vendors;
CREATE POLICY "Allow updates to vendors" 
ON public.vendors 
FOR UPDATE 
USING (true);

-- Allow deletes to vendors (DELETE)
DROP POLICY IF EXISTS "Allow deletes to vendors" ON public.vendors;
CREATE POLICY "Allow deletes to vendors" 
ON public.vendors 
FOR DELETE 
USING (true);

-- 4. Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vendors_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_vendors_timestamp ON public.vendors;
CREATE TRIGGER trg_update_vendors_timestamp
BEFORE UPDATE ON public.vendors
FOR EACH ROW
EXECUTE FUNCTION update_vendors_timestamp();
