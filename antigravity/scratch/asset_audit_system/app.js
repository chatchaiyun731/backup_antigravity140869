/* =====================================================================
   AssetFlow Application Controller (app.js)
   Orchestrates Routing, UI state, Scanner, PDF Parsing, CSV/PDF Export
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // โหลดไอคอน Lucide ในเบื้องต้น
    lucide.createIcons();

    // ==========================================
    // APP STATE
    // ==========================================
    const state = {
        theme: localStorage.getItem('theme') || 'dark',
        currentView: 'dashboard-view',
        currentUser: null,
        userRole: 'auditor', // default
        selectedAssetIds: new Set(),
        parsedPDFAssets: [],
        lastPDFFile: null,
        fiscalYear: '2569',
        locationFilter: 'all',
        html5QrScanner: null
    };

    // ==========================================
    // DOM ELEMENTS
    // ==========================================
    const el = {
        // Screens
        authScreen: document.getElementById('auth-screen'),
        appScreen: document.getElementById('app-screen'),
        
        // Navigation & Titles
        navItems: document.querySelectorAll('.nav-item'),
        viewPanels: document.querySelectorAll('.view-panel'),
        viewTitle: document.getElementById('view-title'),
        viewSubtitle: document.getElementById('view-subtitle'),
        avatarChar: document.getElementById('avatar-char'),
        userDisplayName: document.getElementById('user-display-name'),
        userRoleBadge: document.getElementById('user-role-badge'),
        btnLogout: document.getElementById('btn-logout'),
        btnQuickLogout: document.getElementById('btn-quick-logout'),
        
        // Modals
        configModal: document.getElementById('config-modal'),
        assetModal: document.getElementById('asset-modal'),
        btnOpenConfigAuth: document.getElementById('btn-open-config-auth'),
        btnOpenConfigApp: document.getElementById('btn-open-config-app'),
        btnCloseConfig: document.getElementById('btn-close-config'),
        btnSaveConfig: document.getElementById('btn-save-config'),
        
        // Supabase Connection Inputs
        supabaseUrl: document.getElementById('supabase-url'),
        supabaseKey: document.getElementById('supabase-key'),
        
        // Forms Auth
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        tabLogin: document.getElementById('tab-login'),
        tabRegister: document.getElementById('tab-register'),
        
        // Theme Elements
        btnToggleTheme: document.getElementById('btn-toggle-theme'),
        themeIcon: document.getElementById('theme-icon'),
        
        // Dashboard
        statPercent: document.getElementById('stat-percent'),
        statRatioText: document.getElementById('stat-ratio-text'),
        progressCircle: document.getElementById('progress-circle'),
        statNormal: document.getElementById('stat-normal'),
        statDamaged: document.getElementById('stat-damaged'),
        statLost: document.getElementById('stat-lost'),
        statPending: document.getElementById('stat-pending'),
        reportFiscalYear: document.getElementById('report-fiscal-year'),
        reportLocationFilter: document.getElementById('report-location-filter'),
        btnExportCsv: document.getElementById('btn-export-csv'),
        btnExportPdf: document.getElementById('btn-export-pdf'),
        dashboardRecentTable: document.getElementById('dashboard-recent-table').querySelector('tbody'),
        
        // Assets main table view
        assetSearchInput: document.getElementById('asset-search-input'),
        assetFilterLocation: document.getElementById('asset-filter-location'),
        btnAddAsset: document.getElementById('btn-add-asset'),
        btnCancelAssetModal: document.getElementById('btn-cancel-asset-modal'),
        btnCloseAssetModal: document.getElementById('btn-close-asset-modal'),
        assetForm: document.getElementById('asset-form'),
        assetsTableBody: document.getElementById('assets-table-body'),
        selectAllAssets: document.getElementById('select-all-assets'),
        selectedQrCount: document.getElementById('selected-qr-count'),
        btnPrintSelectedQr: document.getElementById('btn-print-selected-qr'),
        
        // Asset edit fields
        assetFormId: document.getElementById('asset-form-id'),
        assetFormNumber: document.getElementById('asset-form-number'),
        assetFormName: document.getElementById('asset-form-name'),
        assetFormLocation: document.getElementById('asset-form-location'),
        assetFormImage: document.getElementById('asset-form-image'),
        assetModalTitle: document.getElementById('asset-modal-title'),
        
        // QR Camera Scanner View
        btnStartScanner: document.getElementById('btn-start-scanner'),
        btnStopScanner: document.getElementById('btn-stop-scanner'),
        manualSearchBarcode: document.getElementById('manual-search-barcode'),
        btnManualSearchAudit: document.getElementById('btn-manual-search-audit'),
        fabScanTrigger: document.getElementById('fab-scan-trigger'),
        
        // Audit Form View
        btnBackToList: document.getElementById('btn-back-to-list'),
        auditImagePreview: document.getElementById('audit-image-preview'),
        auditFileInput: document.getElementById('audit-file-input'),
        auditQrCanvas: document.getElementById('audit-qr-canvas'),
        auditQrLabel: document.getElementById('audit-qr-label'),
        auditDisplayNumber: document.getElementById('audit-display-number'),
        auditDisplayName: document.getElementById('audit-display-name'),
        auditDisplayLocation: document.getElementById('audit-display-location'),
        auditRecordForm: document.getElementById('audit-record-form'),
        auditAssetId: document.getElementById('audit-asset-id'),
        auditFiscalYear: document.getElementById('audit-fiscal-year'),
        auditNotes: document.getElementById('audit-notes'),
        labelStatusNormal: document.getElementById('label-status-normal'),
        labelStatusDamaged: document.getElementById('label-status-damaged'),
        labelStatusLost: document.getElementById('label-status-lost'),
        
        // PDF Import View
        pdfDragDropZone: document.getElementById('pdf-drag-drop-zone'),
        pdfFileInput: document.getElementById('pdf-file-input'),
        pdfProgressContainer: document.getElementById('pdf-progress-container'),
        pdfProgressBar: document.getElementById('pdf-progress-bar'),
        pdfStatusText: document.getElementById('pdf-status-text'),
        pdfPreviewSection: document.getElementById('pdf-preview-section'),
        pdfParsedTableBody: document.getElementById('pdf-parsed-table-body'),
        selectAllImports: document.getElementById('select-all-imports'),
        parsedCount: document.getElementById('parsed-count'),
        selectedImportCount: document.getElementById('selected-import-count'),
        btnImportConfirm: document.getElementById('btn-import-confirm'),
        
        // Print Preview View
        printQrGrid: document.getElementById('print-qr-grid'),
        btnExecutePrint: document.getElementById('btn-execute-print'),
        btnClosePrint: document.getElementById('btn-close-print')
    };

    // ==========================================
    // INITIATE THEME & SYSTEM STATUS
    // ==========================================
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcon();
    
    // ตรวจสอบการตั้งค่า Supabase
    if (!window.supabaseService.isConfigured()) {
        showConfigModal();
    } else {
        checkUserSession();
    }

    // ==========================================
    // ROUTING / VIEW SWITCHER
    // ==========================================
    function showView(viewId) {
        state.currentView = viewId;
        
        // ซ่อนพาเนลทั้งหมดและสลับพาเนลเป้าหมาย
        el.viewPanels.forEach(panel => {
            panel.classList.remove('active');
        });
        const activePanel = document.getElementById(viewId);
        if (activePanel) {
            activePanel.classList.add('active');
        }

        // ปิดกล้องสแกนทันทีเมื่อย้ายออกจากหน้าจอ
        if (viewId !== 'scanner-view') {
            stopCameraScanner();
        }

        // ปรับแต่งปุ่มนำทางในแถบด้านข้าง
        el.navItems.forEach(item => {
            if (item.getAttribute('data-view') === viewId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // อัปเดตชื่อหน้า (Page Header Title)
        updateHeaderTitles(viewId);

        // โหลดข้อมูลตามหน้า
        if (viewId === 'dashboard-view') {
            loadDashboardData();
        } else if (viewId === 'assets-view') {
            loadAssetsData();
        }
        
        // เลื่อนสกรอลขึ้นด้านบนสุด
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateHeaderTitles(viewId) {
        const titles = {
            'dashboard-view': { title: 'แดชบอร์ดสรุป', sub: 'สถิติและผลความคืบหน้าการสแกนตรวจสอบครุภัณฑ์ประจำปี' },
            'assets-view': { title: 'รายการครุภัณฑ์ทั้งหมด', sub: 'จัดการ ค้นหา สร้าง QR Code และจัดการข้อมูลระบบพัสดุ' },
            'scanner-view': { title: 'สแกนตรวจสอบพัสดุ', sub: 'ใช้กล้องมือถือสแกนคิวอาร์โค้ดเพื่อบันทึกสถานะพัสดุ' },
            'audit-view': { title: 'แบบฟอร์มตรวจสอบครุภัณฑ์', sub: 'ยืนยันสถานะ อัปเดตรูปถ่าย และบันทึกผลการตรวจสอบ' },
            'import-view': { title: 'นำเข้าข้อมูลครุภัณฑ์จาก PDF', sub: 'แปลงข้อมูลพัสดุจากรายงาน PDF เข้าฐานข้อมูลแบบกลุ่ม' },
            'print-preview-view': { title: 'พิมพ์บาร์โค้ด QR Code', sub: 'สติกเกอร์แสดงรายละเอียดสำหรับการติดตัวถังครุภัณฑ์' }
        };
        
        if (titles[viewId]) {
            el.viewTitle.innerText = titles[viewId].title;
            el.viewSubtitle.innerText = titles[viewId].sub;
        }
    }

    // ลงทะเบียนปุ่มนำทาง Sidebar
    el.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = item.getAttribute('data-view');
            showView(targetView);
        });
    });

    // ลงทะเบียน FAB มือถือ
    el.fabScanTrigger.addEventListener('click', () => {
        showView('scanner-view');
        startCameraScanner();
    });

    // ==========================================
    // THEME MANAGEMENT
    // ==========================================
    el.btnToggleTheme.addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', state.theme);
        localStorage.setItem('theme', state.theme);
        updateThemeIcon();
    });

    function updateThemeIcon() {
        if (state.theme === 'dark') {
            el.themeIcon.setAttribute('data-lucide', 'sun');
            el.themeIcon.style.color = '#fbbf24';
        } else {
            el.themeIcon.setAttribute('data-lucide', 'moon');
            el.themeIcon.style.color = '#64748b';
        }
        lucide.createIcons();
    }

    // ==========================================
    // CONNECTION & AUTHENTICATION CONFIG
    // ==========================================
    function showConfigModal() {
        el.supabaseUrl.value = localStorage.getItem('supabase_url') || '';
        el.supabaseKey.value = localStorage.getItem('supabase_key') || '';
        el.configModal.classList.add('active');
    }

    function hideConfigModal() {
        el.configModal.classList.remove('active');
    }

    el.btnOpenConfigAuth.addEventListener('click', showConfigModal);
    el.btnOpenConfigApp.addEventListener('click', showConfigModal);
    el.btnCloseConfig.addEventListener('click', hideConfigModal);

    el.btnSaveConfig.addEventListener('click', () => {
        const url = el.supabaseUrl.value;
        const key = el.supabaseKey.value;
        
        if (!url || !key) {
            alert('กรุณากรอกข้อมูลเชื่อมต่อให้ครบถ้วน');
            return;
        }

        const success = window.supabaseService.saveConfig(url, key);
        if (success) {
            alert('บันทึกการเชื่อมต่อ Supabase เรียบร้อยแล้ว ระบบจะทำการรีเฟรช');
            hideConfigModal();
            window.location.reload();
        } else {
            alert('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาตรวจสอบ URL หรือ Key อีกครั้ง');
        }
    });

    // ตรวจสอบเซสชันผู้ใช้ปัจจุบัน
    async function checkUserSession() {
        try {
            const profile = await window.supabaseService.getCurrentUserProfile();
            if (profile) {
                state.currentUser = profile;
                state.userRole = profile.role;
                
                // อัปเดต UI หน้าหลัก
                el.avatarChar.innerText = profile.display_name.charAt(0).toUpperCase();
                el.userDisplayName.innerText = profile.display_name;
                
                const roleTh = {
                    'admin': 'ผู้ดูแลระบบ (Admin)',
                    'officer': 'เจ้าหน้าที่พัสดุ (Officer)',
                    'auditor': 'ผู้ตรวจสอบพัสดุ (Auditor)',
                    'guard': 'เจ้าหน้าที่เดินตรวจ (บริเวณศาล)',
                    'guard2': 'เจ้าหน้าที่เดินตรวจ (บ้านพัก)'
                };
                el.userRoleBadge.innerText = roleTh[profile.role] || 'ผู้ตรวจสอบ';

                // จัดการจำกัดบทบาทการแสดงผลในหน้าจอ
                manageRolePermissions(profile.role);

                // สลับไปหน้าจอหลักแอปพลิเคชัน
                el.authScreen.style.display = 'none';
                el.appScreen.style.display = 'flex';
                showView('dashboard-view');
            } else {
                showAuthScreen();
            }
        } catch (e) {
            console.error('Session check error', e);
            showAuthScreen();
        }
    }

    function showAuthScreen() {
        el.authScreen.style.display = 'flex';
        el.appScreen.style.display = 'none';
        
        // บนมือถือให้ซ่อน FAB ในหน้า Auth
        el.fabScanTrigger.style.display = 'none';
    }

    function manageRolePermissions(role) {
        const officerOnlyElements = document.querySelectorAll('.officer-only');
        if (role === 'auditor' || role === 'guard' || role === 'guard2') {
            officerOnlyElements.forEach(el => el.style.display = 'none');
            // ผู้ตรวจสอบและเจ้าหน้าที่เดินตรวจจะไม่เห็นปุ่มเพิ่ม/ลบ
            el.btnAddAsset.style.display = 'none';
        } else {
            // Admin หรือ Officer
            officerOnlyElements.forEach(el => el.style.display = '');
            el.btnAddAsset.style.display = '';
        }
    }

    // ล็อกเอาท์
    async function handleLogout() {
        if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
            await window.supabaseService.signOut();
            state.currentUser = null;
            showAuthScreen();
        }
    }
    el.btnLogout.addEventListener('click', handleLogout);
    el.btnQuickLogout.addEventListener('click', handleLogout);

    // ควบคุมสลับแท็บ Auth
    el.tabLogin.addEventListener('click', () => {
        el.loginForm.style.display = 'block';
        el.registerForm.style.display = 'none';
        el.tabLogin.style.borderBottomColor = 'var(--color-primary)';
        el.tabLogin.style.color = 'var(--text-primary)';
        el.tabLogin.style.fontWeight = '600';
        el.tabRegister.style.borderBottomColor = 'transparent';
        el.tabRegister.style.color = 'var(--text-secondary)';
        el.tabRegister.style.fontWeight = '400';
    });

    el.tabRegister.addEventListener('click', () => {
        el.loginForm.style.display = 'none';
        el.registerForm.style.display = 'block';
        el.tabRegister.style.borderBottomColor = 'var(--color-primary)';
        el.tabRegister.style.color = 'var(--text-primary)';
        el.tabRegister.style.fontWeight = '600';
        el.tabLogin.style.borderBottomColor = 'transparent';
        el.tabLogin.style.color = 'var(--text-secondary)';
        el.tabLogin.style.fontWeight = '400';
    });

    // ส่งข้อมูลแบบฟอร์มเข้าใช้งาน
    el.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            await window.supabaseService.signIn(username, password);
            await checkUserSession();
        } catch (err) {
            alert('ลงชื่อเข้าใช้งานล้มเหลว: ' + err.message);
        }
    });

    el.registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const username = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const role = document.getElementById('reg-role').value;
        
        try {
            await window.supabaseService.signUp(username, password, name, role);
            alert('ลงทะเบียนผู้ใช้งานสำเร็จ! สามารถเข้าสู่ระบบได้ทันที');
            el.tabLogin.click();
        } catch (err) {
            alert('ลงทะเบียนล้มเหลว: ' + err.message);
        }
    });

    // ==========================================
    // A. DASHBOARD VIEW CONTROLLER & EXPORTS
    // ==========================================
    async function loadDashboardData() {
        if (!window.supabaseService.isConfigured()) return;
        
        state.fiscalYear = el.reportFiscalYear.value;
        if (state.userRole === 'guard') {
            state.locationFilter = 'บริเวณศาล';
        } else if (state.userRole === 'guard2') {
            state.locationFilter = 'บ้านพัก';
        } else {
            state.locationFilter = el.reportLocationFilter.value;
        }
        
        try {
            // 1. โหลดข้อมูลผลตรวจสอบทั้งหมด
            const report = await window.supabaseService.fetchAuditRecords(state.fiscalYear, state.locationFilter);
            
            // สรุปสถิติความคืบหน้า
            const total = report.length;
            const audited = report.filter(r => r.status !== 'pending').length;
            const normal = report.filter(r => r.status === 'normal').length;
            const damaged = report.filter(r => r.status === 'damaged').length;
            const lost = report.filter(r => r.status === 'lost').length;
            const pending = report.filter(r => r.status === 'pending').length;
            
            // อัปเดตตัวเลขการแสดงผล
            el.statNormal.innerText = normal;
            el.statDamaged.innerText = damaged;
            el.statLost.innerText = lost;
            el.statPending.innerText = pending;
            
            const percent = total > 0 ? Math.round((audited / total) * 100) : 0;
            el.statPercent.innerText = `${percent}%`;
            el.statRatioText.innerText = `ตรวจสอบแล้ว ${audited} จากทั้งหมด ${total} รายการ`;
            
            // คำนวณความยาว SVG Stroke
            const circleLength = 283; // 2 * PI * r (r=45)
            const strokeOffset = circleLength - (percent / 100) * circleLength;
            el.progressCircle.style.strokeDashoffset = strokeOffset;
            
            // 2. ดึงประวัติรายการตรวจสอบล่าสุด 10 รายการ
            const recents = await window.supabaseService.fetchRecentAuditLogs(state.fiscalYear);
            el.dashboardRecentTable.innerHTML = '';
            
            // กรองรายการล่าสุดตามบทบาทพื้นที่รับผิดชอบ
            let filteredRecents = recents;
            if (state.userRole === 'guard') {
                filteredRecents = recents.filter(log => log.assets && log.assets.location === 'บริเวณศาล');
            } else if (state.userRole === 'guard2') {
                filteredRecents = recents.filter(log => log.assets && log.assets.location === 'บ้านพัก');
            }
            
            if (filteredRecents.length === 0) {
                el.dashboardRecentTable.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; color: var(--text-tertiary);">ไม่มีประวัติการตรวจสอบล่าสุดในพื้นที่ของคุณ</td>
                    </tr>`;
            } else {
                filteredRecents.forEach(log => {
                    const statusText = {
                        'normal': 'ปกติ',
                        'damaged': 'ชำรุด',
                        'lost': 'สูญหาย'
                    };
                    const date = new Date(log.audited_at).toLocaleDateString('th-TH', {
                        day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit'
                    });
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td data-label="เลขครุภัณฑ์" style="font-weight: 600;">${log.assets ? log.assets.asset_number : '-'}</td>
                        <td data-label="ชื่อครุภัณฑ์">${log.assets ? log.assets.name : '-'}</td>
                        <td data-label="สถานที่เก็บ">${log.assets ? log.assets.location : '-'}</td>
                        <td data-label="สถานะ"><span class="badge badge-${log.status}">${statusText[log.status] || 'ไม่ระบุ'}</span></td>
                        <td data-label="ผู้ตรวจสอบ">${log.profiles ? log.profiles.display_name : 'ไม่ระบุ'}</td>
                        <td data-label="วันเวลา">${date} น.</td>
                    `;
                    el.dashboardRecentTable.appendChild(tr);
                });
            }
            
            // 3. โหลดรายชื่อสถานที่สำหรับใช้กรองรายงาน
            let locations = [];
            if (state.userRole === 'guard') {
                locations = ['บริเวณศาล'];
                el.reportLocationFilter.innerHTML = '';
            } else if (state.userRole === 'guard2') {
                locations = ['บ้านพัก'];
                el.reportLocationFilter.innerHTML = '';
            } else {
                locations = await window.supabaseService.fetchLocations();
                const currentSelected = el.reportLocationFilter.value;
                el.reportLocationFilter.innerHTML = '<option value="all">ทั้งหมด ทุกสถานที่</option>';
            }
            
            locations.forEach(loc => {
                const opt = document.createElement('option');
                opt.value = loc;
                opt.innerText = loc;
                if (loc === state.locationFilter) opt.selected = true;
                el.reportLocationFilter.appendChild(opt);
            });
            
        } catch (e) {
            console.error('Error loading dashboard:', e);
        }
    }

    el.reportFiscalYear.addEventListener('change', loadDashboardData);
    el.reportLocationFilter.addEventListener('change', loadDashboardData);

    // ส่งออกข้อมูลในรูปไฟล์ CSV (สำหรับเปิดใน Excel)
    el.btnExportCsv.addEventListener('click', async () => {
        try {
            const report = await window.supabaseService.fetchAuditRecords(state.fiscalYear, state.locationFilter);
            
            const statusMap = {
                'normal': 'ปกติ',
                'damaged': 'ชำรุด',
                'lost': 'สูญหาย',
                'pending': 'รอการตรวจสอบ'
            };
            
            // แปลงข้อมูลเป็นอาเรย์ข้อความ CSV (ใส่ BOM เพื่อให้ Excel รองรับภาษาไทยถูกต้อง)
            let csvContent = '\uFEFF';
            csvContent += 'ลำดับ,เลขครุภัณฑ์,ชื่อรายการครุภัณฑ์,สถานที่จัดเก็บ,สถานะการตรวจสอบ,ผู้ตรวจสอบ,วันเวลาตรวจสอบ,หมายเหตุ\n';
            
            report.forEach((item, index) => {
                const auditedTime = item.audited_at ? new Date(item.audited_at).toLocaleString('th-TH') : '-';
                const nameEscaped = `"${item.name.replace(/"/g, '""')}"`;
                const locEscaped = `"${item.location.replace(/"/g, '""')}"`;
                const notesEscaped = `"${item.notes.replace(/"/g, '""')}"`;
                
                csvContent += `${index + 1},${item.asset_number},${nameEscaped},${locEscaped},${statusMap[item.status] || '-'},${item.audited_by || '-'},${auditedTime},${notesEscaped}\n`;
            });
            
            // ดาวน์โหลดไฟล์ผ่านเบราว์เซอร์
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `AssetFlow_Report_${state.fiscalYear}_Location_${state.locationFilter}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            alert('การส่งออกข้อมูลล้มเหลว: ' + e.message);
        }
    });

    // ส่งออกข้อมูลเป็นเอกสารรายงาน PDF (พิมพ์ผ่านเบราว์เซอร์)
    el.btnExportPdf.addEventListener('click', () => {
        window.print();
    });

    // ==========================================
    // B. ASSET VIEW CONTROLLER & ACTIONS
    // ==========================================
    async function loadAssetsData() {
        if (!window.supabaseService.isConfigured()) return;
        
        const searchVal = el.assetSearchInput.value;
        let locationVal = 'all';
        if (state.userRole === 'guard') {
            locationVal = 'บริเวณศาล';
        } else if (state.userRole === 'guard2') {
            locationVal = 'บ้านพัก';
        } else {
            locationVal = el.assetFilterLocation.value;
        }
        
        try {
            // โหลดรายการพัสดุตามการค้นหาและฟิลเตอร์
            const assets = await window.supabaseService.fetchAssets(searchVal, locationVal);
            
            // โหลดรายชื่อสถานที่สำหรับเมนูกรอง
            let locations = [];
            if (state.userRole === 'guard') {
                locations = ['บริเวณศาล'];
                el.assetFilterLocation.innerHTML = '';
            } else if (state.userRole === 'guard2') {
                locations = ['บ้านพัก'];
                el.assetFilterLocation.innerHTML = '';
            } else {
                locations = await window.supabaseService.fetchLocations();
                const currentSelected = el.assetFilterLocation.value;
                el.assetFilterLocation.innerHTML = '<option value="all">สถานที่: ทั้งหมด</option>';
            }
            
            locations.forEach(loc => {
                const opt = document.createElement('option');
                opt.value = loc;
                opt.innerText = loc;
                if (loc === locationVal) opt.selected = true;
                el.assetFilterLocation.appendChild(opt);
            });

            // ดึงผลการตรวจสอบในปีงบฯ ปัจจุบัน เพื่อเช็คสถานะการตรวจสอบครุภัณฑ์แต่ละตัว
            const audits = await window.supabaseService.fetchAuditRecords(state.fiscalYear, 'all');
            const auditMap = new Map(audits.map(a => [a.asset_number, a.status]));

            // เรนเดอร์ตารางครุภัณฑ์
            el.assetsTableBody.innerHTML = '';
            state.selectedAssetIds.clear();
            el.selectedQrCount.innerText = '0';
            el.selectAllAssets.checked = false;

            if (assets.length === 0) {
                el.assetsTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; color: var(--text-tertiary); padding: 2rem;">ไม่พบรายการครุภัณฑ์ในระบบ</td>
                    </tr>`;
                return;
            }

            assets.forEach(asset => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-id', asset.id);
                
                // ตรวจสอบภาพครุภัณฑ์
                const imageHtml = asset.image_url 
                    ? `<img src="${asset.image_url}" style="width: 40px; height: 30px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);" alt="${asset.name}">` 
                    : `<i data-lucide="image" style="width: 20px; color: var(--text-tertiary);"></i>`;
                    
                // สถานะสแกนตรวจสอบในปีปัจจุบัน
                const auditStatus = auditMap.get(asset.asset_number) || 'pending';
                const statusTh = {
                    'normal': 'สแกนแล้ว (ปกติ)',
                    'damaged': 'สแกนแล้ว (ชำรุด)',
                    'lost': 'สแกนแล้ว (สูญหาย)',
                    'pending': 'ยังไม่ได้ตรวจสอบ'
                };
                const statusHtml = `<span class="badge badge-${auditStatus}">${statusTh[auditStatus]}</span>`;

                // แฮนเดิลแสดงปุ่มแก้ไข/ลบ เฉพาะผู้ใช้มีสิทธิ์
                const isOfficer = state.userRole !== 'auditor';
                const actionButtons = `
                    <div style="display: flex; gap: 0.25rem; justify-content: center;">
                        <button class="btn btn-secondary btn-view-details-row" style="padding: 0.3rem 0.5rem; font-size: 0.75rem;" title="ดูบัตรทะเบียนคุม">
                            <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="btn btn-secondary btn-audit-row" style="padding: 0.3rem 0.5rem; font-size: 0.75rem;" title="สแกนตรวจ">
                            <i data-lucide="clipboard-check" style="width: 14px; height: 14px;"></i>
                        </button>
                        ${isOfficer ? `
                        <button class="btn btn-secondary btn-edit-row" style="padding: 0.3rem 0.5rem; font-size: 0.75rem;" title="แก้ไข">
                            <i data-lucide="edit" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="btn btn-danger btn-delete-row" style="padding: 0.3rem 0.5rem; font-size: 0.75rem;" title="ลบ">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                        </button>
                        ` : ''}
                    </div>
                `;

                tr.innerHTML = `
                    <td><input type="checkbox" class="select-asset-check" value="${asset.id}"></td>
                    <td data-label="เลขครุภัณฑ์" class="cell-asset-number">${asset.asset_number}</td>
                    <td data-label="ชื่อรายการ" class="cell-name">${asset.name}</td>
                    <td data-label="สถานที่เก็บ" class="cell-location">${asset.location}</td>
                    <td data-label="ภาพถ่าย" style="text-align: center;">${imageHtml}</td>
                    <td data-label="สถานะปีนี้">${statusHtml}</td>
                    <td data-label="การจัดการ">${actionButtons}</td>
                `;

                // ฟังก์ชันเปิดป๊อปอัปดูรายละเอียดบัตรคุม
                const openDetails = async () => {
                    state.currentViewingAsset = asset;
                    document.getElementById('detail-gov-sector').innerText = asset.government_sector || 'สำนักงานศาลยุติธรรม';
                    document.getElementById('detail-dept').innerText = asset.department || 'ศาลเยาวชนและครอบครัวจังหวัดสตูล';
                    document.getElementById('detail-type').innerText = asset.asset_type || 'ครุภัณฑ์คอมพิวเตอร์';
                    document.getElementById('detail-asset-number').innerText = asset.asset_number;
                    document.getElementById('detail-characteristics').innerText = asset.characteristics || '-';
                    document.getElementById('detail-model-brand').innerText = asset.model_brand || '-';
                    document.getElementById('detail-location').innerText = asset.location || '-';
                    document.getElementById('detail-serial-number').innerText = asset.serial_number || '-';
                    document.getElementById('detail-vendor-name').innerText = asset.vendor_name || '-';
                    document.getElementById('detail-vendor-phone').innerText = asset.vendor_phone || '-';
                    document.getElementById('detail-vendor-address').innerText = asset.vendor_address || '-';
                    document.getElementById('detail-funding-type').innerText = asset.funding_type || '-';
                    document.getElementById('detail-acquisition-method').innerText = asset.acquisition_method || '-';

                    const transBody = document.getElementById('detail-transactions-body');
                    transBody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 1.5rem;">กำลังโหลดประวัติบัญชี...</td></tr>';
                    
                    document.getElementById('asset-details-modal').classList.add('active');
                    lucide.createIcons();

                    try {
                        const trans = await window.supabaseService.fetchAssetTransactions(asset.id);
                        state.currentViewingAssetTransactions = trans || [];
                        renderDetailsTransactions(state.currentViewingAssetTransactions, false);
                    } catch (err) {
                        console.error('Failed to load asset details transactions:', err);
                        transBody.innerHTML = '<tr><td colspan="11" style="text-align: center; color: #ef4444; padding: 1.5rem;">โหลดประวัติล้มเหลว</td></tr>';
                    }
                };

                tr.querySelector('.btn-view-details-row').addEventListener('click', openDetails);
                tr.querySelector('.cell-name').style.cursor = 'pointer';
                tr.querySelector('.cell-name').addEventListener('click', openDetails);
                tr.querySelector('.cell-asset-number').style.cursor = 'pointer';
                tr.querySelector('.cell-asset-number').addEventListener('click', openDetails);

                // อีเวนต์ในแถวตาราง
                tr.querySelector('.btn-audit-row').addEventListener('click', () => {
                    openAuditForm(asset);
                });
                
                if (isOfficer) {
                    tr.querySelector('.btn-edit-row').addEventListener('click', () => {
                        openAssetModal(asset);
                    });
                    tr.querySelector('.btn-delete-row').addEventListener('click', async () => {
                        if (confirm(`คุณแน่ใจว่าต้องการลบครุภัณฑ์หมายเลข ${asset.asset_number} หรือไม่?`)) {
                            try {
                                await window.supabaseService.deleteAsset(asset.id);
                                loadAssetsData();
                            } catch (e) {
                                alert('ไม่สามารถลบข้อมูลได้: ' + e.message);
                            }
                        }
                    });
                }

                // อีเวนต์เลือกพิมพ์ QR Code
                const checkbox = tr.querySelector('.select-asset-check');
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        state.selectedAssetIds.add(asset.id);
                    } else {
                        state.selectedAssetIds.delete(asset.id);
                    }
                    el.selectedQrCount.innerText = state.selectedAssetIds.size;
                });

                el.assetsTableBody.appendChild(tr);
            });

            lucide.createIcons();
        } catch (e) {
            console.error('Error loading assets:', e);
        }
    }

    el.assetSearchInput.addEventListener('input', debounce(loadAssetsData, 300));
    el.assetFilterLocation.addEventListener('change', loadAssetsData);

    // สลับเลือกพัสดุทั้งหมด
    el.selectAllAssets.addEventListener('change', () => {
        const checkboxes = el.assetsTableBody.querySelectorAll('.select-asset-check');
        const checked = el.selectAllAssets.checked;
        
        checkboxes.forEach(cb => {
            cb.checked = checked;
            const assetId = cb.value;
            if (checked) {
                state.selectedAssetIds.add(assetId);
            } else {
                state.selectedAssetIds.delete(assetId);
            }
        });
        
        el.selectedQrCount.innerText = state.selectedAssetIds.size;
    });

    // ดีเลย์หน่วงเวลาฟังก์ชันค้นหาป้องกันคิวรีรัว (Debounce)
    function debounce(func, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // ==========================================
    // ASSET EDIT/ADD MODAL CONTROLLER
    // ==========================================
    function openAssetModal(asset = null) {
        if (asset) {
            el.assetModalTitle.innerText = 'แก้ไขข้อมูลครุภัณฑ์';
            el.assetFormId.value = asset.id;
            el.assetFormNumber.value = asset.asset_number;
            el.assetFormName.value = asset.name;
            el.assetFormLocation.value = asset.location;
            el.assetFormImage.value = asset.image_url || '';
            el.assetFormNumber.readOnly = true; // ห้ามแก้เลขครุภัณฑ์หลัก
            
            document.getElementById('asset-form-gov-sector').value = asset.government_sector || '';
            document.getElementById('asset-form-dept').value = asset.department || '';
            document.getElementById('asset-form-type').value = asset.asset_type || '';
            document.getElementById('asset-form-characteristics').value = asset.characteristics || '';
            document.getElementById('asset-form-model-brand').value = asset.model_brand || '';
            document.getElementById('asset-form-serial').value = asset.serial_number || '';
            document.getElementById('asset-form-vendor-name').value = asset.vendor_name || '';
            document.getElementById('asset-form-vendor-address').value = asset.vendor_address || '';
            document.getElementById('asset-form-vendor-phone').value = asset.vendor_phone || '';
            document.getElementById('asset-form-funding-type').value = asset.funding_type || '';
            document.getElementById('asset-form-acq-method').value = asset.acquisition_method || '';
        } else {
            el.assetModalTitle.innerText = 'เพิ่มข้อมูลครุภัณฑ์ใหม่';
            el.assetFormId.value = '';
            el.assetFormNumber.value = '';
            el.assetFormName.value = '';
            el.assetFormLocation.value = '';
            el.assetFormImage.value = '';
            el.assetFormNumber.readOnly = false;
            
            document.getElementById('asset-form-gov-sector').value = '';
            document.getElementById('asset-form-dept').value = '';
            document.getElementById('asset-form-type').value = '';
            document.getElementById('asset-form-characteristics').value = '';
            document.getElementById('asset-form-model-brand').value = '';
            document.getElementById('asset-form-serial').value = '';
            document.getElementById('asset-form-vendor-name').value = '';
            document.getElementById('asset-form-vendor-address').value = '';
            document.getElementById('asset-form-vendor-phone').value = '';
            document.getElementById('asset-form-funding-type').value = '';
            document.getElementById('asset-form-acq-method').value = '';
        }
        el.assetModal.classList.add('active');
    }

    el.btnAddAsset.addEventListener('click', () => openAssetModal(null));
    el.btnCloseAssetModal.addEventListener('click', () => el.assetModal.classList.remove('active'));
    el.btnCancelAssetModal.addEventListener('click', () => el.assetModal.classList.remove('active'));

    el.assetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const assetData = {
            id: el.assetFormId.value || null,
            name: el.assetFormName.value,
            asset_number: el.assetFormNumber.value,
            location: el.assetFormLocation.value,
            government_sector: document.getElementById('asset-form-gov-sector').value || null,
            department: document.getElementById('asset-form-dept').value || null,
            asset_type: document.getElementById('asset-form-type').value || null,
            characteristics: document.getElementById('asset-form-characteristics').value || null,
            model_brand: document.getElementById('asset-form-model-brand').value || null,
            serial_number: document.getElementById('asset-form-serial').value || null,
            vendor_name: document.getElementById('asset-form-vendor-name').value || null,
            vendor_address: document.getElementById('asset-form-vendor-address').value || null,
            vendor_phone: document.getElementById('asset-form-vendor-phone').value || null,
            funding_type: document.getElementById('asset-form-funding-type').value || null,
            acquisition_method: document.getElementById('asset-form-acq-method').value || null,
            image_url: el.assetFormImage.value || null
        };

        try {
            await window.supabaseService.saveAsset(assetData);
            el.assetModal.classList.remove('active');
            loadAssetsData();
        } catch (err) {
            alert('บันทึกข้อมูลไม่สำเร็จ: ' + err.message);
        }
    });

    // ==========================================
    // C. CAMERA QR CODE SCANNER
    // ==========================================
    function startCameraScanner() {
        el.btnStartScanner.style.display = 'none';
        el.btnStopScanner.style.display = 'inline-flex';
        
        // กำหนดการสแกนผ่าน html5-qrcode
        if (!state.html5QrScanner) {
            state.html5QrScanner = new Html5Qrcode("reader");
        }

        // คอนฟิกตัวสแกนกล้อง
        const config = { 
            fps: 15, 
            qrbox: function(width, height) {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size };
            }
        };

        state.html5QrScanner.start(
            { facingMode: "environment" }, // กล้องหลัง
            config,
            onScanSuccess,
            onScanFailure
        ).catch(err => {
            console.error("Camera access failed:", err);
            alert("ไม่สามารถเปิดกล้องได้ กรุณาอนุมัติสิทธิ์การเข้าถึงกล้องถ่ายภาพบนเบราว์เซอร์");
            stopCameraScanner();
        });
    }

    function stopCameraScanner() {
        if (state.html5QrScanner && state.html5QrScanner.isScanning) {
            state.html5QrScanner.stop().then(() => {
                console.log("Scanner stopped");
                el.btnStartScanner.style.display = 'inline-flex';
                el.btnStopScanner.style.display = 'none';
            }).catch(err => console.error("Error stopping scanner:", err));
        } else {
            el.btnStartScanner.style.display = 'inline-flex';
            el.btnStopScanner.style.display = 'none';
        }
    }

    async function onScanSuccess(decodedText, decodedResult) {
        // เมื่อสแกนติด
        console.log(`Scan matched: ${decodedText}`);
        
        // ส่งสัญญาณเสียงและสั่น (ถ้าเครื่องรองรับ)
        try {
            if (navigator.vibrate) navigator.vibrate(100);
        } catch (e) {}

        stopCameraScanner();
        
        // พยายามดึงเลขครุภัณฑ์จากข้อความสแกน (เผื่อเป็น Deep Link หรือ JSON)
        // เลขครุภัณฑ์อาจติดมาเป็น URL เช่น https://domain.com/?asset=1800-007-0019/0014
        let assetNumber = decodedText.trim();
        if (decodedText.includes('?asset=')) {
            const urlObj = new URL(decodedText);
            assetNumber = urlObj.searchParams.get('asset') || decodedText;
        } else if (decodedText.startsWith('ASSET:')) {
            assetNumber = decodedText.replace('ASSET:', '');
        }

        // ค้นหาข้อมูลใน Database ทันที
        await searchAndAuditAsset(assetNumber);
    }

    function onScanFailure(error) {
        // การสแกนล้มเหลว (ทำงานรัวๆ ในแต่ละเฟรม ไม่จำเป็นต้องพ่น Alert)
    }

    el.btnStartScanner.addEventListener('click', startCameraScanner);
    el.btnStopScanner.addEventListener('click', stopCameraScanner);

    // ดึงรหัสครุภัณฑ์จากช่องกรอกข้อมูลปกติ (Manual Search)
    el.btnManualSearchAudit.addEventListener('click', () => {
        const val = el.manualSearchBarcode.value;
        if (!val) {
            alert('กรุณากรอกเลขครุภัณฑ์ก่อนการสืบค้น');
            return;
        }
        searchAndAuditAsset(val);
    });

    async function searchAndAuditAsset(assetNumber) {
        try {
            const asset = await window.supabaseService.fetchAssetByNumber(assetNumber);
            if (asset) {
                openAuditForm(asset);
            } else {
                alert(`ไม่พบเลขครุภัณฑ์หมายเลข [ ${assetNumber} ] ในระบบฐานข้อมูล\nกรุณาแจ้งเจ้าหน้าที่พัสดุเพื่อทำการป้อนข้อมูลเข้าระบบก่อนตรวจ`);
            }
        } catch (e) {
            alert('เกิดข้อผิดพลาดในการตรวจสอบฐานข้อมูล: ' + e.message);
        }
    }

    // ==========================================
    // D. AUDIT RECORD FORM VIEW
    // ==========================================
    async function openAuditForm(asset) {
        showView('audit-view');
        
        // ล้างฟอร์ม/ใส่ค่า
        el.auditAssetId.value = asset.id;
        el.auditDisplayNumber.innerText = asset.asset_number;
        el.auditDisplayName.innerText = asset.name;
        el.auditDisplayLocation.innerText = asset.location;
        el.auditQrLabel.innerText = asset.asset_number;
        el.auditNotes.value = '';
        
        // เซ็ตภาพถ่ายปัจจุบัน
        if (asset.image_url) {
            el.auditImagePreview.innerHTML = `<img src="${asset.image_url}" alt="ภาพครุภัณฑ์">`;
        } else {
            el.auditImagePreview.innerHTML = `
                <div class="placeholder">
                    <i data-lucide="image" style="width: 32px; height: 32px;"></i>
                    <span>ไม่มีภาพถ่ายครุภัณฑ์</span>
                </div>`;
            lucide.createIcons();
        }

        // ตรวจเช็คว่าเคยมีประวัติการบันทึกในปีงบฯ นี้แล้วหรือยัง
        try {
            const audits = await window.supabaseService.fetchAuditRecords(state.fiscalYear, 'all');
            const currentAudit = audits.find(a => a.asset_id === asset.id && a.status !== 'pending');
            
            if (currentAudit) {
                // เคยตรวจสอบแล้ว มีผลลัพธ์
                document.querySelector(`input[name="audit-status"][value="${currentAudit.status}"]`).checked = true;
                el.auditNotes.value = currentAudit.notes || '';
            } else {
                // ยังไม่ได้ตรวจ กำหนดค่าเริ่มต้นเป็น ปกติ (normal)
                document.querySelector('input[name="audit-status"][value="normal"]').checked = true;
            }
        } catch (e) {
            console.warn('Failed to load past audit log', e);
        }

        // ดึงประวัติบัญชีความเคลื่อนไหวและค่าเสื่อมราคาพัสดุ
        const transBody = document.getElementById('audit-transactions-body');
        if (transBody) {
            transBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 1rem;">กำลังโหลดประวัติบัญชี...</td></tr>';
            try {
                const trans = await window.supabaseService.fetchAssetTransactions(asset.id);
                transBody.innerHTML = '';
                if (trans.length === 0) {
                    transBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-tertiary); padding: 1rem;">ไม่มีประวัติการคำนวณในระบบ</td></tr>';
                } else {
                    trans.forEach(t => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td style="padding: 0.4rem;">${t.transaction_date || '-'}</td>
                            <td style="padding: 0.4rem;">${t.description || '-'}</td>
                            <td style="padding: 0.4rem; text-align: right;">${t.annual_depreciation ? t.annual_depreciation.toLocaleString('th-TH', {minimumFractionDigits: 2}) : '0.00'}</td>
                            <td style="padding: 0.4rem; text-align: right;">${t.accumulated_depreciation ? t.accumulated_depreciation.toLocaleString('th-TH', {minimumFractionDigits: 2}) : '0.00'}</td>
                            <td style="padding: 0.4rem; text-align: right;">${t.net_value ? t.net_value.toLocaleString('th-TH', {minimumFractionDigits: 2}) : '0.00'}</td>
                        `;
                        transBody.appendChild(tr);
                    });
                }
            } catch (transErr) {
                console.error('Failed to load asset transactions:', transErr);
                transBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #ef4444; padding: 1rem;">โหลดประวัติล้มเหลว</td></tr>';
            }
        }

        // สร้าง QR Code ขนาดเล็กสำหรับพัสดุชิ้นนี้ (วาดลง Canvas)
        generateQRForCanvas(el.auditQrCanvas, asset.asset_number);
    }

    // วาดรูป QR Code
    function generateQRForCanvas(canvasEl, text) {
        // ใช้ไลบรารี QRCode ที่นำผ่าน CDN (สร้างลิงก์สำหรับสแกนเข้าตรวจสอบโดยตรงได้)
        // เพื่อความสมบูรณ์แบบ เราจะเข้ารหัสคีย์ QR เป็น Deep Link ปลุกแอปพลิเคชัน
        const currentUrl = window.location.href.split('?')[0];
        const qrPayload = `${currentUrl}?asset=${text}`;
        
        QRCode.toCanvas(canvasEl, qrPayload, {
            width: 120,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        }, function(error) {
            if (error) console.error(error);
        });
    }

    el.btnBackToList.addEventListener('click', () => {
        showView('assets-view');
    });

    // จัดการการอัปโหลดภาพทางกล้องมือถือ/เลือกไฟล์
    el.auditFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // เช็คขนาดไฟล์เบื้องต้น (ไม่เกิน 2MB เพื่อความประหยัด Bandwidth)
        if (file.size > 2 * 1024 * 1024) {
            alert('ภาพถ่ายมีขนาดใหญ่เกิน 2MB กรุณาเลือกใหม่หรือลดความละเอียดกล้องถ่ายรูป');
            return;
        }

        const assetNumber = el.auditDisplayNumber.innerText;
        el.auditImagePreview.innerHTML = `
            <div class="placeholder">
                <div style="width: 24px; height: 24px; border: 3px solid var(--text-tertiary); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 1s infinite linear;"></div>
                <span>กำลังอัปโหลดรูปภาพ...</span>
            </div>`;

        try {
            const uploadedUrl = await window.supabaseService.uploadAssetImage(file, assetNumber);
            el.auditImagePreview.innerHTML = `<img src="${uploadedUrl}" alt="ภาพอัปโหลดครุภัณฑ์">`;
            alert('อัปโหลดรูปภาพครุภัณฑ์สำเร็จ!');
        } catch (err) {
            alert('อัปโหลดรูปภาพล้มเหลว: ' + err.message);
            el.auditImagePreview.innerHTML = `
                <div class="placeholder">
                    <i data-lucide="image" style="width: 32px; height: 32px;"></i>
                    <span>อัปโหลดภาพขัดข้อง</span>
                </div>`;
            lucide.createIcons();
        }
    });

    // บันทึกฟอร์มผลการสแกนตรวจสอบ
    el.auditRecordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const assetId = el.auditAssetId.value;
        const status = document.querySelector('input[name="audit-status"]:checked').value;
        const notes = el.auditNotes.value;
        const year = el.auditFiscalYear.value;

        try {
            await window.supabaseService.saveAuditRecord(assetId, status, notes, year);
            alert('บันทึกข้อมูลการตรวจสอบครุภัณฑ์เรียบร้อยแล้ว!');
            showView('assets-view');
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
        }
    });

    // ==========================================
    // E. PDF SMART PARSER & BULK IMPORT
    // ==========================================
    
    // ตั้งค่า Drag and Drop สำหรับอัปโหลด PDF
    ['dragenter', 'dragover'].forEach(eventName => {
        el.pdfDragDropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            el.pdfDragDropZone.style.borderColor = 'var(--color-primary)';
            el.pdfDragDropZone.style.backgroundColor = 'var(--bg-tertiary)';
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        el.pdfDragDropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            el.pdfDragDropZone.style.borderColor = 'var(--border-color)';
            el.pdfDragDropZone.style.backgroundColor = 'var(--bg-secondary)';
        }, false);
    });

    el.pdfDragDropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            state.lastPDFFile = files[0];
            handlePDFFile(files[0]);
        } else {
            alert('กรุณาเลือกหรือโยนไฟล์ประเภท PDF เท่านั้น');
        }
    });

    el.pdfDragDropZone.addEventListener('click', () => {
        el.pdfFileInput.click();
    });

    el.pdfFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            state.lastPDFFile = file;
            handlePDFFile(file);
        }
    });

    // เริ่มประมวลวิเคราะห์ไฟล์ PDF
    function handlePDFFile(file) {
        el.pdfProgressContainer.style.display = 'block';
        el.pdfProgressBar.style.width = '0%';
        el.pdfStatusText.style.display = 'block';
        el.pdfStatusText.innerText = 'กำลังเปิดไฟล์และโหลดเครื่องมือสแกนเอกสาร...';
        el.pdfPreviewSection.style.display = 'none';
        
        const previewContainer = document.getElementById('pdf-ocr-preview-container');
        if (previewContainer) previewContainer.style.display = 'none';

        const reader = new FileReader();
        reader.onload = async function() {
            const arrayBuffer = this.result;
            
            try {
                // เรียกใช้คลาสถอดรหัสวิเคราะห์ PDF
                const parsed = await window.pdfAssetParser.parse(arrayBuffer, (percent, customMsg) => {
                    el.pdfProgressBar.style.width = `${percent}%`;
                    el.pdfStatusText.innerText = customMsg || `กำลังวิเคราะห์เอกสารและค้นหาเลขครุภัณฑ์: ${percent}%`;
                });

                // ตรวจเช็คข้อมูลครุภัณฑ์ที่มีอยู่แล้วในฐานข้อมูลแบบอัตโนมัติ
                let existingAssetNumbers = new Set();
                if (window.supabaseService.isConfigured()) {
                    try {
                        el.pdfStatusText.innerText = 'กำลังตรวจสอบข้อมูลความซ้ำซ้อนกับฐานข้อมูล...';
                        const existingAssets = await window.supabaseService.fetchAssets('', 'all');
                        existingAssetNumbers = new Set(existingAssets.map(a => a.asset_number.trim()));
                    } catch (dbErr) {
                        console.warn('Failed to fetch existing assets for comparison:', dbErr);
                    }
                }

                // แนบข้อมูลความซ้ำซ้อนในแต่ละตัวพัสดุ
                parsed.forEach(asset => {
                    asset.isDuplicate = existingAssetNumbers.has(asset.asset_number.trim());
                });

                state.parsedPDFAssets = parsed;
                renderPDFParsedTable(parsed);
                
                const newCount = parsed.filter(a => !a.isDuplicate).length;
                const dupCount = parsed.filter(a => a.isDuplicate).length;
                el.pdfStatusText.innerText = `วิเคราะห์สำเร็จ! พบครุภัณฑ์ใหม่ ${newCount} รายการ, ซ้ำในระบบ ${dupCount} รายการ (ระบบติ๊กเลือกเฉพาะรายการใหม่ให้โดยอัตโนมัติ)`;
            } catch (err) {
                alert(err.message);
                el.pdfProgressContainer.style.display = 'none';
                el.pdfStatusText.style.display = 'none';
            }
        };

        reader.readAsArrayBuffer(file);
    }

    // แสดงตารางตัวอย่างข้อมูลที่สกัดจาก PDF สำเร็จ
    function renderPDFParsedTable(assets) {
        el.pdfParsedTableBody.innerHTML = '';
        
        if (assets.length === 0) {
            const rawText = window.pdfAssetParser.lastRawText || 'ไม่มีข้อความที่ดึงได้';
            el.pdfParsedTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: #ef4444; padding: 2rem;">
                        <div style="font-weight: 600; margin-bottom: 0.5rem;">
                            <i data-lucide="alert-circle" style="vertical-align: middle; margin-right: 0.5rem;"></i>
                            วิเคราะห์เสร็จสิ้น แต่ไม่พบรหัสตามรูปแบบครุภัณฑ์ตัวอย่าง (เช่น 7440-001-0001/26049) ในหน้านี้
                        </div>
                        <div style="text-align: left; background-color: var(--bg-tertiary); padding: 1rem; border-radius: 6px; font-size: 0.8rem; font-family: monospace; white-space: pre-wrap; margin-top: 1rem; max-height: 200px; overflow-y: auto; color: var(--text-secondary); border: 1px dashed var(--border-color);">
                            <strong>ข้อความดิบที่ดึงได้จากเอกสาร (Debug OCR Text):</strong>\n${rawText}
                        </div>
                    </td>
                </tr>`;
            el.parsedCount.innerText = '0';
            el.selectedImportCount.innerText = '0';
            el.pdfPreviewSection.style.display = 'block';
            lucide.createIcons();
            return;
        }

        assets.forEach((asset, index) => {
            const tr = document.createElement('tr');
            
            // ตั้งค่าสถานะการติ๊ก (ถ้าซ้ำจะไม่ติ๊กโดยอัตโนมัติ)
            const isChecked = !asset.isDuplicate;
            
            // สไตล์สถานะความซ้ำซ้อน
            const statusHtml = asset.isDuplicate 
                ? `<span class="badge badge-pending">ซ้ำในระบบ</span>` 
                : `<span class="badge badge-normal">เพิ่มใหม่</span>`;

            tr.innerHTML = `
                <td><input type="checkbox" class="import-asset-check" value="${index}" ${isChecked ? 'checked' : ''}></td>
                <td style="font-weight: 600;"><span class="editable-cell" data-field="asset_number" contenteditable="true">${asset.asset_number}</span></td>
                <td><span class="editable-cell" data-field="name" contenteditable="true">${asset.name}</span></td>
                <td><span class="editable-cell" data-field="location" contenteditable="true">${asset.location}</span></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: space-between;">
                        ${statusHtml}
                        <button class="btn-toggle-details" style="padding: 0.2rem 0.4rem; font-size: 0.75rem; border-radius: 4px; background-color: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-secondary); cursor: pointer;" title="แสดงรายละเอียด/ฟิลด์ทั้งหมด">
                            <i data-lucide="chevron-down" style="width: 14px; height: 14px; vertical-align: middle;"></i>
                        </button>
                    </div>
                </td>
            `;

            // ดักจับการแก้ไขแบบสดบนตารางโดยดับเบิ้ลคลิก/แก้ไขตรงๆ
            tr.querySelectorAll('.editable-cell').forEach(cell => {
                cell.addEventListener('blur', (e) => {
                    const field = cell.getAttribute('data-field');
                    const value = cell.innerText.trim();
                    state.parsedPDFAssets[index][field] = value;
                });
            });

            // สร้างส่วนแสดงรายละเอียดแบบขยายแถว (Accordion)
            const detailsTr = document.createElement('tr');
            detailsTr.className = 'details-row';
            detailsTr.style.display = 'none';
            detailsTr.style.backgroundColor = 'var(--bg-tertiary)';
            
            detailsTr.innerHTML = `
                <td colspan="5" style="padding: 1.5rem; border-bottom: 2px solid var(--border-color);">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; text-align: left;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.75rem; color: var(--text-secondary); font-weight: bold;">ส่วนราชการ</label>
                            <input type="text" class="form-control ocr-field" data-field="government_sector" value="${asset.government_sector || ''}" style="font-size: 0.85rem; padding: 0.4rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.75rem; color: var(--text-secondary); font-weight: bold;">หน่วยงาน</label>
                            <input type="text" class="form-control ocr-field" data-field="department" value="${asset.department || ''}" style="font-size: 0.85rem; padding: 0.4rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.75rem; color: var(--text-secondary); font-weight: bold;">ประเภทครุภัณฑ์</label>
                            <input type="text" class="form-control ocr-field" data-field="asset_type" value="${asset.asset_type || ''}" style="font-size: 0.85rem; padding: 0.4rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.75rem; color: var(--text-secondary); font-weight: bold;">ลักษณะ/คุณสมบัติ</label>
                            <input type="text" class="form-control ocr-field" data-field="characteristics" value="${asset.characteristics || ''}" style="font-size: 0.85rem; padding: 0.4rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.75rem; color: var(--text-secondary); font-weight: bold;">รุ่น/แบบ (ยี่ห้อ)</label>
                            <input type="text" class="form-control ocr-field" data-field="model_brand" value="${asset.model_brand || ''}" style="font-size: 0.85rem; padding: 0.4rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.75rem; color: var(--text-secondary); font-weight: bold;">หมายเลขเครื่อง</label>
                            <input type="text" class="form-control ocr-field" data-field="serial_number" value="${asset.serial_number || ''}" style="font-size: 0.85rem; padding: 0.4rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.75rem; color: var(--text-secondary); font-weight: bold;">ชื่อผู้ขาย/ผู้จัดจ้าง</label>
                            <input type="text" class="form-control ocr-field" data-field="vendor_name" value="${asset.vendor_name || ''}" style="font-size: 0.85rem; padding: 0.4rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.75rem; color: var(--text-secondary); font-weight: bold;">ที่อยู่ผู้ขาย</label>
                            <input type="text" class="form-control ocr-field" data-field="vendor_address" value="${asset.vendor_address || ''}" style="font-size: 0.85rem; padding: 0.4rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.75rem; color: var(--text-secondary); font-weight: bold;">โทรศัพท์ผู้ขาย</label>
                            <input type="text" class="form-control ocr-field" data-field="vendor_phone" value="${asset.vendor_phone || ''}" style="font-size: 0.85rem; padding: 0.4rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.75rem; color: var(--text-secondary); font-weight: bold;">ประเภทเงิน</label>
                            <input type="text" class="form-control ocr-field" data-field="funding_type" value="${asset.funding_type || ''}" style="font-size: 0.85rem; padding: 0.4rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.75rem; color: var(--text-secondary); font-weight: bold;">วิธีการได้มา</label>
                            <input type="text" class="form-control ocr-field" data-field="acquisition_method" value="${asset.acquisition_method || ''}" style="font-size: 0.85rem; padding: 0.4rem;">
                        </div>
                    </div>
                </td>
            `;

            // ดักจับการกรอกข้อมูลแก้ไขภายในกล่องดีเทล
            detailsTr.querySelectorAll('.ocr-field').forEach(input => {
                input.addEventListener('input', (e) => {
                    const field = input.getAttribute('data-field');
                    const value = input.value.trim();
                    state.parsedPDFAssets[index][field] = value;
                });
            });

            // ดักสลับปิด/เปิดรายละเอียด
            tr.querySelector('.btn-toggle-details').addEventListener('click', () => {
                const isHidden = detailsTr.style.display === 'none';
                detailsTr.style.display = isHidden ? 'table-row' : 'none';
                const icon = tr.querySelector('.btn-toggle-details i');
                if (icon) {
                    icon.setAttribute('data-lucide', isHidden ? 'chevron-up' : 'chevron-down');
                    lucide.createIcons();
                }
            });

            // ดักสลับติ๊กเลือกนำเข้า
            tr.querySelector('.import-asset-check').addEventListener('change', updateImportCount);

            el.pdfParsedTableBody.appendChild(tr);
            el.pdfParsedTableBody.appendChild(detailsTr);
        });

        el.parsedCount.innerText = assets.length;
        el.pdfPreviewSection.style.display = 'block';
        
        // เซ็ตตัวเลือก "เลือกทั้งหมด" เริ่มต้น ให้เป็นจริงถ้ามีตัวสินค้าใหม่ที่ไม่ซ้ำ
        const hasNew = assets.some(a => !a.isDuplicate);
        el.selectAllImports.checked = hasNew;
        
        updateImportCount();
    }

    // อัปเดตยอดรวมรายการที่จะกดบันทึกนำเข้า
    function updateImportCount() {
        const checkedBoxes = el.pdfParsedTableBody.querySelectorAll('.import-asset-check:checked');
        el.selectedImportCount.innerText = checkedBoxes.length;
    }

    el.selectAllImports.addEventListener('change', () => {
        const checkboxes = el.pdfParsedTableBody.querySelectorAll('.import-asset-check');
        const checked = el.selectAllImports.checked;
        checkboxes.forEach(cb => {
            cb.checked = checked;
        });
        updateImportCount();
    });

    // กดยืนยันการอิมพอร์ตข้อมูลเข้าดาต้าเบส
    el.btnImportConfirm.addEventListener('click', async () => {
        const checkedBoxes = el.pdfParsedTableBody.querySelectorAll('.import-asset-check:checked');
        if (checkedBoxes.length === 0) {
            alert('กรุณาเลือกพัสดุอย่างน้อย 1 รายการเพื่อบันทึก');
            return;
        }

        const assetsToImport = [];
        checkedBoxes.forEach(cb => {
            const idx = parseInt(cb.value);
            assetsToImport.push(state.parsedPDFAssets[idx]);
        });

        if (confirm(`คุณแน่ใจว่าต้องการนำเข้าข้อมูลพัสดุที่เลือก ${assetsToImport.length} รายการ หรือไม่?\n\n(ระบบจะบันทึกรายการใหม่ และจะปรับปรุงข้อมูลพัสดุเดิมในระบบให้โดยอัตโนมัติหากพบว่ามีเลขครุภัณฑ์ซ้ำกัน)`)) {
            el.btnImportConfirm.disabled = true;
            el.btnImportConfirm.innerText = 'กำลังบันทึกเข้าระบบ...';

            try {
                await window.supabaseService.bulkInsertAssets(assetsToImport);
                alert(`นำเข้าและปรับปรุงข้อมูลครุภัณฑ์สำเร็จจำนวน ${assetsToImport.length} รายการ!`);
                
                // เคลียร์และสลับไปหน้ารายการครุภัณฑ์เพื่อตรวจเช็ค
                el.pdfPreviewSection.style.display = 'none';
                el.pdfProgressContainer.style.display = 'none';
                el.pdfStatusText.style.display = 'none';
                el.pdfFileInput.value = '';
                
                showView('assets-view');
            } catch (err) {
                alert('เกิดปัญหาในการจัดเก็บ: ' + err.message);
            } finally {
                el.btnImportConfirm.disabled = false;
                el.btnImportConfirm.innerHTML = '<i data-lucide="save"></i> บันทึกข้อมูลที่เลือกเข้าฐานข้อมูล';
                lucide.createIcons();
            }
        }
    });

    // ==========================================
    // F. BULK QR CODE PRINT PREVIEW VIEW
    // ==========================================
    el.btnPrintSelectedQr.addEventListener('click', async () => {
        if (state.selectedAssetIds.size === 0) {
            alert('กรุณาติ๊กเลือกพัสดุที่ต้องการพิมพ์ QR Code จากตารางอย่างน้อย 1 รายการ');
            return;
        }

        try {
            // โหลดรายละเอียดพัสดุทั้งหมดเพื่อนำมาพิมพ์
            const assets = await window.supabaseService.fetchAssets('all', 'all');
            const selectedAssets = assets.filter(a => state.selectedAssetIds.has(a.id));
            
            showView('print-preview-view');
            el.printQrGrid.innerHTML = '';

            selectedAssets.forEach(asset => {
                const qrCard = document.createElement('div');
                qrCard.className = 'qr-card-print';
                
                // สร้าง Canvas โฮสต์ QR
                const canvas = document.createElement('canvas');
                canvas.className = 'qr-canvas';
                
                const detail = document.createElement('div');
                detail.className = 'qr-details';
                detail.innerHTML = `
                    <div class="qr-num">${asset.asset_number}</div>
                    <div style="font-size: 0.7rem; font-weight: 500; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${asset.name}</div>
                    <div style="font-size: 0.65rem; color: #555555; margin-top: 0.25rem;">สถานที่: ${asset.location}</div>
                `;
                
                qrCard.appendChild(canvas);
                qrCard.appendChild(detail);
                el.printQrGrid.appendChild(qrCard);
                
                // เจน QR Code ลง Canvas (สร้างเป็น Deep Link แอดเดรส)
                generateQRForCanvas(canvas, asset.asset_number);
            });

        } catch (e) {
            alert('โหลดพรีวิวพิมพ์ QR ผิดพลาด: ' + e.message);
        }
    });

    el.btnExecutePrint.addEventListener('click', () => {
        window.print();
    });

    el.btnClosePrint.addEventListener('click', () => {
        showView('assets-view');
    });

    // อีเวนต์ปิดหน้าต่างรายละเอียดพัสดุ
    const closeAssetDetailsModal = () => {
        document.getElementById('asset-details-modal').classList.remove('active');
    };
    document.getElementById('btn-close-details-modal').addEventListener('click', closeAssetDetailsModal);
    document.getElementById('btn-close-details-footer').addEventListener('click', closeAssetDetailsModal);

    // ปุ่มกดแก้ไขข้อมูลพัสดุจากหน้ารายละเอียดบัตรคุม
    const btnEditFromDetails = document.getElementById('btn-edit-from-details');
    if (btnEditFromDetails) {
        btnEditFromDetails.addEventListener('click', () => {
            if (state.currentViewingAsset) {
                closeAssetDetailsModal();
                openAssetModal(state.currentViewingAsset);
            }
        });
    }

    // ==========================================
    // DEPRECIATION TRANSACTIONS EDIT CONTROLLER
    // ==========================================
    function renderDetailsTransactions(transList, isEditing = false) {
        const transBody = document.getElementById('detail-transactions-body');
        const tableHeaderRow = document.getElementById('details-table-header-row');
        if (!transBody || !tableHeaderRow) return;
        
        tableHeaderRow.innerHTML = `
            <th style="width: 85px; padding: 0.5rem;">วันเดือนปี</th>
            <th style="width: 75px; padding: 0.5rem;">ที่เอกสาร</th>
            <th style="width: 130px; padding: 0.5rem;">รายการ</th>
            <th style="width: 55px; padding: 0.5rem; text-align: center;">จำนวนหน่วย</th>
            <th style="width: 80px; padding: 0.5rem; text-align: right;">ราคาต่อหน่วย</th>
            <th style="width: 80px; padding: 0.5rem; text-align: right;">มูลค่ารวม</th>
            <th style="width: 55px; padding: 0.5rem; text-align: center;">อายุใช้งาน</th>
            <th style="width: 60px; padding: 0.5rem; text-align: center;">อัตราค่าเสื่อม</th>
            <th style="width: 85px; padding: 0.5rem; text-align: right;">ค่าเสื่อมปีนี้</th>
            <th style="width: 85px; padding: 0.5rem; text-align: right;">ค่าเสื่อมสะสม</th>
            <th style="width: 85px; padding: 0.5rem; text-align: right;">มูลค่าสุทธิ</th>
            ${isEditing ? '<th style="width: 45px; padding: 0.5rem; text-align: center;">ลบ</th>' : ''}
        `;
        
        transBody.innerHTML = '';
        
        if (transList.length === 0) {
            transBody.innerHTML = `<tr><td colspan="${isEditing ? 12 : 11}" style="text-align: center; color: var(--text-tertiary); padding: 1.5rem;">ไม่มีประวัติการคำนวณในระบบ</td></tr>`;
            return;
        }

        transList.forEach((t, index) => {
            const tr = document.createElement('tr');
            if (isEditing) {
                tr.innerHTML = `
                    <td style="padding: 0.25rem;"><input type="text" class="edit-trans-val form-control" data-field="transaction_date" data-index="${index}" value="${t.transaction_date || ''}" style="font-size: 0.7rem; padding: 0.2rem; min-height: auto;"></td>
                    <td style="padding: 0.25rem;"><input type="text" class="edit-trans-val form-control" data-field="document_no" data-index="${index}" value="${t.document_no || ''}" style="font-size: 0.7rem; padding: 0.2rem; min-height: auto;"></td>
                    <td style="padding: 0.25rem;"><input type="text" class="edit-trans-val form-control" data-field="description" data-index="${index}" value="${t.description || ''}" style="font-size: 0.7rem; padding: 0.2rem; min-height: auto;"></td>
                    <td style="padding: 0.25rem;"><input type="number" class="edit-trans-val form-control" data-field="quantity" data-index="${index}" value="${t.quantity !== null && t.quantity !== undefined ? t.quantity : ''}" style="font-size: 0.7rem; padding: 0.2rem; text-align: center; min-height: auto;"></td>
                    <td style="padding: 0.25rem;"><input type="number" step="0.01" class="edit-trans-val form-control" data-field="unit_price" data-index="${index}" value="${t.unit_price !== null && t.unit_price !== undefined ? t.unit_price : ''}" style="font-size: 0.7rem; padding: 0.2rem; text-align: right; min-height: auto;"></td>
                    <td style="padding: 0.25rem;"><input type="number" step="0.01" class="edit-trans-val form-control" data-field="total_value" data-index="${index}" value="${t.total_value !== null && t.total_value !== undefined ? t.total_value : ''}" style="font-size: 0.7rem; padding: 0.2rem; text-align: right; min-height: auto;"></td>
                    <td style="padding: 0.25rem;"><input type="number" class="edit-trans-val form-control" data-field="useful_life" data-index="${index}" value="${t.useful_life !== null && t.useful_life !== undefined ? t.useful_life : ''}" style="font-size: 0.7rem; padding: 0.2rem; text-align: center; min-height: auto;"></td>
                    <td style="padding: 0.25rem;"><input type="text" class="edit-trans-val form-control" data-field="depreciation_rate" data-index="${index}" value="${t.depreciation_rate || ''}" style="font-size: 0.7rem; padding: 0.2rem; text-align: center; min-height: auto;"></td>
                    <td style="padding: 0.25rem;"><input type="number" step="0.01" class="edit-trans-val form-control" data-field="annual_depreciation" data-index="${index}" value="${t.annual_depreciation !== null && t.annual_depreciation !== undefined ? t.annual_depreciation : ''}" style="font-size: 0.7rem; padding: 0.2rem; text-align: right; min-height: auto;"></td>
                    <td style="padding: 0.25rem;"><input type="number" step="0.01" class="edit-trans-val form-control" data-field="accumulated_depreciation" data-index="${index}" value="${t.accumulated_depreciation !== null && t.accumulated_depreciation !== undefined ? t.accumulated_depreciation : ''}" style="font-size: 0.7rem; padding: 0.2rem; text-align: right; min-height: auto;"></td>
                    <td style="padding: 0.25rem;"><input type="number" step="0.01" class="edit-trans-val form-control" data-field="net_value" data-index="${index}" value="${t.net_value !== null && t.net_value !== undefined ? t.net_value : ''}" style="font-size: 0.7rem; padding: 0.2rem; text-align: right; min-height: auto;"></td>
                    <td style="padding: 0.25rem; text-align: center; vertical-align: middle;">
                        <button type="button" class="btn btn-danger btn-delete-trans-row" data-index="${index}" style="padding: 0.2rem 0.4rem; font-size: 0.7rem; border-radius: 4px; line-height: 1;">
                            <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
                        </button>
                    </td>
                `;
            } else {
                tr.innerHTML = `
                    <td style="padding: 0.5rem;">${t.transaction_date || '-'}</td>
                    <td style="padding: 0.5rem;">${t.document_no || '-'}</td>
                    <td style="padding: 0.5rem;">${t.description || '-'}</td>
                    <td style="padding: 0.5rem; text-align: center;">${t.quantity !== null && t.quantity !== undefined ? t.quantity : '-'}</td>
                    <td style="padding: 0.5rem; text-align: right;">${t.unit_price ? t.unit_price.toLocaleString('th-TH', {minimumFractionDigits: 2}) : '-'}</td>
                    <td style="padding: 0.5rem; text-align: right;">${t.total_value ? t.total_value.toLocaleString('th-TH', {minimumFractionDigits: 2}) : '-'}</td>
                    <td style="padding: 0.5rem; text-align: center;">${t.useful_life !== null && t.useful_life !== undefined ? t.useful_life : '-'}</td>
                    <td style="padding: 0.5rem; text-align: center;">${t.depreciation_rate || '-'}</td>
                    <td style="padding: 0.5rem; text-align: right;">${t.annual_depreciation ? t.annual_depreciation.toLocaleString('th-TH', {minimumFractionDigits: 2}) : '-'}</td>
                    <td style="padding: 0.5rem; text-align: right;">${t.accumulated_depreciation ? t.accumulated_depreciation.toLocaleString('th-TH', {minimumFractionDigits: 2}) : '-'}</td>
                    <td style="padding: 0.5rem; text-align: right;">${t.net_value ? t.net_value.toLocaleString('th-TH', {minimumFractionDigits: 2}) : '-'}</td>
                `;
            }
            transBody.appendChild(tr);
        });

        // อีเวนต์เฉพาะโหมดแก้ไข
        if (isEditing) {
            transBody.querySelectorAll('.edit-trans-val').forEach(input => {
                input.addEventListener('change', () => {
                    const field = input.getAttribute('data-field');
                    const idx = parseInt(input.getAttribute('data-index'));
                    let val = input.value.trim();
                    
                    if (field === 'quantity' || field === 'useful_life') {
                        state.currentViewingAssetTransactions[idx][field] = val ? parseInt(val) : null;
                    } else if (field === 'unit_price' || field === 'total_value' || field === 'annual_depreciation' || field === 'accumulated_depreciation' || field === 'net_value') {
                        state.currentViewingAssetTransactions[idx][field] = val ? parseFloat(val) : null;
                    } else {
                        state.currentViewingAssetTransactions[idx][field] = val;
                    }
                });
            });

            transBody.querySelectorAll('.btn-delete-trans-row').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-index'));
                    state.currentViewingAssetTransactions.splice(idx, 1);
                    renderDetailsTransactions(state.currentViewingAssetTransactions, true);
                });
            });
        }
        lucide.createIcons();
    }

    // จัดการการคลิกปุ่มแก้ไขตารางประวัติค่าเสื่อมราคา
    const btnEditTransTable = document.getElementById('btn-edit-trans-table');
    const btnAddTransRow = document.getElementById('btn-add-trans-row');

    if (btnEditTransTable) {
        btnEditTransTable.addEventListener('click', async () => {
            if (state.userRole === 'auditor') {
                alert('คุณไม่มีสิทธิ์ในการแก้ไขตารางนี้');
                return;
            }

            if (!state.isEditingTransactions) {
                // เปลี่ยนเป็นโหมดแก้ไข
                state.isEditingTransactions = true;
                if (btnAddTransRow) btnAddTransRow.style.display = 'inline-flex';
                btnEditTransTable.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px; margin-right: 0.25rem;"></i> บันทึกตารางประวัติ';
                btnEditTransTable.className = 'btn btn-primary officer-only';
                renderDetailsTransactions(state.currentViewingAssetTransactions, true);
            } else {
                // เปลี่ยนกลับเป็นโหมดอ่านอย่างเดียว และบันทึกลงฐานข้อมูล
                try {
                    btnEditTransTable.innerHTML = 'กำลังบันทึก...';
                    await window.supabaseService.saveAssetTransactions(state.currentViewingAsset.id, state.currentViewingAssetTransactions);
                    
                    state.isEditingTransactions = false;
                    if (btnAddTransRow) btnAddTransRow.style.display = 'none';
                    btnEditTransTable.innerHTML = '<i data-lucide="edit-3" style="width: 14px; height: 14px; margin-right: 0.25rem;"></i> แก้ไขตารางประวัติ';
                    btnEditTransTable.className = 'btn btn-secondary officer-only';
                    
                    // รีโหลดข้อมูลความสดจากฐานข้อมูล
                    const freshTrans = await window.supabaseService.fetchAssetTransactions(state.currentViewingAsset.id);
                    state.currentViewingAssetTransactions = freshTrans;
                    renderDetailsTransactions(state.currentViewingAssetTransactions, false);
                    alert('บันทึกการแก้ไขประวัติค่าเสื่อมราคาเรียบร้อยแล้ว');
                } catch (err) {
                    alert('บันทึกผิดพลาด: ' + err.message);
                    btnEditTransTable.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px; margin-right: 0.25rem;"></i> บันทึกตารางประวัติ';
                }
            }
        });
    }

    if (btnAddTransRow) {
        btnAddTransRow.addEventListener('click', () => {
            state.currentViewingAssetTransactions.push({
                transaction_date: '',
                document_no: '',
                description: '',
                quantity: null,
                unit_price: null,
                total_value: null,
                useful_life: null,
                depreciation_rate: '',
                annual_depreciation: null,
                accumulated_depreciation: null,
                net_value: null
            });
            renderDetailsTransactions(state.currentViewingAssetTransactions, true);
        });
    }



    // ดึงเลขครุภัณฑ์จาก URL (ในกรณีสแกนผ่านกล้องนอกระบบ เช่น LINE / iOS Camera)
    const urlParams = new URLSearchParams(window.location.search);
    const urlAsset = urlParams.get('asset');
    if (urlAsset) {
        // ให้หน่วงเวลาเล็กน้อยรอระบบเชื่อมต่อ Supabase
        setTimeout(() => {
            if (window.supabaseService.isConfigured()) {
                searchAndAuditAsset(urlAsset);
            }
        }, 1000);
    }
});
