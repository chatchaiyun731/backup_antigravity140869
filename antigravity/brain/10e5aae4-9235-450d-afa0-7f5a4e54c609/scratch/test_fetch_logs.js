const supabaseUrl = 'https://yurtzwdpfmwytvpaokwi.supabase.co';
const supabaseKey = 'sb_publishable_ZgDsjezCHGXk50TUxnJJ8A_BDa2I2CQ';

async function testFetchLogs() {
    // 1. ดึงประวัติการเดินตรวจล่าสุด
    const logsUrl = `${supabaseUrl}/rest/v1/g_patrol_audit_records?select=*&fiscal_year=eq.2569&order=audited_at.desc&limit=50`;
    
    try {
        const response1 = await fetch(logsUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Accept-Profile': 'g_patrol'
            }
        });
        
        if (!response1.ok) {
            console.error('Audit Records query failed:', response1.status, response1.statusText);
            console.error('Body:', await response1.text());
            return;
        }

        const logs = await response1.json();
        console.log(`Fetched ${logs.length} logs successfully.`);

        // 2. ดึงข้อมูลจุดตรวจ
        const cpUrl = `${supabaseUrl}/rest/v1/g_patrol_checkpoints?select=*`;
        const response2 = await fetch(cpUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Accept-Profile': 'g_patrol'
            }
        });

        if (!response2.ok) {
            console.error('Checkpoints query failed:', response2.status, response2.statusText);
            console.error('Body:', await response2.text());
            return;
        }
        const checkpoints = await response2.json();
        console.log(`Fetched ${checkpoints.length} checkpoints successfully.`);

        // 3. ดึงข้อมูลผู้ใช้
        const usersUrl = `${supabaseUrl}/rest/v1/g_patrol_users?select=id,display_name,role`;
        const response3 = await fetch(usersUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Accept-Profile': 'g_patrol'
            }
        });

        if (!response3.ok) {
            console.error('Users query failed:', response3.status, response3.statusText);
            console.error('Body:', await response3.text());
            return;
        }
        const users = await response3.json();
        console.log(`Fetched ${users.length} users successfully.`);

        console.log('All queries succeeded on g_patrol schema!');

    } catch (e) {
        console.error('Exception:', e);
    }
}

testFetchLogs();
