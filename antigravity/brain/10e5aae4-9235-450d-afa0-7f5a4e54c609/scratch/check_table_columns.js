const supabaseUrl = 'https://yurtzwdpfmwytvpaokwi.supabase.co';
const supabaseKey = 'sb_publishable_ZgDsjezCHGXk50TUxnJJ8A_BDa2I2CQ';

async function checkColumns() {
    // เราจะดึงข้อมูลแถวแรกของตาราง g_patrol_audit_records มาทดสอบเพื่อวิเคราะห์โครงสร้างคอลัมน์ที่มีอยู่จริงในฐานข้อมูล
    const url = `${supabaseUrl}/rest/v1/g_patrol_audit_records?limit=1`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Accept-Profile': 'g_patrol'
            }
        });
        
        if (!response.ok) {
            console.error('Fetch failed:', response.status, response.statusText);
            console.error('Body:', await response.text());
            return;
        }

        const data = await response.json();
        console.log('Sample row from g_patrol_audit_records:', data);
        if (data.length > 0) {
            console.log('Columns list:', Object.keys(data[0]));
        } else {
            console.log('Table is empty, cannot inspect keys from row data.');
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

checkColumns();
