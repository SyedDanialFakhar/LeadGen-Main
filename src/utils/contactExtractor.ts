// src/utils/contactExtractor.ts
/**
 * LETHAL RECRUITER & AGENCY FILTER — v4
 * ──────────────────────────────────────────────────────────────────────────────
 * v4 Changes:
 * - extractEmails() now filters out generic/role-based emails and only keeps
 *   personal emails (e.g. john@company.com, not hr@, careers@, info@, etc.)
 * - extractContactName() now validates properly — rejects sentence fragments
 *   and non-name garbage like "for families navigating one of life"
 * - checkRecruitmentAgency() has broader keyword coverage to catch
 *   "Fuse Recruitment", "ABC Recruiters", "XYZ Talent" style names
 * - Added advertiserName word-level regex check (same as companyName)
 */

export interface FilterVerdict {
  shouldFilter: boolean
  reason: string
  confidence: number
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
  | 'recruiter_profile'
  | 'pass'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lc(s: string): string { return s.toLowerCase() }

function findMatches(text: string, terms: string[]): string[] {
  const t = lc(text)
  return terms.filter(term => t.includes(lc(term)))
}

// ─── Email extraction — personal only ────────────────────────────────────────
/**
 * Generic/role-based email prefixes that are NOT personal contacts.
 * We only want personal emails like john.smith@company.com
 */
const GENERIC_EMAIL_PREFIXES: string[] = [
  'info', 'hello', 'hi', 'hey',
  'contact', 'contactus', 'contact-us',
  'enquiries', 'enquiry', 'inquiries', 'inquiry',
  'admin', 'administration',
  'hr', 'humanresources', 'human-resources', 'human.resources',
  'careers', 'career',
  'jobs', 'job',
  'recruitment', 'recruit', 'recruiting',
  'apply', 'applications', 'application',
  'resumes', 'resume', 'cv',
  'talent', 'talentacquisition', 'talent-acquisition',
  'hiring', 'hire',
  'noreply', 'no-reply', 'donotreply', 'do-not-reply',
  'support', 'help', 'helpdesk',
  'mail', 'email', 'post',
  'office', 'reception', 'receptionist', 'front-desk', 'frontdesk',
  'general', 'general-enquiries',
  'team', 'staff',
  'management', 'manager',
  'sales', 'marketing', 'accounts', 'finance', 'billing', 'payroll',
  'operations', 'ops',
  'legal', 'compliance',
  'news', 'newsletter', 'updates', 'notifications',
  'press', 'media', 'pr',
  'privacy', 'security', 'abuse', 'report',
  'webmaster', 'web', 'it', 'tech', 'technical',
  'feedback', 'suggestions',
  'partners', 'partnerships',
  'accommodations', 'accessibility', 'diversity',
  'reasonableaccommodations',
  'peopleteam', 'people-team', 'people&culture', 'peopleandculture',
]

/**
 * Returns true if an email looks like a personal email (e.g. john@company.com)
 * rather than a generic role/department email.
 */
function isPersonalEmail(email: string): boolean {
  const prefix = email.split('@')[0]?.toLowerCase() ?? ''

  // Reject if prefix exactly matches a generic term
  if (GENERIC_EMAIL_PREFIXES.includes(prefix)) return false

  // Reject if prefix STARTS WITH a generic term followed by nothing or a separator
  // e.g. "careers2024", "hr.team", "admin+seek"
  for (const generic of GENERIC_EMAIL_PREFIXES) {
    if (
      prefix === generic ||
      prefix.startsWith(generic + '.') ||
      prefix.startsWith(generic + '-') ||
      prefix.startsWith(generic + '_') ||
      prefix.startsWith(generic + '+') ||
      prefix.startsWith(generic + '@') ||
      // e.g. "hrmanager", "jobsau", "careerspage"
      (prefix.startsWith(generic) && prefix.length <= generic.length + 4)
    ) {
      return false
    }
  }

  // Reject emails that are clearly not personal — e.g. all digits/generic patterns
  // A personal email prefix should contain at least one letter that isn't part of
  // a generic word, and should look like a name (letters, dots, hyphens, numbers)
  if (!/^[a-z]/i.test(prefix)) return false

  // Must be at least 3 characters
  if (prefix.length < 3) return false

  return true
}

export function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const allEmails = [...new Set(text.match(emailRegex) || [])]

  // Filter to personal emails only
  return allEmails.filter(email => isPersonalEmail(email))
}

// ─── Phone extraction ─────────────────────────────────────────────────────────

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

// ─── Contact name extraction ──────────────────────────────────────────────────
/**
 * Extracts a real person's name from a job description.
 * Only returns something if it looks genuinely like "FirstName LastName"
 * mentioned in a contact context (e.g. "contact John Smith", "email Sarah Jones at").
 * Rejects sentence fragments, long phrases, and common non-name words.
 */

// Words that disqualify a "name" match — these appear in sentence fragments
const NON_NAME_BLACKLIST = new Set([
  'the', 'your', 'our', 'their', 'for', 'and', 'with', 'from', 'about',
  'this', 'that', 'which', 'what', 'where', 'when', 'how', 'any', 'all',
  'customer', 'feedback', 'territory', 'role', 'team', 'company', 'position',
  'application', 'opportunity', 'business', 'sales', 'manager', 'director',
  'please', 'directly', 'further', 'information', 'queries', 'questions',
  'account', 'service', 'support', 'inquiries', 'enquiries',
  'key', 'new', 'next', 'full', 'high', 'top', 'best', 'great', 'good',
  'more', 'other', 'some', 'many', 'most', 'such', 'each', 'both',
  'national', 'regional', 'local', 'global', 'senior', 'junior',
  'human', 'people', 'talent', 'culture', 'resources', 'services',
  'life', 'time', 'year', 'day', 'work', 'home', 'office',
  'navigating', 'experiencing', 'seeking', 'looking', 'hiring',
  'families', 'individuals', 'clients', 'candidates', 'applicants',
])

export function extractContactName(text: string): string | null {
  // Strict patterns: only match when a person's name is clearly mentioned
  // in a "contact this person" context
  const patterns = [
    // "contact John Smith on / at / via"
    /\bcontact\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\s+(?:on|at|via|directly|for)/i,
    // "please contact John Smith"
    /\bplease\s+contact\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\b/i,
    // "contact John Smith,"
    /\bcontact\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\s*[,\.]/i,
    // "email John Smith at"
    /\bemail\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\s+at\b/i,
    // "speak with John Smith" / "speak to John Smith"
    /\bspeak\s+(?:with|to)\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\b/i,
    // "reach out to John Smith"
    /\breach\s+out\s+to\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\b/i,
    // "questions, contact John Smith"
    /\bquestions[,\.]?\s+(?:please\s+)?contact\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\b/i,
    // "to John Smith, Brand & X Manager" — explicit name + job title
    /\bto\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z\']{1,20}),\s+[A-Z][a-z]/i,
    // "attn: John Smith" / "attention: John Smith"
    /\battn:?\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\b/i,
    // "call John Smith on"
    /\bcall\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\s+on\b/i,
  ]

  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (m?.[1]) {
      const name = m[1].trim()
      const words = name.split(/\s+/)

      // Must be exactly 2–3 words
      if (words.length < 2 || words.length > 3) continue

      // Every word must start with uppercase
      if (!words.every(w => /^[A-Z]/.test(w))) continue

      // No word can be a blacklisted non-name word
      const lowerWords = words.map(w => w.toLowerCase())
      if (lowerWords.some(w => NON_NAME_BLACKLIST.has(w))) continue

      // Each word must look like a real name component (only letters, hyphens, apostrophes)
      if (!words.every(w => /^[A-Za-z\-']{2,}$/.test(w))) continue

      return name
    }
  }

  return null
}

// ─── RecruiterProfile type (mirrors Apify output) ─────────────────────────────

export interface RecruiterProfileData {
  name?: string | null
  rating?: string | number | null
  reviewCount?: string | number | null
  contactNumber?: string | null
  agencyName?: string | null
  agencyWebsite?: string | null
  location?: {
    country?: string | null
    postcode?: string | null
    state?: string | null
    city?: string | null
  } | null
  specialisations?: string[]
  placementCount?: string | number | null
}

// Returns true if a value from Apify is a real populated value (not "N/A")
function isRealValue(val: string | number | null | undefined): boolean {
  if (val === null || val === undefined) return false
  const s = String(val).trim()
  return s !== '' && s !== 'N/A' && s !== 'n/a' && s !== '0' && s !== 'null'
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 0 (HIGHEST PRIORITY): Recruiter Profile
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Apify populates recruiterProfile ONLY when a job is posted by a recruiter
 * on behalf of a client. Direct employer posts have empty recruiterProfile.
 *
 * Fields checked (in priority order):
 *   name          → recruiter's personal name (e.g. Lewis Ball)
 *   agencyName    → the agency company name (e.g. Fuse Recruitment)
 *   agencyWebsite → agency website
 *   specialisations → only agency recruiters have these
 *   placementCount  → only agency recruiters have placement counts
 *   reviewCount     → only agency recruiters have Seek reviews
 */
export function checkRecruiterProfile(
  recruiterProfile: RecruiterProfileData | null | undefined,
  recruiterSpecialisations?: string[] | null
): FilterVerdict {
  if (!recruiterProfile) {
    return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
  }

  if (isRealValue(recruiterProfile.name)) {
    const agencyPart = isRealValue(recruiterProfile.agencyName)
      ? ` (${recruiterProfile.agencyName})`
      : ''
    return {
      shouldFilter: true,
      reason: `Job posted by recruiter: "${recruiterProfile.name}"${agencyPart}`,
      confidence: 100,
      category: 'recruiter_profile',
    }
  }

  if (isRealValue(recruiterProfile.agencyName)) {
    return {
      shouldFilter: true,
      reason: `Job posted by recruitment agency: "${recruiterProfile.agencyName}"`,
      confidence: 99,
      category: 'recruiter_profile',
    }
  }

  if (isRealValue(recruiterProfile.agencyWebsite)) {
    return {
      shouldFilter: true,
      reason: `Job posted through recruiter website: "${recruiterProfile.agencyWebsite}"`,
      confidence: 97,
      category: 'recruiter_profile',
    }
  }

  if (Array.isArray(recruiterSpecialisations) && recruiterSpecialisations.length > 0) {
    return {
      shouldFilter: true,
      reason: `Job posted by recruiter with specialisations: ${recruiterSpecialisations.slice(0, 2).join(', ')}`,
      confidence: 96,
      category: 'recruiter_profile',
    }
  }

  if (isRealValue(recruiterProfile.placementCount)) {
    const count = Number(recruiterProfile.placementCount)
    if (!isNaN(count) && count > 0) {
      return {
        shouldFilter: true,
        reason: `Job posted by recruiter with ${count} Seek placements`,
        confidence: 95,
        category: 'recruiter_profile',
      }
    }
  }

  if (isRealValue(recruiterProfile.reviewCount)) {
    const count = Number(recruiterProfile.reviewCount)
    if (!isNaN(count) && count > 0) {
      return {
        shouldFilter: true,
        reason: `Job posted by recruiter with ${count} Seek reviews`,
        confidence: 93,
        category: 'recruiter_profile',
      }
    }
  }

  return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 1: Recruitment / Staffing Agency (name + description + website)
// ═══════════════════════════════════════════════════════════════════════════════

const KNOWN_AGENCIES: string[] = [
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
  'preacta recruitment', 'scaleup recruitment',
  'levyl', 'beaumont people', 'beaumont consulting', 'engage personnel',
  'lawson elliot', 'lawson & elliot', 'peoplecorp', 'people corp',
  'talent web', 'talentweb', 'parity consulting', 'capability group',
  'careerone', 'career one', 'trojan recruitment', 'trojan staffing',
  'veritas recruitment', 'sirius people', 'watermark search',
  'lotus people', 'verve partners', 'smaart recruitment',
  'apex group', 'hoban recruitment', 'aston carter',
  'harvey nash', 'allegis group', 'talenting',
  'sf people', 'sf recruitment',
  'people infrastructure', 'peak talent', 'peak recruitment',
  'recruitment solutions', 'recruitment co',
  'atlas recruitment', 'pronto recruitment',
  'momentum consulting', 'momentum recruitment',
  'people collective', 'people connect', 'people matters',
  'people first', 'people consulting', 'people advisory',
  'talent right', 'talent focus', 'talent connect',
  'talent search', 'talent scout', 'talent link',
  'talent now', 'talent army',
  'bluefin resources', 'blue fin resources',
  'new recruitment', 'now recruitment',
  'go recruitment', 'link recruitment', 'link talent',
  'impact talent', 'impact recruitment',
  'core talent', 'cornerstone recruitment',
  'oxygen recruitment', 'red wolf group',
  'fuse recruitment', 'fuse staffing', 'fuse talent',
  'jora', 'seek talent', 'indeed hire',
]

/**
 * Single words that as a WHOLE WORD in a company name = recruitment business.
 * ⭐ v4: Added 'recruiters' (plural), 'recruits', 'placements' to catch
 *        names like "ABC Recruiters", "XYZ Placements"
 */
const AGENCY_NAME_WORD_REGEX =
  /\b(recruitment|recruiting|recruiter|recruiters|recruits|staffing|headhunter|headhunters|headhunting|resourcing|outsourcing|placements?|manpower|labour\s*hire|labor\s*hire)\b/i

/**
 * Multi-word phrases in a company name → agency signal
 */
const AGENCY_NAME_PHRASES: string[] = [
  'recruitment agency', 'staffing agency', 'employment agency',
  'talent acquisition', 'recruitment firm', 'staffing firm',
  'labour hire', 'labor hire', 'temp agency',
  'temporary staffing', 'contract staffing', 'permanent placement',
  'executive search', 'search and selection',
  'talent solutions', 'workforce solutions', 'resourcing solutions',
  'specialist recruiter', 'boutique recruiter', 'boutique recruitment',
  'niche recruiter', 'specialist staffing',
  'people solutions', 'people group',
  'talent group', 'talent agency', 'search firm',
]

/**
 * Phrases at the start of a job description that mean the poster is an agency.
 */
const AGENCY_DESCRIPTION_SIGNALS: string[] = [
  'our client is seeking', 'our client requires', 'our client needs',
  'our client is looking for', 'our client has an exciting',
  'our client, a', 'our client —', 'our client -',
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
  'recruited by', 'this role has been exclusively',
  'this search is being', 'this position is being managed by',
  'as a specialist recruiter', 'as a leading recruitment',
  'as a boutique recruitment', 'we are a recruitment',
  'we specialise in placing', 'we specialise in recruiting',
  'our specialist recruitment', 'our recruitment team',
  'our experienced recruitment', 'our team of recruiters',
  'working with our client base', 'registering for future roles',
  'submit your resume to our talent pool',
  'connect with our recruitment team',
  // Additional agency signals
  'we are partnering with', 'we partner with',
  'join our talent community', 'talent community',
  'for a confidential discussion', 'confidential discussion',
  'if you would like a confidential', 'for a confidential chat',
  '#choose fuse', '#scr-', // Seek recruiter hashtags
  'refer them to us and we\'ll give you',
  'we\'ll give you $',
  'if you know someone looking for a job, refer',
]

export function checkRecruitmentAgency(
  companyName: string,
  advertiserName: string,
  description: string,
  website: string | null
): FilterVerdict {
  const nameText = `${companyName} ${advertiserName}`

  // 1. Known agencies list (exact substring match)
  const knownMatch = KNOWN_AGENCIES.find(agency => lc(nameText).includes(lc(agency)))
  if (knownMatch) {
    return {
      shouldFilter: true,
      reason: `Known recruitment agency: "${knownMatch}"`,
      confidence: 98,
      category: 'recruitment_agency',
    }
  }

  // 2. Single-word whole-word match in COMPANY NAME
  if (AGENCY_NAME_WORD_REGEX.test(companyName)) {
    const match = companyName.match(AGENCY_NAME_WORD_REGEX)?.[0] || ''
    return {
      shouldFilter: true,
      reason: `Company name contains recruitment keyword: "${match}" in "${companyName}"`,
      confidence: 94,
      category: 'recruitment_agency',
    }
  }

  // 2b. ⭐ v4: Also check advertiserName with the same word regex
  // Catches cases where companyName is clean but advertiserName reveals it's an agency
  if (AGENCY_NAME_WORD_REGEX.test(advertiserName)) {
    const match = advertiserName.match(AGENCY_NAME_WORD_REGEX)?.[0] || ''
    return {
      shouldFilter: true,
      reason: `Advertiser name contains recruitment keyword: "${match}" in "${advertiserName}"`,
      confidence: 93,
      category: 'recruitment_agency',
    }
  }

  // 3. Multi-word phrases in company/advertiser name
  const nameSignals = findMatches(nameText, AGENCY_NAME_PHRASES)
  if (nameSignals.length >= 1) {
    return {
      shouldFilter: true,
      reason: `Company name suggests agency: "${nameSignals[0]}"`,
      confidence: 88,
      category: 'recruitment_agency',
    }
  }

  // 4. Agency phrases in description (first 600 chars — slightly wider window)
  const descSignals = findMatches(description.slice(0, 600), AGENCY_DESCRIPTION_SIGNALS)
  if (descSignals.length >= 2) {
    return {
      shouldFilter: true,
      reason: `Description has multiple agency phrases: "${descSignals[0]}", "${descSignals[1]}"`,
      confidence: 95,
      category: 'recruitment_agency',
    }
  }
  if (descSignals.length === 1) {
    return {
      shouldFilter: true,
      reason: `Description contains agency phrase: "${descSignals[0]}"`,
      confidence: 87,
      category: 'recruitment_agency',
    }
  }

  // 5. ⭐ v4: Also scan the FULL description for the recruiter hashtag pattern
  // Seek recruiter ads often end with "#SCR-firstname-lastname" or "#Choose AgencyName"
  if (/#(?:SCR|scr)-[a-z]/.test(description) || /#[Cc]hoose\s+\w/.test(description)) {
    return {
      shouldFilter: true,
      reason: 'Description contains Seek recruiter tracking hashtag',
      confidence: 90,
      category: 'recruitment_agency',
    }
  }

  // 6. Recruitment website
  if (website && isRecruitmentWebsite(website)) {
    return {
      shouldFilter: true,
      reason: `Company website indicates recruitment firm: ${website}`,
      confidence: 85,
      category: 'recruitment_website',
    }
  }

  return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
}

export function isRecruitmentAgency(companyName: string, advertiserName?: string): boolean {
  const v = checkRecruitmentAgency(companyName, advertiserName || '', '', null)
  return v.shouldFilter && v.confidence >= 70
}

export function hasRecruitmentIntro(description: string): boolean {
  const v = checkRecruitmentAgency('', '', description, null)
  return v.shouldFilter && v.category === 'recruitment_agency' && v.confidence >= 80
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 2: "No Agency" disclaimer
// ═══════════════════════════════════════════════════════════════════════════════

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
  'do not forward resumes to', 'please do not forward your resume',
  'unsolicited resumes will not be accepted',
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

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 3: HR Consulting
// ═══════════════════════════════════════════════════════════════════════════════

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

export function checkHRConsulting(companyName: string, description: string): FilterVerdict {
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
    const descMatches = findMatches(description, HR_DESCRIPTION_SIGNALS)
    if (descMatches.length > 0) {
      return {
        shouldFilter: true,
        reason: `HR consultancy: name "${nameMatches[0]}" + description confirms`,
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

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 4: Law Firms
// ═══════════════════════════════════════════════════════════════════════════════

const LAW_FIRM_NAME_SIGNALS: string[] = [
  'lawyers', 'solicitors', 'barristers', 'legal', 'law group',
  'law firm', 'chambers', 'attorneys', 'counsel',
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

const LAW_FIRM_PATTERN = /\b(?:lawyers?|solicitors?|barristers?|legal|law|counsel|chambers|attorneys?)\b/i

export function checkLawFirm(
  companyName: string,
  jobTitle: string,
  description: string,
  website?: string | null
): FilterVerdict {
  if (LAW_FIRM_PATTERN.test(companyName)) {
    const descConfirmation = findMatches(description, LAW_DESCRIPTION_TERMS)
    if (descConfirmation.length > 0) {
      return {
        shouldFilter: true,
        reason: `Law firm: "${companyName}" + description confirms legal practice`,
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

  const combined = `${companyName} ${jobTitle} ${description.slice(0, 500)} ${website || ''}`
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

export function isLawFirmRelated(
  companyName: string,
  jobTitle: string,
  description: string,
  website?: string | null
): boolean {
  return checkLawFirm(companyName, jobTitle, description, website).shouldFilter
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 5: Private Advertiser
// ═══════════════════════════════════════════════════════════════════════════════

export function checkPrivateAdvertiser(
  advertiserName?: string,
  isPrivate?: boolean
): FilterVerdict {
  if (isPrivate === true) {
    return {
      shouldFilter: true,
      reason: 'Marked as private advertiser by Seek',
      confidence: 99,
      category: 'private_advertiser',
    }
  }
  if (!advertiserName) return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }

  const exactPrivate = ['Private Advertiser', 'Confidential', 'Confidential Company', 'Anonymous']
  if (exactPrivate.includes(advertiserName)) {
    return {
      shouldFilter: true,
      reason: `Advertiser listed as "${advertiserName}"`,
      confidence: 99,
      category: 'private_advertiser',
    }
  }
  return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
}

export function isPrivateAdvertiser(advertiserName?: string, isPrivate?: boolean): boolean {
  return checkPrivateAdvertiser(advertiserName, isPrivate).shouldFilter
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 6: Recruitment Website
// ═══════════════════════════════════════════════════════════════════════════════

const RECRUITMENT_WEBSITE_KEYWORDS: string[] = [
  'recruit', 'recruitment', 'staffing', 'labour-hire', 'labourhire',
  'employment-agency', 'employmentagency', 'headhunt', 'headhunting',
  'jobsearch', 'job-search', 'careersolutions', 'career-solutions',
  'placementgroup', 'placement-group', 'talentsearch', 'talent-search',
]

export function isRecruitmentWebsite(website: string): boolean {
  const lowerWebsite = lc(website)
  return RECRUITMENT_WEBSITE_KEYWORDS.some(kw => lowerWebsite.includes(kw))
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 7: Sales Classification
// ═══════════════════════════════════════════════════════════════════════════════

export function isSalesJob(classification: string): boolean {
  if (!classification) return false
  return lc(classification).includes('sales')
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITE FILTER
// ═══════════════════════════════════════════════════════════════════════════════

export interface CompositeFilterResult {
  shouldFilter: boolean
  verdict: FilterVerdict
}

export function runAllFilters(params: {
  companyName: string
  advertiserName: string
  jobTitle: string
  description: string
  website: string | null
  classification: string
  isPrivate?: boolean
  filterSalesOnly: boolean
  recruiterProfile?: RecruiterProfileData | null
  recruiterSpecialisations?: string[] | null
}): CompositeFilterResult {
  const THRESHOLD = 70

  // 0. Sales classification
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

  // 1. Recruiter profile (Apify data — most reliable, run first)
  const recruiterVerdict = checkRecruiterProfile(
    params.recruiterProfile,
    params.recruiterSpecialisations
  )
  if (recruiterVerdict.shouldFilter && recruiterVerdict.confidence >= THRESHOLD) {
    return { shouldFilter: true, verdict: recruiterVerdict }
  }

  // 2. Private advertiser
  const privateVerdict = checkPrivateAdvertiser(params.advertiserName, params.isPrivate)
  if (privateVerdict.shouldFilter && privateVerdict.confidence >= THRESHOLD) {
    return { shouldFilter: true, verdict: privateVerdict }
  }

  // 3. Recruitment agency (name + description + website)
  const agencyVerdict = checkRecruitmentAgency(
    params.companyName,
    params.advertiserName,
    params.description,
    params.website
  )
  if (agencyVerdict.shouldFilter && agencyVerdict.confidence >= THRESHOLD) {
    return { shouldFilter: true, verdict: agencyVerdict }
  }

  // 4. No-agency disclaimer
  const disclaimerVerdict = checkNoAgencyDisclaimer(params.description)
  if (disclaimerVerdict.shouldFilter && disclaimerVerdict.confidence >= THRESHOLD) {
    return { shouldFilter: true, verdict: disclaimerVerdict }
  }

  // 5. HR consulting
  const hrVerdict = checkHRConsulting(params.companyName, params.description)
  if (hrVerdict.shouldFilter && hrVerdict.confidence >= THRESHOLD) {
    return { shouldFilter: true, verdict: hrVerdict }
  }

  // 6. Law firm
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

// ─── Backwards-compat shims ───────────────────────────────────────────────────
export { checkNoAgencyDisclaimer as checkUnwantedPhrases }

export type FilteredJobRecord = {
  companyName: string
  jobTitle: string
  reason: string
  category: string
  confidence: number
  jobLink?: string
}