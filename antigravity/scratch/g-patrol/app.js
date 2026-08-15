/* =====================================================================
   G-Patrol Application Controller (app.js)
   Fully recreated to match the original G-Patrol app mobile-first layout
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // โหลดไอคอน Lucide ในเบื้องต้น
    lucide.createIcons();

    // ตรวจสอบและแจ้งเตือนเบราว์เซอร์ภายในแอป (LINE, Facebook ฯลฯ)
    detectInAppBrowser();

    function detectInAppBrowser() {
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        const isInApp = (ua.indexOf("Line") > -1) || (ua.indexOf("FB_IAB") > -1) || (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1) || (ua.indexOf("Instagram") > -1);
        
        if (isInApp) {
            // แสดงข้อความเตือนเล็กๆ ในตัวแบบฟอร์มตรวจสอบแนบรูปถ่าย
            const inappWarning = document.getElementById('inapp-warning-text');
            if (inappWarning) inappWarning.style.display = 'block';

            // แสดงแบนเนอร์สีแดงแจ้งเตือนด้านบนสุดของหน้าจอ
            const banner = document.createElement('div');
            banner.id = 'inapp-browser-banner';
            banner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background-color: #ef4444;
                color: white;
                text-align: center;
                padding: 12px 16px;
                font-size: 0.9rem;
                font-weight: bold;
                z-index: 999999;
                box-shadow: 0 4px 6px rgba(0,0,0,0.15);
                display: flex;
                flex-direction: column;
                gap: 6px;
                align-items: center;
                justify-content: center;
            `;
            
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            const instructionText = isIOS 
                ? 'แนะนำ: กรุณากดปุ่มแชร์ (กล่องที่มีลูกศรชี้ขึ้น) แล้วเลือก "เปิดด้วย Safari"'
                : 'แนะนำ: กรุณากดปุ่ม 3 จุดที่มุมขวาบน แล้วเลือก "เปิดด้วยเบราว์เซอร์อื่น" หรือ "เปิดใน Chrome"';

            banner.innerHTML = `
                <div style="font-size: 0.95rem; display: flex; align-items: center; gap: 4px;">
                    <span>⚠️ ตรวจพบการเปิดลิงก์ผ่าน LINE / Facebook WebView</span>
                </div>
                <div style="font-size: 0.8rem; font-weight: normal; line-height: 1.4; text-align: center; max-width: 95%;">
                    ระบบในแอปแชทอาจปิดกั้นการเปิดกล้องถ่ายรูปโดยตรง (บังคับให้สลับไปเลือกแกลเลอรีภาพแทน)<br>
                    <strong>${instructionText}</strong> เพื่อใช้งานระบบกล้องและตัวสแกนได้สมบูรณ์แบบ 100%
                </div>
            `;
            document.body.appendChild(banner);
            document.body.style.paddingTop = '80px';
        }
    }

    // ==========================================
    // APP STATE
    // ==========================================
    const state = {
        currentUser: null,
        userRole: 'guard', // default
        currentView: 'view-dashboard',
        fiscalYear: 2569,
        locationFilter: 'all',
        html5QrScanner: null,
        checkpoints: []
    };

    // ==========================================
    // DOM ELEMENTS
    // ==========================================
    const el = {
        // Screens
        authScreen: document.getElementById('auth-screen'),
        appScreen: document.getElementById('app-screen'),
        
        // Forms Auth
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        tabLoginBtn: document.getElementById('tab-login-btn'),
        tabRegisterBtn: document.getElementById('tab-register-btn'),
        btnOpenConfigAuth: document.getElementById('btn-open-config-auth'),
        regAvatarFileInput: document.getElementById('reg-avatar-file'),
        
        // App Header & Profile Card
        userDisplayName: document.getElementById('user-display-name'),
        userRoleText: document.getElementById('user-role-text'),
        userShiftText: document.getElementById('user-shift-text'),
        userAvatarImg: document.getElementById('user-avatar-img'),
        btnLogout: document.getElementById('btn-logout'),
        btnChangeAvatar: document.getElementById('btn-change-avatar'),
        userAvatarFileInput: document.getElementById('user-avatar-file-input'),
        
        // Views
        viewDashboard: document.getElementById('view-dashboard'),
        viewCheckpoints: document.getElementById('view-checkpoints'),
        viewReports: document.getElementById('view-reports'),
        tabViews: document.querySelectorAll('.tab-view'),
        
        // Bottom Nav Bar
        appBottomNav: document.getElementById('app-bottom-nav'),
        navTabBtns: document.querySelectorAll('.nav-tab-btn'),
        
        // Dashboard Stats
        statTotalToday: document.getElementById('stat-total-today'),
        statNormalToday: document.getElementById('stat-normal-today'),
        statAbnormalToday: document.getElementById('stat-abnormal-today'),
        patrolLogsTbody: document.getElementById('patrol-logs-tbody'),
        btnLoadLatest: document.getElementById('btn-load-latest'),
        filterZone: document.getElementById('filter-zone'),
        filterShift: document.getElementById('filter-shift'),
        filterDate: document.getElementById('filter-date'),
        summarySection: document.querySelector('.summary-section'),
        historySection: document.querySelector('.history-section'),
        sectionDutyReport: document.getElementById('section-duty-report'),
        courtMarshalFiltersSection: document.getElementById('court-marshal-filters-section'),
        
        // Checkpoints Manage View
        btnAddCheckpoint: document.getElementById('btn-add-checkpoint'),
        checkpointSearchInput: document.getElementById('checkpoint-search-input'),
        checkpointLocationFilter: document.getElementById('checkpoint-location-filter'),
        checkpointsTableBody: document.getElementById('checkpoints-table-body'),
        
        // Reports View
        reportFiscalYear: document.getElementById('report-fiscal-year'),
        reportDateFilter: document.getElementById('report-date-filter'),
        reportLocationFilter: document.getElementById('report-location-filter'),
        btnExportCsv: document.getElementById('btn-export-csv'),
        btnExportPdf: document.getElementById('btn-export-pdf'),
        
        // PDF Import View
        pdfFileInput: document.getElementById('pdf-file-input'),
        btnSelectPdf: document.getElementById('btn-select-pdf'),
        pdfFileName: document.getElementById('pdf-file-name'),
        pdfProgressContainer: document.getElementById('pdf-progress-container'),
        pdfProgressBar: document.getElementById('pdf-progress-bar'),
        pdfStatusText: document.getElementById('pdf-status-text'),
        
        // Config Connection Modal
        modalConfig: document.getElementById('modal-config'),
        configUrl: document.getElementById('config-url'),
        configKey: document.getElementById('config-key'),
        btnSaveConfig: document.getElementById('btn-save-config'),
        
        // Scanner Modal
        modalScanner: document.getElementById('modal-scanner'),
        btnOpenScanner: document.getElementById('fab-scan-trigger'),
        btnCloseScanner: document.getElementById('btn-close-scanner'),
        manualCheckpointInput: document.getElementById('manual-checkpoint-input'),
        btnManualSearch: document.getElementById('btn-manual-search'),
        
        // Check-in Record Form Modal
        modalAuditForm: document.getElementById('modal-audit-form'),
        auditAssetId: document.getElementById('audit-asset-id'),
        auditAssetNumber: document.getElementById('audit-asset-number'),
        auditAssetName: document.getElementById('audit-asset-name'),
        auditAssetLocation: document.getElementById('audit-asset-location'),
        auditImagePreview: document.getElementById('audit-image-preview'),
        auditNotes: document.getElementById('audit-notes'),
        auditPhotoInput: document.getElementById('audit-photo-input'),
        btnTriggerCamera: document.getElementById('btn-trigger-camera'),
        auditPhotoFilename: document.getElementById('audit-photo-filename'),
        cameraLoading: document.getElementById('camera-loading'),
        auditRecordForm: document.getElementById('audit-record-form'),
        
        // Add/Edit Checkpoint Modal
        modalCheckpoint: document.getElementById('modal-checkpoint'),
        checkpointForm: document.getElementById('checkpoint-form'),
        checkpointFormId: document.getElementById('checkpoint-form-id'),
        checkpointFormNumber: document.getElementById('checkpoint-form-number'),
        checkpointFormName: document.getElementById('checkpoint-form-name'),
        checkpointFormLocation: document.getElementById('checkpoint-form-location'),
        checkpointFormImage: document.getElementById('checkpoint-form-image'),
        checkpointModalTitle: document.getElementById('checkpoint-modal-title')
    };

    // จัดการกรณีภาพโปรไฟล์โหลดไม่สำเร็จ ให้แสดงเป็น Base64 SVG (ช่วยลดปัญหาติดขัดของบราวเซอร์และลูป Error ซ้ำซ้อน)
    if (el.userAvatarImg) {
        el.userAvatarImg.addEventListener('error', function handleAvatarError() {
            // ป้องกันการทำงานทับซ้อนถ้าระบุเป็น data URI อยู่แล้ว
            if (!el.userAvatarImg.src.startsWith('data:')) {
                el.userAvatarImg.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzNiODJmNiI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==";
            }
        });
    }

    // ==========================================
    // INITIALIZATION & CONFIGURATION CHECKS
    // ==========================================
    if (!window.supabaseService.isConfigured()) {
        showConfigModal();
    } else {
        checkUserSession();
    }

    // ==========================================
    // AUTHENTICATION TAB ACTIONS
    // ==========================================
    el.tabLoginBtn.addEventListener('click', () => {
        el.tabLoginBtn.classList.add('active');
        el.tabRegisterBtn.classList.remove('active');
        el.loginForm.style.display = 'flex';
        el.registerForm.style.display = 'none';
    });

    el.tabRegisterBtn.addEventListener('click', () => {
        el.tabRegisterBtn.classList.add('active');
        el.tabLoginBtn.classList.remove('active');
        el.registerForm.style.display = 'flex';
        el.loginForm.style.display = 'none';
    });

    // ==========================================
    // CONFIG CONNECTION ACTIONS
    // ==========================================
    el.btnOpenConfigAuth.addEventListener('click', showConfigModal);
    
    el.btnSaveConfig.addEventListener('click', () => {
        const url = el.configUrl.value.trim();
        const key = el.configKey.value.trim();
        
        if (!url || !key) {
            alert('กรุณากรอกข้อมูลการเชื่อมต่อให้ครบถ้วน');
            return;
        }
        
        window.supabaseService.saveConfig(url, key);
        hideModal(el.modalConfig);
        
        // เริ่มต้นเชื่อมต่อใหม่
        if (window.supabaseService.init()) {
            alert('บันทึกการตั้งค่าและเชื่อมต่อ Supabase สำเร็จ!');
            checkUserSession();
        } else {
            alert('การเชื่อมต่อล้มเหลว กรุณาตรวจสอบ URL หรือ Key อีกครั้ง');
            showConfigModal();
        }
    });

    function showConfigModal() {
        el.configUrl.value = localStorage.getItem('supabase_url') || '';
        el.configKey.value = localStorage.getItem('supabase_key') || '';
        showModal(el.modalConfig);
    }

    // ==========================================
    // USER SESSIONS, LOGIN, REGISTER & LOGOUT
    // ==========================================
    async function checkUserSession() {
        try {
            const profile = await window.supabaseService.getCurrentUserProfile();
            if (profile) {
                state.currentUser = profile;
                state.userRole = profile.role;
                
                // ยืนยันข้อมูลชื่อผู้เข้าใช้งานเดิมเพื่อความปลอดภัย
                if (confirm(`ยืนยันข้อมูลผู้เข้าใช้งานระบบ G-Patrol:\nคุณคือ "${profile.display_name}" ใช่หรือไม่?`)) {
                    setupUILayout(profile);
                } else {
                    await window.supabaseService.signOut();
                    state.currentUser = null;
                    showAuthScreen();
                }
            } else {
                showAuthScreen();
            }
        } catch (e) {
            console.error('Session check error:', e);
            showAuthScreen();
        }
    }

    function showAuthScreen() {
        el.authScreen.style.display = 'flex';
        el.appScreen.style.display = 'none';
    }

    // ฟังก์ชันช่วยแปลงลิงก์ Google Drive ทุกรูปแบบให้สามารถแสดงผลผ่านแท็ก <img> ได้โดยตรง
    function convertGoogleDriveLink(url) {
        if (!url || url.trim() === '') return '';
        let cleanUrl = url.trim();
        if (cleanUrl.includes('drive.google.com')) {
            const driveIdRegex = /(?:\/file\/d\/|id=)([a-zA-Z0-9_-]+)/;
            const match = cleanUrl.match(driveIdRegex);
            if (match && match[1]) {
                return `https://lh3.googleusercontent.com/d/${match[1]}`;
            }
        }
        return cleanUrl;
    }

    function setupUILayout(profile) {
        el.authScreen.style.display = 'none';
        el.appScreen.style.display = 'flex';

        // ปรับข้อมูลบน Profile Card
        el.userDisplayName.innerText = profile.display_name;
        
        const roleTextMapping = {
            'admin': 'ผู้ดูแลระบบ (Admin)',
            'officer': 'เจ้าหน้าที่พัสดุ (Officer)',
            'court marshal': 'Court Marshal',
            'guard': 'Guard - บริเวณศาล',
            'guard2': 'Guard - บ้านพัก'
        };
        el.userRoleText.innerText = roleTextMapping[profile.role] || 'เจ้าหน้าที่เดินตรวจ';

        // แสดง/ซ่อนกะปฏิบัติงานบนโปรไฟล์การ์ดสำหรับ Guard และ Guard2
        if (el.userShiftText) {
            const isGuard = (profile.role === 'guard' || profile.role === 'guard2');
            if (isGuard) {
                const now = new Date();
                const shiftVal = getLogShift(now);
                const shiftTextMapping = {
                'shift1': 'กะ 1 (06:00-11:00)',
                'shift2': 'กะ 2 (12:00-14:00)',
                'shift3': 'กะ 3 (14:30-16:00)',
                'shift4': 'กะ 4 (16:30-18:00)',
                'shift5': 'กะ 5 (20:30-22:00)',
                'shift6': 'กะ 6 (00:30-02:00)',
                'shift7': 'กะ 7 (02:30-04:00)',
                'shift8': 'กะ 8 (04:30-06:00)'
            };
                const shiftStr = shiftTextMapping[shiftVal] || 'ไม่ระบุกะ';
                el.userShiftText.innerText = `กะปฏิบัติหน้าที่ปัจจุบัน: ${shiftStr}`;
                el.userShiftText.style.display = 'block';
            } else {
                el.userShiftText.style.display = 'none';
            }
        }

        // รูปโปรไฟล์ผู้ใช้
        if (profile.avatar_url && profile.avatar_url.trim() !== '') {
            el.userAvatarImg.src = convertGoogleDriveLink(profile.avatar_url);
        } else {
            el.userAvatarImg.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzNiODJmNiI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==";
        }

        // จัดการระดับสิทธิ์การเข้าถึงปุ่มสำหรับ Admin/Officer เท่านั้น
        const isOfficer = (profile.role === 'admin' || profile.role === 'officer' || profile.role === 'court_marshal' || profile.role === 'court marshal');
        const btnReportsNav = document.querySelector('.nav-tab-btn[data-target="view-reports"]');
        
        const filtersSection = document.getElementById('court-marshal-filters-section');

        const guardAlert = document.getElementById('guard-current-shift-alert');
        const guardShiftText = document.getElementById('guard-login-shift-text');

        if (isOfficer) {
            // แสดงแถบนำทางด้านล่างสำหรับบทบาทตำรวจศาล/แอดมิน เพื่อสลับหน้าได้อิสระ
            el.appBottomNav.style.display = 'flex';

            document.querySelectorAll('.officer-only').forEach(element => {
                element.style.display = 'flex';
            });
            if (btnReportsNav) btnReportsNav.style.display = 'flex';
            if (el.btnAddCheckpoint) el.btnAddCheckpoint.style.display = 'flex';
            if (guardAlert) guardAlert.style.display = 'none';
            
            // แสดงส่วนสถิติและประวัติรายงาน สำหรับ Court Marshal / Admin / Officer
            if (el.summarySection) el.summarySection.style.display = 'block';
            if (el.historySection) el.historySection.style.display = 'block';
            if (el.sectionDutyReport) el.sectionDutyReport.style.display = 'none'; // ซ่อนรายการการ์ดเดินตรวจ

            if (filtersSection) {
                filtersSection.style.display = 'block';
                // ตั้งค่าเริ่มต้นวันที่เลือกให้เป็นวันนี้
                if (el.filterDate && !el.filterDate.value) {
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    el.filterDate.value = `${yyyy}-${mm}-${dd}`;
                }
            }
        } else {
            // ซ่อนแถบนำทางด้านล่างสำหรับยาม (Guard/Guard2) เพื่อให้เข้าใช้งานได้เฉพาะหน้า "รายงานจุดเดินตรวจ" เท่านั้นตามเงื่อนไข
            el.appBottomNav.style.display = 'none';

            document.querySelectorAll('.officer-only').forEach(element => {
                element.style.display = 'none';
            });
            if (btnReportsNav) btnReportsNav.style.display = 'none';
            if (el.btnAddCheckpoint) el.btnAddCheckpoint.style.display = 'none';
            
            // แสดงกล่องระบุวันและกะปฏิบัติงานปัจจุบันของยาม
            if (guardAlert && guardShiftText) {
                guardAlert.style.display = 'flex';
                const now = new Date();
                const shiftVal = getLogShift(now);
                const shiftTextMapping = {
                'shift1': 'กะ 1 (06:00-11:00)',
                'shift2': 'กะ 2 (12:00-14:00)',
                'shift3': 'กะ 3 (14:30-16:00)',
                'shift4': 'กะ 4 (16:30-18:00)',
                'shift5': 'กะ 5 (20:30-22:00)',
                'shift6': 'กะ 6 (00:30-02:00)',
                'shift7': 'กะ 7 (02:30-04:00)',
                'shift8': 'กะ 8 (04:30-06:00)'
            };
                guardShiftText.innerText = shiftTextMapping[shiftVal] || 'ไม่ระบุกะ';
            }

            // ซ่อนส่วนสถิติและประวัติรายงาน แสดงเฉพาะรายการจุดตรวจเดินเวร สำหรับ Guard
            if (el.summarySection) el.summarySection.style.display = 'none';
            if (el.historySection) el.historySection.style.display = 'none';
            if (el.sectionDutyReport) el.sectionDutyReport.style.display = 'block';

            if (filtersSection) filtersSection.style.display = 'none';
        }

        // กำหนดค่าเริ่มต้นของตัวกรองในหน้าแสดงจุดตรวจ (รายงานจุดเดินตรวจ) ตาม Zone ของผู้ใช้แต่ละคน และล็อกระดับการเข้าถึง
        if (el.checkpointLocationFilter) {
            if (profile.role === 'guard') {
                el.checkpointLocationFilter.value = 'บริเวณศาล';
                el.checkpointLocationFilter.disabled = true; // ล็อกเฉพาะบริเวณศาลสำหรับยาม guard
            } else if (profile.role === 'guard2') {
                el.checkpointLocationFilter.value = 'บ้านพัก';
                el.checkpointLocationFilter.disabled = true; // ล็อกเฉพาะบ้านพักสำหรับยาม guard2
            } else {
                el.checkpointLocationFilter.value = 'all';
                el.checkpointLocationFilter.disabled = false; // เปิดสิทธิ์สำหรับ Court Marshal / Admin
            }
        }

        // เปลี่ยนหน้าจอตามบทบาทผู้ใช้ (ยามจะถูกบังคับให้ไปที่หน้าจุดตรวจ ส่วนแอดมินไปที่แดชบอร์ดสรุปผล)
        if (isOfficer) {
            switchTab('view-dashboard');
            loadDashboardData();
        } else {
            switchTab('view-checkpoints');
            loadCheckpointsData();
        }
    }

    // ล็อกอิน (Login Submit)
    el.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value.trim();

        try {
            const user = await window.supabaseService.signInWithUsername(username, password);
            state.currentUser = user;
            state.userRole = user.role;
            
            // ยืนยันข้อมูลชื่อผู้ใช้งานล็อกอินเพื่อความปลอดภัย
            if (confirm(`ยืนยันการลงชื่อเข้าใช้งานระบบ G-Patrol:\nคุณคือ "${user.display_name}" ใช่หรือไม่?`)) {
                setupUILayout(user);
            } else {
                await window.supabaseService.signOut();
                state.currentUser = null;
                showAuthScreen();
            }
        } catch (err) {
            alert('ลงชื่อเข้าใช้งานล้มเหลว: ' + err.message);
        }
    });

    // ลงทะเบียนสมาชิกใหม่ (Register Submit)
    el.registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value.trim();
        const displayName = document.getElementById('reg-display-name').value.trim();
        const role = document.getElementById('reg-role').value;
        const avatarFile = el.regAvatarFileInput.files[0];

        try {
            // สมัครสมาชิกโดยลงทะเบียนแบบไม่มีรูปภาพก่อนเพื่อให้ได้ userId
            const newUser = await window.supabaseService.signUpWithUsername(username, password, displayName, role, null);
            
            // อัปโหลดไฟล์รูปประจำตัวหากผู้ใช้เลือกไว้
            if (avatarFile) {
                await window.supabaseService.uploadUserAvatar(avatarFile, newUser.id);
            }

            alert('ลงทะเบียนผู้ใช้สำเร็จ! กรุณาสลับแท็บเพื่อเข้าสู่ระบบ');
            el.tabLoginBtn.click();
            document.getElementById('login-username').value = username;
            document.getElementById('login-password').value = password;
            
            // เคลียร์ค่าฟอร์มลงทะเบียน
            el.registerForm.reset();
        } catch (err) {
            alert('ลงทะเบียนล้มเหลว: ' + err.message);
        }
    });

    // ออกจากระบบ (Logout)
    el.btnLogout.addEventListener('click', async () => {
        if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
            await window.supabaseService.signOut();
            state.currentUser = null;
            showAuthScreen();
        }
    });

    // เปลี่ยนรูปประจำตัวผู้ใช้งาน (Change User Avatar)
    if (el.btnChangeAvatar && el.userAvatarFileInput) {
        el.btnChangeAvatar.addEventListener('click', () => {
            el.userAvatarFileInput.click();
        });

        el.userAvatarFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!state.currentUser) {
                alert('กรุณาเข้าสู่ระบบก่อนเปลี่ยนรูปโปรไฟล์');
                return;
            }

            if (!confirm('คุณต้องการเปลี่ยนรูปภาพโปรไฟล์ใช่หรือไม่?')) return;

            el.userAvatarImg.style.opacity = '0.5';

            try {
                const publicUrl = await window.supabaseService.uploadUserAvatar(file, state.currentUser.id);
                
                // อัปเดตข้อมูลผู้ใช้ใน state และ localStorage
                state.currentUser.avatar_url = publicUrl;
                localStorage.setItem('g_patrol_user', JSON.stringify(state.currentUser));

                // อัปเดตรูปภาพแสดงผล
                el.userAvatarImg.src = publicUrl;
                alert('เปลี่ยนรูปประจำตัวเสร็จสมบูรณ์!');
            } catch (err) {
                alert('เปลี่ยนรูปโปรไฟล์ไม่สำเร็จ: ' + err.message);
            } finally {
                el.userAvatarImg.style.opacity = '1';
            }
        });
    }

    // ==========================================
    // TAB VIEW ROUTING
    // ==========================================
    function switchTab(viewId) {
        state.currentView = viewId;
        
        // ซ่อนทุกหน้าจอและแสดงหน้าจอที่เลือก
        el.tabViews.forEach(view => {
            if (view.id === viewId) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });

        // อัปเดตปุ่ม Bottom Nav active
        el.navTabBtns.forEach(btn => {
            if (btn.getAttribute('data-target') === viewId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // รีเฟรชข้อมูลตามหน้าจอที่เปลี่ยน
        if (viewId === 'view-dashboard') {
            loadDashboardData();
        } else if (viewId === 'view-checkpoints') {
            loadCheckpointsData();
        }
    }

    // คลิกสลับแท็บเมนูด้านล่าง
    el.navTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            switchTab(target);
        });
    });

    // ==========================================
    // VIEW 1: DASHBOARD DATA LOADER & TABLE
    // ==========================================
    // ฟังก์ชันคำนวณช่วงเวลาเริ่มต้นและสิ้นสุดของกะปฏิบัติหน้าที่ที่เลือก (รองรับกะใหม่ 8 กะ ครอบคลุมช่องว่างชั่วโมงตรวจ)
    function getShiftTimeRange(dateObj = new Date()) {
        const today = new Date(dateObj);
        const y = today.getFullYear();
        const m = today.getMonth();
        const d = today.getDate();
        
        const h = today.getHours();
        const min = today.getMinutes();
        const timeNum = h * 60 + min;
        
        let startH, startM, startS, endH, endM, endS;
        let shiftName = '';
        let startDayOffset = 0;
        let endDayOffset = 0;
        
        // 1. กะ 6 (00:30 - 02:00) -> range: 00:30 - 02:14:59
        if (timeNum >= 30 && timeNum < 135) {
            shiftName = 'shift6'; startH = 0; startM = 30; startS = 0; endH = 2; endM = 14; endS = 59;
        }
        // 2. กะ 7 (02:30 - 04:00) -> range: 02:15 - 04:14:59
        else if (timeNum >= 135 && timeNum < 255) {
            shiftName = 'shift7'; startH = 2; startM = 15; startS = 0; endH = 4; endM = 14; endS = 59;
        }
        // 3. กะ 8 (04:30 - 06:00) -> range: 04:15 - 05:59:59
        else if (timeNum >= 255 && timeNum < 360) {
            shiftName = 'shift8'; startH = 4; startM = 15; startS = 0; endH = 5; endM = 59; endS = 59;
        }
        // 4. กะ 1 (06:00 - 11:00) -> range: 06:00 - 11:29:59
        else if (timeNum >= 360 && timeNum < 690) {
            shiftName = 'shift1'; startH = 6; startM = 0; startS = 0; endH = 11; endM = 29; endS = 59;
        }
        // 5. กะ 2 (12:00 - 14:00) -> range: 11:30 - 14:14:59
        else if (timeNum >= 690 && timeNum < 855) {
            shiftName = 'shift2'; startH = 11; startM = 30; startS = 0; endH = 14; endM = 14; endS = 59;
        }
        // 6. กะ 3 (14:30 - 16:00) -> range: 14:15 - 16:14:59
        else if (timeNum >= 855 && timeNum < 975) {
            shiftName = 'shift3'; startH = 14; startM = 15; startS = 0; endH = 16; endM = 14; endS = 59;
        }
        // 7. กะ 4 (16:30 - 18:00) -> range: 16:15 - 19:14:59
        else if (timeNum >= 975 && timeNum < 1155) {
            shiftName = 'shift4'; startH = 16; startM = 15; startS = 0; endH = 19; endM = 14; endS = 59;
        }
        // 8. กะ 5 (20:30 - 22:00) -> range: 19:15 - 00:29:59 (ข้ามคืน)
        else {
            shiftName = 'shift5';
            startH = 19; startM = 15; startS = 0; endH = 0; endM = 29; endS = 59;
            if (timeNum < 30) {
                startDayOffset = -1;
            } else {
                endDayOffset = 1;
            }
        }
        
        const startIso = new Date(y, m, d + startDayOffset, startH, startM, startS).toISOString();
        const endIso = new Date(y, m, d + endDayOffset, endH, endM, endS).toISOString();
        
        return { shiftName, startIso, endIso };
    }

    // ฟังก์ชันช่วยหา กะเวลา จากชั่วโมงของเวลาตรวจเดินเวร
    function getLogShift(date) {
        return getShiftTimeRange(date).shiftName;
    }

    async function loadDashboardData() {
        if (!window.supabaseService.client) return;
        
        const selectedZone = el.filterZone ? el.filterZone.value : 'all';
        const selectedShift = el.filterShift ? el.filterShift.value : 'all';
        const selectedDateVal = el.filterDate ? el.filterDate.value : '';
        
        try {
            // โหลดรายการสแกน 50 ครั้งล่าสุด
            const logs = await window.supabaseService.fetchRecentAuditLogs(state.fiscalYear);
            
            // คำนวณเป้าหมายวันที่เพื่อการแสดงผล (รองรับโซนเวลาของเบราว์เซอร์แต่ละเครื่องอย่างถูกต้อง)
            let targetDateStr = new Date().toLocaleDateString('en-US');
            if (selectedDateVal) {
                const parts = selectedDateVal.split('-');
                const localDate = new Date(parts[0], parts[1] - 1, parts[2]);
                targetDateStr = localDate.toLocaleDateString('en-US');
            }

            // กรองตามสิทธิ์การเข้าถึงสำหรับผู้กรองหลัก (Court Marshal / Admin / Officer)
            const isCourtMarshal = (state.userRole === 'court marshal' || state.userRole === 'court_marshal' || state.userRole === 'admin' || state.userRole === 'officer');
            let filteredLogs = logs;
            
            if (isCourtMarshal) {
                // กรองตามวันที่เลือก
                if (selectedDateVal) {
                    filteredLogs = filteredLogs.filter(log => {
                        if (!log.audited_at) return false;
                        const logDateStr = new Date(log.audited_at).toLocaleDateString('en-US');
                        return logDateStr === targetDateStr;
                    });
                }
                // กรองตามโซนจุดตรวจ
                if (selectedZone !== 'all') {
                    filteredLogs = filteredLogs.filter(log => {
                        const loc = log.g_patrol_checkpoints ? log.g_patrol_checkpoints.location : '';
                        if (selectedZone === 'อื่นๆ') {
                            return loc !== 'บริเวณศาล' && loc !== 'บ้านพัก';
                        }
                        return loc === selectedZone;
                    });
                }
                // กรองตามกะเวลา
                if (selectedShift !== 'all') {
                    filteredLogs = filteredLogs.filter(log => {
                        const shift = getLogShift(new Date(log.audited_at));
                        return shift === selectedShift;
                    });
                }
            }

            // เรียงลำดับรายการตามกะเวลา (shift1 ถึง shift8) เพื่อความชัดเจนตามที่ Court Marshal กำหนด และเรียงตามเวลาเช็คอินจริง
            filteredLogs.sort((a, b) => {
                if (!a.audited_at) return 1;
                if (!b.audited_at) return -1;
                const shiftA = getLogShift(new Date(a.audited_at));
                const shiftB = getLogShift(new Date(b.audited_at));
                if (shiftA !== shiftB) {
                    return shiftA.localeCompare(shiftB);
                }
                return new Date(a.audited_at) - new Date(b.audited_at);
            });

            renderDashboardTable(filteredLogs);

            // คำนวณสถิติเช็คอินประจำวัน (Daily Summary - สรุปวันที่เลือก)
            // กรองประวัติที่เกิดขึ้นเฉพาะ "วันที่เลือก"
            let todayLogs = logs.filter(log => {
                if (!log.audited_at) return false;
                const logDateStr = new Date(log.audited_at).toLocaleDateString('en-US');
                return logDateStr === targetDateStr;
            });

            // กรองข้อมูลสถิติวันที่เลือกด้วยตัวคัดกรองเดียวกัน
            if (isCourtMarshal) {
                if (selectedZone !== 'all') {
                    todayLogs = todayLogs.filter(log => {
                        const loc = log.g_patrol_checkpoints ? log.g_patrol_checkpoints.location : '';
                        if (selectedZone === 'อื่นๆ') {
                            return loc !== 'บริเวณศาล' && loc !== 'บ้านพัก';
                        }
                        return loc === selectedZone;
                    });
                }
                if (selectedShift !== 'all') {
                    todayLogs = todayLogs.filter(log => {
                        const shift = getLogShift(new Date(log.audited_at));
                        return shift === selectedShift;
                    });
                }
            }

            const totalToday = todayLogs.length;
            const normalToday = todayLogs.filter(log => log.status === 'normal').length;
            const abnormalToday = todayLogs.filter(log => log.status === 'damaged' || log.status === 'lost').length;

            // นำยอดแสดงบนการ์ดสรุปประวัติ
            el.statTotalToday.innerText = totalToday;
            el.statNormalToday.innerText = normalToday;
            el.statAbnormalToday.innerText = abnormalToday;
            
            // โหลดกล่องรายการจุดตรวจรายงานเดินตรวจเวรประจำวันบน Dashboard
            await loadDashboardDutyReport();
            
        } catch (e) {
            console.error('Failed to load dashboard:', e);
            el.patrolLogsTbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--card-red); font-weight: bold; padding: 1.5rem;">
                        <i data-lucide="wifi-off" style="vertical-align: middle;"></i> ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้
                    </td>
                </tr>
            `;
            lucide.createIcons();
        }
    }

    function renderDashboardTable(logs) {
        el.patrolLogsTbody.innerHTML = '';
        
        if (logs.length === 0) {
            el.patrolLogsTbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-tertiary); padding: 2rem;">
                        ไม่มีประวัติการเช็คอินจุดตรวจล่าสุด
                    </td>
                </tr>
            `;
            return;
        }

        // กรองการแสดงผลตามสิทธิ์หรือขอบเขตพื้นที่ที่จำกัด (ถ้าเจ้าหน้าที่เป็น Guard)
        let filteredLogs = logs;
        if (state.userRole === 'guard') {
            filteredLogs = logs.filter(log => log.g_patrol_checkpoints && log.g_patrol_checkpoints.location === 'บริเวณศาล');
        } else if (state.userRole === 'guard2') {
            filteredLogs = logs.filter(log => log.g_patrol_checkpoints && log.g_patrol_checkpoints.location === 'บ้านพัก');
        }

        if (filteredLogs.length === 0) {
            el.patrolLogsTbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-tertiary); padding: 2rem;">
                        ไม่มีประวัติการเดินตรวจในพื้นที่รับผิดชอบของคุณ
                    </td>
                </tr>
            `;
            return;
        }

        filteredLogs.forEach(log => {
            const tr = document.createElement('tr');
            
            // 1. เวลาสแกนตรวจ และ กะเวลา
            const date = new Date(log.audited_at);
            const timeText = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
            const dateText = date.toLocaleDateString('th-TH');
            const shiftVal = getLogShift(date);
            const shiftTextMapping = {
                'shift1': 'กะ 1 (06:00-11:00)',
                'shift2': 'กะ 2 (12:00-14:00)',
                'shift3': 'กะ 3 (14:30-16:00)',
                'shift4': 'กะ 4 (16:30-18:00)',
                'shift5': 'กะ 5 (20:30-22:00)',
                'shift6': 'กะ 6 (00:30-02:00)',
                'shift7': 'กะ 7 (02:30-04:00)',
                'shift8': 'กะ 8 (04:30-06:00)'
            };
            const shiftText = shiftTextMapping[shiftVal] || 'ไม่ระบุกะ';
            
            // 2. ข้อมูลจุดตรวจ (ชื่อ + สถานที่) + ผู้รายงาน + พิกัด GPS + เหตุเหตุการณ์ไม่ปกติ
            const reporterName = log.g_patrol_users ? log.g_patrol_users.display_name : 'ไม่ระบุ';
            
            let gpsLinkHtml = '';
            if (log.latitude && log.longitude) {
                gpsLinkHtml = `
                    <div style="margin-top: 0.15rem;">
                        <a href="https://www.google.com/maps?q=${log.latitude},${log.longitude}" target="_blank" style="display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.72rem; color: #2563eb; font-weight: 600; text-decoration: none; background-color: #eff6ff; padding: 0.1rem 0.3rem; border: 1px solid #bfdbfe; border-radius: 4px;">
                            <i data-lucide="map-pin" style="width: 10px; height: 10px;"></i> ดูพิกัด (GPS)
                        </a>
                    </div>
                `;
            }

            let notesHtml = '';
            if (log.status !== 'normal' && log.notes && log.notes.trim() !== '') {
                notesHtml = `
                    <div style="margin-top: 0.25rem; padding: 0.25rem 0.4rem; background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 4px; color: #991b1b; font-size: 0.72rem; font-weight: 500; display: inline-block; max-width: 100%;">
                        <span style="font-weight: 600; color: #b91c1c; margin-right: 0.15rem;">⚠️ เหตุไม่ปกติ:</span>
                        <span style="word-break: break-word; color: #dc2626;">${log.notes}</span>
                    </div>
                `;
            }

            const checkpointName = log.g_patrol_checkpoints 
                ? `<div><strong>${log.g_patrol_checkpoints.name}</strong> (${log.g_patrol_checkpoints.location})</div>
                   <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem; display: flex; flex-direction: column; gap: 0.1rem; align-items: flex-start;">
                       <span>👤 ผู้รายงาน: <strong>${reporterName}</strong></span>
                       ${gpsLinkHtml}
                       ${notesHtml}
                   </div>` 
                : 'ไม่ทราบชื่อจุดตรวจ';
            
            // 3. ป้ายสถานะ
            let statusHtml = '';
            if (log.status === 'normal') {
                statusHtml = '<span class="badge badge-normal">ปกติ / ปลอดภัย</span>';
            } else if (log.status === 'damaged') {
                statusHtml = '<span class="badge badge-damaged">พบสิ่งผิดปกติ</span>';
            } else {
                statusHtml = '<span class="badge badge-lost">เกิดเหตุเร่งด่วน</span>';
            }

            // 4. ภาพถ่ายขณะสแกน (แสดงเป็นภาพย่อ Thumbnail)
            let imageHtml = '<span style="color: var(--text-tertiary); font-size: 0.85rem;">ไม่มีรูป</span>';
            const checkpointImg = log.image_url || (log.g_patrol_checkpoints ? log.g_patrol_checkpoints.image_url : null);
            if (checkpointImg && checkpointImg.trim() !== '') {
                const cleanImgUrl = convertGoogleDriveLink(checkpointImg);
                imageHtml = `
                    <a href="${cleanImgUrl}" target="_blank" title="คลิกเพื่อดูภาพขนาดใหญ่" style="display: block; width: fit-content; margin: 0 auto;">
                        <img src="${cleanImgUrl}" class="table-thumbnail-img" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; border: 1.5px solid var(--border-color); display: block; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: transform 0.15s ease;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
                    </a>
                `;
            }

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600; font-size: 0.8rem; color: var(--header-blue);">${shiftText}</div>
                    <div style="font-weight: 500; font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem;">📅 ${dateText}</div>
                    <div style="font-weight: 500; font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem;">🕒 ${timeText}</div>
                </td>
                <td>${checkpointName}</td>
                <td>${statusHtml}</td>
                <td>${imageHtml}</td>
            `;
            el.patrolLogsTbody.appendChild(tr);
        });

        lucide.createIcons();
    }

    el.btnLoadLatest.addEventListener('click', () => {
        loadDashboardData();
        alert('รีเฟรชข้อมูลเดินตรวจล่าสุดเสร็จสิ้น!');
    });

    el.filterZone.addEventListener('change', () => {
        loadDashboardData();
    });

    el.filterShift.addEventListener('change', () => {
        loadDashboardData();
    });

    el.filterDate.addEventListener('change', () => {
        loadDashboardData();
    });

    // โหลดและแสดงผลกล่อง รายงานเดินตรวจ (Checkpoint Duty Cards) บน Dashboard
    async function loadDashboardDutyReport() {
        const listContainer = document.getElementById('duty-checkpoints-list');
        if (!listContainer) return;

        try {
            // ดึงข้อมูลจุดตรวจทั้งหมด
            let data = await window.supabaseService.fetchAssets('', 'all');

            // กรองตามสิทธิ์และพื้นที่รับผิดชอบของ Guard บน Dashboard เพื่อให้ยามแต่ละกะเห็นเฉพาะจุดตรวจของตนเอง
            if (state.userRole === 'guard') {
                data = data.filter(cp => cp.zone === 'บริเวณศาล');
            } else if (state.userRole === 'guard2') {
                data = data.filter(cp => cp.zone === 'บ้านพัก');
            }

            // จัดเรียงจุดตรวจตามโซน เพื่อแยก Zone อย่างชัดเจน
            const zoneOrder = { 'บริเวณศาล': 1, 'บ้านพัก': 2 };
            data.sort((a, b) => {
                const orderA = zoneOrder[a.zone] || 3;
                const orderB = zoneOrder[b.zone] || 3;
                if (orderA !== orderB) return orderA - orderB;
                return a.asset_number.localeCompare(b.asset_number, undefined, { numeric: true });
            });

            // คำนวณขอบเขตเวลาของกะปฏิบัติงานในวันปัจจุบัน เพื่อเริ่มต้นรายงานใหม่ทุกจุดตรวจเมื่อเปลี่ยนกะ (รองรับ Safari/Mobile)
            const today = new Date();
            const { startIso, endIso } = getShiftTimeRange(today);

            // ดึงข้อมูลเช็คอินที่ตรวจแล้วในวันนี้ พร้อมเวลาสแกนตรวจจริง
            const { data: auditedList, error: auditError } = await window.supabaseService.client
                .from('g_patrol_audit_records')
                .select('asset_id, audited_at')
                .eq('fiscal_year', state.fiscalYear)
                .gte('audited_at', startIso)
                .lte('audited_at', endIso);

            if (auditError) throw auditError;
            const auditedTimeMap = new Map(auditedList.map(r => [r.asset_id, r.audited_at]));

            listContainer.innerHTML = '';

            if (data.length === 0) {
                listContainer.innerHTML = `
                    <div style="text-align: center; color: var(--text-tertiary); padding: 2rem; grid-column: 1 / -1;">
                        ไม่พบรายการจุดตรวจเดินตรวจในเขตพื้นที่รับผิดชอบของคุณ
                    </div>
                `;
                return;
            }

            data.forEach(cp => {
                const isAudited = auditedTimeMap.has(cp.id);
                const auditTime = auditedTimeMap.get(cp.id);
                const card = document.createElement('div');
                card.className = 'duty-card';

                const imageSrc = cp.image_url && cp.image_url.trim() !== '' 
                    ? convertGoogleDriveLink(cp.image_url) 
                    : "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'/></svg>";

                let statusBadge = '';
                if (isAudited) {
                    const timeText = new Date(auditTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
                    statusBadge = `<span class="badge badge-normal" style="background-color: #10b981; color: #ffffff; font-size: 0.75rem;">ตรวจแล้ว (${timeText})</span>`;
                } else {
                    statusBadge = '<span class="badge badge-lost" style="background-color: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; font-size: 0.75rem;">ยังไม่ได้ตรวจ</span>';
                }

                let actionButton = isAudited
                    ? `<button class="btn btn-secondary btn-sm" disabled style="opacity: 0.65; cursor: not-allowed; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem; height: 36px; padding: 0;">
                        <i data-lucide="check-circle-2" style="width: 15px; height: 15px;"></i> ตรวจแล้ว
                       </button>`
                    : `<button class="btn btn-primary btn-sm btn-duty-audit-action" data-id="${cp.id}" style="width: 100%; background-color: var(--card-blue); border: none; display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem; height: 36px; padding: 0;">
                        <i data-lucide="clipboard-check" style="width: 15px; height: 15px;"></i> บันทึกผล
                       </button>`;

                card.innerHTML = `
                    <div class="duty-card-header">
                        <span class="duty-code">${cp.asset_number}</span>
                        ${statusBadge}
                    </div>
                    <div class="duty-card-body">
                        <img src="${imageSrc}" class="duty-thumb" alt="Checkpoint thumbnail">
                        <div class="duty-details">
                            <span class="duty-name" title="${cp.name}">${cp.name}</span>
                            <span class="duty-loc"><i data-lucide="map-pin" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-right: 2px;"></i>${cp.location}</span>
                        </div>
                    </div>
                    <div class="duty-card-footer">
                        ${actionButton}
                    </div>
                `;

                if (!isAudited) {
                    card.querySelector('.btn-duty-audit-action').addEventListener('click', () => {
                        openAuditForm(cp);
                    });
                }

                listContainer.appendChild(card);
            });

            lucide.createIcons();
        } catch (err) {
            console.error('Error loading dashboard duty report:', err);
            listContainer.innerHTML = `
                <div style="text-align: center; color: var(--card-red); padding: 2rem; grid-column: 1 / -1;">
                    เกิดข้อผิดพลาดในการโหลดจุดตรวจ: ${err.message}
                </div>
            `;
        }
    }

    // ==========================================
    // VIEW 2: CHECKPOINTS MANAGEMENT DATA LOADER
    // ==========================================
    async function loadCheckpointsData() {
        if (!window.supabaseService.client) return;

        try {
            const query = el.checkpointSearchInput.value.trim();
            const location = el.checkpointLocationFilter.value;
            
            // ดึงข้อมูลเช็คอินประจำวันวันนี้ หรือดึงเฉพาะกะเวลาปฏิบัติงานปัจจุบันของยามเพื่อเริ่มเวรใหม่ทุกจุด
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const todayIso = `${yyyy}-${mm}-${dd}`;

            let startRange, endRange;
            if (state.userRole === 'guard' || state.userRole === 'guard2') {
                const { startIso, endIso } = getShiftTimeRange(today);
                startRange = startIso;
                endRange = endIso;
            } else {
                startRange = todayIso;
                endRange = todayIso;
            }

            let data = await window.supabaseService.fetchAuditRecords(state.fiscalYear, location, startRange, endRange);
            
            // กรองค้นหาเพิ่มเติมตามข้อความอินพุต
            if (query !== '') {
                data = data.filter(cp => 
                    cp.name.toLowerCase().includes(query.toLowerCase()) || 
                    cp.asset_number.toLowerCase().includes(query.toLowerCase())
                );
            }

            // จัดเรียงจุดตรวจตามโซน (บริเวณศาล มาก่อน ตามด้วย บ้านพัก และ โซนอื่นๆ) เพื่อแยก Zone อย่างชัดเจน
            const zoneOrder = { 'บริเวณศาล': 1, 'บ้านพัก': 2 };
            data.sort((a, b) => {
                const orderA = zoneOrder[a.zone] || 3;
                const orderB = zoneOrder[b.zone] || 3;
                if (orderA !== orderB) return orderA - orderB;
                return a.asset_number.localeCompare(b.asset_number, undefined, { numeric: true });
            });

            state.checkpoints = data;
            renderCheckpointsTable(data);
        } catch (e) {
            console.error('Failed to fetch checkpoints:', e);
            el.checkpointsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--card-red); padding: 1.5rem;">
                        ไม่สามารถดึงข้อมูลจุดตรวจได้: ${e.message}
                    </td>
                </tr>
            `;
        }
    }

    function renderCheckpointsTable(list, auditedIds = new Set()) {
        el.checkpointsTableBody.innerHTML = '';

        if (list.length === 0) {
            el.checkpointsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-tertiary); padding: 2rem;">
                        ไม่พบรายการจุดตรวจเดินตรวจ
                    </td>
                </tr>
            `;
            return;
        }

        const isCourtMarshal = (state.userRole === 'court marshal' || state.userRole === 'court_marshal');
        const isAdminOrOfficer = (state.userRole === 'admin' || state.userRole === 'officer');
        const isOfficer = (state.userRole === 'admin' || state.userRole === 'officer' || state.userRole === 'court_marshal' || state.userRole === 'court marshal');

        list.forEach(cp => {
            const tr = document.createElement('tr');
            
            // ตรวจสอบเช็คอินโดยเทียบฟิลด์ audit_id ที่ได้จาก fetchAuditRecords
            const isAudited = (cp.audit_id !== null && cp.status !== 'pending');

            let imageHtml = `<span style="color: var(--text-tertiary); font-size: 0.85rem;">ไม่มีภาพ</span>`;
            // แสดงรูปภาพเฉพาะเมื่อจุดตรวจนี้ได้รับการสแกนในรอบกะเวลานี้แล้วเท่านั้น ป้องกันการแสดงรูปเก่าค้างรอบ
            const checkpointImg = isAudited ? cp.audit_image_url : null;
            if (checkpointImg && checkpointImg.trim() !== '') {
                const cleanImgUrl = convertGoogleDriveLink(checkpointImg);
                imageHtml = `
                    <a href="${cleanImgUrl}" target="_blank" title="คลิกเพื่อดูภาพขนาดจริง" style="display: block; width: fit-content; margin: 0 auto;">
                        <img src="${cleanImgUrl}" class="img-thumbnail" alt="Checkpoint image" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; cursor: pointer; transition: transform 0.15s ease;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
                    </a>
                `;
            }

            // ปุ่มจัดการแก้ไข/ลบ สำหรับแอดมินหรือเจ้าหน้าที่เท่านั้น
            let actionButtons = '-';
            if (isAdminOrOfficer) {
                actionButtons = `
                    <div style="display: flex; gap: 0.5rem; justify-content: center;">
                        <button class="table-icon-btn btn-edit-cp" data-id="${cp.asset_id}" title="แก้ไข"><i data-lucide="edit-3"></i></button>
                        <button class="table-icon-btn text-danger btn-delete-cp" data-id="${cp.asset_id}" title="ลบ"><i data-lucide="trash-2"></i></button>
                    </div>
                `;
            } else if (isCourtMarshal) {
                // ศาล/ตำรวจศาลไม่มีปุ่มเช็คอินหรือบันทึกผล
                actionButtons = '-';
            } else {
                // สำหรับพนักงาน Guard / Guard2: แสดงปุ่ม สแกนตรวจ / บันทึกผล / หรือแนบรูปภาพภายหลัง (กรณีออฟไลน์ CP-01 ถึง CP-04)
                const isOfflineCP = ['CP-01', 'CP-02', 'CP-03', 'CP-04'].includes(cp.asset_number);
                const hasPhoto = checkpointImg && checkpointImg.trim() !== '';

                if (isAudited) {
                    if (isOfflineCP && !hasPhoto) {
                        actionButtons = `
                            <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                                <button class="btn btn-secondary btn-sm" disabled style="opacity: 0.65; cursor: not-allowed; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem;">
                                    <i data-lucide="check-circle-2"></i> ตรวจแล้ว
                                </button>
                                <button class="btn btn-primary btn-sm btn-audit-cp" data-id="${cp.asset_id}" style="width: 100%; background-color: #f59e0b; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem;">
                                    <i data-lucide="camera"></i> แนบรูปภายหลัง
                                </button>
                            </div>
                        `;
                    } else {
                        actionButtons = `
                            <button class="btn btn-secondary btn-sm" disabled style="opacity: 0.65; cursor: not-allowed; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem;">
                                <i data-lucide="check-circle-2"></i> ตรวจแล้ว
                            </button>
                        `;
                    }
                } else {
                    actionButtons = `
                        <button class="btn btn-primary btn-sm btn-audit-cp" data-id="${cp.asset_id}" style="width: 100%; background-color: var(--card-blue); border: none; display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem;">
                            <i data-lucide="clipboard-check"></i> บันทึกผล
                        </button>
                    `;
                }
            }

            let statusBadge = '';
            if (isAudited) {
                if (cp.status === 'normal') {
                    statusBadge = '<span class="badge badge-normal" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.5rem; background-color: #10b981; color: #ffffff;">ปกติ / ปลอดภัย</span>';
                } else if (cp.status === 'damaged') {
                    statusBadge = '<span class="badge badge-damaged" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.5rem; background-color: #f59e0b; color: #ffffff;">พบสิ่งผิดปกติ</span>';
                } else {
                    statusBadge = '<span class="badge badge-lost" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.5rem; background-color: #ef4444; color: #ffffff;">เกิดเหตุเร่งด่วน</span>';
                }
            } else {
                statusBadge = '<span class="badge" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 0.5rem; background-color: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1;">ยังไม่ได้ตรวจ</span>';
            }

            // แสดงผู้รายงานและเวลาตรวจในช่อง checkpoints ทุกช่อง
            let reporterHtml = '';
            if (isAudited) {
                const dateObj = new Date(cp.audited_at);
                const auditTime = cp.audited_at ? dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.' : '-';
                const shiftVal = getLogShift(dateObj);
                const shiftTextMapping = {
                'shift1': 'กะ 1 (06:00-11:00)',
                'shift2': 'กะ 2 (12:00-14:00)',
                'shift3': 'กะ 3 (14:30-16:00)',
                'shift4': 'กะ 4 (16:30-18:00)',
                'shift5': 'กะ 5 (20:30-22:00)',
                'shift6': 'กะ 6 (00:30-02:00)',
                'shift7': 'กะ 7 (02:30-04:00)',
                'shift8': 'กะ 8 (04:30-06:00)'
            };
                const shiftText = shiftTextMapping[shiftVal] || 'ไม่ระบุกะ';

                const scanDate = dateObj.toLocaleDateString('th-TH');
                let gpsHtml = '';
                if (cp.latitude && cp.longitude) {
                    gpsHtml = `
                        <div style="margin-top: 0.25rem;">
                            <a href="https://www.google.com/maps?q=${cp.latitude},${cp.longitude}" target="_blank" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.72rem; padding: 0.15rem 0.4rem; height: auto; font-weight: 600; color: #2563eb; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; text-decoration: none;">
                                <i data-lucide="map-pin" style="width: 12px; height: 12px;"></i> ดูพิกัดแผนที่ (GPS)
                            </a>
                        </div>
                    `;
                }

                // แสดงข้อความรายละเอียดเมื่อเกิดเหตุการณ์ไม่ปกติ
                let notesHtml = '';
                if (cp.status !== 'normal' && cp.notes && cp.notes.trim() !== '') {
                    notesHtml = `
                        <div style="margin-top: 0.35rem; padding: 0.4rem 0.5rem; background-color: #fee2e2; border: 1.5px solid #fca5a5; border-radius: 6px; color: #991b1b; font-size: 0.78rem; font-weight: 500;">
                            <div style="display: flex; align-items: center; gap: 0.25rem; font-weight: 600; margin-bottom: 0.15rem; color: #b91c1c;">
                                <i data-lucide="alert-triangle" style="width: 13px; height: 13px; flex-shrink: 0;"></i> รายละเอียดเหตุการณ์ไม่ปกติ:
                            </div>
                            <div style="word-break: break-word; color: #dc2626;">${cp.notes}</div>
                        </div>
                    `;
                }

                reporterHtml = `
                    <div style="margin-top: 0.35rem; display: flex; flex-direction: column; gap: 0.15rem; font-size: 0.8rem; color: var(--text-secondary);">
                        <span>👤 ผู้รายงาน: <strong>${cp.audited_by || 'ไม่ระบุ'}</strong></span>
                        <span>📅 วันที่ตรวจจริง: <strong>${scanDate}</strong></span>
                        <span>⏰ กะเวลา: <strong>${shiftText}</strong></span>
                        <span>🕒 เวลาตรวจจริง: <strong>${auditTime}</strong></span>
                        ${gpsHtml}
                        ${notesHtml}
                    </div>
                `;
            } else {
                reporterHtml = `
                    <div style="margin-top: 0.35rem; display: flex; flex-direction: column; gap: 0.15rem; font-size: 0.8rem; color: var(--text-tertiary);">
                        <span>👤 ผู้รายงาน: -</span>
                        <span>📅 วันที่ตรวจจริง: -</span>
                        <span>⏰ กะเวลา: -</span>
                        <span>🕒 เวลาตรวจจริง: -</span>
                    </div>
                `;
            }

            tr.innerHTML = `
                <td style="font-weight: bold; color: var(--header-blue);">${cp.asset_number}</td>
                <td>
                    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.25rem;">
                        <span style="font-weight: 500;">${cp.name}</span>
                        ${statusBadge}
                    </div>
                    ${reporterHtml}
                </td>
                <td>${cp.location}</td>
                <td>${imageHtml}</td>
                <td>${actionButtons}</td>
            `;

            // ดักจับปุ่ม Edit / Delete / Audit
            const rawCp = {
                id: cp.asset_id,
                asset_number: cp.asset_number,
                name: cp.name,
                location: cp.location,
                zone: cp.zone,
                image_url: cp.image_url,
                status: cp.status,
                notes: cp.notes,
                audit_image_url: cp.audit_image_url
            };

            if (isAdminOrOfficer) {
                tr.querySelector('.btn-edit-cp').addEventListener('click', () => openCheckpointModal(rawCp));
                tr.querySelector('.btn-delete-cp').addEventListener('click', () => handleDeleteCheckpoint(rawCp));
            } else if (!isOfficer && !isCourtMarshal) {
                // สำหรับยาม (Guard/Guard2)
                const isOfflineCP = ['CP-01', 'CP-02', 'CP-03', 'CP-04'].includes(cp.asset_number);
                const hasPhoto = checkpointImg && checkpointImg.trim() !== '';

                if (!isAudited || (isOfflineCP && !hasPhoto)) {
                    const auditBtn = tr.querySelector('.btn-audit-cp');
                    if (auditBtn) {
                        auditBtn.addEventListener('click', () => {
                            openAuditForm(rawCp);
                        });
                    }
                }
            }

            el.checkpointsTableBody.appendChild(tr);
        });

        lucide.createIcons();
    }

    // ค้นหาแบบเรียลไทม์
    el.checkpointSearchInput.addEventListener('input', loadCheckpointsData);
    el.checkpointLocationFilter.addEventListener('change', loadCheckpointsData);

    // ลบจุดตรวจ
    async function handleDeleteCheckpoint(cp) {
        if (confirm(`คุณแน่ใจว่าต้องการลบจุดตรวจรหัส [ ${cp.asset_number} ] หรือไม่? การลบนี้จะล้างประวัติการบันทึกตรวจของจุดตรวจนี้ด้วย!`)) {
            try {
                await window.supabaseService.deleteAsset(cp.id);
                alert('ลบจุดตรวจเรียบร้อยแล้ว');
                loadCheckpointsData();
            } catch (e) {
                alert('ไม่สามารถลบข้อมูลได้: ' + e.message);
            }
        }
    }

    // ==========================================
    // ADD/EDIT CHECKPOINT MODAL ACTIONS
    // ==========================================
    el.btnAddCheckpoint.addEventListener('click', () => {
        openCheckpointModal();
    });

    function openCheckpointModal(cp = null) {
        if (cp) {
            el.checkpointModalTitle.innerText = '📝 แก้ไขข้อมูลจุดตรวจ';
            el.checkpointFormId.value = cp.id;
            el.checkpointFormNumber.value = cp.asset_number;
            el.checkpointFormNumber.readOnly = true; // ไม่ให้แก้ไขรหัสเดิม
            el.checkpointFormName.value = cp.name;
            el.checkpointFormLocation.value = cp.location;
            el.checkpointFormImage.value = cp.image_url || '';
        } else {
            el.checkpointModalTitle.innerText = '📍 เพิ่มจุดตรวจใหม่';
            el.checkpointFormId.value = '';
            el.checkpointFormNumber.value = '';
            el.checkpointFormNumber.readOnly = false;
            el.checkpointFormName.value = '';
            el.checkpointFormLocation.value = 'บริเวณศาล';
            el.checkpointFormImage.value = '';
        }
        showModal(el.modalCheckpoint);
    }

    el.checkpointForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const cpData = {
            id: el.checkpointFormId.value || undefined,
            asset_number: el.checkpointFormNumber.value.trim(),
            name: el.checkpointFormName.value.trim(),
            location: el.checkpointFormLocation.value,
            image_url: el.checkpointFormImage.value.trim() || null
        };

        try {
            await window.supabaseService.saveAsset(cpData);
            alert('บันทึกข้อมูลจุดตรวจสำเร็จ!');
            hideModal(el.modalCheckpoint);
            loadCheckpointsData();
        } catch (err) {
            alert('ไม่สามารถบันทึกได้: ' + err.message);
        }
    });

    // ==========================================
    // VIEW 3: REPORT EXPORT & IMPORT ACTIONS
    // ==========================================
    
    // กำหนดค่าเริ่มต้นให้กับกล่องเลือกวันที่ในหน้ารายงาน (ค่าเริ่มต้นเป็นย้อนหลัง 30 วันจนถึงวันนี้)
    initReportDateFilters();

    function initReportDateFilters() {
        const today = new Date();
        const formatDateForInput = (date) => {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        const inputReportDate = document.getElementById('report-date-filter');
        if (inputReportDate) inputReportDate.value = formatDateForInput(today);
    }

    // ส่งออกรายงาน Excel / CSV
    el.btnExportCsv.addEventListener('click', async () => {
        const year = parseInt(el.reportFiscalYear.value);
        const loc = el.reportLocationFilter.value;
        const reportDateVal = el.reportDateFilter.value || null;
        const startDate = reportDateVal;
        const endDate = reportDateVal;

        try {
            const records = await window.supabaseService.fetchAuditRecords(year, loc, startDate, endDate);
            if (records.length === 0) {
                alert('ไม่พบข้อมูลประวัติการเดินตรวจตามตัวกรองที่ระบุ');
                return;
            }

            // แปลงข้อมูลเป็น CSV ภาษาไทยที่รองรับ MS Excel สมบูรณ์แบบ
            let csvContent = '\uFEFF'; // BOM สำหรับเปิด Excel ภาษาไทยได้ไม่เป็นภาษาต่างดาว
            csvContent += 'ลำดับ,รหัสจุดตรวจ,ชื่อจุดตรวจ,สถานที่ตั้ง,สถานะตรวจ,ผู้ตรวจสอบ,วันเวลาตรวจเช็คอิน,หมายเหตุการตรวจ\n';
            
            records.forEach((r, index) => {
                const dateText = r.audited_at ? new Date(r.audited_at).toLocaleString('th-TH') : '-';
                const auditorText = r.audited_by || 'ยังไม่ได้ตรวจ';
                
                let statusLabel = 'ยังไม่ได้ตรวจ';
                if (r.status === 'normal') statusLabel = 'ปกติ / ปลอดภัย';
                else if (r.status === 'damaged') statusLabel = 'พบสิ่งผิดปกติ/ชำรุด';
                else if (r.status === 'lost') statusLabel = 'เกิดเหตุเร่งด่วน';
                
                csvContent += `"${index + 1}","${r.asset_number || ''}","${r.name || ''}","${r.location || ''}","${statusLabel}","${auditorText}","${dateText}","${r.notes || ''}"\n`;
            });

            // สร้างไฟล์ดาวน์โหลด
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            const fileSuffix = startDate ? startDate : `${year}`;
            link.setAttribute('download', `G-Patrol-Report-${fileSuffix}-${loc}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            alert('ส่งออกรายงานล้มเหลว: ' + e.message);
        }
    });

    // ส่งออกเป็น PDF Report แบบพิมพ์สวยงาม
    el.btnExportPdf.addEventListener('click', async () => {
        const year = parseInt(el.reportFiscalYear.value);
        const loc = el.reportLocationFilter.value;
        const reportDateVal = el.reportDateFilter.value || null;
        const startDate = reportDateVal;
        const endDate = reportDateVal;

        try {
            const records = await window.supabaseService.fetchAuditRecords(year, loc, startDate, endDate);
            if (records.length === 0) {
                alert('ไม่พบข้อมูลที่จะนำส่งพิมพ์ PDF');
                return;
            }

            let periodText = `ประจำปี พ.ศ. ${year}`;
            let docTitle = `รายงานประวัติเดินตรวจ G-Patrol - ประจำปี ${year}`;
            if (startDate) {
                const dateText = new Date(startDate).toLocaleDateString('th-TH');
                periodText = `ประจำวันที่: ${dateText}`;
                docTitle = `รายงานประวัติเดินตรวจ G-Patrol - ประจำวันที่ ${dateText}`;
            }

            // บังคับเปลี่ยนสไตล์ของเว็บหลักเพื่อความสวยงามในเอกสาร
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>${docTitle}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
                        body { font-family: 'Sarabun', sans-serif; padding: 2rem; color: #1e293b; }
                        h1 { text-align: center; color: #1e3a8a; font-size: 1.5rem; margin-bottom: 0.5rem; }
                        h2 { text-align: center; font-size: 1rem; font-weight: normal; color: #64748b; margin-bottom: 2rem; }
                        table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.85rem; }
                        th { background-color: #1e3a8a; color: #ffffff; padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; }
                        td { padding: 8px 10px; border: 1px solid #e2e8f0; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.75rem; }
                        .badge-normal { background-color: #d1fae5; color: #065f46; }
                        .badge-damaged { background-color: #fef3c7; color: #92400e; }
                        .badge-lost { background-color: #fee2e2; color: #991b1b; }
                        .footer { margin-top: 3rem; text-align: right; font-size: 0.9rem; color: #64748b; }
                    </style>
                </head>
                <body>
                    <h1>รายงานสรุปการเดินตรวจเช็คอินจุดตรวจ (G-Patrol)</h1>
                    <h2>${periodText} | ตัวกรองสถานที่: ${loc === 'all' ? 'ทุกสถานที่' : loc}</h2>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 50px;">ลำดับ</th>
                                <th style="width: 100px;">รหัสจุดตรวจ (QR)</th>
                                <th>ชื่อจุดตรวจ</th>
                                <th style="width: 100px;">สถานที่ตั้ง</th>
                                <th style="width: 120px;">สถานะเช็คอิน</th>
                                <th style="width: 140px;">วันเวลาที่ตรวจ</th>
                                <th>ผู้เดินตรวจ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.map((r, i) => {
                                const dateText = r.audited_at ? new Date(r.audited_at).toLocaleString('th-TH') : '-';
                                const auditorText = r.audited_by || 'ยังไม่ได้ตรวจ';
                                
                                let statusBadge = '';
                                if (r.status === 'normal') {
                                    statusBadge = '<span class="badge badge-normal">ปกติ / ปลอดภัย</span>';
                                } else if (r.status === 'damaged') {
                                    statusBadge = '<span class="badge badge-damaged">พบสิ่งผิดปกติ</span>';
                                } else if (r.status === 'lost') {
                                    statusBadge = '<span class="badge badge-lost">เกิดเหตุเร่งด่วน</span>';
                                } else {
                                    statusBadge = '<span class="badge" style="background-color: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; font-weight: bold;">ยังไม่ได้ตรวจ</span>';
                                }

                                return `
                                    <tr>
                                        <td style="text-align: center;">${i + 1}</td>
                                        <td style="font-weight: bold;">${r.asset_number || '-'}</td>
                                        <td>${r.name || '-'}</td>
                                        <td>${r.location || '-'}</td>
                                        <td style="text-align: center;">${statusBadge}</td>
                                        <td style="text-align: center;">${dateText}</td>
                                        <td>${auditorText}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    <div class="footer">
                        รายงานข้อมูลวันที่: ${new Date().toLocaleDateString('th-TH')} ณ ศาลเยาวชนและครอบครัวจังหวัดสตูล (G-Patrol System)
                    </div>
                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (e) {
            alert('ออกรายงาน PDF ล้มเหลว: ' + e.message);
        }
    });

    // นำเข้าจุดตรวจจาก PDF (PDF Import Tool)
    el.btnSelectPdf.addEventListener('click', () => el.pdfFileInput.click());
    
    el.pdfFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        el.pdfFileName.innerText = file.name;
        el.pdfProgressContainer.style.display = 'block';
        el.pdfProgressBar.style.style = '0%';
        el.pdfStatusText.innerText = 'กำลังเปิดอ่านไฟล์ PDF...';

        try {
            const arrayBuffer = await file.arrayBuffer();
            
            // เรียกใช้ PDF parser module
            const items = await window.pdfAssetParser.parse(arrayBuffer, (percent) => {
                el.pdfProgressBar.style.width = `${percent}%`;
                el.pdfStatusText.innerText = `วิเคราะห์ข้อมูลโครงสร้างตาราง: ${percent}%`;
            });

            if (items.length === 0) {
                alert('ไม่พบรายการข้อมูลจุดตรวจหรือรหัสในรูปแบบที่วิเคราะห์ได้ในเอกสาร PDF นี้');
                el.pdfProgressContainer.style.display = 'none';
                return;
            }

            el.pdfStatusText.innerText = `พบรายการจุดตรวจในเอกสารทั้งหมด ${items.length} รายการ กำลังนำข้อมูลเข้าฐานข้อมูล...`;

            // บันทึกจุดตรวจเข้าฐานข้อมูลทั้งหมดแบบ Bulk
            await window.supabaseService.bulkInsertAssets(items);
            
            el.pdfProgressBar.style.width = '100%';
            el.pdfStatusText.innerText = `เสร็จสมบูรณ์! นำเข้าข้อมูลจุดตรวจเดินตรวจเข้าสู่ระบบเรียบร้อยจำนวน ${items.length} รายการ`;
            alert(`นำเข้าจุดตรวจสำเร็จจำนวน ${items.length} รายการแล้ว!`);
            
            loadCheckpointsData();
        } catch (err) {
            alert('การนำเข้าข้อมูลล้มเหลว: ' + err.message);
            el.pdfProgressContainer.style.display = 'none';
        }
    });

    // ==========================================
    // CAMERA SCANNER & QR CODE CODE CONTROLS
    // ==========================================
    
    // เปิดสแกนเนอร์
    el.btnOpenScanner.addEventListener('click', () => {
        el.manualCheckpointInput.value = '';
        showModal(el.modalScanner);
        startScanner();
    });

    // ปิดสแกนเนอร์
    el.btnCloseScanner.addEventListener('click', () => {
        hideModal(el.modalScanner);
        stopScanner();
    });

    function startScanner() {
        if (state.html5QrScanner) {
            stopScanner();
        }
        
        state.html5QrScanner = new Html5Qrcode("qr-reader");
        const config = { fps: 15, qrbox: { width: 250, height: 250 } };
        
        // เริ่มต้นกล้องกล้องหลัง
        state.html5QrScanner.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanFailure
        ).catch(err => {
            console.error("Error starting QR Code scanner:", err);
            // ปล่อยให้ใช้งานสแกนด้วยกล้องไม่ได้ แต่สามารถกรอกด้วยตัวเองได้
        });
    }

    function stopScanner() {
        if (state.html5QrScanner) {
            state.html5QrScanner.stop().then(() => {
                state.html5QrScanner = null;
            }).catch(err => {
                console.error("Failed to stop scanner:", err);
            });
        }
    }

    // เมื่อสแกน QR Code สำเร็จ
    async function onScanSuccess(decodedText, decodedResult) {
        console.log(`Scan result: ${decodedText}`);
        stopScanner();
        hideModal(el.modalScanner);
        
        // แยกวิเคราะห์ค่า QR Code เพื่อนำมาค้นหาจุดตรวจ
        await processCheckpointByNumber(decodedText);
    }

    function onScanFailure(error) {
        // เงียบไว้เพื่อไม่ให้รบกวนจังหวะสแกนกล้องขยับ
    }

    // ตรวจสอบแบบพิมพ์รหัสเอง
    el.btnManualSearch.addEventListener('click', async () => {
        const cpNumber = el.manualCheckpointInput.value.trim();
        if (!cpNumber) {
            alert('กรุณากรอกรหัสจุดตรวจก่อนตรวจสอบ');
            return;
        }
        
        stopScanner();
        hideModal(el.modalScanner);
        await processCheckpointByNumber(cpNumber);
    });

    async function processCheckpointByNumber(cpNumber) {
        try {
            // ดึงข้อมูลจุดตรวจตามหมายเลขจุดตรวจ
            const checkpoint = await window.supabaseService.fetchAssetByNumber(cpNumber);
            if (checkpoint) {
                // ตรวจสอบสิทธิ์เขตพื้นที่ของ Guard หากไม่ใช่ Admin/Officer
                if (state.userRole === 'guard' && checkpoint.zone !== 'บริเวณศาล') {
                    alert('คุณไม่มีสิทธิ์ในการเดินตรวจจุดตรวจในพื้นที่นี้ (สิทธิ์ของคุณจำกัดเฉพาะ บริเวณศาล เท่านั้น)');
                    return;
                }
                if (state.userRole === 'guard2' && checkpoint.zone !== 'บ้านพัก') {
                    alert('คุณไม่มีสิทธิ์ในการเดินตรวจจุดตรวจในพื้นที่นี้ (สิทธิ์ของคุณจำกัดเฉพาะ บ้านพัก เท่านั้น)');
                    return;
                }

                // ตรวจสอบว่าจุดตรวจนี้เคยถูกบันทึกในรอบกะเวลาเดินตรวจปัจจุบันนี้แล้วหรือยัง
                const today = new Date();
                const { startIso, endIso } = getShiftTimeRange(today);

                const { data: existingRecords, error: checkError } = await window.supabaseService.client
                    .from('g_patrol_audit_records')
                    .select('id')
                    .eq('asset_id', checkpoint.id)
                    .eq('fiscal_year', state.fiscalYear)
                    .gte('audited_at', startIso)
                    .lte('audited_at', endIso)
                    .maybeSingle();

                if (checkError) throw checkError;

                if (existingRecords) {
                    alert(`จุดตรวจ [ ${checkpoint.name} ] ได้รับการสแกนตรวจเช็คอินเสร็จสิ้นแล้วในกะรอบเวลานี้ ไม่สามารถส่งรายงานซ้ำได้ครับ`);
                    return;
                }

                // เปิดฟอร์มบันทึกเช็คอินเดินตรวจ
                openAuditForm(checkpoint);
            } else {
                alert(`ไม่พบรหัสจุดตรวจ [ ${cpNumber} ] ในฐานข้อมูลระบบ\nกรุณาแจ้งแอดมินให้ตั้งค่าจุดตรวจนี้ก่อนเดินตรวจเช็คอินครับ`);
            }
        } catch (e) {
            alert('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + e.message);
        }
    }

    // ==========================================
    // CHECK-IN FORM (AUDIT FORM) VIEW CONTROLS
    // ==========================================
    function openAuditForm(cp) {
        // ตรวจสอบสิทธิ์เขตพื้นที่ของ Guard เพื่อป้องกันการเช็คอินข้ามเขต
        if (state.userRole === 'guard' && cp.zone !== 'บริเวณศาล') {
            alert('คุณไม่มีสิทธิ์ในการเดินตรวจจุดตรวจในพื้นที่นี้ (สิทธิ์ของคุณจำกัดเฉพาะ บริเวณศาล เท่านั้น)');
            return;
        }
        if (state.userRole === 'guard2' && cp.zone !== 'บ้านพัก') {
            alert('คุณไม่มีสิทธิ์ในการเดินตรวจจุดตรวจในพื้นที่นี้ (สิทธิ์ของคุณจำกัดเฉพาะ บ้านพัก เท่านั้น)');
            return;
        }

        el.auditAssetId.value = cp.id;
        document.getElementById('audit-photo-url').value = ''; // เคลียร์ภาพถ่ายเก่าออก
        
        // เคลียร์พิกัด GPS เก่าออกและเรียกฟังก์ชันขอพิกัดปัจจุบันอัตโนมัติ
        document.getElementById('audit-gps-display').value = 'กำลังขอสิทธิ์ดึงพิกัด GPS...';
        document.getElementById('audit-latitude').value = '';
        document.getElementById('audit-longitude').value = '';
        requestGPSLocation();
        
        const now = new Date();

        // กำหนดเวลาจริงที่บันทึกรายงาน ณ ปัจจุบัน
        const realtimeDisplay = document.getElementById('audit-realtime-display');
        if (realtimeDisplay) {
            const timeText = now.toLocaleDateString('th-TH') + ' ' + now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
            realtimeDisplay.value = timeText;
        }

        // กำหนดชื่อเจ้าหน้าที่ผู้ตรวจเดินเวรไว้ด้านบน
        const userTextDisplay = document.getElementById('audit-user-text');
        if (userTextDisplay && state.currentUser) {
            const roleTextMapping = {
                'admin': 'ผู้ดูแลระบบ (Admin)',
                'officer': 'เจ้าหน้าที่พัสดุ (Officer)',
                'court marshal': 'Court Marshal',
                'guard': 'Guard - บริเวณศาล',
                'guard2': 'Guard - บ้านพัก'
            };
            const roleName = roleTextMapping[state.currentUser.role] || 'เจ้าหน้าที่เดินตรวจ';
            userTextDisplay.innerText = `${state.currentUser.display_name} (${roleName})`;
        }

        // กำหนดรอบกะเวลาเดินตรวจเริ่มต้นแสดงผลไว้ด้านบน (ใต้ชื่อผู้รายงาน)
        const shiftTextDisplay = document.getElementById('audit-shift-text');
        if (shiftTextDisplay) {
            const shiftVal = getLogShift(now);
            const shiftTextMapping = {
                'shift1': 'กะ 1 (06:00-11:00)',
                'shift2': 'กะ 2 (12:00-14:00)',
                'shift3': 'กะ 3 (14:30-16:00)',
                'shift4': 'กะ 4 (16:30-18:00)',
                'shift5': 'กะ 5 (20:30-22:00)',
                'shift6': 'กะ 6 (00:30-02:00)',
                'shift7': 'กะ 7 (02:30-04:00)',
                'shift8': 'กะ 8 (04:30-06:00)'
            };
            shiftTextDisplay.innerText = shiftTextMapping[shiftVal] || 'ไม่ระบุกะ';
        }

        // รีเซ็ตซ่อนกล่องพิมพ์เหตุการณ์ไม่ปกติไว้ก่อน (เนื่องจากเริ่มแรกจะถูกเช็คเป็นสถานะ ปกติ)
        const notesContainer = document.getElementById('abnormal-notes-container');
        if (notesContainer) notesContainer.style.display = 'none';

        // รีเซ็ตซ่อนกล่องพรีวิวรูปถ่ายจริงที่เคยแนบไว้ก่อนหน้า
        const previewBox = document.getElementById('audit-taken-photo-preview');
        const previewImg = document.getElementById('img-taken-preview');
        if (previewBox && previewImg) {
            previewImg.src = '';
            previewBox.style.display = 'none';
        }

        // จัดการแสดงผลตัวกรองระบุเวลาตรวจย้อนหลัง สำหรับสิทธิ์ Court Marshal / Admin / Officer
        const datetimeContainer = document.getElementById('audit-datetime-container');
        const customDatetimeInput = document.getElementById('audit-custom-datetime');
        if (datetimeContainer && customDatetimeInput) {
            const isCourtMarshal = (state.userRole === 'court marshal' || state.userRole === 'court_marshal' || state.userRole === 'admin' || state.userRole === 'officer');
            datetimeContainer.style.display = isCourtMarshal ? 'block' : 'none';
            if (isCourtMarshal) {
                // ตั้งค่าเวลาเริ่มต้นให้เป็นเวลาปัจจุบันในรูปแบบของเบราว์เซอร์เครื่อง (Local Time)
                const offset = now.getTimezoneOffset();
                const localNow = new Date(now.getTime() - (offset * 60 * 1000));
                customDatetimeInput.value = localNow.toISOString().slice(0, 16);
            }
        }

        el.auditAssetNumber.innerText = cp.asset_number;
        el.auditAssetName.innerText = cp.name;
        el.auditAssetLocation.innerText = cp.location;
        el.auditAssetId.value = cp.id;
        
        // ตรวจสอบว่าเป็นการแนบรูปเพิ่มย้อนหลัง หรือเป็นการแก้ไขข้อมูลที่มีอยู่แล้วหรือไม่
        const currentStatus = cp.status && cp.status !== 'pending' ? cp.status : 'normal';
        el.auditRecordForm.querySelector(`input[name="audit-status"][value="${currentStatus}"]`).checked = true;
        
        el.auditNotes.value = cp.notes || '';
        if (notesContainer) {
            notesContainer.style.display = currentStatus === 'damaged' ? 'block' : 'none';
        }

        el.auditPhotoFilename.innerText = cp.audit_image_url ? 'มีรูปแนบแล้ว' : 'ไม่มีภาพถ่ายแนบ';
        el.auditPhotoInput.value = '';
        document.getElementById('audit-photo-url').value = cp.audit_image_url || '';

        if (cp.audit_image_url && cp.audit_image_url.trim() !== '') {
            if (previewBox && previewImg) {
                previewImg.src = convertGoogleDriveLink(cp.audit_image_url);
                previewBox.style.display = 'block';
            }
        }

        // รูปตัวอย่างจุดตรวจดั้งเดิม
        if (cp.image_url && cp.image_url.trim() !== '') {
            el.auditImagePreview.innerHTML = `<img src="${convertGoogleDriveLink(cp.image_url)}" alt="Checkpoint original picture">`;
        } else {
            el.auditImagePreview.innerHTML = `<span>ภาพตัวอย่างจุดตรวจ</span>`;
        }

        const isOfflineCP = ['CP-01', 'CP-02', 'CP-03', 'CP-04'].includes(cp.asset_number);
        if (isOfflineCP) {
            el.auditPhotoInput.removeAttribute('capture');
        } else {
            el.auditPhotoInput.setAttribute('capture', 'environment');
        }

        showModal(el.modalAuditForm);
    }

    // จำลองถ่ายภาพ (การใช้งาน File Input แนบรูปภาพจริงผ่านมือถือ)
    el.btnTriggerCamera.addEventListener('click', () => {
        el.auditPhotoInput.click();
    });

    el.auditPhotoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        el.auditPhotoFilename.innerText = file.name;
        el.cameraLoading.style.display = 'block';

        const assetNumber = el.auditAssetNumber.innerText;
        const isOfflineSupported = ['CP-01', 'CP-02', 'CP-03', 'CP-04'].includes(assetNumber);

        try {
            // อัปโหลดไฟล์รูปภาพไปที่ Supabase Storage bucket 'asset-images'
            const uploadedUrl = await window.supabaseService.uploadAssetImage(assetNumber, file);
            
            // เก็บ URL ภาพลงฟิลด์ซ่อนสำหรับบันทึกรายงานตรวจ
            document.getElementById('audit-photo-url').value = uploadedUrl;

            // อัปเดตและแสดงพรีวิวภาพถ่ายจริงที่แนบด้านล่างปุ่ม
            const previewBox = document.getElementById('audit-taken-photo-preview');
            const previewImg = document.getElementById('img-taken-preview');
            if (previewBox && previewImg) {
                previewImg.src = uploadedUrl;
                previewBox.style.display = 'block';
            }

            el.cameraLoading.style.display = 'none';
            alert('อัปโหลดและแนบรูปถ่ายประจำจุดเช็คอินสำเร็จ!');
        } catch (err) {
            console.error('Network image upload failed:', err);
            
            if (isOfflineSupported) {
                // กรณีไม่มีสัญญาณเน็ตสำหรับ CP-01 ถึง CP-04: ให้แปลงภาพเป็น Base64 Data URL เพื่อแนบและจัดเก็บในเครื่องชั่วคราว
                const reader = new FileReader();
                reader.onload = function(event) {
                    const localDataUrl = event.target.result;
                    document.getElementById('audit-photo-url').value = localDataUrl;
                    
                    const previewBox = document.getElementById('audit-taken-photo-preview');
                    const previewImg = document.getElementById('img-taken-preview');
                    if (previewBox && previewImg) {
                        previewImg.src = localDataUrl;
                        previewBox.style.display = 'block';
                    }
                    el.cameraLoading.style.display = 'none';
                    el.auditPhotoFilename.innerText = file.name + ' (โหมดออฟไลน์)';
                    alert('ไม่สามารถอัปโหลดไปยังเซิร์ฟเวอร์ได้เนื่องจากสัญญาณเน็ตขัดข้อง ระบบได้แนบรูปถ่ายในโหมดออฟไลน์ไว้เรียบร้อยแล้ว ท่านสามารถกดยืนยันการเดินตรวจต่อได้ครับ');
                };
                reader.onerror = function() {
                    alert('อัปโหลดรูปภาพล้มเหลว และไม่สามารถอ่านรูปในโหมดออฟไลน์ได้');
                    el.cameraLoading.style.display = 'none';
                };
                reader.readAsDataURL(file);
            } else {
                alert('อัปโหลดรูปภาพล้มเหลว: ' + err.message);
                el.cameraLoading.style.display = 'none';
                el.auditPhotoFilename.innerText = 'อัปโหลดล้มเหลว';
            }
        }
    });

    // ซ่อน/แสดงกล่องระบุเหตุการณ์ไม่ปกติแบบไดนามิก ตามการเลือกสถานะจุดตรวจ
    el.auditRecordForm.querySelectorAll('input[name="audit-status"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const notesContainer = document.getElementById('abnormal-notes-container');
            if (notesContainer) {
                notesContainer.style.display = e.target.value === 'damaged' ? 'block' : 'none';
            }
        });
    });

    // อัปเดตรอบกะเวลาเดินตรวจเมื่อสิทธิ์ตำรวจศาลทำการระบุเวลาตรวจย้อนหลัง
    const customDatetimeInput = document.getElementById('audit-custom-datetime');
    if (customDatetimeInput) {
        customDatetimeInput.addEventListener('change', (e) => {
            const shiftTextDisplay = document.getElementById('audit-shift-text');
            if (e.target.value && shiftTextDisplay) {
                const date = new Date(e.target.value);
                const shiftVal = getLogShift(date);
                const shiftTextMapping = {
                'shift1': 'กะ 1 (06:00-11:00)',
                'shift2': 'กะ 2 (12:00-14:00)',
                'shift3': 'กะ 3 (14:30-16:00)',
                'shift4': 'กะ 4 (16:30-18:00)',
                'shift5': 'กะ 5 (20:30-22:00)',
                'shift6': 'กะ 6 (00:30-02:00)',
                'shift7': 'กะ 7 (02:30-04:00)',
                'shift8': 'กะ 8 (04:30-06:00)'
            };
                shiftTextDisplay.innerText = shiftTextMapping[shiftVal] || 'ไม่ระบุกะ';
            }
        });
    }

    // ส่งรายงานเช็คอินเดินตรวจ (Audit Form Submit)
    el.auditRecordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const record = {
            asset_id: el.auditAssetId.value,
            status: el.auditRecordForm.elements['audit-status'].value,
            notes: el.auditNotes.value.trim() || null,
            fiscal_year: state.fiscalYear,
            image_url: document.getElementById('audit-photo-url').value || null,
            latitude: parseFloat(document.getElementById('audit-latitude').value) || null,
            longitude: parseFloat(document.getElementById('audit-longitude').value) || null
        };

        const customDatetimeVal = document.getElementById('audit-custom-datetime').value;
        const isCourtMarshal = (state.userRole === 'court marshal' || state.userRole === 'court_marshal' || state.userRole === 'admin' || state.userRole === 'officer');
        if (isCourtMarshal && customDatetimeVal) {
            record.audited_at = new Date(customDatetimeVal).toISOString();
        }

        try {
            await window.supabaseService.saveAuditRecord(record);
            alert('บันทึกรายงานการเดินตรวจเช็คอินเรียบร้อยแล้ว!');
            hideModal(el.modalAuditForm);
            
            // โหลดข้อมูล Dashboard และ Checkpoints ใหม่เพื่ออัปเดตสถิติและสถานะปุ่ม
            loadDashboardData();
            loadCheckpointsData();
        } catch (err) {
            alert('บันทึกรายงานไม่สำเร็จ: ' + err.message);
        }
    });

    // ฟังก์ชันขอสิทธิ์ดึงพิกัด GPS ณ ปัจจุบันสำหรับอุปกรณ์มือถือ
    function requestGPSLocation() {
        const gpsDisplay = document.getElementById('audit-gps-display');
        const latInput = document.getElementById('audit-latitude');
        const lngInput = document.getElementById('audit-longitude');
        
        if (!navigator.geolocation) {
            gpsDisplay.value = 'เบราว์เซอร์ไม่รองรับ GPS';
            return;
        }
        
        gpsDisplay.value = 'กำลังดึงพิกัด GPS...';
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                latInput.value = lat;
                lngInput.value = lng;
                gpsDisplay.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            },
            (error) => {
                console.error("GPS Fetch Error:", error);
                let errMsg = 'ดึงพิกัดไม่สำเร็จ';
                if (error.code === error.PERMISSION_DENIED) {
                    errMsg = 'กรุณาเปิดสิทธิ์เข้าถึงพิกัด (GPS)';
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    errMsg = 'ไม่พบสัญญาณพิกัด GPS';
                } else if (error.code === error.TIMEOUT) {
                    errMsg = 'ดึงพิกัดหมดเวลา (Timeout)';
                }
                gpsDisplay.value = errMsg;
            },
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0
            }
        );
    }

    // ลงทะเบียนปุ่มดึงพิกัด GPS เพิ่มเติม
    const btnGetGps = document.getElementById('btn-get-gps');
    if (btnGetGps) {
        btnGetGps.addEventListener('click', () => {
            requestGPSLocation();
        });
    }

    // ==========================================
    // COMMON COMPONENT HELPERS
    // ==========================================
    function showModal(modalEl) {
        if (modalEl) modalEl.classList.add('active');
    }

    function hideModal(modalEl) {
        if (modalEl) modalEl.classList.remove('active');
    }

    // ตั้งค่าปิดโมดูลเมื่อกดปุ่ม X
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            hideModal(modal);
            
            // หยุดสแกนเนอร์หากปุ่มกากบาทเป็นตัวหยุดสแกน
            if (modal && modal.id === 'modal-scanner') {
                stopScanner();
            }
        });
    });

    // โหลดหน้าแรกเมื่อล็อกอินอยู่แล้ว
    window.addEventListener('hashchange', () => {
        // จัดการ routing หากจำเป็น
    });
});
