-- ========================================================
-- كود إصلاح جداول Supabase - شغّله في SQL Editor
-- ========================================================

-- ① إصلاح جدول المبيعات (sales) - إضافة الأعمدة الناقصة
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS shift_id TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'complete';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS down_payment JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE;

-- ② إصلاح جدول العملاء (customers) - إضافة الأعمدة الناقصة
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'عميل عادي';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'نشط';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS debt NUMERIC DEFAULT 0;

-- ④ إصلاح جدول المنتجات (products) - إضافة حقل الترتيب الناقص
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sort_order NUMERIC;

