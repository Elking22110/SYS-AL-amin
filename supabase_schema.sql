-- ========================================================
-- SUPABASE DATABASE SCHEMA FOR AL-AMEIN STORE POS SYSTEM
-- ========================================================
-- Copy and run this script in your Supabase SQL Editor to prepare the database.

-- Disable Row Level Security (RLS) for simplicity of local clients sync,
-- or configure policies to allow anonymous writes if not using auth headers.
-- All tables below will have RLS disabled for smooth offline/online sync.

-- 1. categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;

-- 2. products Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC DEFAULT 0,
    cost NUMERIC DEFAULT 0,
    stock INTEGER DEFAULT 0,
    barcode TEXT,
    main_category_id TEXT,
    sub_category_id TEXT,
    image_path TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- 3. customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    type TEXT DEFAULT 'عميل عادي',
    status TEXT DEFAULT 'نشط',
    debt NUMERIC DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    last_visit TIMESTAMP WITH TIME ZONE,
    join_date TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;

-- 4. sales Table
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    date TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,
    shift_id TEXT,
    customer_id TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    payment_status TEXT DEFAULT 'complete',
    down_payment JSONB DEFAULT '{}'::jsonb,
    customer JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;

-- 5. shifts Table
CREATE TABLE IF NOT EXISTS public.shifts (
    id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'active',
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    opening_amount NUMERIC DEFAULT 0,
    expected_amount NUMERIC DEFAULT 0,
    closing_amount NUMERIC DEFAULT 0,
    cashier_username TEXT,
    sales_details JSONB DEFAULT '{}'::jsonb,
    returns_data JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.shifts DISABLE ROW LEVEL SECURITY;

-- 6. returns Table
CREATE TABLE IF NOT EXISTS public.returns (
    id TEXT PRIMARY KEY,
    date TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,
    ref_invoice_id TEXT,
    shift_id TEXT,
    customer JSONB DEFAULT '{}'::jsonb,
    item JSONB DEFAULT '{}'::jsonb,
    amount NUMERIC DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.returns DISABLE ROW LEVEL SECURITY;

-- 7. users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'cashier',
    password TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;


-- ========================================================
-- TABLES UTILIZING JSONB VALUE DUMP (LOCALSTORAGE STORES)
-- ========================================================

-- 8. suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;

-- 9. supplier_supplies Table
CREATE TABLE IF NOT EXISTS public.supplier_supplies (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.supplier_supplies DISABLE ROW LEVEL SECURITY;

-- 10. supplier_payments Table
CREATE TABLE IF NOT EXISTS public.supplier_payments (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.supplier_payments DISABLE ROW LEVEL SECURITY;

-- 11. expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;

-- 12. store_info Table (maps to storeInfo in localCache)
CREATE TABLE IF NOT EXISTS public.store_info (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.store_info DISABLE ROW LEVEL SECURITY;

-- 13. pos_settings Table (maps to pos-settings in localCache)
CREATE TABLE IF NOT EXISTS public.pos_settings (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.pos_settings DISABLE ROW LEVEL SECURITY;

-- 14. system_settings Table (maps to system-settings in localCache)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;


-- ========================================================
-- AUTO-UPDATE TIMESTAMPS FUNCTION
-- ========================================================

-- Trigger to automatically keep updated_at field updated if row is changed inside Supabase
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all core tables
DROP TRIGGER IF EXISTS update_categories_modtime ON public.categories;
CREATE TRIGGER update_categories_modtime BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_modtime ON public.products;
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_modtime ON public.customers;
CREATE TRIGGER update_customers_modtime BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_modtime ON public.sales;
CREATE TRIGGER update_sales_modtime BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shifts_modtime ON public.shifts;
CREATE TRIGGER update_shifts_modtime BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_returns_modtime ON public.returns;
CREATE TRIGGER update_returns_modtime BEFORE UPDATE ON public.returns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_modtime ON public.users;
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to JSONB localstorage tables
DROP TRIGGER IF EXISTS update_suppliers_modtime ON public.suppliers;
CREATE TRIGGER update_suppliers_modtime BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_supplier_supplies_modtime ON public.supplier_supplies;
CREATE TRIGGER update_supplier_supplies_modtime BEFORE UPDATE ON public.supplier_supplies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_supplier_payments_modtime ON public.supplier_payments;
CREATE TRIGGER update_supplier_payments_modtime BEFORE UPDATE ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_modtime ON public.expenses;
CREATE TRIGGER update_expenses_modtime BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_info_modtime ON public.store_info;
CREATE TRIGGER update_store_info_modtime BEFORE UPDATE ON public.store_info FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pos_settings_modtime ON public.pos_settings;
CREATE TRIGGER update_pos_settings_modtime BEFORE UPDATE ON public.pos_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_modtime ON public.system_settings;
CREATE TRIGGER update_system_settings_modtime BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- ADDITIONAL SYSTEM TABLES (SHIFT STATE, WASTE, IMAGES)
-- ========================================================

-- 15. active_shift Table (maps to activeShift in localCache)
CREATE TABLE IF NOT EXISTS public.active_shift (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.active_shift DISABLE ROW LEVEL SECURITY;

-- 16. manufacturing_waste Table (maps to manufacturing_waste in localCache)
CREATE TABLE IF NOT EXISTS public.manufacturing_waste (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.manufacturing_waste DISABLE ROW LEVEL SECURITY;

-- 17. product_images Table (maps to productImages in localCache)
CREATE TABLE IF NOT EXISTS public.product_images (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.product_images DISABLE ROW LEVEL SECURITY;

-- Apply updated_at trigger to new tables
DROP TRIGGER IF EXISTS update_active_shift_modtime ON public.active_shift;
CREATE TRIGGER update_active_shift_modtime BEFORE UPDATE ON public.active_shift FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_manufacturing_waste_modtime ON public.manufacturing_waste;
CREATE TRIGGER update_manufacturing_waste_modtime BEFORE UPDATE ON public.manufacturing_waste FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_images_modtime ON public.product_images;
CREATE TRIGGER update_product_images_modtime BEFORE UPDATE ON public.product_images FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
