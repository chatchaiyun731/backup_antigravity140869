-- =====================================================================
-- สคริปต์สำหรับการติดตั้งฐานข้อมูลระบบ AssetFlow ใน Supabase (Username/Password)
-- คัดลอกโค้ดนี้ทั้งหมดและนำไปรันในส่วน SQL Editor ของ Supabase Project
-- =====================================================================

-- 1. สร้าง Schema ใหม่ชื่อ asset_audit สำหรับระบบตรวจสอบพัสดุ
CREATE SCHEMA IF NOT EXISTS asset_audit;

-- 2. ล้างตารางเดิมหากเคยทดสอบระบบไว้ก่อนหน้านี้
DROP TABLE IF EXISTS asset_audit.audit_records CASCADE;
DROP TABLE IF EXISTS asset_audit.assets CASCADE;
DROP TABLE IF EXISTS asset_audit.users CASCADE;

-- 3. สร้างตารางเก็บข้อมูลผู้ใช้งานระบบพัสดุ (Username & Password)
CREATE TABLE asset_audit.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'officer', 'auditor')) DEFAULT 'auditor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. ตาราง Assets (ข้อมูลรายละเอียดครุภัณฑ์ทะเบียนคุมทรัพย์สินแบบเต็มรูปแบบ)
CREATE TABLE asset_audit.assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_number TEXT UNIQUE NOT NULL, -- รหัส / เลขครุภัณฑ์
    name TEXT NOT NULL, -- ชื่อรายการพัสดุ
    location TEXT NOT NULL, -- สถานที่ตั้ง / หน่วยงานผู้รับผิดชอบ
    government_sector TEXT, -- ส่วนราชการ
    department TEXT, -- หน่วยงาน
    asset_type TEXT, -- ประเภท
    characteristics TEXT, -- ลักษณะ/คุณสมบัติ
    model_brand TEXT, -- รุ่น/แบบ (ยี่ห้อ)
    serial_number TEXT, -- หมายเลขเครื่อง
    vendor_name TEXT, -- ชื่อผู้ขาย/ผู้รับจ้าง/ผู้บริจาค
    vendor_address TEXT, -- ที่อยู่ผู้ขาย
    vendor_phone TEXT, -- โทร.
    funding_type TEXT, -- ประเภทเงิน
    acquisition_method TEXT, -- วิธีการได้มา
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    created_by UUID REFERENCES asset_audit.users(id) ON DELETE SET NULL
);

-- 5. ตาราง Audit Records (บันทึกการตรวจสอบพัสดุประจำปี)
CREATE TABLE asset_audit.audit_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID REFERENCES asset_audit.assets(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('normal', 'damaged', 'lost', 'pending')) DEFAULT 'pending',
    notes TEXT,
    fiscal_year INTEGER NOT NULL,
    audited_by UUID REFERENCES asset_audit.users(id) ON DELETE SET NULL,
    audited_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    -- กำหนดให้แต่ละครุภัณฑ์ตรวจสอบได้ปีละ 1 ครั้งต่อปีงบประมาณเท่านั้น
    CONSTRAINT unique_asset_fiscal_year UNIQUE (asset_id, fiscal_year)
);

-- 5.1 ตาราง Asset Transactions (ตารางประวัติบัญชีค่าเสื่อมราคาและรายการความเคลื่อนไหว)
CREATE TABLE asset_audit.asset_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID REFERENCES asset_audit.assets(id) ON DELETE CASCADE NOT NULL,
    transaction_date TEXT, -- วันเดือนปี
    document_no TEXT, -- ที่เอกสาร
    description TEXT, -- รายการ
    quantity INTEGER, -- จำนวนหน่วย
    unit_price NUMERIC, -- ราคาต่อหน่วย/ชุด/กลุ่ม
    total_value NUMERIC, -- มูลค่ารวม
    useful_life INTEGER, -- อายุใช้งาน
    depreciation_rate NUMERIC, -- อัตราค่าเสื่อมราคา
    annual_depreciation NUMERIC, -- ค่าเสื่อมราคาประจำปี
    accumulated_depreciation NUMERIC, -- ค่าเสื่อมราคาสะสม
    net_value NUMERIC, -- มูลค่าสุทธิ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 6. ฟังก์ชันและทริกเกอร์สำหรับอัปเดต updated_at ในตารางครุภัณฑ์อัตโนมัติ
CREATE OR REPLACE FUNCTION asset_audit.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assets_modtime
    BEFORE UPDATE ON asset_audit.assets
    FOR EACH ROW
    EXECUTE FUNCTION asset_audit.update_modified_column();

-- 7. ทริกเกอร์แต่งตั้งให้ผู้ใช้งานคนแรกที่สมัครเข้ามาในตารางพัสดุเป็น 'admin' โดยอัตโนมัติ
CREATE OR REPLACE FUNCTION asset_audit.handle_new_asset_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM asset_audit.users;
    IF user_count = 0 THEN
        NEW.role := 'admin'; -- บัญชีแรกสุดให้สิทธิ์เป็น Admin
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_asset_user_created
    BEFORE INSERT ON asset_audit.users
    FOR EACH ROW EXECUTE FUNCTION asset_audit.handle_new_asset_user();

-- 8. ปิดระบบความปลอดภัย RLS ของตารางระบบพัสดุเพื่อความสะดวกในการใช้งาน
ALTER TABLE asset_audit.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE asset_audit.assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE asset_audit.audit_records DISABLE ROW LEVEL SECURITY;

-- 9. กำหนดสิทธิ์ให้สิทธิ์การเข้าถึงผ่าน API แก่ Schema นี้
GRANT USAGE ON SCHEMA asset_audit TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA asset_audit TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA asset_audit TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA asset_audit TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA asset_audit GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA asset_audit GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA asset_audit GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
