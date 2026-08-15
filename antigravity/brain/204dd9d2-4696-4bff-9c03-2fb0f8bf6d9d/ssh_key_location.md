# วิธีตรวจสอบ SSH key ที่คุณได้เพิ่มบน GitHub

1. เปิดเว็บเบราว์เซอร์และเข้าสู่ระบบ GitHub ด้วยบัญชีของคุณ.
2. คลิกที่ **avatar** ของคุณ (มุมขวาบน) แล้วเลือก **Settings**.
3. ในเมนูด้านซ้าย เลือก **SSH and GPG keys** (หรือ **SSH keys** หากอยู่ในเมนูย่อย).
4. คุณจะเห็นรายการของคีย์ที่เพิ่มไว้ทั้งหมด. คีย์ที่เราใช้สำหรับสำรอง Antigravity จะมีชื่อ **“Antigravity backup key”** และแสดง Fingerprint‑SHA256 เช่น:
   ```
   SHA256:eEzKkKfV03pq8y5gPvSohUc9hZKRfxmcA/HRk05hg5w
   ```
5. หากต้องการตรวจสอบค่า **Public key** ให้คลิกที่ชื่อคีย์ แล้วจะเปิดหน้ารายละเอียดที่แสดงคีย์เต็ม (ssh‑ed25519 …).

---

> ![GitHub SSH keys page mockup](file:///C:/Users/66830/.gemini/antigravity/brain/204dd9d2-4696-4bff-9c03-2fb0f8bf6d9d/github_ssh_keys_page_1786676368028.jpg)

*(ภาพตัวอย่าง UI ของหน้า Settings → SSH and GPG keys บน GitHub, โหมด Dark)*
