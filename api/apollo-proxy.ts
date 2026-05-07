// api/apollo-proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apolloKey = process.env.APOLLO_API_KEY
  
  if (!apolloKey) {
    console.error('[Proxy] Apollo API key not configured')
    return res.status(500).json({ error: 'Apollo API key not configured' })
  }

  const { path, method, qs, body } = req.body

  if (!path) {
    return res.status(400).json({ error: 'Missing path parameter' })
  }

  // Build the URL
  const url = `https://api.apollo.io/api/v1${path}${qs ? `?${qs}` : ''}`
  
  console.log(`[Proxy] ${method} ${path}`)

  try {
    const response = await fetch(url, {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        accept: 'application/json',
        'x-api-key': apolloKey,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

    const data = await response.json()
    
    // Forward the response status
    res.status(response.status).json(data)
  } catch (error) {
    console.error('[Proxy] Error:', error)
    res.status(500).json({ error: 'Proxy request failed' })
  }
}