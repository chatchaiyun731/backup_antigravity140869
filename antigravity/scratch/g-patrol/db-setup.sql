-- =====================================================================
-- สคริปต์สำหรับการติดตั้งตารางข้อมูลระบบ G-Patrol (Custom Schema: g_patrol)
-- คัดลอกโค้ดนี้ทั้งหมดและนำไปรันในส่วน SQL Editor ของ Supabase Project
-- =====================================================================

-- 1. สร้าง Schema ใหม่ชื่อ g_patrol สำหรับระบบเดินตรวจ เพื่อป้องกันความซ้ำซ้อน
CREATE SCHEMA IF NOT EXISTS g_patrol;

-- 2. ล้างตารางเดิมหากเคยทดสอบระบบไว้ก่อนหน้านี้
DROP TABLE IF EXISTS g_patrol.g_patrol_audit_records CASCADE;
DROP TABLE IF EXISTS g_patrol.g_patrol_checkpoints CASCADE;
DROP TABLE IF EXISTS g_patrol.g_patrol_users CASCADE;

-- 3. สร้างตารางเก็บข้อมูลผู้ใช้งานระบบเดินตรวจ (Username & Password)
CREATE TABLE g_patrol.g_patrol_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'officer', 'auditor', 'guard', 'guard2', 'court marshal')) DEFAULT 'auditor',
    avatar_url TEXT,                            -- ลิงก์รูปถ่ายประจำตัวผู้ใช้งาน
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. ตาราง g_patrol_checkpoints (จุดเช็คอิน/จุดตรวจของระบบ G-Patrol)
CREATE TABLE g_patrol.g_patrol_checkpoints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,                         -- ชื่อจุดเช็คอิน/จุดตรวจ
    asset_number TEXT UNIQUE NOT NULL,          -- รหัสจุดเช็คอิน/เลข QR Code
    location TEXT NOT NULL,                     -- สถานที่/บริเวณจุดตรวจ
    image_url TEXT,                             -- URL รูปภาพประจำจุดตรวจ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    created_by UUID REFERENCES g_patrol.g_patrol_users(id) ON DELETE SET NULL
);

-- 5. ตาราง Audit Records (บันทึกประวัติการสแกนเช็คอินจุดตรวจของระบบ G-Patrol)
CREATE TABLE g_patrol.g_patrol_audit_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID REFERENCES g_patrol.g_patrol_checkpoints(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('normal', 'damaged', 'lost', 'pending')) DEFAULT 'pending',
    notes TEXT,                                  -- หมายเหตุหรือคำอธิบายจากการตรวจ
    fiscal_year INTEGER NOT NULL,                -- ปีงบประมาณ (เช่น 2569)
    audited_by UUID REFERENCES g_patrol.g_patrol_users(id) ON DELETE SET NULL,
    audited_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    -- กำหนดให้แต่ละจุดเช็คอินเดินตรวจได้ปีละ 1 ครั้งต่อปีงบประมาณเท่านั้น
    CONSTRAINT unique_g_patrol_asset_fiscal_year UNIQUE (asset_id, fiscal_year)
);

-- 6. ฟังก์ชันและทริกเกอร์สำหรับอัปเดต updated_at ในตารางจุดตรวจอัตโนมัติ
CREATE OR REPLACE FUNCTION g_patrol.update_g_patrol_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_g_patrol_checkpoints_modtime
    BEFORE UPDATE ON g_patrol.g_patrol_checkpoints
    FOR EACH ROW
    EXECUTE FUNCTION g_patrol.update_g_patrol_modified_column();

-- 7. ทริกเกอร์แต่งตั้งให้ผู้ใช้งานคนแรกที่สมัครเข้ามาในตารางเดินตรวจเป็น 'admin' โดยอัตโนมัติ
CREATE OR REPLACE FUNCTION g_patrol.handle_new_gpatrol_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM g_patrol.g_patrol_users;
    IF user_count = 0 THEN
        NEW.role := 'admin'; -- บัญชีแรกสุดให้สิทธิ์เป็น Admin
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_gpatrol_user_created
    BEFORE INSERT ON g_patrol.g_patrol_users
    FOR EACH ROW EXECUTE FUNCTION g_patrol.handle_new_gpatrol_user();

-- 8. ปิดระบบความปลอดภัย RLS ของตารางระบบเดินตรวจชั่วคราวเพื่ออำนวยความสะดวกในการเชื่อมโยง
ALTER TABLE g_patrol.g_patrol_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE g_patrol.g_patrol_checkpoints DISABLE ROW LEVEL SECURITY;
ALTER TABLE g_patrol.g_patrol_audit_records DISABLE ROW LEVEL SECURITY;

-- 9. กำหนดสิทธิ์ให้สิทธิ์การเข้าถึงผ่าน API แก่ Schema ใหม่นี้
GRANT USAGE ON SCHEMA g_patrol TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA g_patrol TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA g_patrol TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA g_patrol TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA g_patrol GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA g_patrol GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA g_patrol GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
