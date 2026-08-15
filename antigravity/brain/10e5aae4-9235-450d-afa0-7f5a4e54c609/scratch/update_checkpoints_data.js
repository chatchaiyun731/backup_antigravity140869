const supabaseUrl = 'https://yurtzwdpfmwytvpaokwi.supabase.co';
const supabaseKey = 'sb_publishable_ZgDsjezCHGXk50TUxnJJ8A_BDa2I2CQ';

const checkpointsToUpdate = [
    { asset_number: 'CP-01', name: '1.มุมรั้วด้านซ้าย (นอกรั้ว)', location: 'บริเวณศาล' },
    { asset_number: 'CP-02', name: '2.มุมรั้วด้านขวา (นอกรั้ว)', location: 'บริเวณศาล' },
    { asset_number: 'CP-03', name: '3.มุมรั้วด้านซ้าย (เขตในรั้ว)', location: 'บริเวณศาล' },
    { asset_number: 'CP-04', name: '4.มุมรั้วด้านขวา (เขตในรั้ว)', location: 'บริเวณศาล' },
    { asset_number: 'CP-05', name: '5.ห้องประชุม (ในโรงรถด้านซ้าย)', location: 'บริเวณศาล' },
    { asset_number: 'CP-06', name: '6.ห้องประชุม (ถ่ายตัวอาคาร)', location: 'บริเวณศาล' },
    { asset_number: 'CP-07', name: '7.มุมด้านขวาอาคาร (แนวรั้วทิศตะวันตก)', location: 'บริเวณศาล' },
    { asset_number: 'CP-08', name: '8.มุมขวาอาคาร (ทิศตะวันออก)', location: 'บริเวณศาล' },
    { asset_number: 'CP-09', name: '9.ประตูเชื่อมทางศาลจังหวัด (ทิศใต้)', location: 'บริเวณศาล' },
    { asset_number: 'CP-10', name: '10.มุมอาคารชั้น 1 ด้านขวา (ถ่ายไปทางด้านซ้ายของอาคาร)', location: 'บริเวณศาล' },
    { asset_number: 'CP-11', name: '11.มุมซ้ายอาคารชั้น 1 (ถ่ายไปทางด้านขวาของอาคาร)', location: 'บริเวณศาล' },
    { asset_number: 'CP-12', name: '12.มุมห้องน้ำประชาชน (ถ่ายไปทางห้องประชุมชั้น 1)', location: 'บริเวณศาล' },
    { asset_number: 'CP-13', name: '13.แนวรั้วด้านหลังห้องประชุมชั้น 1 (ถ่ายไปทางซ้ายหรือขวาก็ได้)', location: 'บริเวณศาล' },
    { asset_number: 'CP-14', name: '14.หน้าห้องประชาสัมพันธ์ (ถ่ายจากมุมห้องแม่บ้านออกมา)', location: 'บริเวณศาล' },
    { asset_number: 'CP-15', name: '15.มุมโต๊ะอาหารชั้น 2 (ถ่ายออกมาหน้าห้องท่านหัวหน้า)', location: 'บริเวณศาล' },
    { asset_number: 'CP-16', name: '16.โต๊ะตำรวจหน้าห้องท่านชั้น 2 (ถ่ายออกมาด้านซ้ายของอาคาร)', location: 'บริเวณศาล' },
    { asset_number: 'CP-17', name: '17.หน้าห้องนักจิต (ถ่ายไปทางด้านขวาของอาคาร)', location: 'บริเวณศาล' },
    { asset_number: 'CP-18', name: '18.หน้าห้องเก็บของ (ถ่ายออกไปทางห้องสมุด)', location: 'บริเวณศาล' },
    { asset_number: 'CP-19', name: '19.อื่นๆ (รายงานเหตุฉุกเฉิน)', location: 'บริเวณศาล' },
    { asset_number: 'CP-20', name: '20.บ้านต้นมะขามด้านใน', location: 'บ้านพัก' },
    { asset_number: 'CP-21', name: '21.บ้านต้นมะขามด้านซ้าย', location: 'บ้านพัก' },
    { asset_number: 'CP-22', name: '22.บ้านต้นมะขามด้านขวา', location: 'บ้านพัก' },
    { asset_number: 'CP-23', name: '23.บ้านพักท่านชาริฟ', location: 'บ้านพัก' },
    { asset_number: 'CP-24', name: '24.บ้านพักผู้พิพากษาหัวหน้าคณะ', location: 'บ้านพัก' },
    { asset_number: 'CP-25', name: '25.บ้านพักผู้พิพากษาหัวหน้าศาล', location: 'บ้านพัก' }
];

async function updateCheckpoints() {
    for (const cp of checkpointsToUpdate) {
        const url = `${supabaseUrl}/rest/v1/g_patrol_checkpoints?asset_number=eq.${cp.asset_number}`;
        try {
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    name: cp.name,
                    location: cp.location,
                    updated_at: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                console.error(`Failed to update ${cp.asset_number}:`, response.status, response.statusText);
            } else {
                console.log(`Successfully updated ${cp.asset_number}`);
            }
        } catch (e) {
            console.error(`Exception updating ${cp.asset_number}:`, e);
        }
    }
}

updateCheckpoints();
