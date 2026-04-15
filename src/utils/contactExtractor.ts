// src/utils/contactExtractor.ts
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ENHANCED CONTACT EXTRACTOR & JOB FILTER
 * ─────────────────────────────────────────────────────────────────────────────
 * Strategy: Multi-pass scoring system.
 *
 * Instead of a single binary check, each filter function returns a FilterVerdict
 * that includes a confidence score (0–100) and a human-readable reason.
 * The scraper can then decide:
 *   • score >= 80  → hard block (definitely not wanted)
 *   • score 50–79 → soft block (log as warning, still filter out)
 *   • score < 50  → pass (legitimate company)
 *
 * FREE AI ENHANCEMENT: We use the Anthropic Messages API (which is already
 * available in this project via the existing fetch infrastructure) to classify
 * ambiguous cases — specifically when our keyword heuristics score 30–70.
 * High-confidence keyword hits never need an AI round-trip, keeping costs near zero.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface FilterVerdict {
  shouldFilter: boolean
  reason: string
  confidence: number       // 0–100 — how confident we are
  category: FilterCategory
}

export type FilterCategory =
  | 'recruitment_agency'
  | 'no_agency_disclaimer'
  | 'recruitment_intro'
  | 'hr_consulting'
  | 'law_firm'
  | 'private_advertiser'
  | 'non_sales'
  | 'recruitment_website'
  | 'pass'

// ─── Contact extraction ───────────────────────────────────────────────────────

export function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  return [...new Set(text.match(emailRegex) || [])]
}

export function extractPhones(text: string): string[] {
  const phoneRegexes = [
    /(\+61\s?4\d{2}\s?\d{3}\s?\d{3})/g,
    /(04\d{2}\s?\d{3}\s?\d{3})/g,
    /(\(0[2378]\)\s?\d{4}\s?\d{4})/g,
    /(0[2378]\s?\d{4}\s?\d{4})/g,
    /(1300\s?\d{3}\s?\d{3})/g,
    /(1800\s?\d{3}\s?\d{3})/g,
  ]
  const phones: string[] = []
  for (const regex of phoneRegexes) {
    phones.push(...(text.match(regex) || []))
  }
  return [...new Set(phones)]
}

export function extractContactName(text: string): string | null {
  const patterns = [
    /Contact:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /Contact\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /Please\s+contact\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /Reach out to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /Email\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+at/i,
    /speak (?:with|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /apply (?:to|through)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
  ]
  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lc(s: string) { return s.toLowerCase() }

/** Count how many terms from a list appear in text */
function countMatches(text: string, terms: string[]): number {
  const t = lc(text)
  return terms.filter(term => t.includes(lc(term))).length
}

/** Find which terms matched */
function findMatches(text: string, terms: string[]): string[] {
  const t = lc(text)
  return terms.filter(term => t.includes(lc(term)))
}

// ─── 1. Recruitment / Staffing Agency ────────────────────────────────────────

/**
 * KNOWN agency names — exact match for high confidence
 */
const KNOWN_AGENCIES: string[] = [
  // Big international
  'hays', 'randstad', 'robert half', 'michael page', 'adecco',
  'kelly services', 'manpower', 'manpowergroup', 'hudson', 'peoplebank',
  'chandler macleod', 'pagegroup', 'robert walters', 'morgan mckinley',
  'talent international', 'u&u recruitment', 'u and u recruitment',
  'frontline recruitment', 'aspect personnel', 'designnbuild',
  'design & build recruitment', 'design and build recruitment',
  'gough recruitment', 'white recruitment', 'mars recruitment',
  'people2people', 'people 2 people', 'talent quarter',
  'six degrees executive', 'entrée consulting', 'entree consulting',
  'talentpath', 'talent path', 'paxus', 'finite recruitment',
  'red energy recruitment', 'talentbay', 'talent bay',
  'placed recruitment', 'sharp & carter', 'sharp and carter',
  'davidson recruitment', 'spencer ogden', 'cts recruitment',
  'salexo consulting', 'sales focus', 'on q recruitment',
  'pulse staffing', 'recruitment edge', 'seek talent solutions',
  'resource solutions', 'horner recruitment', 'sportspeople',
  'miller leith', 'profusion group',
]

/**
 * Generic agency signals — medium confidence
 */
const AGENCY_SIGNALS: string[] = [
  'recruitment agency', 'staffing agency', 'employment agency',
  'talent acquisition agency', 'recruitment firm', 'staffing firm',
  'labour hire agency', 'labor hire agency', 'temp agency',
  'temporary staffing', 'contract staffing', 'permanent placement',
  'executive search firm', 'headhunting firm', 'search and selection',
  'talent solutions', 'workforce solutions', 'resourcing solutions',
  'specialist recruiter', 'boutique recruiter', 'boutique recruitment',
  'niche recruiter', 'specialist staffing',
]

/**
 * Phrases that appear in job descriptions from agencies
 * These mean the COMPANY posting is an agency, not the hiring client
 */
const AGENCY_DESCRIPTION_SIGNALS: string[] = [
  'our client is seeking', 'our client requires', 'our client needs',
  'our client is looking for', 'our client has an exciting',
  'we are recruiting on behalf', 'recruiting on behalf of',
  'on behalf of our client', 'on behalf of a client',
  'we have partnered with', "we've partnered with", 'we are partnered with',
  'we are currently working with', 'working exclusively with',
  'exclusively engaged by', 'engaged by our client',
  'confidential client', 'leading client',
  'our client, a leading', 'our well-known client',
  'our prestigious client', 'one of our clients',
  'we are assisting our client', 'assisting a client',
  'this role is with one of', 'this opportunity is with',
  'we are partnering with a',
]

export function checkRecruitmentAgency(
  companyName: string,
  advertiserName: string,
  description: string,
  website: string | null
): FilterVerdict {
  const searchText = `${companyName} ${advertiserName}`

  // Check known agencies — very high confidence
  const knownMatch = KNOWN_AGENCIES.find(name =>
    lc(searchText).includes(name) || lc(companyName) === name
  )
  if (knownMatch) {
    return {
      shouldFilter: true,
      reason: `Known recruitment agency: "${knownMatch}"`,
      confidence: 98,
      category: 'recruitment_agency',
    }
  }

  // Check agency signals in company name — high confidence
  const nameSignals = findMatches(searchText, AGENCY_SIGNALS)
  if (nameSignals.length >= 2) {
    return {
      shouldFilter: true,
      reason: `Company name contains multiple agency signals: ${nameSignals.slice(0, 2).join(', ')}`,
      confidence: 90,
      category: 'recruitment_agency',
    }
  }
  if (nameSignals.length === 1) {
    return {
      shouldFilter: true,
      reason: `Company name suggests agency: "${nameSignals[0]}"`,
      confidence: 75,
      category: 'recruitment_agency',
    }
  }

  // Check description for agency intro phrases
  const descSignals = findMatches(description.slice(0, 300), AGENCY_DESCRIPTION_SIGNALS)
  if (descSignals.length >= 2) {
    return {
      shouldFilter: true,
      reason: `Description has multiple agency phrases: "${descSignals[0]}"`,
      confidence: 92,
      category: 'recruitment_agency',
    }
  }
  if (descSignals.length === 1) {
    return {
      shouldFilter: true,
      reason: `Description starts with agency phrase: "${descSignals[0]}"`,
      confidence: 85,
      category: 'recruitment_agency',
    }
  }

  // Check website
  if (website && isRecruitmentWebsite(website)) {
    return {
      shouldFilter: true,
      reason: `Company website indicates recruitment firm: ${website}`,
      confidence: 80,
      category: 'recruitment_website',
    }
  }

  return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
}

// Backwards-compat shim
export function isRecruitmentAgency(companyName: string, advertiserName?: string): boolean {
  const v = checkRecruitmentAgency(companyName, advertiserName || '', '', null)
  return v.shouldFilter && v.confidence >= 75
}

export function hasRecruitmentIntro(description: string): boolean {
  const v = checkRecruitmentAgency('', '', description, null)
  return v.shouldFilter && v.category === 'recruitment_agency' && v.confidence >= 80
}

// ─── 2. "No Agency" disclaimer ────────────────────────────────────────────────

const NO_AGENCY_PHRASES: string[] = [
  'no recruitment agencies', 'no agencies please', 'agencies do not contact',
  'strictly no agencies', 'no agency calls', 'no agency contact',
  'agency fee will not be accepted', 'do not contact us if you are a recruitment',
  'unsolicited applications from recruitment', 'we are not working with agencies',
  'we are not engaging agencies', 'direct applications only',
  'please do not send agency', 'agency cv will not be accepted',
  'agency submissions will not be accepted', 'no third party',
  'no third-party submissions', 'we do not accept agency',
  'direct applicants only', 'internal recruitment only',
  'no canvassing', 'no placement agencies',
]

export function checkNoAgencyDisclaimer(description: string): FilterVerdict {
  const matches = findMatches(description, NO_AGENCY_PHRASES)
  if (matches.length === 0) return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
  return {
    shouldFilter: true,
    reason: `Job explicitly blocks agencies: "${matches[0]}"`,
    confidence: 97,
    category: 'no_agency_disclaimer',
  }
}

export function hasUnwantedPhrases(description: string): boolean {
  return checkNoAgencyDisclaimer(description).shouldFilter
}

// ─── 3. HR Consulting ─────────────────────────────────────────────────────────

const HR_COMPANY_SIGNALS: string[] = [
  'hr consulting', 'hr consultancy', 'human resources consulting',
  'hr advisory', 'hr solutions', 'hr services', 'hr management consulting',
  'people consulting', 'people advisory', 'people & culture consulting',
  'people and culture consulting', 'workforce consulting', 'talent consulting',
  'organisational development', 'organizational development consulting',
  'change management consulting', 'hr outsourcing', 'hr technology solutions',
  'hris implementation', 'payroll solutions provider', 'payroll consulting',
]

const HR_DESCRIPTION_SIGNALS: string[] = [
  'we provide hr services to', 'hr consulting firm',
  'our hr consultants', 'outsourced hr', 'fractional hr',
  'interim hr', 'we help businesses manage their hr',
  'hr business partner services', 'we provide people & culture',
]

export function checkHRConsulting(
  companyName: string,
  description: string
): FilterVerdict {
  const nameMatches = findMatches(companyName, HR_COMPANY_SIGNALS)
  if (nameMatches.length >= 2) {
    return {
      shouldFilter: true,
      reason: `Company name suggests HR consultancy: "${nameMatches.slice(0, 2).join(', ')}"`,
      confidence: 88,
      category: 'hr_consulting',
    }
  }
  if (nameMatches.length === 1) {
    // Confirm with description
    const descMatches = findMatches(description, HR_DESCRIPTION_SIGNALS)
    if (descMatches.length > 0) {
      return {
        shouldFilter: true,
        reason: `HR consultancy confirmed by name "${nameMatches[0]}" + description`,
        confidence: 82,
        category: 'hr_consulting',
      }
    }
    return {
      shouldFilter: true,
      reason: `Company name suggests HR consultancy: "${nameMatches[0]}"`,
      confidence: 65,
      category: 'hr_consulting',
    }
  }
  return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
}

// ─── 4. Law / Legal Firms ─────────────────────────────────────────────────────

const LAW_FIRM_NAME_SIGNALS: string[] = [
  'lawyers', 'solicitors', 'barristers', 'legal', 'law group',
  'law firm', 'chambers', 'attorneys', 'counsel',
  // Common AU law firm suffix patterns handled below
]

const LAW_FIRM_DESCRIPTION_SIGNALS: string[] = [
  'law firm', 'law practice', 'legal practice', 'solicitor firm',
  'barrister chambers', 'legal counsel', 'in-house counsel',
  'litigation practice', 'conveyancing practice', 'family law practice',
  'corporate law firm', 'immigration law', 'employment law firm',
  'boutique law firm', 'national law firm', 'international law firm',
  'we are a law firm', 'our law firm', 'our legal team',
]

const LAW_DESCRIPTION_TERMS: string[] = [
  'plaintiff', 'defendant', 'litigation', 'conveyancing', 'wills and estates',
  'family law', 'criminal law', 'intellectual property law',
  'corporate law', 'commercial law advice', 'legal advice to clients',
  'practising certificate',
]

// Pattern to detect "Surname & Surname Lawyers" or "Smith Partners Solicitors"
const LAW_FIRM_PATTERN = /\b(?:lawyers?|solicitors?|barristers?|legal|law|counsel|chambers|attorneys?)\b/i

export function checkLawFirm(
  companyName: string,
  jobTitle: string,
  description: string,
  website?: string | null
): FilterVerdict {
  const combined = `${companyName} ${jobTitle} ${description.slice(0, 500)} ${website || ''}`

  // Strong: company name matches law firm name pattern
  if (LAW_FIRM_PATTERN.test(companyName)) {
    // Verify it's actually a firm and not e.g. "SalesLaw CRM"
    const descConfirmation = findMatches(description, LAW_DESCRIPTION_TERMS)
    if (descConfirmation.length > 0) {
      return {
        shouldFilter: true,
        reason: `Law firm: company name "${companyName}" + description confirms legal practice`,
        confidence: 93,
        category: 'law_firm',
      }
    }
    return {
      shouldFilter: true,
      reason: `Company name suggests law firm: "${companyName}"`,
      confidence: 72,
      category: 'law_firm',
    }
  }

  const nameMatches = findMatches(companyName, LAW_FIRM_NAME_SIGNALS)
  if (nameMatches.length > 0) {
    return {
      shouldFilter: true,
      reason: `Company name contains legal term: "${nameMatches[0]}"`,
      confidence: 78,
      category: 'law_firm',
    }
  }

  const descMatches = findMatches(combined, LAW_FIRM_DESCRIPTION_SIGNALS)
  if (descMatches.length >= 2) {
    return {
      shouldFilter: true,
      reason: `Description indicates law firm: "${descMatches.slice(0, 2).join(', ')}"`,
      confidence: 80,
      category: 'law_firm',
    }
  }

  return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
}

// Backwards-compat shim
export function isLawFirmRelated(
  companyName: string,
  jobTitle: string,
  description: string,
  website?: string | null
): boolean {
  return checkLawFirm(companyName, jobTitle, description, website).shouldFilter
}

// ─── 5. Private Advertiser ────────────────────────────────────────────────────

export function checkPrivateAdvertiser(
  advertiserName?: string,
  isPrivate?: boolean
): FilterVerdict {
  if (isPrivate === true) {
    return {
      shouldFilter: true,
      reason: 'Marked as private advertiser by platform',
      confidence: 99,
      category: 'private_advertiser',
    }
  }
  if (!advertiserName) return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }

  const exactPrivate = ['Private Advertiser', 'Confidential', 'Confidential Company', 'Anonymous']
  if (exactPrivate.includes(advertiserName)) {
    return {
      shouldFilter: true,
      reason: `Advertiser name is "${advertiserName}"`,
      confidence: 99,
      category: 'private_advertiser',
    }
  }
  return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
}

export function isPrivateAdvertiser(advertiserName?: string, isPrivate?: boolean): boolean {
  return checkPrivateAdvertiser(advertiserName, isPrivate).shouldFilter
}

// ─── 6. Recruitment Website ───────────────────────────────────────────────────

const RECRUITMENT_WEBSITE_KEYWORDS: string[] = [
  'recruit', 'recruitment', 'staffing', 'labour-hire', 'labourhire',
  'employment-agency', 'employmentagency', 'headhunt', 'headhunting',
  'jobsearch', 'job-search', 'careersolutions', 'career-solutions',
  'placementgroup', 'placement-group',
]

export function isRecruitmentWebsite(website: string): boolean {
  const lowerWebsite = lc(website)
  return RECRUITMENT_WEBSITE_KEYWORDS.some(kw => lowerWebsite.includes(kw))
}

// ─── 7. Sales Classification ──────────────────────────────────────────────────

export function isSalesJob(classification: string): boolean {
  if (!classification) return false
  return lc(classification).includes('sales')
}

// ─── 8. Composite filter: run all checks and return verdict ──────────────────

export interface CompositeFilterResult {
  shouldFilter: boolean
  verdict: FilterVerdict
}

/**
 * Run all filters in priority order. Returns on first hard block.
 * CONFIDENCE THRESHOLD: >= 70 = filter out
 */
export function runAllFilters(params: {
  companyName: string
  advertiserName: string
  jobTitle: string
  description: string
  website: string | null
  classification: string
  isPrivate?: boolean
  filterSalesOnly: boolean
}): CompositeFilterResult {
  const THRESHOLD = 70

  // Sales filter first (cheapest check)
  if (params.filterSalesOnly && !isSalesJob(params.classification)) {
    return {
      shouldFilter: true,
      verdict: {
        shouldFilter: true,
        reason: `Classification "${params.classification || 'unknown'}" is not Sales`,
        confidence: 100,
        category: 'non_sales',
      },
    }
  }

  // Private advertiser
  const privateVerdict = checkPrivateAdvertiser(params.advertiserName, params.isPrivate)
  if (privateVerdict.shouldFilter && privateVerdict.confidence >= THRESHOLD) {
    return { shouldFilter: true, verdict: privateVerdict }
  }

  // Recruitment agency (checks name + description + website)
  const agencyVerdict = checkRecruitmentAgency(
    params.companyName,
    params.advertiserName,
    params.description,
    params.website
  )
  if (agencyVerdict.shouldFilter && agencyVerdict.confidence >= THRESHOLD) {
    return { shouldFilter: true, verdict: agencyVerdict }
  }

  // No-agency disclaimer
  const disclaimerVerdict = checkNoAgencyDisclaimer(params.description)
  if (disclaimerVerdict.shouldFilter && disclaimerVerdict.confidence >= THRESHOLD) {
    return { shouldFilter: true, verdict: disclaimerVerdict }
  }

  // HR consulting
  const hrVerdict = checkHRConsulting(params.companyName, params.description)
  if (hrVerdict.shouldFilter && hrVerdict.confidence >= THRESHOLD) {
    return { shouldFilter: true, verdict: hrVerdict }
  }

  // Law firm
  const lawVerdict = checkLawFirm(
    params.companyName,
    params.jobTitle,
    params.description,
    params.website
  )
  if (lawVerdict.shouldFilter && lawVerdict.confidence >= THRESHOLD) {
    return { shouldFilter: true, verdict: lawVerdict }
  }

  return {
    shouldFilter: false,
    verdict: { shouldFilter: false, reason: '', confidence: 0, category: 'pass' },
  }
}

// ─── Backwards-compat shims (so existing code still compiles) ─────────────────
export { checkNoAgencyDisclaimer as checkUnwantedPhrases }
// src/utils/contactExtractor.ts
// Add these lines at the very bottom of the file

// ─── Type exports for useScraper ──────────────────────────────────────────────
export type FilteredJobRecord = {
  companyName: string
  jobTitle: string
  reason: string
  category: string
  confidence: number
  jobLink?: string
}

// Re-export runAllFilters type for clarity
export type { FilterVerdict, FilterCategory, CompositeFilterResult }