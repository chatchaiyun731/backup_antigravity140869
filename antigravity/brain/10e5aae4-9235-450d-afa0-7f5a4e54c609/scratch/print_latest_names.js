const supabaseUrl = 'https://yurtzwdpfmwytvpaokwi.supabase.co';
const supabaseKey = 'sb_publishable_ZgDsjezCHGXk50TUxnJJ8A_BDa2I2CQ';

async function printNames() {
    const url = `${supabaseUrl}/rest/v1/g_patrol_checkpoints?select=asset_number,name&order=asset_number`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Accept-Profile': 'g_patrol'
            }
        });
        
        if (!response.ok) {
            console.error('Fetch failed:', response.status);
            return;
        }

        const data = await response.json();
        console.log('Latest names in g_patrol schema:');
        data.forEach(cp => {
            console.log(`${cp.asset_number}: ${cp.name}`);
        });
    } catch (e) {
        console.error(e);
    }
}

printNames();
