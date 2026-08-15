const { createClient } = require('@supabase/supabase-client');

const supabaseUrl = 'https://yurtzwdpfmwytvpaokwi.supabase.co';
const supabaseKey = 'sb_publishable_ZgDsjezCHGXk50TUxnJJ8A_BDa2I2CQ'; // จาก previous checkpoint

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    try {
        const { data, error } = await supabase
            .from('g_patrol_users')
            .select('*')
            .eq('username', 'mgr001')
            .maybeSingle();

        if (error) {
            console.error('Error fetching user:', error);
            return;
        }

        console.log('User Record:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Exception:', e);
    }
}

checkUser();
