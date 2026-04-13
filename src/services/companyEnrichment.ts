// src/services/companyEnrichment.ts
import { getApifyToken } from './settingsService'

export interface EnrichedCompanyData {
  website: string | null
  linkedinUrl: string | null
  industry: string | null
  companySize: string | null
  confidence: number
}

// Free API: Clearbit Name to Domain (no API key required for basic usage)
async function findWebsiteClearbit(companyName: string): Promise<string | null> {
  try {
    const response = await fetch(`https://company.clearbit.com/v1/domains/find?name=${encodeURIComponent(companyName)}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.domain ? `https://${data.domain}` : null
    }
    return null
  } catch (error) {
    console.error('Clearbit lookup failed:', error)
    return null
  }
}

// Generate likely website from company name (fallback)
function generateWebsiteSuggestion(companyName: string, city?: string): string | null {
  if (!companyName) return null
  
  // Clean company name
  let cleanName = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/ptyltd$/, '')
    .replace(/ltd$/, '')
    .replace(/pvt$/, '')
    .trim()
  
  if (!cleanName) return null
  
  // Try common Australian domain patterns
  const domains = [
    `https://${cleanName}.com.au`,
    `https://www.${cleanName}.com.au`,
    `https://${cleanName}.com`,
    `https://www.${cleanName}.com`
  ]
  
  return domains[0] // Return the most likely
}

// Search for company website using multiple free sources
export async function enrichCompanyWebsite(
  companyName: string, 
  city?: string | null
): Promise<EnrichedCompanyData> {
  console.log(`🔍 Enriching company: ${companyName} (${city || 'location unknown'})`)
  
  let website: string | null = null
  let linkedinUrl: string | null = null
  let confidence = 0
  
  // Try Clearbit first (free, no key)
  website = await findWebsiteClearbit(companyName)
  if (website) {
    confidence = 7
    console.log(`  ✅ Found via Clearbit: ${website}`)
  }
  
  // If no website found, generate suggestion
  if (!website) {
    website = generateWebsiteSuggestion(companyName, city || undefined)
    if (website) {
      confidence = 3
      console.log(`  💡 Generated suggestion: ${website}`)
    }
  }
  
  // Try to find LinkedIn URL via Google search suggestion (simple approach)
  // For a real implementation, you'd use a proper API, but this gives a basic suggestion
  if (companyName) {
    const linkedinSuggestion = `https://www.linkedin.com/company/${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    linkedinUrl = linkedinSuggestion
    console.log(`  🔗 LinkedIn suggestion: ${linkedinUrl}`)
  }
  
  return {
    website,
    linkedinUrl,
    industry: null,
    companySize: null,
    confidence
  }
}

// Bulk enrich multiple companies
export async function enrichMultipleCompanies(
  companies: Array<{ id: string; name: string; city?: string | null }>
): Promise<Map<string, EnrichedCompanyData>> {
  const results = new Map<string, EnrichedCompanyData>()
  
  // Process one by one to avoid rate limiting
  for (const company of companies) {
    try {
      const enriched = await enrichCompanyWebsite(company.name, company.city)
      results.set(company.id, enriched)
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`Failed to enrich ${company.name}:`, error)
      results.set(company.id, {
        website: null,
        linkedinUrl: null,
        industry: null,
        companySize: null,
        confidence: 0
      })
    }
  }
  
  return results
}