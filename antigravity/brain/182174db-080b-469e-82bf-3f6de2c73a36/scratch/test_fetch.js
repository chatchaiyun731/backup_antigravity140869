async function testFetch() {
  const ticker = 'CPALL.BK';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
  const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
  
  console.log('Fetching with codetabs:', proxyUrl);
  try {
    const res = await fetch(proxyUrl);
    console.log('Status:', res.status);
    const json = await res.json();
    const result = json.chart.result[0];
    console.log('Price:', result.meta.regularMarketPrice);
    console.log('PrevClose:', result.meta.previousClose);
  } catch (e) {
    console.error('Error:', e);
  }
}

testFetch();
