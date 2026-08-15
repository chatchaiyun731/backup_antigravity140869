const supabaseUrl = 'https://yurtzwdpfmwytvpaokwi.supabase.co';
const supabaseKey = 'sb_publishable_ZgDsjezCHGXk50TUxnJJ8A_BDa2I2CQ';

async function testGuardViews() {
    // 1. ดึงข้อมูลจุดตรวจทั้งหมด
    const assetsUrl = `${supabaseUrl}/rest/v1/g_patrol_checkpoints?select=*`;
    try {
        const res = await fetch(assetsUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const checkpoints = await res.json();
        console.log(`Total checkpoints in DB: ${checkpoints.length}`);
        
        const guardPoints = checkpoints.filter(cp => cp.location === 'บริเวณศาล');
        const guard2Points = checkpoints.filter(cp => cp.location === 'บ้านพัก');
        
        console.log(`Guard checkpoints (บริเวณศาล): ${guardPoints.length}`);
        guardPoints.forEach(cp => console.log(`  - ${cp.asset_number}: ${cp.name} (${cp.location})`));
        
        console.log(`Guard2 checkpoints (บ้านพัก): ${guard2Points.length}`);
        guard2Points.forEach(cp => console.log(`  - ${cp.asset_number}: ${cp.name} (${cp.location})`));
        
    } catch (e) {
        console.error('Error:', e);
    }
}

testGuardViews();
