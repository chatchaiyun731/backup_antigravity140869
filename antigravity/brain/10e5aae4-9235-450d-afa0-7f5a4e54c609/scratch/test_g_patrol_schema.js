const supabaseUrl = 'https://yurtzwdpfmwytvpaokwi.supabase.co';
const supabaseKey = 'sb_publishable_ZgDsjezCHGXk50TUxnJJ8A_BDa2I2CQ';

async function testSchema() {
    console.log('Testing connection to g_patrol schema...');
    
    // เราจะใช้ node-fetch แบบแมนนวลเพื่อจำลองการเรียก REST API ของ Supabase PostgREST
    // โดยการระบุ header "Accept-Profile" และ "Content-Profile" สำหรับ schema g_patrol
    const url = `${supabaseUrl}/rest/v1/g_patrol_users?select=count`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Accept-Profile': 'g_patrol',
                'Content-Profile': 'g_patrol'
            }
        });
        
        if (!response.ok) {
            console.error('HTTP Error:', response.status, response.statusText);
            const text = await response.text();
            console.error('Response body:', text);
            return;
        }

        const data = await response.json();
        console.log('Success! Count of users in g_patrol schema:', data);
    } catch (e) {
        console.error('Exception:', e);
    }
}

testSchema();
