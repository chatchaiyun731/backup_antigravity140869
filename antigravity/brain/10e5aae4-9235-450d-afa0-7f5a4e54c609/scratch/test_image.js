async function testImage() {
    const url = 'https://lh3.googleusercontent.com/d/15HX4TAoIDSL1dBy5UAm04_DTx9vrfShf';
    try {
        const response = await fetch(url, { method: 'HEAD' });
        console.log('Google Drive direct link status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    } catch (e) {
        console.error('Fetch error:', e);
    }
}
testImage();
