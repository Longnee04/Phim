/* ==========================================================
   LPhim — Vercel Serverless Proxy for VSMOV Streams
   ========================================================== */

export default async function handler(req, res) {
  // Allow Cross-Origin Requests (CORS) from any domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, hash, host } = req.query;

  let targetUrl = url;
  if (!targetUrl && hash) {
    const serverHost = host || 'v9.streamvsmov.com';
    targetUrl = `https://${serverHost}/stream/${hash}/master.m3u8`;
  }

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing target URL or hash parameter' });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://vsmov.com/'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch stream from VSMOV: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    } else if (targetUrl.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    }

    const data = await response.text();
    return res.status(200).send(data);
  } catch (err) {
    console.error('VSMOV Proxy Error:', err);
    return res.status(500).json({ error: 'VSMOV Proxy Error', details: err.message });
  }
}
