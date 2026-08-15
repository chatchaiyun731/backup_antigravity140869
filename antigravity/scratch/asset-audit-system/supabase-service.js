/* =====================================================================
   Supabase Service Controller for AssetFlow
   Handles Auth, Profiles, Asset CRUD, Auditing and Image Uploads
   ===================================================================== */

class SupabaseService {
    constructor() {
        this.client = null;
        this.init();
    }

    // เริ่มต้นเชื่อมต่อกับ Supabase
    init() {
        const url = localStorage.getItem('supabase_url');
        const key = localStorage.getItem('supabase_key');
        if (url && key) {
            try {
                // โหลด supabase จาก CDN (ซึ่งประกาศไว้ใน window.supabase)
                if (window.supabase) {
                    this.client = window.supabase.createClient(url, key);
                    return true;
                }
            } catch (err) {
                console.error('Error creating Supabase client:', err);
            }
        }
        this.client = null;
        return false;
    }

    // ตรวจสอบว่าตั้งค่า API Key แล้วหรือยัง
    isConfigured() {
        return this.client !== null;
    }

    // บันทึกการเชื่อมต่อใหม่และรีเซ็ตไคลเอนต์
    saveConfig(url, key) {
        localStorage.setItem('supabase_url', url.trim());
        localStorage.setItem('supabase_key', key.trim());
        return this.init();
    }

    // เคลียร์การตั้งค่า
    clearConfig() {
        localStorage.removeItem('supabase_url');
        localStorage.removeItem('supabase_key');
        this.client = null;
    }

    // ==========================================
    // AUTHENTICATION & PROFILES
    // ==========================================

    async signUp(email, password, displayName, role) {
        if (!this.client) throw new Error('กรุณาตั้งค่าการเชื่อมต่อฐานข้อมูล Supabase ก่อน');
        
        // ลงทะเบียนผู้ใช้งานผ่าน Supabase Auth พร้อมบันทึก metadata ชื่อแสดงผล
        const { data, error } = await this.client.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName
                }
            }
        });

        if (error) throw error;
        
        // หากต้องการอัปเดตบทบาททันที (ในกรณีที่ทริกเกอร์หน่วงเวลาหรือไม่ทำงาน)
        // เนื่องจากสิทธิ์ RLS อาจติดขัดในการแก้ไขโปรไฟล์ของผู้ใช้ทันทีหลังลงทะเบียน 
        // เราสามารถอัปเดตบทบาทผ่านโปรไฟล์หากสิทธิ์อนุญาต
        try {
            if (data.user) {
                const { error: profileError } = await this.client
                    .from('profiles')
                    .update({ role: role, display_name: displayName })
                    .eq('id', data.user.id);
                if (profileError) console.warn('Profile sync warning:', profileError.message);
            }
        } catch (e) {
            console.warn('Profile sync exception:', e);
        }

        return data;
    }

    async signIn(email, password) {
        if (!this.client) throw new Error('กรุณาตั้งค่าการเชื่อมต่อฐานข้อมูล Supabase ก่อน');
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    }

    async signOut() {
        if (this.client) {
            await this.client.auth.signOut();
        }
    }

    async getSession() {
        if (!this.client) return null;
        const { data } = await this.client.auth.getSession();
        return data.session;
    }

    // ดึงโปรไฟล์และบทบาทของผู้ใช้ปัจจุบัน
    async getCurrentUserProfile() {
        if (!this.client) return null;
        const session = await this.getSession();
        if (!session) return null;

        const { data, error } = await this.client
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) {
            console.error('Error fetching user profile:', error);
            // สร้าง Profile ชั่วคราวให้สิทธิ์เป็นผู้ตรวจสอบหากไม่มีข้อมูลตาราง
            return {
                id: session.user.id,
                email: session.user.email,
                role: 'auditor',
                display_name: session.user.email.split('@')[0]
            };
        }
        return data;
    }

    // ดึงโปรไฟล์ทั้งหมด (สำหรับหน้าจัดการผู้ใช้ของแอดมิน - อนาคต)
    async getAllProfiles() {
        if (!this.client) return [];
        const { data, error } = await this.client
            .from('profiles')
            .select('*')
            .order('email');
        if (error) throw error;
        return data;
    }

    // อัปเดตบทบาทผู้ใช้งาน (เฉพาะ Admin เท่านั้น)
    async updateProfileRole(userId, newRole) {
        if (!this.client) return;
        const { data, error } = await this.client
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);
        if (error) throw error;
        return data;
    }

    // ==========================================
    // ASSET CRUD OPERATIONS
    // ==========================================

    async fetchAssets(searchQuery = '', locationFilter = 'all') {
        if (!this.client) return [];
        
        let query = this.client
            .from('assets')
            .select('*, profiles(display_name)');
            
        if (locationFilter !== 'all') {
            query = query.eq('location', locationFilter);
        }
        
        if (searchQuery.trim() !== '') {
            // ค้นหาทั้งเลขครุภัณฑ์และชื่อรายการพัสดุ
            query = query.or(`name.ilike.%${searchQuery}%,asset_number.ilike.%${searchQuery}%`);
        }
        
        const { data, error } = await query.order('asset_number');
        if (error) throw error;
        return data;
    }

    async fetchAssetByNumber(assetNumber) {
        if (!this.client) return null;
        const { data, error } = await this.client
            .from('assets')
            .select('*')
            .eq('asset_number', assetNumber.trim())
            .maybeSingle();
            
        if (error) throw error;
        return data;
    }

    async saveAsset(asset) {
        if (!this.client) throw new Error('Database is not connected');
        const user = (await this.client.auth.getUser()).data.user;
        
        const assetData = {
            name: asset.name,
            asset_number: asset.asset_number.trim(),
            location: asset.location.trim(),
            image_url: asset.image_url,
            created_by: user ? user.id : null
        };

        if (asset.id) {
            // อัปเดตข้อมูลเดิม
            const { data, error } = await this.client
                .from('assets')
                .update(assetData)
                .eq('id', asset.id)
                .select();
            if (error) throw error;
            return data[0];
        } else {
            // เพิ่มข้อมูลใหม่
            const { data, error } = await this.client
                .from('assets')
                .insert([assetData])
                .select();
            if (error) throw error;
            return data[0];
        }
    }

    // เพิ่มข้อมูลครุภัณฑ์หลายรายการพร้อมกัน (Bulk Save จาก PDF)
    async bulkInsertAssets(assetsList) {
        if (!this.client) throw new Error('Database is not connected');
        const user = (await this.client.auth.getUser()).data.user;
        
        const preparedData = assetsList.map(asset => ({
            name: asset.name,
            asset_number: asset.asset_number.trim(),
            location: asset.location.trim(),
            image_url: asset.image_url || null,
            created_by: user ? user.id : null
        }));

        const { data, error } = await this.client
            .from('assets')
            .insert(preparedData)
            .select();
            
        if (error) throw error;
        return data;
    }

    async deleteAsset(assetId) {
        if (!this.client) return;
        const { error } = await this.client
            .from('assets')
            .delete()
            .eq('id', assetId);
        if (error) throw error;
    }

    // ดึงชื่อสถานที่จัดเก็บที่มีทั้งหมดในตาราง (เพื่อใช้ทำ Filter)
    async fetchLocations() {
        if (!this.client) return [];
        const { data, error } = await this.client
            .from('assets')
            .select('location');
        if (error) throw error;
        
        // สกัดตัวซ้ำออก
        const uniqueLocations = [...new Set(data.map(item => item.location))];
        return uniqueLocations.filter(loc => loc && loc.trim() !== '').sort();
    }

    // ==========================================
    // AUDIT LOGS & REPORTING
    // ==========================================

    // ดึงประวัติการตรวจสอบทั้งหมดร่วมกับข้อมูลพัสดุ
    async fetchAuditRecords(fiscalYear = 2569, locationFilter = 'all') {
        if (!this.client) return [];
        
        let query = this.client
            .from('audit_records')
            .select('*, assets(*), profiles(display_name)')
            .eq('fiscal_year', fiscalYear);

        const { data, error } = await query;
        if (error) throw error;
        
        // ถ้าต้องการกรองตามสถานที่ในระดับฝั่งไคลเอนต์หรือฐานข้อมูล
        let records = data;
        if (locationFilter !== 'all') {
            records = data.filter(record => record.assets && record.assets.location === locationFilter);
        }
        
        // ดึงครุภัณฑ์ทั้งหมดเพื่อเช็ครายการที่ "ยังไม่ได้สแกนตรวจสอบ"
        const { data: allAssets, error: assetError } = await this.client.from('assets').select('*');
        if (assetError) throw assetError;

        let filteredAssets = allAssets;
        if (locationFilter !== 'all') {
            filteredAssets = allAssets.filter(asset => asset.location === locationFilter);
        }

        // นำมาประกอบกันเพื่อให้เห็นรายการครุภัณฑ์ทั้งหมดที่มีผลการตรวจ
        const recordsMap = new Map(records.map(r => [r.asset_id, r]));
        
        const fullReport = filteredAssets.map(asset => {
            const audit = recordsMap.get(asset.id);
            return {
                asset_id: asset.id,
                asset_number: asset.asset_number,
                name: asset.name,
                location: asset.location,
                image_url: asset.image_url,
                // ข้อมูลบันทึก
                audit_id: audit ? audit.id : null,
                status: audit ? audit.status : 'pending',
                notes: audit ? audit.notes : '',
                fiscal_year: fiscalYear,
                audited_by: audit ? (audit.profiles ? audit.profiles.display_name : 'ไม่ระบุ') : null,
                audited_at: audit ? audit.audited_at : null
            };
        });

        return fullReport;
    }

    // ดึงผลการตรวจสอบล่าสุด 10 รายการ (แสดงในหน้าแดชบอร์ด)
    async fetchRecentAuditLogs(fiscalYear = 2569) {
        if (!this.client) return [];
        const { data, error } = await this.client
            .from('audit_records')
            .select('*, assets(*), profiles(display_name)')
            .eq('fiscal_year', fiscalYear)
            .order('audited_at', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        return data;
    }

    // บันทึกสถานะการตรวจสอบครุภัณฑ์ประจำปี (Upsert)
    async saveAuditRecord(assetId, status, notes, fiscalYear) {
        if (!this.client) throw new Error('Database is not connected');
        const user = (await this.client.auth.getUser()).data.user;
        
        const recordData = {
            asset_id: assetId,
            status: status,
            notes: notes || '',
            fiscal_year: parseInt(fiscalYear),
            audited_by: user ? user.id : null,
            audited_at: new Date().toISOString()
        };

        // ตรวจสอบก่อนว่าเคยตรวจสอบไปแล้วหรือไม่ในปีงบประมาณนี้
        const { data: existing, error: checkError } = await this.client
            .from('audit_records')
            .select('id')
            .eq('asset_id', assetId)
            .eq('fiscal_year', parseInt(fiscalYear))
            .maybeSingle();

        if (checkError) throw checkError;

        if (existing) {
            // ทำการ Update บันทึกเดิม
            const { data, error } = await this.client
                .from('audit_records')
                .update(recordData)
                .eq('id', existing.id)
                .select();
            if (error) throw error;
            return data[0];
        } else {
            // ทำการ Insert บันทึกใหม่
            const { data, error } = await this.client
                .from('audit_records')
                .insert([recordData])
                .select();
            if (error) throw error;
            return data[0];
        }
    }

    // ==========================================
    // STORAGE FILE UPLOADS
    // ==========================================

    async uploadAssetImage(file, assetNumber) {
        if (!this.client) throw new Error('Database is not connected');
        
        // แยกส่วนขยายไฟล์เดิม
        const fileExt = file.name.split('.').pop() || 'jpg';
        // ตั้งชื่อไฟล์พัสดุ: เลขครุภัณฑ์_เวลา.นามสกุลไฟล์
        const safeNum = assetNumber.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${safeNum}_${Date.now()}.${fileExt}`;
        const filePath = `audit_photos/${fileName}`;

        // อัปโหลดเข้า Storage Bucket ชื่อ "asset-images"
        const { data, error } = await this.client.storage
            .from('asset-images')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw error;

        // ดึง Public URL ของไฟล์ที่อัปโหลด
        const { data: publicUrlData } = this.client.storage
            .from('asset-images')
            .getPublicUrl(filePath);

        // อัปเดตรูปภาพในตาราง Assets โดยตรงเพื่อบันทึกรูปหลักล่าสุด
        await this.client
            .from('assets')
            .update({ image_url: publicUrlData.publicUrl })
            .eq('asset_number', assetNumber.trim());

        return publicUrlData.publicUrl;
    }
}

// ประกาศและแชร์ instance สำหรับเรียกใช้งานใน app.js
window.supabaseService = new SupabaseService();
