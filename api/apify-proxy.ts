// api/apify-proxy.ts
export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const apifyToken = process.env.APIFY_API_KEY;
    
    if (!apifyToken) {
      return res.status(500).json({ error: 'Apify API key not configured on server' });
    }
  
    const { path, method, body } = req.body;
    
    if (!path) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }
  
    const url = `https://api.apify.com/v2${path}`;
    console.log(`[Apify Proxy] ${method} → ${url}`);
  
    try {
      const options: RequestInit = {
        method: method || 'GET',
        headers: {
          'Authorization': `Bearer ${apifyToken}`,
          'Content-Type': 'application/json',
        },
      };
      
      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }
  
      const response = await fetch(url, options);
      const data = await response.json();
      
      res.status(response.status).json(data);
    } catch (error) {
      console.error('[Apify Proxy] Error:', error);
      res.status(500).json({ error: error.message });
    }
  }