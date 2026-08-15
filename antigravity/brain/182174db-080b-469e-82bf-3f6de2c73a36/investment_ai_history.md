# Smart Investment AI - Project History & Context Link 🚀

ประวัติการสนทนาและการพัฒนาของโปรเจกต์ **Smart Investment AI** ได้ถูกเชื่อมโยงและรวบรวมไว้ที่นี่เรียบร้อยแล้ว เพื่อให้คุณสามารถติดตามและพัฒนาต่อได้อย่างสะดวก

---

## 🔗 วิธีการกลับไปคุยต่อในแชทเดิม
หากคุณต้องการเปิดแชทเดิมที่มีข้อความโต้ตอบทั้งหมดกับ AI ในประวัติเก่า คุณสามารถใช้คำสั่งด้านล่างนี้ได้ทันที:
- **คำสั่ง Resume ใน CLI**:
  ```bash
  /resume c65c70e4-1473-4c30-bb91-f17f7cbd18d7
  ```
  *(หรือคลิกเลือกห้องสนทนาที่มี ID `c65c70e4-1473-4c30-bb91-f17f7cbd18d7` จากแถบเมนูด้านซ้าย)*

---

## 📂 ข้อมูลโปรเจกต์ปัจจุบัน (Active Workspace)
โฟลเดอร์สำหรับเขียนโค้ดและพัฒนาแอปพลิเคชันได้ย้ายมาอยู่ที่นี่:
- **ที่อยู่โฟลเดอร์โปรเจกต์**: [investment-portfolio-tracker](file:///C:/Users/66830/.gemini/antigravity/scratch/investment-portfolio-tracker)

---

## 🌟 ฟีเจอร์เด่นและประวัติการพัฒนาที่ผ่านมา
อ้างอิงจากบทสนทนาเก่า (`c65c70e4-1473-4c30-bb91-f17f7cbd18d7`) แอปพลิเคชันประกอบไปด้วยฟีเจอร์เหล่านี้:

1. **Dashboard การจัดการพอร์ตโฟลิโอ**:
   - แสดงสัดส่วนการลงทุน (Asset Allocation & Sector Allocation) โดยใช้กราฟสวยงามจาก Recharts
   - แสดงผลรวมมูลค่า ต้นทุน และอัตราการทำกำไร/ขาดทุนสะสม (Gain/Loss %)
   - แยกประเภทพอร์ตได้ระหว่าง พอร์ตอ้างอิง (Reference) และพอร์ตลงทุนจริง (Real)
2. **ระบบสแกนด้วย AI บนสัญลักษณ์รายตัว (On-Demand AI Scan)**:
   - มีปุ่ม "🤖 สแกนหาจุดซื้อ/ขาย" เพื่อป้อนข้อมูลหุ้นให้ AI ประเมินและแสดงผลเป็นสัญลักษณ์ท้ายชื่อหุ้น ได้แก่:
     - 🔥 **Overheating** (แนะนำให้พิจารณาขายทำกำไร / Take Profit)
     - 🧊 **Underperforming** (แนะนำให้พิจารณาตัดขาดทุน / Cut Loss)
     - 🛡️ **Strong Hold** (พื้นฐานดี แนะนำถือต่อ)
     - 🚀 **Accumulate/Buy Opportunity** (แนะนำให้ซื้อ/สะสมเพิ่ม)
   - มี Tooltip อธิบายรายละเอียดเหตุผลเมื่อนำเมาส์ไปชี้ และมีข้อความคำเตือน (Disclaimer) อย่างถูกต้อง
3. **การดึงราคาแบบ Real-time และจำลองการดึงราคา**:
   - เชื่อมต่อ API ดึงราคาหุ้นไทย (SET) เช่น CPALL, SCBGP และหุ้นสหรัฐฯ (US) เช่น AAPL รวมถึงกองทุน B-INNOTECH ได้
4. **ความเข้ากันได้กับการแสดงผลบนมือถือ (Mobile Responsive)**:
   - ปรับปรุงโครงสร้างหน้าจอหลัก กราฟ และเมนู Tab ให้สลับใช้งานง่ายบนจอมือถือ
   - ปรับปรุงตารางรายชื่อหุ้นให้ปัดเลื่อนซ้าย-ขวาได้ (Horizontal Scroll) โดยไม่หลุดกรอบ
   - ปรับปรุง Modal ฟอร์มป้อนข้อมูลให้ช่องกรอกข้อมูลเรียงซ้อนกันแนวตั้งสำหรับหน้าจอมือถือ
5. **ระบบจัดการ API Key และการตั้งค่าโมเดล**:
   - หน้าจอ Settings ให้กรอก API Key และเลือกโมเดล (Gemini, OpenAI, Anthropic, Custom Endpoint)
   - ข้อมูลบันทึกไว้ใน LocalStorage ปลอดภัยภายในเครื่อง

---

## 🛠️ โครงสร้างไฟล์โค้ดของแอปพลิเคชัน

| ชื่อไฟล์ | หน้าที่/ความรับผิดชอบ |
| :--- | :--- |
| [src/App.tsx](file:///C:/Users/66830/.gemini/antigravity/scratch/investment-portfolio-tracker/src/App.tsx) | หน้าหลักควบคุมสถานะ (States) การดึงข้อมูล และแท็บหน้าจอย่อย |
| [src/components/Dashboard.tsx](file:///C:/Users/66830/.gemini/antigravity/scratch/investment-portfolio-tracker/src/components/Dashboard.tsx) | หน้าสรุปผล สถิติ และการแสดงกราฟสัดส่วนการลงทุน |
| [src/components/HoldingsList.tsx](file:///C:/Users/66830/.gemini/antigravity/scratch/investment-portfolio-tracker/src/components/HoldingsList.tsx) | ตารางรายชื่อหุ้น กองทุน ปุ่มกดสแกน AI และ Tooltip คำสั่ง |
| [src/components/AiAdvisor.tsx](file:///C:/Users/66830/.gemini/antigravity/scratch/investment-portfolio-tracker/src/components/AiAdvisor.tsx) | หน้าต่างวิเคราะห์พอร์ตความเสี่ยงโดยภาพรวมจาก AI |
| [src/components/AiChat.tsx](file:///C:/Users/66830/.gemini/antigravity/scratch/investment-portfolio-tracker/src/components/AiChat.tsx) | หน้าแชทโต้ตอบสอบถามเกี่ยวกับพอร์ตโฟลิโอกับ AI |
| [src/components/ApiSettings.tsx](file:///C:/Users/66830/.gemini/antigravity/scratch/investment-portfolio-tracker/src/components/ApiSettings.tsx) | ฟอร์มสำหรับตั้งค่า API Key และ Custom Model Endpoint |
| [src/components/TransactionModal.tsx](file:///C:/Users/66830/.gemini/antigravity/scratch/investment-portfolio-tracker/src/components/TransactionModal.tsx) | หน้าป๊อปอัปสำหรับเพิ่มและแก้ไขข้อมูลธุรกรรมการซื้อขายสินทรัพย์ |
| [src/services/aiService.ts](file:///C:/Users/66830/.gemini/antigravity/scratch/investment-portfolio-tracker/src/services/aiService.ts) | โมดูลคำนวณสัดส่วนพอร์ต คำนวณความเสี่ยง และทำหน้าที่คุยกับ LLM API |
| [src/services/financeApi.ts](file:///C:/Users/66830/.gemini/antigravity/scratch/investment-portfolio-tracker/src/services/financeApi.ts) | ระบบดึงราคาหุ้นและข้อมูลกองทุนจำลองที่มีการอัปเดตแบบเรียลไทม์ |
| [src/index.css](file:///C:/Users/66830/.gemini/antigravity/scratch/investment-portfolio-tracker/src/index.css) | สไตล์ชีตหลักที่กำหนดโทนสี premium-dark และตั้งค่า `@media` สำหรับหน้าจอมือถือ |

---

> [!TIP]
> หากต้องการเปิดหน้าแอปพลิเคชันเพื่อทดสอบการทำงาน ให้เปิด Terminal ในโฟลเดอร์โปรเจกต์แล้วรันคำสั่ง:
> `npm run dev`
