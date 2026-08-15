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
        const defaultUrl = 'https://yurtzwdpfmwytvpaokwi.supabase.co';
        const defaultKey = 'sb_publishable_ZgDsjezCHGXk50TUxnJJ8A_BDa2I2CQ';
        
        let url = localStorage.getItem('supabase_url');
        let key = localStorage.getItem('supabase_key');
        
        // หากเบราว์เซอร์จำค่า URL ที่ต่างจากโปรเจกต์ปัจจุบัน ให้ล้างค่าออกเพื่อสลับมาโปรเจกต์ใหม่ล่าสุดโดยอัตโนมัติ
        if (url && url !== defaultUrl) {
            url = null;
            key = null;
            localStorage.removeItem('supabase_url');
            localStorage.removeItem('supabase_key');
            localStorage.removeItem('g_patrol_user'); // ล้างข้อมูลการจำล็อกอินเดิมด้วย
        }

        // หากไม่มีการตั้งค่าไว้ล่วงหน้า ให้ใช้ค่าเริ่มต้นระบบโดยอัตโนมัติ
        if (!url || !key) {
            url = defaultUrl;
            key = defaultKey;
            localStorage.setItem('supabase_url', defaultUrl);
            localStorage.setItem('supabase_key', defaultKey);
        }

        if (url && key) {
            try {
                // โหลด supabase จาก CDN (ซึ่งประกาศไว้ใน window.supabase)
                if (window.supabase) {
                    this.client = window.supabase.createClient(url, key, {
                        db: {
                            schema: 'g_patrol'
                        }
                    });
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

    async signUp(username, password, displayName, role, avatarUrl = null) {
        if (!this.client) throw new Error('กรุณาตั้งค่าการเชื่อมต่อฐานข้อมูล Supabase ก่อน');
        
        const { data, error } = await this.client
            .from('g_patrol_users')
            .insert({
                username: username.trim(),
                password: password.trim(),
                display_name: displayName.trim(),
                role: role,
                avatar_url: avatarUrl ? avatarUrl.trim() : null
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async signUpWithUsername(username, password, displayName, role, avatarUrl = null) {
        return this.signUp(username, password, displayName, role, avatarUrl);
    }

    async signIn(username, password) {
        if (!this.client) throw new Error('กรุณาตั้งค่าการเชื่อมต่อฐานข้อมูล Supabase ก่อน');
        const { data, error } = await this.client
            .from('g_patrol_users')
            .select('*')
            .eq('username', username.trim())
            .eq('password', password.trim())
            .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');

        // บันทึกข้อมูลผู้ใช้ปัจจุบันลง localStorage
        localStorage.setItem('g_patrol_user', JSON.stringify(data));
        return data;
    }

    async signInWithUsername(username, password) {
        return this.signIn(username, password);
    }

    async signOut() {
        localStorage.removeItem('g_patrol_user');
    }

    async getSession() {
        const userStr = localStorage.getItem('g_patrol_user');
        return userStr ? JSON.parse(userStr) : null;
    }

    // ดึงโปรไฟล์และบทบาทของผู้ใช้ปัจจุบัน
    async getCurrentUserProfile() {
        if (!this.client) return null;
        const session = await this.getSession();
        if (!session) return null;

        const { data, error } = await this.client
            .from('g_patrol_users')
            .select('*')
            .eq('id', session.id)
            .maybeSingle();

        if (error) {
            console.error('Error fetching user profile:', error);
            return session; // คืนค่าเซสชันเดิมหากดึงข้อมูลไม่ได้
        }
        if (data) {
            localStorage.setItem('g_patrol_user', JSON.stringify(data));
            return data;
        }
        return null;
    }

    // ดึงโปรไฟล์ทั้งหมด (สำหรับหน้าจัดการผู้ใช้ของแอดมิน - อนาคต)
    async getAllProfiles() {
        if (!this.client) return [];
        const { data, error } = await this.client
            .from('g_patrol_users')
            .select('*')
            .order('username');
        if (error) throw error;
        return data;
    }

    // อัปเดตบทบาทผู้ใช้งาน (เฉพาะ Admin เท่านั้น)
    async updateProfileRole(userId, newRole) {
        if (!this.client) return;
        const { data, error } = await this.client
            .from('g_patrol_users')
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
            .from('g_patrol_checkpoints')
            .select('*, g_patrol_users(display_name)');
            
        if (locationFilter !== 'all') {
            if (locationFilter === 'อื่นๆ') {
                query = query.not('zone', 'in', '("บริเวณศาล","บ้านพัก")');
            } else {
                query = query.eq('zone', locationFilter);
            }
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
            .from('g_patrol_checkpoints')
            .select('*')
            .eq('asset_number', assetNumber.trim())
            .maybeSingle();
            
        if (error) throw error;
        return data;
    }

    async saveAsset(asset) {
        if (!this.client) throw new Error('Database is not connected');
        const session = await this.getSession();
        const userId = session ? session.id : null;
        
        let zone = 'อื่นๆ';
        if (asset.location === 'บริเวณศาล' || asset.location.includes('บริเวณศาล') || asset.location === 'ศาล') {
            zone = 'บริเวณศาล';
        } else if (asset.location === 'บ้านพัก' || asset.location.includes('บ้านพัก')) {
            zone = 'บ้านพัก';
        }

        const assetData = {
            name: asset.name,
            asset_number: asset.asset_number.trim(),
            location: asset.location.trim(),
            zone: zone,
            image_url: asset.image_url,
            created_by: userId
        };

        if (asset.id) {
            // อัปเดตข้อมูลเดิม
            const { data, error } = await this.client
                .from('g_patrol_checkpoints')
                .update(assetData)
                .eq('id', asset.id)
                .select();
            if (error) throw error;
            return data[0];
        } else {
            // เพิ่มข้อมูลใหม่
            const { data, error } = await this.client
                .from('g_patrol_checkpoints')
                .insert([assetData])
                .select();
            if (error) throw error;
            return data[0];
        }
    }

    // เพิ่มข้อมูลครุภัณฑ์หลายรายการพร้อมกัน (Bulk Save จาก PDF)
    async bulkInsertAssets(assetsList) {
        if (!this.client) throw new Error('Database is not connected');
        const session = await this.getSession();
        const userId = session ? session.id : null;
        
        const preparedData = assetsList.map(asset => {
            let zone = 'อื่นๆ';
            if (asset.location === 'บริเวณศาล' || asset.location.includes('บริเวณศาล') || asset.location === 'ศาล' || asset.name.includes('ศาล')) {
                zone = 'บริเวณศาล';
            } else if (asset.location === 'บ้านพัก' || asset.location.includes('บ้านพัก') || asset.name.includes('บ้านพัก')) {
                zone = 'บ้านพัก';
            }
            return {
                name: asset.name,
                asset_number: asset.asset_number.trim(),
                location: asset.location.trim(),
                zone: zone,
                image_url: asset.image_url || null,
                created_by: userId
            };
        });

        const { data, error } = await this.client
            .from('g_patrol_checkpoints')
            .insert(preparedData)
            .select();
            
        if (error) throw error;
        return data;
    }

    async deleteAsset(assetId) {
        if (!this.client) return;
        const { error } = await this.client
            .from('g_patrol_checkpoints')
            .delete()
            .eq('id', assetId);
        if (error) throw error;
    }

    // ดึงชื่อสถานที่จัดเก็บที่มีทั้งหมดในตาราง (เพื่อใช้ทำ Filter)
    async fetchLocations() {
        if (!this.client) return [];
        const { data, error } = await this.client
            .from('g_patrol_checkpoints')
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
    async fetchAuditRecords(fiscalYear = 2569, locationFilter = 'all', startDate = null, endDate = null) {
        if (!this.client) return [];
        
        try {
            // 1. ดึงประวัติ audit พร้อมกรองช่วงวันที่ (ถ้ากำหนดไว้)
            let query = this.client.from('g_patrol_audit_records').select('*');
            
            if (startDate || endDate) {
                let startIso, endIso;
                if (startDate) {
                    startIso = startDate.includes('T') ? startDate : new Date(startDate + 'T00:00:00').toISOString();
                } else {
                    startIso = new Date('1970-01-01T00:00:00Z').toISOString();
                }
                if (endDate) {
                    endIso = endDate.includes('T') ? endDate : new Date(endDate + 'T23:59:59').toISOString();
                } else {
                    endIso = new Date().toISOString(); // ถึงปัจจุบัน
                }
                query = query.gte('audited_at', startIso).lte('audited_at', endIso);
            } else {
                query = query.eq('fiscal_year', fiscalYear);
            }

            const { data: logs, error: logsError } = await query;
            if (logsError) throw logsError;

            // 2. ดึงข้อมูลจุดตรวจทั้งหมด
            const { data: checkpoints, error: cpError } = await this.client
                .from('g_patrol_checkpoints')
                .select('*');
            if (cpError) throw cpError;

            // 3. ดึงข้อมูลผู้ใช้งานทั้งหมดเพื่อใช้แสดงชื่อผู้บันทึกตรวจ
            const { data: users, error: usersError } = await this.client
                .from('g_patrol_users')
                .select('id, display_name, role');
            if (usersError) throw usersError;

            // สร้างแผนที่ความสัมพันธ์ (Maps)
            const userMap = new Map(users.map(u => [u.id, u]));

            // กรองสถานที่จุดตรวจในฝั่งจาวาสคริปต์
            let filteredCheckpoints = checkpoints || [];
            if (locationFilter !== 'all') {
                if (locationFilter === 'อื่นๆ') {
                    filteredCheckpoints = checkpoints.filter(cp => cp.zone !== 'บริเวณศาล' && cp.zone !== 'บ้านพัก');
                } else {
                    filteredCheckpoints = checkpoints.filter(cp => cp.zone === locationFilter);
                }
            }

            // นำมาประกอบร่างข้อมูลส่งกลับคืน (แสดงรายงานเช็คอินของทุกคน ทั้ง Guard, Guard2 และ Court Marshal)
            const logsMap = new Map((logs || []).map(log => [log.asset_id, log]));

            const result = filteredCheckpoints.map(cp => {
                const audit = logsMap.get(cp.id);
                const auditorUser = audit ? userMap.get(audit.audited_by) : null;
                return {
                    asset_id: cp.id,
                    asset_number: cp.asset_number,
                    name: cp.name,
                    location: cp.location,
                    zone: cp.zone || 'อื่นๆ',
                    image_url: cp.image_url,
                    // ข้อมูลบันทึกการตรวจ
                    audit_id: audit ? audit.id : null,
                    status: audit ? audit.status : 'pending',
                    notes: audit ? audit.notes : '',
                    fiscal_year: fiscalYear,
                    audited_by: auditorUser ? auditorUser.display_name : (audit ? 'ไม่ระบุ' : null),
                    audited_at: audit ? audit.audited_at : null,
                    audit_image_url: audit ? audit.image_url : null,
                    latitude: audit ? audit.latitude : null,
                    longitude: audit ? audit.longitude : null
                };
            });

            // เรียงลำดับข้อมูลตามรหัสจุดตรวจ (asset_number) เช่น CP-01, CP-02 เสมอ
            result.sort((a, b) => a.asset_number.localeCompare(b.asset_number, undefined, { numeric: true }));
            return result;
        } catch (err) {
            console.error('Error in fetchAuditRecords:', err);
            throw err;
        }
    }

    // ดึงผลการตรวจสอบล่าสุด 10 รายการ (แสดงในหน้าแดชบอร์ด)
    async fetchRecentAuditLogs(fiscalYear = 2569) {
        if (!this.client) return [];
        
        try {
            // 1. ดึงประวัติการเดินตรวจล่าสุด
            const { data: logs, error: logsError } = await this.client
                .from('g_patrol_audit_records')
                .select('*')
                .eq('fiscal_year', fiscalYear)
                .order('audited_at', { ascending: false })
                .limit(50);
                
            if (logsError) throw logsError;
            if (!logs || logs.length === 0) return [];

            // 2. ดึงข้อมูลจุดตรวจทั้งหมดเพื่อใช้จับคู่
            const { data: checkpoints, error: cpError } = await this.client
                .from('g_patrol_checkpoints')
                .select('*');
            if (cpError) throw cpError;

            // 3. ดึงข้อมูลผู้ใช้งานทั้งหมดเพื่อใช้แสดงชื่อผู้บันทึกตรวจ
            const { data: users, error: usersError } = await this.client
                .from('g_patrol_users')
                .select('id, display_name, role');
            if (usersError) throw usersError;

            const cpMap = new Map(checkpoints.map(c => [c.id, c]));
            const userMap = new Map(users.map(u => [u.id, u]));

            // จับคู่ความสัมพันธ์และตอบกลับ (แสดงผลรายงานทั้งหมดของทั้ง Guard, Guard2 และ Court Marshal)
            return logs.map(log => {
                const cp = cpMap.get(log.asset_id);
                const user = userMap.get(log.audited_by);
                return {
                    ...log,
                    g_patrol_checkpoints: cp || null,
                    g_patrol_users: user ? { display_name: user.display_name, role: user.role } : null
                };
            });
        } catch (err) {
            console.error('Error in fetchRecentAuditLogs:', err);
            throw err;
        }
    }

    // บันทึกสถานะการตรวจสอบครุภัณฑ์ประจำปี (Upsert)
    async saveAuditRecord(record) {
        if (!this.client) throw new Error('Database is not connected');
        const session = await this.getSession();
        const userId = session ? session.id : null;
        
        const recordData = {
            asset_id: record.asset_id,
            status: record.status,
            notes: record.notes || '',
            fiscal_year: parseInt(record.fiscal_year),
            audited_by: userId,
            audited_at: record.audited_at || new Date().toISOString(),
            image_url: record.image_url || null,
            latitude: record.latitude || null,
            longitude: record.longitude || null
        };

        // ตรวจสอบก่อนว่าเคยตรวจสอบไปแล้วหรือไม่ในปีงบประมาณนี้
        const { data: existing, error: checkError } = await this.client
            .from('g_patrol_audit_records')
            .select('id')
            .eq('asset_id', record.asset_id)
            .eq('fiscal_year', parseInt(record.fiscal_year))
            .maybeSingle();

        if (checkError) throw checkError;

        if (existing) {
            // ทำการ Update บันทึกเดิม
            const { data, error } = await this.client
                .from('g_patrol_audit_records')
                .update(recordData)
                .eq('id', existing.id)
                .select();
            if (error) throw error;
            return data[0];
        } else {
            // ทำการ Insert บันทึกใหม่
            const { data, error } = await this.client
                .from('g_patrol_audit_records')
                .insert([recordData])
                .select();
            if (error) throw error;
            return data[0];
        }
    }

    // ==========================================
    // STORAGE FILE UPLOADS
    // ==========================================

    async uploadAssetImage(arg1, arg2) {
        if (!this.client) throw new Error('Database is not connected');
        
        let file, assetNumber;
        if (typeof arg1 === 'string') {
            assetNumber = arg1;
            file = arg2;
        } else {
            file = arg1;
            assetNumber = arg2;
        }
        
        // แยกส่วนขยายไฟล์เดิม
        const fileExt = file.name.split('.').pop() || 'jpg';
        // ตั้งชื่อไฟล์พัสดุ: เลขครุภัณฑ์_เวลา.นามสกุลไฟล์
        const safeNum = assetNumber.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${safeNum}_${Date.now()}.${fileExt}`;
        const filePath = `audit_photos/${fileName}`;

        // อัปโหลดเข้า Storage Bucket ชื่อ "patrol-photos"
        const { data, error } = await this.client.storage
            .from('patrol-photos')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw error;

        // ดึง Public URL ของไฟล์ที่อัปโหลด
        const { data: publicUrlData } = this.client.storage
            .from('patrol-photos')
            .getPublicUrl(filePath);

        // อัปเดตรูปภาพในตาราง Assets โดยตรงเพื่อบันทึกรูปหลักล่าสุด
        await this.client
            .from('g_patrol_checkpoints')
            .update({ image_url: publicUrlData.publicUrl })
            .eq('asset_number', assetNumber.trim());

        return publicUrlData.publicUrl;
    }

    async uploadUserAvatar(file, userId) {
        if (!this.client) throw new Error('Database is not connected');
        
        // แยกส่วนขยายไฟล์เดิม
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${userId}_${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // อัปโหลดเข้า Storage Bucket ชื่อ "patrol-photos"
        const { data, error } = await this.client.storage
            .from('patrol-photos')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw error;

        // ดึง Public URL ของไฟล์ที่อัปโหลด
        const { data: publicUrlData } = this.client.storage
            .from('patrol-photos')
            .getPublicUrl(filePath);

        // อัปเดตรูปภาพในตาราง g_patrol_users โดยตรง
        const { error: updateError } = await this.client
            .from('g_patrol_users')
            .update({ avatar_url: publicUrlData.publicUrl })
            .eq('id', userId);

        if (updateError) throw updateError;

        return publicUrlData.publicUrl;
    }
}

// ประกาศและแชร์ instance สำหรับเรียกใช้งานใน app.js
window.supabaseService = new SupabaseService();
