const supabaseUrl = 'https://yurtzwdpfmwytvpaokwi.supabase.co';
const supabaseKey = 'sb_publishable_ZgDsjezCHGXk50TUxnJJ8A_BDa2I2CQ';

async function runTest() {
    try {
        console.log('1. Fetching assets via fetch...');
        const res1 = await fetch(`${supabaseUrl}/rest/v1/g_patrol_checkpoints?select=*`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const data1 = await res1.json();
        console.log(`Assets count: ${data1.length}`);

        console.log('2. Fetching audit records via fetch...');
        const res2 = await fetch(`${supabaseUrl}/rest/v1/g_patrol_audit_records?select=asset_id&fiscal_year=eq.2569`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const data2 = await res2.json();
        console.log(`Audit records count: ${data2.length}`);
    } catch (e) {
        console.error('Catch Exception:', e);
    }
}

runTest();
