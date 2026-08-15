const supabaseUrl = 'https://yurtzwdpfmwytvpaokwi.supabase.co';
const supabaseKey = 'sb_publishable_ZgDsjezCHGXk50TUxnJJ8A_BDa2I2CQ';

async function checkRecords() {
    const url = `${supabaseUrl}/rest/v1/g_patrol_audit_records?select=*,g_patrol_checkpoints(name,location,asset_number)&order=audited_at.desc`;
    try {
        const response = await fetch(url, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!response.ok) {
            console.error('HTTP Error:', response.status, response.statusText);
            return;
        }

        const data = await response.json();
        console.log(`Total Audit Records: ${data.length}`);
        console.log('Sample Records (first 5):', JSON.stringify(data.slice(0, 5), null, 2));
    } catch (e) {
        console.error('Exception:', e);
    }
}

checkRecords();
