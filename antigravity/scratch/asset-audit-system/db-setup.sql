-- =====================================================================
-- สคริปต์สำหรับการติดตั้งฐานข้อมูลระบบ AssetFlow ใน Supabase
-- คัดลอกโค้ดนี้ทั้งหมดและนำไปรันในส่วน SQL Editor ของ Supabase Project
-- =====================================================================

-- 1. ล้างตารางเดิมหากเคยทดสอบระบบไว้ก่อนหน้านี้ (เรียงตามการอ้างอิง foreign keys)
DROP TABLE IF EXISTS public.audit_records CASCADE;
DROP TABLE IF EXISTS public.assets CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. สร้างตาราง Profiles เพื่อเก็บข้อมูลชื่อและบทบาทของผู้ใช้ (Roles)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'officer', 'auditor', 'guard', 'guard2')) DEFAULT 'auditor',
    display_name TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. ตาราง Assets (ข้อมูลรายการพัสดุ/ครุภัณฑ์)
CREATE TABLE public.assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    asset_number TEXT UNIQUE NOT NULL,
    location TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 4. ตาราง Audit Records (บันทึกการตรวจสอบพัสดุประจำปี)
CREATE TABLE public.audit_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('normal', 'damaged', 'lost', 'pending')) DEFAULT 'pending',
    notes TEXT,
    fiscal_year INTEGER NOT NULL,
    audited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    audited_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    -- กำหนดให้แต่ละครุภัณฑ์ตรวจสอบได้ปีละ 1 ครั้งต่อปีงบประมาณเท่านั้น
    CONSTRAINT unique_asset_fiscal_year UNIQUE (asset_id, fiscal_year)
);

-- 5. ฟังก์ชันเปิดใช้งานอัปเดต updated_at อัตโนมัติ
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assets_modtime
    BEFORE UPDATE ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- 6. ทริกเกอร์สร้างโปรไฟล์อัตโนมัติหลังลงทะเบียนผู้ใช้งานผ่าน Supabase Auth
-- หมายเหตุ: บัญชีผู้ใช้คนแรกที่สมัครใช้งานระบบนี้จะได้รับบทบาทเป็น 'admin' ส่วนคนต่อๆ ไปจะเป็น 'auditor'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count INTEGER;
    default_role TEXT := 'auditor';
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.profiles;
    IF user_count = 0 THEN
        default_role := 'admin'; -- บัญชีแรกสุดให้เป็น Admin
    END IF;

    INSERT INTO public.profiles (id, email, role, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        default_role,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- 7. ระบบความปลอดภัยระดับแถวข้อมูล Row Level Security (RLS)
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_records ENABLE ROW LEVEL SECURITY;

-- นโยบายสำหรับตาราง Profiles
CREATE POLICY "อนุญาตให้ทุกคนที่ล็อกอินแล้วดูโปรไฟล์ได้" 
    ON public.profiles FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "อนุญาตให้เจ้าของโปรไฟล์แก้ไขชื่อตนเองได้" 
    ON public.profiles FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "อนุญาตให้ Admin จัดการโปรไฟล์ของทุกคนได้" 
    ON public.profiles FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- นโยบายสำหรับตาราง Assets
CREATE POLICY "อนุญาตให้ทุกคนที่ล็อกอินแล้วดูพัสดุได้" 
    ON public.assets FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "อนุญาตให้ Admin และ Officer จัดการข้อมูลพัสดุได้" 
    ON public.assets FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'officer')
        )
    );

-- นโยบายสำหรับตาราง Audit Records
CREATE POLICY "อนุญาตให้ทุกคนที่ล็อกอินแล้วดูบันทึกการตรวจสอบได้" 
    ON public.audit_records FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "อนุญาตให้ทุกคนที่ล็อกอินแล้วลงบันทึก/อัปเดตการตรวจสอบได้" 
    ON public.audit_records FOR ALL 
    TO authenticated 
    USING (true);

-- =====================================================================
-- 8. วิธีการสร้างและตั้งค่า Storage Bucket (ภาพครุภัณฑ์)
-- ในหน้าเว็บ Supabase Console ให้สร้าง Bucket ชื่อ "asset-images" แบบ Public
-- แล้วกำหนดนโยบาย (Policies) ของ Storage ดังนี้:
-- นโยบาย SELECT: "Allow public access for reading files"
-- นโยบาย INSERT/UPDATE: "Allow authenticated users to upload files"
-- =====================================================================
