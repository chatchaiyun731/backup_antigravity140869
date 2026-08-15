/* =====================================================================
   Smart PDF Parser Module for AssetFlow
   Extracts structured asset list from PDF text content using coordinate grouping
   ===================================================================== */

class PDFAssetParser {
    constructor() {
        // Regex สำหรับจับรูปแบบเลขครุภัณฑ์: 1800-007-0019/0014
        // หรือ 1800-007-0019 (ไม่บังคับมี / ด้านหลัง)
        this.assetRegex = /\b\d{4}-\d{3}-\d{4}(?:\/\d{4})?\b/g;
    }

    /**
     * วิเคราะห์ไฟล์ PDF และดึงข้อมูลพัสดุ
     * @param {ArrayBuffer} pdfArrayBuffer - ข้อมูลไบนารีของไฟล์ PDF
     * @param {Function} onProgress - คอลแบ็กฟังก์ชันเพื่อรายงานความคืบหน้า (เปอร์เซ็นต์)
     * @returns {Promise<Array>} รายการพัสดุที่ถอดรหัสได้ [{ asset_number, name, location }]
     */
    async parse(pdfArrayBuffer, onProgress = () => {}) {
        const assets = [];
        try {
            // โหลดเอกสาร PDF
            const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
            const pdf = await loadingTask.promise;
            const totalPages = pdf.numPages;

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                onProgress(Math.round((pageNum / totalPages) * 100));
                
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                // ดึงรายการบรรทัดข้อความจากพิกัด
                const lines = this.rebuildLines(textContent.items);
                
                // ค้นหาข้อมูลพัสดุในแต่ละบรรทัด
                for (const line of lines) {
                    const parsedItem = this.parseLine(line);
                    if (parsedItem) {
                        assets.push(parsedItem);
                    }
                }
            }
        } catch (err) {
            console.error('Error parsing PDF:', err);
            throw new Error('ไม่สามารถอ่านไฟล์ PDF นี้ได้ กรุณาตรวจสอบว่าเป็นไฟล์ PDF ที่มีข้อความจริง (ไม่ใช่ภาพสแกนแบบรูปภาพล้วน)');
        }
        return assets;
    }

    /**
     * จัดบรรทัดข้อความในหน้ากระดาษโดยดูจากพิกัดแนวตั้ง (Y)
     * PDF.js จะส่งคืนข้อความย่อยๆ เราต้องรวมส่วนที่อยู่ในแนวระดับเดียวกันเข้าด้วยกัน
     */
    rebuildLines(items) {
        if (!items || items.length === 0) return [];

        // กลุ่มข้อความแยกตามพิกัด Y (ปัดเศษเพื่อป้องกันเศษพิกัดเยื้องเล็กน้อย)
        const yGroups = {};
        const yTolerance = 4; // พิกัดเบี่ยงเบนได้ไม่เกิน 4 พิกเซลในแนวตั้ง

        for (const item of items) {
            // ข้อมูล item.str คือข้อความ, item.transform[5] คือพิกัดแกน Y (ความสูงจากขอบล่าง)
            // item.transform[4] คือพิกัดแกน X (ความกว้างจากขอบซ้าย)
            if (!item.str || item.str.trim() === '') continue;

            const y = item.transform[5];
            const x = item.transform[4];
            
            // ค้นหากลุ่มพิกัด Y ที่ใกล้เคียงกันที่มีอยู่แล้ว
            let foundYKey = null;
            for (const key in yGroups) {
                if (Math.abs(parseFloat(key) - y) <= yTolerance) {
                    foundYKey = key;
                    break;
                }
            }

            if (foundYKey === null) {
                foundYKey = y.toString();
                yGroups[foundYKey] = [];
            }

            yGroups[foundYKey].push({ text: item.str, x: x });
        }

        // นำแต่ละกลุ่มบรรทัดมาเรียงข้อความจากซ้ายไปขวา (เรียงตาม X)
        const lineTexts = [];
        // เรียงแกน Y จากสูงสุดลงต่ำสุด (หัวกระดาษลงไปท้ายกระดาษ)
        const sortedYKeys = Object.keys(yGroups).map(Number).sort((a, b) => b - a);

        for (const yKey of sortedYKeys) {
            const lineItems = yGroups[yKey];
            // เรียงลำดับจากซ้ายไปขวา
            lineItems.sort((a, b) => a.x - b.x);
            
            // เชื่อมคำเข้าด้วยกัน
            const combinedText = lineItems.map(item => item.text).join(' ');
            if (combinedText.trim() !== '') {
                lineTexts.push(combinedText);
            }
        }

        return lineTexts;
    }

    /**
     * แยกวิเคราะห์บรรทัดข้อความเดี่ยวเพื่อหาข้อมูลพัสดุ
     * @param {string} lineText - ข้อความรวมในบรรทัดเดียวกัน
     * @returns {object|null} ข้อมูลพัสดุ หรือ null หากไม่พบเลขครุภัณฑ์
     */
    parseLine(lineText) {
        // ค้นหาเลขครุภัณฑ์ในบรรทัด
        this.assetRegex.lastIndex = 0; // รีเซ็ตตำแหน่ง regex
        const matches = lineText.match(this.assetRegex);
        
        if (!matches || matches.length === 0) {
            return null; // ไม่พบเลขครุภัณฑ์ในบรรทัดนี้
        }

        const assetNumber = matches[0]; // ใช้เลขครุภัณฑ์ตัวแรกที่เจอในบรรทัด

        // แยกบรรทัดด้วยเลขครุภัณฑ์ที่พบ เพื่อหาข้อความรอบข้าง
        const parts = lineText.split(assetNumber);
        let leftText = parts[0] ? parts[0].trim() : '';
        let rightText = parts[1] ? parts[1].trim() : '';

        // --- ส่วนการประมวลผลข้อความด้านซ้าย (Left Text) คาดว่าจะเป็น "ชื่อรายการพัสดุ" ---
        // กำจัดพวกลำดับที่ เช่น "1. ", "ลำดับ 1 ", "1 " 
        leftText = leftText.replace(/^\d+[\.\s\-\)]+\s*/, ''); // ตัดลำดับที่ 1., 1) หรือตัวเลขนำหน้าออก
        leftText = leftText.replace(/^(ลำดับที่|ลำดับ|ที่)\s*\d+\s*/, ''); // ตัด "ลำดับที่..." นำหน้าออก
        
        // --- ส่วนการประมวลผลข้อความด้านขวา (Right Text) คาดว่าจะเป็น "สถานที่จัดเก็บ" ---
        // หากด้านขวาเป็นช่องว่าง หรือไม่มีข้อมูล ลองสแกนหาสถานที่ยอดนิยม
        let location = 'ไม่ระบุสถานที่';
        if (rightText && rightText.length > 2) {
            // บางครั้ง PDF อาจมีอักขระขยะติดมา ให้ช่วยตกแต่งคำเล็กน้อย
            location = rightText.replace(/^[\s\-\:\.\/\|]+/, '').trim();
        }

        // กรณีชื่อครุภัณฑ์ว่างเปล่า (เกิดจาก PDF จัดหน้าเยื้องบรรทัด) ให้ใช้คำแทน
        let name = leftText !== '' ? leftText : 'ครุภัณฑ์ไม่ได้ระบุชื่อ';

        // ปรับปรุงกรณีข้อมูลที่ตัดออกมาดูแปลกๆ (เช่น สั้นเกินไปหรือยาวเกินไปจนสับสน)
        if (name.length < 2) {
            name = `ครุภัณฑ์เลขที่ ${assetNumber}`;
        }

        return {
            asset_number: assetNumber,
            name: name,
            location: location
        };
    }
}

// ประกาศและแชร์ instance สำหรับเรียกใช้งานใน app.js
window.pdfAssetParser = new PDFAssetParser();
