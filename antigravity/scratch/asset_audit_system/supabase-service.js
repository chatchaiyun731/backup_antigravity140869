/* =====================================================================
   Supabase Service Controller for AssetFlow
   Handles Auth, Users, Asset CRUD, Auditing and Image Uploads
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
                    this.client = window.supabase.createClient(url, key, {
                        db: {
                            schema: 'asset_audit'
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
    // AUTHENTICATION & USERS (Username / Password)
    // ==========================================

    async signUp(username, password, displayName, role) {
        if (!this.client) throw new Error('กรุณาตั้งค่าการเชื่อมต่อฐานข้อมูล Supabase ก่อน');
        
        const { data, error } = await this.client
            .from('users')
            .insert({
                username: username.trim(),
                password: password.trim(),
                display_name: displayName.trim(),
                role: role
            })
            .select()
            .single();

        if (error) {
            if (error.message.includes('unique') || error.code === '23505') {
                throw new Error('ชื่อผู้ใช้งานนี้ถูกใช้ไปแล้ว กรุณาใช้ชื่ออื่น');
            }
            throw error;
        }
        return data;
    }

    async signIn(username, password) {
        if (!this.client) throw new Error('กรุณาตั้งค่าการเชื่อมต่อฐานข้อมูล Supabase ก่อน');
        
        const { data, error } = await this.client
            .from('users')
            .select('*')
            .eq('username', username.trim())
            .eq('password', password.trim())
            .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');

        // บันทึกข้อมูลผู้ใช้ปัจจุบันลง localStorage
        localStorage.setItem('asset_flow_user', JSON.stringify(data));
        return data;
    }

    async signOut() {
        localStorage.removeItem('asset_flow_user');
    }

    async getSession() {
        const userStr = localStorage.getItem('asset_flow_user');
        return userStr ? JSON.parse(userStr) : null;
    }

    // ดึงโปรไฟล์และบทบาทของผู้ใช้ปัจจุบัน
    async getCurrentUserProfile() {
        if (!this.client) return null;
        const session = await this.getSession();
        if (!session) return null;

        const { data, error } = await this.client
            .from('users')
            .select('*')
            .eq('id', session.id)
            .maybeSingle();

        if (error) {
            console.error('Error fetching user profile:', error);
            return session; // คืนค่าเซสชันเดิมหากดึงข้อมูลไม่ได้
        }
        if (data) {
            localStorage.setItem('asset_flow_user', JSON.stringify(data));
            return data;
        }
        return null;
    }

    // ดึงรายชื่อผู้ใช้งานทั้งหมด (สำหรับ Admin)
    async getAllProfiles() {
        if (!this.client) return [];
        const { data, error } = await this.client
            .from('users')
            .select('*')
            .order('username');
        if (error) throw error;
        return data;
    }

    // อัปเดตบทบาทผู้ใช้งาน (เฉพาะ Admin)
    async updateProfileRole(userId, newRole) {
        if (!this.client) return;
        const { data, error } = await this.client
            .from('users')
            .update({ role: newRole })
            .eq('id', userId)
            .select();
        if (error) throw error;
        return data[0];
    }

    // ==========================================
    // ASSET CRUD OPERATIONS
    // ==========================================

    async fetchAssets(searchQuery = '', locationFilter = 'all') {
        if (!this.client) return [];
        
        let query = this.client
            .from('assets')
            .select('*, users(display_name)');
            
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
        const session = await this.getSession();
        const userId = session ? session.id : null;
        
        const assetData = {
            name: asset.name,
            asset_number: asset.asset_number.trim(),
            location: asset.location.trim(),
            government_sector: asset.government_sector || null,
            department: asset.department || null,
            asset_type: asset.asset_type || null,
            characteristics: asset.characteristics || null,
            model_brand: asset.model_brand || null,
            serial_number: asset.serial_number || null,
            vendor_name: asset.vendor_name || null,
            vendor_address: asset.vendor_address || null,
            vendor_phone: asset.vendor_phone || null,
            funding_type: asset.funding_type || null,
            acquisition_method: asset.acquisition_method || null,
            image_url: asset.image_url,
            created_by: userId
        };

        let savedAsset = null;
        if (asset.id) {
            // อัปเดตข้อมูลเดิม
            const { data, error } = await this.client
                .from('assets')
                .update(assetData)
                .eq('id', asset.id)
                .select();
            if (error) throw error;
            savedAsset = data[0];
        } else {
            // เพิ่มข้อมูลใหม่
            const { data, error } = await this.client
                .from('assets')
                .insert([assetData])
                .select();
            if (error) throw error;
            savedAsset = data[0];
        }

        // บันทึกรายการประวัติความเคลื่อนไหว (ถ้ามี)
        if (asset.transactions) {
            await this.saveAssetTransactions(savedAsset.id, asset.transactions);
        }
        return savedAsset;
    }

    // เพิ่มหรือปรับปรุงข้อมูลครุภัณฑ์หลายรายการพร้อมกัน (Bulk Upsert จาก PDF)
    async bulkInsertAssets(assetsList) {
        if (!this.client) throw new Error('Database is not connected');
        const session = await this.getSession();
        const userId = session ? session.id : null;
        
        const preparedData = assetsList.map(asset => ({
            name: asset.name,
            asset_number: asset.asset_number.trim(),
            location: asset.location.trim(),
            government_sector: asset.government_sector || null,
            department: asset.department || null,
            asset_type: asset.asset_type || null,
            characteristics: asset.characteristics || null,
            model_brand: asset.model_brand || null,
            serial_number: asset.serial_number || null,
            vendor_name: asset.vendor_name || null,
            vendor_address: asset.vendor_address || null,
            vendor_phone: asset.vendor_phone || null,
            funding_type: asset.funding_type || null,
            acquisition_method: asset.acquisition_method || null,
            image_url: asset.image_url || null,
            created_by: userId
        }));

        // ใช้ upsert เพื่อไม่ให้พังเมื่อมีข้อมูลซ้ำ และช่วยอัปเดตข้อมูลล่าสุดอัตโนมัติ
        const { data, error } = await this.client
            .from('assets')
            .upsert(preparedData, { onConflict: 'asset_number' })
            .select();
            
        if (error) throw error;

        // บันทึกรายการประวัติความเคลื่อนไหวสำหรับพัสดุแต่ละตัว
        for (const asset of assetsList) {
            const dbAsset = data.find(a => a.asset_number.trim() === asset.asset_number.trim());
            if (dbAsset && asset.transactions) {
                await this.saveAssetTransactions(dbAsset.id, asset.transactions);
            }
        }

        return data;
    }

    // ฟังก์ชันย่อยสำหรับบันทึกรายการประวัติบัญชีและค่าเสื่อมราคาพัสดุ
    async saveAssetTransactions(assetId, transactions) {
        if (!this.client) return;
        
        // ลบข้อมูลเก่าทิ้งก่อนเพื่อบันทึกทับใหม่ป้องกันความซ้ำซ้อน
        await this.client
            .from('asset_transactions')
            .delete()
            .eq('asset_id', assetId);
            
        if (transactions.length === 0) return;

        const prepared = transactions.map(t => ({
            asset_id: assetId,
            transaction_date: t.transaction_date || null,
            document_no: t.document_no || null,
            description: t.description || 'คำนวณค่าเสื่อมราคา',
            quantity: t.quantity || null,
            unit_price: t.unit_price || null,
            total_value: t.total_value || null,
            useful_life: t.useful_life || null,
            depreciation_rate: t.depreciation_rate || null,
            annual_depreciation: t.annual_depreciation || null,
            accumulated_depreciation: t.accumulated_depreciation || null,
            net_value: t.net_value || null
        }));

        const { error } = await this.client
            .from('asset_transactions')
            .insert(prepared);

        if (error) {
            console.error('Error saving asset transactions:', error);
            throw error;
        }
    }

    // ดึงข้อมูลรายการบัญชีค่าเสื่อมราคาพัสดุ
    async fetchAssetTransactions(assetId) {
        if (!this.client) return [];
        const { data, error } = await this.client
            .from('asset_transactions')
            .select('*')
            .eq('asset_id', assetId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching asset transactions:', error);
            throw error;
        }
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
            .select('*, assets(*), users(display_name)')
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
                audited_by: audit ? (audit.users ? audit.users.display_name : 'ไม่ระบุ') : null,
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
            .select('*, assets(*), users(display_name)')
            .eq('fiscal_year', fiscalYear)
            .order('audited_at', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        return data;
    }

    // บันทึกสถานะการตรวจสอบครุภัณฑ์ประจำปี (Upsert)
    async saveAuditRecord(assetId, status, notes, fiscalYear) {
        if (!this.client) throw new Error('Database is not connected');
        const session = await this.getSession();
        const userId = session ? session.id : null;
        
        const recordData = {
            asset_id: assetId,
            status: status,
            notes: notes || '',
            fiscal_year: parseInt(fiscalYear),
            audited_by: userId,
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
