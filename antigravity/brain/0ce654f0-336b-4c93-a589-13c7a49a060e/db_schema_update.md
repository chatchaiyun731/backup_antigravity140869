# SQL สำหรับปรับปรุงฐานข้อมูล G-Patrol (เพิ่มคอลัมน์ Zone)

กรุณาคัดลอกคำสั่ง SQL ด้านล่างนี้ ไปรันใน **SQL Editor** บน **Supabase Console** ของคุณเพื่อเพิ่มคอลัมน์ `zone` และจัดหมวดหมู่ข้อมูลจุดตรวจที่มีอยู่เดิมโดยอัตโนมัติ:

```sql
-- 1. เพิ่มคอลัมน์ zone ในตาราง g_patrol_checkpoints
ALTER TABLE g_patrol.g_patrol_checkpoints ADD COLUMN IF NOT EXISTS zone TEXT;

-- 2. อัปเดตข้อมูลจุดตรวจเดิมให้ระบุ zone เป็น 'บริเวณศาล'
UPDATE g_patrol.g_patrol_checkpoints 
SET zone = 'บริเวณศาล' 
WHERE location LIKE '%บริเวณศาล%' 
   OR name LIKE '%บริเวณศาล%' 
   OR name LIKE '%ศาล%'
   OR location LIKE '%ศาล%'
   OR asset_number IN ('CP-01', 'CP-02', 'CP-03', 'CP-04', 'CP-05', 'CP-06', 'CP-07', 'CP-08', 'CP-09', 'CP-10', 'CP-11', 'CP-12', 'CP-13', 'CP-14', 'CP-15', 'CP-16', 'CP-17', 'CP-18', 'CP-19', 'CP-20', 'CP-21');

-- 3. อัปเดตข้อมูลจุดตรวจเดิมให้ระบุ zone เป็น 'บ้านพัก'
UPDATE g_patrol.g_patrol_checkpoints 
SET zone = 'บ้านพัก' 
WHERE location LIKE '%บ้านพัก%' 
   OR name LIKE '%บ้านพัก%'
   OR asset_number IN ('CP-22', 'CP-23', 'CP-24', 'CP-25', 'CP-26', 'CP-27');

-- 4. ตั้งค่าเริ่มต้นสำหรับจุดที่ไม่มีข้อมูลเข้าพวก ให้เป็น 'อื่นๆ'
UPDATE g_patrol.g_patrol_checkpoints 
SET zone = 'อื่นๆ' 
WHERE zone IS NULL;
```
