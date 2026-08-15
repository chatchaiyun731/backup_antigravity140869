const https = require('https');

const supabaseUrl = 'https://yurtzwdpfmwytvpaokwi.supabase.co';
const supabaseKey = 'sb_publishable_ZgDsjezCHGXk50TUxnJJ8A_BDa2I2CQ';

const options = {
  hostname: 'yurtzwdpfmwytvpaokwi.supabase.co',
  path: '/rest/v1/g_patrol_checkpoints?select=*',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Accept-Profile': 'g_patrol'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Total checkpoints:', json.length);
      console.log('List of checkpoints:');
      json.forEach(cp => {
        console.log(`- ${cp.asset_number}: ${cp.name} (${cp.location})`);
      });
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
      console.log('Raw data:', data);
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
