const supabaseUrl = 'https://yurtzwdpfmwytvpaokwi.supabase.co';
const supabaseKey = 'sb_publishable_ZgDsjezCHGXk50TUxnJJ8A_BDa2I2CQ';

async function checkUsers() {
    const url = `${supabaseUrl}/rest/v1/g_patrol_users?select=*`;
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
        console.log('All Users:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Exception:', e);
    }
}

checkUsers();
