-- =========================================================================
-- BAZAARPULSE - Admin Settings & Hero Banner Supabase Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- =========================================================================

-- 1. Create admin_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    global_commission_rate NUMERIC DEFAULT 10,
    platform_name VARCHAR(255) DEFAULT 'BazaarPulse',
    hero_banner_title VARCHAR(255),
    hero_banner_subtitle TEXT,
    campaign_banner JSONB DEFAULT '{}'::jsonb,
    banners JSONB DEFAULT '[]'::jsonb,
    cart_banner JSONB DEFAULT '{"isActive": true, "bannerText": "৯৯৯ টাকার ইসলামিক বই কিনলেই পাচ্ছেন ফ্রি ডেলিভারি", "termsText": "শর্ত প্রযোজ্য"}'::jsonb,
    maintenance_mode BOOLEAN DEFAULT false,
    CONSTRAINT single_row CHECK (id = 1)
);

-- 2. Ensure all columns exist (in case table was created previously without them)
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS global_commission_rate NUMERIC DEFAULT 10;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS platform_name VARCHAR(255) DEFAULT 'BazaarPulse';
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS hero_banner_title VARCHAR(255);
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS hero_banner_subtitle TEXT;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS campaign_banner JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS banners JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS cart_banner JSONB DEFAULT '{"isActive": true, "bannerText": "৯৯৯ টাকার ইসলামিক বই কিনলেই পাচ্ছেন ফ্রি ডেলিভারি", "termsText": "শর্ত প্রযোজ্য"}'::jsonb;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT false;

-- 3. Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Allow public read access on admin_settings" ON public.admin_settings;
CREATE POLICY "Allow public read access on admin_settings"
ON public.admin_settings FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow update on admin_settings" ON public.admin_settings;
CREATE POLICY "Allow update on admin_settings"
ON public.admin_settings FOR ALL
TO public
USING (true);

-- 5. Insert default row if empty
INSERT INTO public.admin_settings (id, platform_name)
VALUES (1, 'BazaarPulse')
ON CONFLICT (id) DO NOTHING;
