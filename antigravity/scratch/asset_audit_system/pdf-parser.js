/* =====================================================================
   Smart PDF Parser Module with Browser-based OCR for AssetFlow
   Extracts structured asset list from PDF text content.
   Supports digital PDFs and scanned image PDFs using Tesseract.js.
   ===================================================================== */

class PDFAssetParser {
    constructor() {
        // Regex หลักที่ยืดหยุ่นสูงสำหรับตรวจจับเลขครุภัณฑ์ (เช่น 1800 - 007 - 0019 / O014 หรือ 7440-001-0001/26049)
        // รองรับช่องว่างและตัวอักษรที่มักสับสนจากการทำ OCR (เช่น O กับ 0 หรือ l กับ 1)
        this.assetRegex = /[0-9OoIil|]{4}\s*-\s*[0-9OoIil|]{3}\s*-\s*[0-9OoIil|]{4}(?:\s*\/\s*[0-9OoIil|]+)?/gi;
        this.lastRawText = ''; // เก็บข้อความดิบล่าสุดเพื่อช่วยในการตรวจสอบ/ดีบั๊ก
        this.detectedRotation = null; // แคชค่าองศาการหมุนที่ถูกต้อง (หาแค่หน้าแรกแล้วใช้ร่วมกันทุกหน้า)
    }

    /**
     * ทำความสะอาดและจัดรูปแบบรหัสครุภัณฑ์ที่สแกนได้ให้เป็นมาตรฐาน (เช่น แปลง O/o -> 0, ลบช่องว่าง)
     */
    normalizeAssetNumber(str) {
        if (!str) return '';
        // 1. ลบช่องว่างทั้งหมดออก
        let cleaned = str.replace(/\s+/g, '');
        // 2. แปลงตัวอักษรที่มักสับสนกลับเป็นตัวเลข
        cleaned = cleaned.replace(/[Oo]/g, '0');
        cleaned = cleaned.replace(/[Iil|]/g, '1');
        return cleaned.toUpperCase();
    }

    /**
     * วิเคราะห์ไฟล์ PDF และดึงข้อมูลพัสดุ
     * @param {ArrayBuffer} pdfArrayBuffer - ข้อมูลไบนารีของไฟล์ PDF
     * @param {Function} onProgress - คอลแบ็กฟังก์ชันเพื่อรายงานความคืบหน้า (เปอร์เซ็นต์, ข้อความสถานะ)
     * @returns {Promise<Array>} รายการพัสดุที่ถอดรหัสได้ [{ asset_number, name, location }]
     */
    async parse(pdfArrayBuffer, onProgress = () => {}) {
        const assets = [];
        this.lastRawText = ''; // รีเซ็ตข้อความดิบ
        this.detectedRotation = null; // รีเซ็ตแคชองศาหมุน
        
        try {
            // โหลดเอกสาร PDF
            const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
            const pdf = await loadingTask.promise;
            const totalPages = pdf.numPages;

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                // สลับความคืบหน้าเบื้องต้น
                onProgress(
                    Math.round(((pageNum - 0.9) / totalPages) * 100),
                    `กำลังอ่านเอกสารหน้าที่ ${pageNum}/${totalPages}...`
                );
                
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                // ดึงรายการบรรทัดข้อความจากพิกัด (Digital Text Extraction)
                const lines = this.rebuildLines(textContent.items);
                let pageText = lines.join(' ');
                
                // ตรวจสอบว่าพบบาร์โค้ด/เลขครุภัณฑ์ผ่านวิธีดิจิทัลหรือไม่
                this.assetRegex.lastIndex = 0;
                let hasAsset = this.assetRegex.test(pageText);

                // หากไม่มีตัวหนังสือดิจิทัล หรือไม่พบเลขครุภัณฑ์ในโหมดปกติ ให้สลับเข้าระบบสแกน OCR แบบด่วน
                if (!hasAsset || pageText.trim() === '') {
                    console.log(`Page ${pageNum} has no digital text. Invoking Fast Auto-Rotation OCR Mode...`);
                    
                    // ตรวจเช็คการดาวน์โหลดไลบรารี Tesseract.js
                    if (!window.Tesseract) {
                        throw new Error('ระบบ OCR ไม่ทำงานเนื่องจากโหลดไลบรารี Tesseract.js ขัดข้อง กรุณาเชื่อมต่ออินเทอร์เน็ต');
                    }

                    // ขั้นตอนที่ 1: ตรวจหาองศาการหมุนที่ถูกต้องจากหน้าแรก (หาเฉพาะหน้าแรกและจำค่าไว้ใช้ต่อหน้าอื่นๆ)
                    if (this.detectedRotation === null) {
                        // ตรวจสอบ 3 มุมที่เป็นไปได้: 0 (ปกติ), 90 (ตะแคงขวา), 270 (ตะแคงซ้าย)
                        const rotationsToTry = [0, 90, 270];
                        let bestAngle = 0;
                        let maxThaiChars = 0;

                        this.lastRawText += `[เริ่มระบบวิเคราะห์องศาอัตโนมัติ]\n`;

                        for (const angle of rotationsToTry) {
                            const tryIndex = rotationsToTry.indexOf(angle);
                            onProgress(
                                Math.round(((pageNum - 0.9 + (tryIndex * 0.06)) / totalPages) * 100),
                                `กำลังวิเคราะห์ทิศทางเอกสารอัตโนมัติ (ทดสอบมุมหมุน ${angle}°)...`
                            );

                            const defaultRotate = page.rotate !== undefined ? page.rotate : (page.rotation !== undefined ? page.rotation : 0);
                            const rotationAngle = (defaultRotate + angle) % 360;

                            // เพิ่ม scale เป็น 1.2 เพื่อความชัดเจนในการสแกนตรวจสอบตัวหนังสือไทย (แม่นยำกว่า 0.5)
                            const lowResViewport = page.getViewport({ scale: 1.2, rotation: rotationAngle });
                            const lowResCanvas = document.createElement('canvas');
                            const lowResContext = lowResCanvas.getContext('2d');
                            lowResCanvas.height = lowResViewport.height;
                            lowResCanvas.width = lowResViewport.width;

                            lowResContext.fillStyle = '#ffffff';
                            lowResContext.fillRect(0, 0, lowResCanvas.width, lowResCanvas.height);

                            await page.render({
                                canvasContext: lowResContext,
                                viewport: lowResViewport
                            }).promise;

                            // สั่งทำ OCR ด่วนหาตัวอักษร
                            const ocrTestResult = await window.Tesseract.recognize(lowResCanvas, 'tha+eng');
                            const testText = ocrTestResult.data.text || '';
                            
                            // นับจำนวนตัวอักษรภาษาไทย Unicode เพื่อวิเคราะห์ทิศทางที่ตัวหนังสือตั้งตรง
                            const thaiCharMatches = testText.match(/[\u0e00-\u0e7f]/g);
                            const thaiCharCount = thaiCharMatches ? thaiCharMatches.length : 0;
                            
                            console.log(`Rotation Check: Angle ${angle}° yielded ${thaiCharCount} Thai characters.`);
                            this.lastRawText += `- ทดสอบมุมหมุน ${angle}° พบอักษรไทย ${thaiCharCount} ตัว\n`;

                            if (thaiCharCount > maxThaiChars) {
                                maxThaiChars = thaiCharCount;
                                bestAngle = angle;
                            }
                        }
                        this.detectedRotation = bestAngle;
                        console.log(`Locked final rotation angle: ${this.detectedRotation}°`);
                        this.lastRawText += `=> เลือกมุมหมุนที่ดีที่สุด: ${this.detectedRotation}°\n\n`;
                    }

                    // ขั้นตอนที่ 2: รัน OCR ความละเอียดสูงจริง (scale = 2.0) เพียง "ครั้งเดียว" ในมุมที่ถูกต้อง
                    onProgress(
                        Math.round(((pageNum - 0.7) / totalPages) * 100),
                        `กำลังทำ OCR ความละเอียดสูง หน้าที่ ${pageNum}/${totalPages} (ที่มุมหมุน ${this.detectedRotation}°)...`
                    );

                    const defaultRotate = page.rotate !== undefined ? page.rotate : (page.rotation !== undefined ? page.rotation : 0);
                    const finalRotation = (defaultRotate + this.detectedRotation) % 360;

                    const viewport = page.getViewport({ scale: 2.0, rotation: finalRotation });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    context.fillStyle = '#ffffff';
                    context.fillRect(0, 0, canvas.width, canvas.height);

                    await page.render({
                        canvasContext: context,
                        viewport: viewport
                    }).promise;

                    // แสดงภาพพรีวิวกระดาษแนวตรงบนหน้าเว็บ
                    const previewImg = document.getElementById('pdf-ocr-preview-img');
                    const previewContainer = document.getElementById('pdf-ocr-preview-container');
                    if (previewImg && previewContainer) {
                        previewImg.src = canvas.toDataURL();
                        previewContainer.style.display = 'block';
                    }

                    // รัน OCR คุณภาพสูงรอบเดียวจบ
                    const finalOcrResult = await window.Tesseract.recognize(canvas, 'tha+eng', {
                        logger: (m) => {
                            if (m.status === 'recognizing text') {
                                const ocrPercent = Math.round(m.progress * 100);
                                onProgress(
                                    Math.round(((pageNum - 0.7 + (m.progress * 0.6)) / totalPages) * 100),
                                    `กำลังวิเคราะห์ข้อความ หน้าที่ ${pageNum}/${totalPages}: ${ocrPercent}%`
                                );
                            }
                        }
                    });

                    pageText = finalOcrResult.data.text;
                }

                // สะสมข้อความดิบไว้เพื่อช่วยดีบั๊ก
                this.lastRawText += `--- หน้าที่ ${pageNum} (ผลลัพธ์ OCR สรุป) ---\n${pageText}\n\n`;

                // นำข้อความที่สกัดได้ไปวิเคราะห์หาข้อมูลพัสดุ
                const isCardStyle = pageText.includes('ทะเบียนคุมทรัพย์สิน') || 
                                    pageText.includes('ลักษณะ/คุณสมบัติ') || 
                                    pageText.includes('สถานที่ตั้ง') || 
                                    pageText.includes('ลักษณะ') || 
                                    pageText.includes('รุ่น/แบบ') ||
                                    pageText.includes('ยี่ห้อ');

                if (isCardStyle) {
                    // ใช้ระบบวิเคราะห์แบบทะเบียนคุมพัสดุเดี่ยว
                    const parsedCard = this.parseCardStyle(pageText);
                    if (parsedCard) {
                        assets.push(parsedCard);
                    }
                } else {
                    // ใช้ระบบวิเคราะห์แบบตารางรายการตามปกติ
                    // แยกแถวข้อมูลตามขึ้นบรรทัดใหม่
                    const textLines = pageText.split('\n');
                    for (const line of textLines) {
                        const parsedItem = this.parseLine(line);
                        if (parsedItem) {
                            assets.push(parsedItem);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error parsing PDF:', err);
            throw new Error('ไม่สามารถวิเคราะห์ไฟล์เอกสารนี้ได้: ' + err.message);
        }
        return assets;
    }

    /**
     * ดึงคำที่อยู่ระหว่างสองคำสำคัญ (Helper function)
     */
    extractBetween(text, startKeyword, endKeywords) {
        const startIndex = text.indexOf(startKeyword);
        if (startIndex === -1) return '';
        
        let restText = text.substring(startIndex + startKeyword.length).trim();
        
        // ค้นหาตำแหน่งที่ใกล้ที่สุดของคำปิดท้าย
        let minEndIndex = restText.length;
        for (const endKeyword of endKeywords) {
            const idx = restText.indexOf(endKeyword);
            if (idx !== -1 && idx < minEndIndex) {
                minEndIndex = idx;
            }
        }
        
        return restText.substring(0, minEndIndex).trim();
    }

    /**
     * ดึงข้อมูลพัสดุในรูปแบบ "ทะเบียนคุมทรัพย์สิน" (Card-based Layout)
     * @param {string} pageText - ข้อความรวมทั้งหมดในหนึ่งหน้ากระดาษ
     * @returns {object|null} ข้อมูลพัสดุ หรือ null หากไม่พบเลขครุภัณฑ์
     */
    parseCardStyle(pageText) {
        // ค้นหาเลขครุภัณฑ์ในหน้ากระดาษ
        this.assetRegex.lastIndex = 0;
        const matches = pageText.match(this.assetRegex);
        if (!matches || matches.length === 0) {
            return null; // ไม่พบเลขครุภัณฑ์
        }

        const rawAssetNumber = matches[0];
        const assetNumber = this.normalizeAssetNumber(rawAssetNumber);

        // ดึงข้อมูลแต่ละตัวแปรอย่างละเอียด:
        
        // 1. ส่วนราชการ
        let governmentSector = this.extractBetween(pageText, 'ส่วนราชการ', ['หน่วยงาน', 'ประเภท', 'รหัส']);
        governmentSector = governmentSector.replace(/^[\s\-\:\.\/\|_]+/, '').trim();
        
        // 2. หน่วยงาน
        let department = this.extractBetween(pageText, 'หน่วยงาน', ['ประเภท', 'รหัส', 'ลักษณะ']);
        department = department.replace(/^[\s\-\:\.\/\|_]+/, '').trim();
        
        // 3. ประเภท
        let assetType = this.extractBetween(pageText, 'ประเภท', ['รหัส', 'ลักษณะ', 'รุ่น']);
        assetType = assetType.replace(/^[\s\-\:\.\/\|_]+/, '').trim();
        
        // 4. ลักษณะ/คุณสมบัติ
        let characteristics = this.extractBetween(pageText, 'ลักษณะ/คุณสมบัติ', ['รุ่น/แบบ', 'หมายเลขเครื่อง', 'ชื่อผู้ขาย']);
        if (!characteristics) {
            characteristics = this.extractBetween(pageText, 'ลักษณะ', ['รุ่น/แบบ', 'หมายเลขเครื่อง']);
        }
        characteristics = characteristics.replace(/^[\s\-\:\.\/\|_]+/, '').trim();
        
        // 5. รุ่น/แบบ
        let modelBrand = this.extractBetween(pageText, 'รุ่น/แบบ', ['หมายเลขเครื่อง', 'ที่อยู่', 'ชื่อผู้ขาย']);
        if (!modelBrand) {
            modelBrand = this.extractBetween(pageText, 'รุ่น', ['หมายเลขเครื่อง', 'ที่อยู่']);
        }
        modelBrand = modelBrand.replace(/^[\s\-\:\.\/\|_]+/, '').trim();
        
        // 6. สถานที่ตั้ง/หน่วยงานผู้รับผิดชอบ (สถานที่เก็บ)
        let location = 'ไม่ระบุสถานที่';
        let extractedLoc = this.extractBetween(pageText, 'สถานที่ตั้ง/หน่วยงานผู้รับผิดชอบ', ['หมายเลขเครื่อง', 'ชื่อผู้ขาย', 'ที่อยู่', 'โทร', 'ประเภทเงิน', 'หน่วยงาน', 'ส่วนราชการ']);
        if (!extractedLoc) {
            extractedLoc = this.extractBetween(pageText, 'สถานที่ตั้ง', ['หมายเลขเครื่อง', 'ชื่อผู้ขาย', 'ที่อยู่', 'โทร', 'ประเภทเงิน', 'หน่วยงาน', 'ส่วนราชการ']);
        }
        if (extractedLoc) {
            location = extractedLoc.replace(/^[\s\-\:\.\/\|_]+/, '').trim();
        }

        // 7. หมายเลขเครื่อง
        let serialNumber = this.extractBetween(pageText, 'หมายเลขเครื่อง', ['ชื่อผู้ขาย', 'ที่อยู่', 'โทร']);
        serialNumber = serialNumber.replace(/^[\s\-\:\.\/\|_]+/, '').trim();
        
        // 8. ชื่อผู้ขาย/ผู้รับจ้าง/ผู้บริจาค
        let vendorName = this.extractBetween(pageText, 'ชื่อผู้ขาย/ผู้รับจ้าง/ผู้บริจาค', ['ที่อยู่', 'โทร', 'ประเภทเงิน']);
        if (!vendorName) {
            vendorName = this.extractBetween(pageText, 'ชื่อผู้ขาย', ['ที่อยู่', 'โทร', 'ประเภทเงิน']);
        }
        vendorName = vendorName.replace(/^[\s\-\:\.\/\|_]+/, '').trim();
        
        // 9. ที่อยู่
        let vendorAddress = this.extractBetween(pageText, 'ที่อยู่', ['โทร', 'ประเภทเงิน', 'วิธีการได้มา']);
        vendorAddress = vendorAddress.replace(/^[\s\-\:\.\/\|_]+/, '').trim();
        
        // 10. โทร.
        let vendorPhone = this.extractBetween(pageText, 'โทร.', ['ประเภทเงิน', 'วิธีการได้มา']);
        if (!vendorPhone) {
            vendorPhone = this.extractBetween(pageText, 'โทร', ['ประเภทเงิน', 'วิธีการได้มา']);
        }
        vendorPhone = vendorPhone.replace(/^[\s\-\:\.\/\|_]+/, '').trim();
        
        // 11. ประเภทเงิน (วิเคราะห์จากปุ่มเช็คบล็อก)
        let fundingType = 'ไม่ระบุ';
        if (/[\/vV7xX✓|\[]\]?\s*เงินงบประมาณ/i.test(pageText)) fundingType = 'เงินงบประมาณ';
        else if (/[\/vV7xX✓|\[]\]?\s*เงินค่าธรรมเนียมศาล/i.test(pageText)) fundingType = 'เงินค่าธรรมเนียมศาลเพื่อเสริมงบประมาณ';
        else if (/[\/vV7xX✓|\[]\]?\s*เงินบริจาค/i.test(pageText)) fundingType = 'เงินบริจาค/เงินช่วยเหลือ';
        else if (/[\/vV7xX✓|\[]\]?\s*อื่นๆ/i.test(pageText)) fundingType = 'อื่นๆ';
        
        // 12. วิธีการได้มา (วิเคราะห์จากปุ่มเช็คบล็อก)
        let acquisitionMethod = 'ไม่ระบุ';
        if (/[\/vV7xX✓|\[]\]?\s*ตกลงราคา/i.test(pageText)) acquisitionMethod = 'ตกลงราคา';
        else if (/[\/vV7xX✓|\[]\]?\s*สอบราคา/i.test(pageText)) acquisitionMethod = 'สอบราคา';
        else if (/[\/vV7xX✓|\[]\]?\s*ประกวดราคา/i.test(pageText)) acquisitionMethod = 'ประกวดราคา';
        else if (/[\/vV7xX✓|\[]\]?\s*วิธีพิเศษ/i.test(pageText)) acquisitionMethod = 'วิธีพิเศษ';
        else if (/[\/vV7xX✓|\[]\]?\s*รับบริจาค/i.test(pageText)) acquisitionMethod = 'รับบริจาค';
        else if (/[\/vV7xX✓|\[]\]?\s*e-market/i.test(pageText)) acquisitionMethod = 'e-market';
        else if (/[\/vV7xX✓|\[]\]?\s*e-bidding/i.test(pageText)) acquisitionMethod = 'e-bidding';
        else if (/[\/vV7xX✓|\[]\]?\s*คัดเลือก/i.test(pageText)) acquisitionMethod = 'คัดเลือก';
        else if (/[\/vV7xX✓|\[]\]?\s*เฉพาะเจาะจง/i.test(pageText)) acquisitionMethod = 'เฉพาะเจาะจง';
        else if (/[\/vV7xX✓|\[]\]?\s*อื่นๆ/i.test(pageText)) acquisitionMethod = 'อื่นๆ';

        // ตั้งค่าชื่อรายการที่สมบูรณ์
        let name = characteristics;
        if (modelBrand) {
            name += ` (${modelBrand})`;
        }
        if (!name) {
            name = assetType || `ครุภัณฑ์พัสดุเลขที่ ${assetNumber}`;
        }

        // ดึงประวัติบัญชีความเคลื่อนไหวและค่าเสื่อมราคาพัสดุจากตารางท้ายเอกสาร
        const transactions = [];
        const textLines = pageText.split('\n');
        // Regex ค้นหาวันที่ไทยสั้น เช่น 30 ก.ย. 66 หรือ 30 ก.ย.66
        const dateRegex = /\b\d{1,2}\s*(?:ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\.?\s*\d{2}\b/i;

        for (const line of textLines) {
            const dateMatch = line.match(dateRegex);
            if (dateMatch) {
                const dateStr = dateMatch[0];
                const rest = line.substring(line.indexOf(dateStr) + dateStr.length).trim();

                // ค้นหาตัวเลขที่มีทศนิยมทั้งหมดในส่วนที่เหลือ
                const numbers = rest.match(/[\d,]+\.\d{2}/g) || [];

                // หาข้อความอธิบายรายการ (อยู่ระหว่างวันที่กับตัวเลขชุดแรก)
                let desc = rest;
                if (numbers.length > 0) {
                    desc = rest.split(numbers[0])[0].trim();
                }

                // ทำความสะอาดเครื่องหมายขยะ
                desc = desc.replace(/^[\s\-\:\.\/\|_]+/, '').trim();

                // ฟังก์ชันแปลงตัวหนังสือเป็นตัวเลข
                const parseNum = (val) => val ? parseFloat(val.replace(/,/g, '')) : 0;

                const annualDep = numbers.length >= 3 ? parseNum(numbers[numbers.length - 3]) : 0;
                const accumDep = numbers.length >= 2 ? parseNum(numbers[numbers.length - 2]) : 0;
                const netVal = numbers.length >= 1 ? parseNum(numbers[numbers.length - 1]) : 0;

                transactions.push({
                    transaction_date: dateStr,
                    document_no: '',
                    description: desc || 'คำนวณค่าเสื่อมราคาประจำปี',
                    quantity: null,
                    unit_price: null,
                    total_value: null,
                    useful_life: null,
                    depreciation_rate: null,
                    annual_depreciation: annualDep,
                    accumulated_depreciation: accumDep,
                    net_value: netVal
                });
            }
        }

        return {
            asset_number: assetNumber,
            name: name,
            location: location,
            government_sector: governmentSector || 'สำนักงานศาลยุติธรรม',
            department: department || 'ศาลเยาวชนและครอบครัวจังหวัดสตูล',
            asset_type: assetType || 'ครุภัณฑ์คอมพิวเตอร์',
            characteristics: characteristics,
            model_brand: modelBrand,
            serial_number: serialNumber,
            vendor_name: vendorName,
            vendor_address: vendorAddress,
            vendor_phone: vendorPhone,
            funding_type: fundingType,
            acquisition_method: acquisitionMethod,
            transactions: transactions
        };
    }

    /**
     * จัดบรรทัดข้อความในหน้ากระดาษโดยดูจากพิกัดแนวตั้ง (Y)
     */
    rebuildLines(items) {
        if (!items || items.length === 0) return [];

        const yGroups = {};
        const yTolerance = 4;

        for (const item of items) {
            if (!item.str || item.str.trim() === '') continue;

            const y = item.transform[5];
            const x = item.transform[4];
            
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

        const lineTexts = [];
        const sortedYKeys = Object.keys(yGroups).map(Number).sort((a, b) => b - a);

        for (const yKey of sortedYKeys) {
            const lineItems = yGroups[yKey];
            lineItems.sort((a, b) => a.x - b.x);
            
            const combinedText = lineItems.map(item => item.text).join(' ');
            if (combinedText.trim() !== '') {
                lineTexts.push(combinedText);
            }
        }

        return lineTexts;
    }

    /**
     * แยกวิเคราะห์บรรทัดข้อความเดี่ยวเพื่อหาข้อมูลพัสดุ
     */
    parseLine(lineText) {
        this.assetRegex.lastIndex = 0;
        const matches = lineText.match(this.assetRegex);
        
        if (!matches || matches.length === 0) {
            return null;
        }

        const rawAssetNumber = matches[0];
        const assetNumber = this.normalizeAssetNumber(rawAssetNumber);

        const parts = lineText.split(rawAssetNumber);
        let leftText = parts[0] ? parts[0].trim() : '';
        let rightText = parts[1] ? parts[1].trim() : '';

        leftText = leftText.replace(/^\d+[\.\s\-\)]+\s*/, '');
        leftText = leftText.replace(/^(ลำดับที่|ลำดับ|ที่)\s*\d+\s*/, '');
        
        let location = 'not_specified';
        if (rightText && rightText.length > 2) {
            location = rightText.replace(/^[\s\-\:\.\/\|_]+/, '').trim();
        }

        let name = leftText !== '' ? leftText : 'ครุภัณฑ์ไม่ได้ระบุชื่อ';

        if (name.length < 2) {
            name = `ครุภัณฑ์เลขที่ ${assetNumber}`;
        }

        return {
            asset_number: assetNumber,
            name: name,
            location: location,
            government_sector: '',
            department: '',
            asset_type: '',
            characteristics: name,
            model_brand: '',
            serial_number: '',
            vendor_name: '',
            vendor_address: '',
            vendor_phone: '',
            funding_type: '',
            acquisition_method: ''
        };
    }
}

// ประกาศและแชร์ instance สำหรับเรียกใช้งานใน app.js
window.pdfAssetParser = new PDFAssetParser();
