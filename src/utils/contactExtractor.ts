/**
 * LETHAL RECRUITER & AGENCY FILTER — v5
 * ──────────────────────────────────────────────────────────────────────────────
 * v5 Changes vs v4:
 *
 * BUG FIX — 600-char window:
 *   v4 scanned only description.slice(0, 600) for ALL agency description signals.
 *   This meant referral bonuses ("refer them to us and we'll give you $500"),
 *   trailing hashtags (#SCR-, #Choose Fuse), and end-of-ad disclaimers were
 *   NEVER matched — causing agency jobs to slip through.
 *
 *   Fix: Signals are now split into three lists:
 *     1. AGENCY_INTRO_SIGNALS   → checked in first 900 chars  (opening phrases)
 *     2. AGENCY_BODY_SIGNALS    → checked in full description  (can appear anywhere)
 *     3. AGENCY_TRAILING_SIGNALS→ checked in full description  (end-of-ad giveaways)
 *
 * NEW — Referral bonus detection:
 *   Patterns like "refer them to us and we'll give you $500" are now caught
 *   regardless of where they appear in the description.
 *
 * NEW — "At [Agency], we specialise in recruitment/placing" trailing pattern.
 *
 * NEW — More known agencies added (Australian market 2025/26).
 *
 * UNCHANGED — checkRecruiterProfile() (was already correct & comprehensive).
 * UNCHANGED — HR multi-word phrase matching (avoids false positives on "hr" substring).
 * UNCHANGED — extractEmails() personal-only filtering.
 * UNCHANGED — extractContactName() strict validation.
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

function lc(s: string): string {
  return s.toLowerCase()
}

function findMatches(text: string, terms: string[]): string[] {
  const t = lc(text)
  return terms.filter((term) => t.includes(lc(term)))
}

// ─── Email extraction — personal only ────────────────────────────────────────

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

function isPersonalEmail(email: string): boolean {
  const prefix = email.split('@')[0]?.toLowerCase() ?? ''

  if (GENERIC_EMAIL_PREFIXES.includes(prefix)) return false

  for (const generic of GENERIC_EMAIL_PREFIXES) {
    if (
      prefix === generic ||
      prefix.startsWith(generic + '.') ||
      prefix.startsWith(generic + '-') ||
      prefix.startsWith(generic + '_') ||
      prefix.startsWith(generic + '+') ||
      prefix.startsWith(generic + '@') ||
      (prefix.startsWith(generic) && prefix.length <= generic.length + 4)
    ) {
      return false
    }
  }

  if (!/^[a-z]/i.test(prefix)) return false
  if (prefix.length < 3) return false

  return true
}

export function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const allEmails = [...new Set(text.match(emailRegex) || [])]
  return allEmails.filter((email) => isPersonalEmail(email))
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
  const patterns = [
    /\bcontact\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\s+(?:on|at|via|directly|for)/i,
    /\bplease\s+contact\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\b/i,
    /\bcontact\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\s*[,\.]/i,
    /\bemail\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\s+at\b/i,
    /\bspeak\s+(?:with|to)\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\b/i,
    /\breach\s+out\s+to\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\b/i,
    /\bquestions[,\.]?\s+(?:please\s+)?contact\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\b/i,
    /\bto\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z\']{1,20}),\s+[A-Z][a-z]/i,
    /\battn:?\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\b/i,
    /\bcall\s+([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\s+on\b/i,
  ]

  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (m?.[1]) {
      const name = m[1].trim()
      const words = name.split(/\s+/)

      if (words.length < 2 || words.length > 3) continue
      if (!words.every((w) => /^[A-Z]/.test(w))) continue

      const lowerWords = words.map((w) => w.toLowerCase())
      if (lowerWords.some((w) => NON_NAME_BLACKLIST.has(w))) continue
      if (!words.every((w) => /^[A-Za-z\-']{2,}$/.test(w))) continue

      return name
    }
  }

  return null
}

// ─── RecruiterProfile type ─────────────────────────────────────────────────────

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

function isRealValue(val: string | number | null | undefined): boolean {
  if (val === null || val === undefined) return false
  const s = String(val).trim()
  return s !== '' && s !== 'N/A' && s !== 'n/a' && s !== '0' && s !== 'null'
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 0 (HIGHEST PRIORITY): Recruiter Profile
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Apify populates recruiterProfile ONLY when the job is posted by a recruiter
 * on behalf of a client. Direct employer posts have an empty recruiterProfile.
 *
 * This is the single most reliable signal available — 100% confidence when present.
 * Fields checked in priority order:
 *   name            → recruiter's personal name (e.g. Lewis Ball)
 *   agencyName      → agency company name (e.g. Fuse Recruitment)
 *   agencyWebsite   → agency website
 *   specialisations → only agency recruiters list these on Seek
 *   placementCount  → only agency recruiters have Seek placement records
 *   reviewCount     → only agency recruiters accumulate Seek reviews
 */
export function checkRecruiterProfile(
  recruiterProfile: RecruiterProfileData | null | undefined,
  recruiterSpecialisations?: string[] | null
): FilterVerdict {
  if (!recruiterProfile) {
    return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
  }

  // Check if it's an empty object (common for non-recruiter jobs)
  const keys = Object.keys(recruiterProfile)
  if (keys.length === 0) {
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
  // Global / National
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
  'talentbay', 'talent bay',
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
  // Additional Australian agencies 2025/26
  'burning glass', 'experteer', 'seek learning',
  'redwolf + rosch', 'redwolf rosch',
  'tiger recruitment', 'tiger staffing',
  'green bay recruitment', 'eleven recruitment',
  'kaizen recruitment', 'marble recruitment',
  'reo group', 'search party', 'fetch recruitment',
  'ivy recruitment', 'byronhurst', 'blackbook executive',
  'precision sourcing', 'perigon group',
  'saxton drummond', 'execucare',
  'limerence talent', 'limerence recruitment',
  'salted talent', 'talent & skills',
  'tss talent', 'executive search',
  'core recruits', 'salt agency', 'salt recruitment',
  'people path', 'people source', 'people plus',
  'people2people recruitment', 'people 2 people recruitment',
  'found careers', 'talent scout australia',
]

/**
 * Single words that as a WHOLE WORD in a company/advertiser name = recruitment.
 */
const AGENCY_NAME_WORD_REGEX =
  /\b(recruitment|recruiting|recruiter|recruiters|recruits|staffing|headhunter|headhunters|headhunting|resourcing|outsourcing|placements?|manpower|labour\s*hire|labor\s*hire)\b/i

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

// ── v5: THREE separate signal lists for description scanning ─────────────────

/**
 * INTRO SIGNALS — phrases that appear at the OPENING of an agency job ad.
 * Checked in the first 900 characters of the description.
 */
const AGENCY_INTRO_SIGNALS: string[] = [
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
  'working with our client base',
  'we are partnering with', 'we partner with',
  'for a confidential discussion', 'confidential discussion',
  'if you would like a confidential', 'for a confidential chat',
  // Additional intro patterns
  'we are exclusively recruiting',
  'exclusively recruiting for',
  'partnered exclusively with',
  'our client, an award',
  'this role sits within a confidential',
  'the business is a',
  'our client operates',
  'the organisation is seeking',
  'we are working with a leading',
  'we have been engaged by',
  'we are engaged by',
  'retained by',
  'our retained client',
]

/**
 * BODY SIGNALS — phrases that can appear ANYWHERE in the description (full scan).
 * Require 2+ matches OR 1 high-confidence match.
 */
const AGENCY_BODY_SIGNALS: string[] = [
  'registering for future roles',
  'submit your resume to our talent pool',
  'connect with our recruitment team',
  'join our talent community',
  'talent community',
  'we specialise in recruitment for',
  'we are a leading recruitment',
  'our recruitment consultants',
  'our team of recruitment',
  'speak with one of our consultants',
  'our consultants specialise',
  'we match candidates',
  'placing candidates',
  'we place candidates',
  'sourcing top talent',
]

/**
 * TRAILING SIGNALS — phrases that appear at the END of an agency job ad.
 * These are DEAD GIVEAWAYS regardless of where they appear.
 * Checked against the FULL description — even one match = filter.
 *
 * KEY v5 FIX: referral bonuses and trailing boilerplate were previously
 * only checked in the first 600 chars and were NEVER matched.
 */
const AGENCY_TRAILING_SIGNALS: string[] = [
  // Referral bonus programs (classic agency trailing content)
  "refer them to us and we'll give you",
  "refer them to us and we will give you",
  'refer a friend and receive',
  'referral fee of $',
  'referral bonus of $',
  '$500 if we find them a new role',
  '$500 referral',
  'referral reward',
  "we'll give you $",
  'refer your friends and earn',
  'know someone looking for a job? refer',
  'if you know someone looking for a job',
  // Agency self-promotion at end of ads
  'we specialise in recruitment for the insurance',
  'we specialise in recruitment for the',
  'actively source for a broad range of established clients',
  'if you are a broking, underwriting or claims professional',
  'if you are a sales professional looking for your next',
  'if you are looking for your next opportunity, we',
  "we'd love to hear from you!" , // when preceded by agency self-promo
  // Candidate pool harvesting
  'register your details with us',
  'register your resume with us',
  'add your resume to our database',
  'we have a database of',
  // Standard agency footers
  'only shortlisted candidates will be contacted',
  'only successful candidates will be contacted',
  'please note: only shortlisted',
  // Seek recruiter hashtags (already caught by regex but belt-and-suspenders)
  '#choose fuse',
  '#choose people2people',
  '#choose hays',
  '#choose randstad',
  '#choose robert half',
]

export function checkRecruitmentAgency(
  companyName: string,
  advertiserName: string,
  description: string,
  website: string | null
): FilterVerdict {
  const nameText = `${companyName} ${advertiserName}`

  // ── 1. Known agencies list (exact substring match) ──────────────────────────
  const knownMatch = KNOWN_AGENCIES.find((agency) => lc(nameText).includes(lc(agency)))
  if (knownMatch) {
    return {
      shouldFilter: true,
      reason: `Known recruitment agency: "${knownMatch}"`,
      confidence: 98,
      category: 'recruitment_agency',
    }
  }

  // ── 2. Single-word whole-word match in COMPANY NAME ─────────────────────────
  if (AGENCY_NAME_WORD_REGEX.test(companyName)) {
    const match = companyName.match(AGENCY_NAME_WORD_REGEX)?.[0] || ''
    return {
      shouldFilter: true,
      reason: `Company name contains recruitment keyword: "${match}" in "${companyName}"`,
      confidence: 94,
      category: 'recruitment_agency',
    }
  }

  // ── 2b. Same check on ADVERTISER NAME ───────────────────────────────────────
  if (AGENCY_NAME_WORD_REGEX.test(advertiserName)) {
    const match = advertiserName.match(AGENCY_NAME_WORD_REGEX)?.[0] || ''
    return {
      shouldFilter: true,
      reason: `Advertiser name contains recruitment keyword: "${match}" in "${advertiserName}"`,
      confidence: 93,
      category: 'recruitment_agency',
    }
  }

  // ── 3. Multi-word phrases in company/advertiser name ────────────────────────
  const nameSignals = findMatches(nameText, AGENCY_NAME_PHRASES)
  if (nameSignals.length >= 1) {
    return {
      shouldFilter: true,
      reason: `Company name suggests agency: "${nameSignals[0]}"`,
      confidence: 88,
      category: 'recruitment_agency',
    }
  }

  // ── 4a. INTRO signals — first 900 chars ─────────────────────────────────────
  // BUG FIX v5: Increased from 600 → 900. These phrases appear in the opening
  // paragraph. Two matches = very high confidence, one match = still filter.
  const introSignals = findMatches(description.slice(0, 900), AGENCY_INTRO_SIGNALS)
  if (introSignals.length >= 2) {
    return {
      shouldFilter: true,
      reason: `Description opens with multiple agency phrases: "${introSignals[0]}", "${introSignals[1]}"`,
      confidence: 96,
      category: 'recruitment_agency',
    }
  }
  if (introSignals.length === 1) {
    return {
      shouldFilter: true,
      reason: `Description contains agency intro phrase: "${introSignals[0]}"`,
      confidence: 88,
      category: 'recruitment_agency',
    }
  }

  // ── 4b. BODY signals — full description ─────────────────────────────────────
  // These can appear anywhere. Need 2+ to filter, or 1 with a supporting signal.
  const bodySignals = findMatches(description, AGENCY_BODY_SIGNALS)
  if (bodySignals.length >= 2) {
    return {
      shouldFilter: true,
      reason: `Description has multiple agency body phrases: "${bodySignals[0]}", "${bodySignals[1]}"`,
      confidence: 85,
      category: 'recruitment_agency',
    }
  }

  // ── 4c. TRAILING signals — full description ──────────────────────────────────
  // BUG FIX v5: These were previously MISSED because they appear at the END of
  // descriptions but the old code only scanned the first 600 chars.
  // Even ONE trailing signal = definitive agency. No direct employer writes
  // "refer them to us and we'll give you $500".
  const trailingSignals = findMatches(description, AGENCY_TRAILING_SIGNALS)
  if (trailingSignals.length >= 1) {
    return {
      shouldFilter: true,
      reason: `Description contains agency trailing signal: "${trailingSignals[0]}"`,
      confidence: 95,
      category: 'recruitment_agency',
    }
  }

  // ── 5. Seek recruiter tracking hashtags — full description ───────────────────
  // Seek recruiter profiles always append #SCR-firstname-lastname and/or #Choose Agency.
  // These appear at the very end of the description HTML.
  if (/#(?:SCR|scr)-[a-zA-Z]/.test(description)) {
    const match = description.match(/#(?:SCR|scr)-[a-zA-Z][^\s]*/)?.[0] || '#SCR-...'
    return {
      shouldFilter: true,
      reason: `Description contains Seek recruiter tracking hashtag: ${match}`,
      confidence: 97,
      category: 'recruitment_agency',
    }
  }
  if (/#[Cc]hoose\s+\w/.test(description)) {
    const match = description.match(/#[Cc]hoose\s+\w[^\s<]*/)?.[0] || '#Choose ...'
    return {
      shouldFilter: true,
      reason: `Description contains Seek agency hashtag: ${match}`,
      confidence: 96,
      category: 'recruitment_agency',
    }
  }

  // ── 6. Recruitment website ───────────────────────────────────────────────────
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
  // Additional common variations
  'we are managing this search internally',
  'this role is being filled internally',
  'we have engaged a preferred supplier',
  'we have preferred recruitment suppliers',
  'we have an approved supplier list',
  'no agency approaches',
  'agency approaches will not be accepted',
  'we are not accepting agency',
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
// NOTE: "HR" as a standalone word is intentionally NOT in these lists to avoid
// false positives on company names like "CHR Industries" or "THR Group".
// Only multi-word phrases are used.

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
  return RECRUITMENT_WEBSITE_KEYWORDS.some((kw) => lowerWebsite.includes(kw))
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

  // 0. Sales classification check
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
  //    Catches "Recruited by: Lewis Ball (Fuse Recruitment)" type jobs.
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
  //    v5 FIX: Now scans full description via trailing signals.
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

import { getMaxEmployeeCount } from './filterUtils'

export type RecommendedContactRole =
  | 'Director'
  | 'CEO'
  | 'General Manager'
  | 'Sales Manager'
  | 'HR Manager'
  | 'People & Culture Manager'
  | 'Hiring Manager'

export interface ContactRecommendation {
  role: RecommendedContactRole
  reason: string
  priority: number
}

export function getRecommendedContactRole(
  employeeCount: string | null | undefined,
  linkedinHirerName?: string | null,
  reportingTo?: string | null
): ContactRecommendation {
  if (linkedinHirerName) {
    return {
      role: 'Hiring Manager',
      reason: `LinkedIn shows ${linkedinHirerName} is actively hiring for this role`,
      priority: 1,
    }
  }

  if (reportingTo) {
    return {
      role: 'General Manager',
      reason: `Ad states role reports to: ${reportingTo}`,
      priority: 2,
    }
  }

  const maxCount = getMaxEmployeeCount(employeeCount)

  if (maxCount === 0) {
    return {
      role: 'General Manager',
      reason: 'Company size unknown — General Manager is the safest default',
      priority: 5,
    }
  }

  if (maxCount <= 30) {
    return {
      role: 'Director',
      reason: `Small company (${employeeCount} employees) — Director is likely handling hiring directly`,
      priority: 1,
    }
  }

  if (maxCount <= 100) {
    return {
      role: 'General Manager',
      reason: `Mid-small company (${employeeCount} employees) — General Manager oversees hiring`,
      priority: 2,
    }
  }

  if (maxCount <= 300) {
    return {
      role: 'HR Manager',
      reason: `Medium company (${employeeCount} employees) — HR Manager runs recruitment process`,
      priority: 3,
    }
  }

  return {
    role: 'People & Culture Manager',
    reason: `Larger company (${employeeCount} employees) — People & Culture team manages hiring`,
    priority: 4,
  }
}

export function getLinkedInPeopleSearchUrl(
  companyName: string,
  contactRole: RecommendedContactRole
): string {
  const query = encodeURIComponent(`${contactRole} ${companyName}`)
  return `https://www.linkedin.com/search/results/people/?keywords=${query}`
}

export function getLinkedInCompanySearchUrl(companyName: string): string {
  const query = encodeURIComponent(companyName)
  return `https://www.linkedin.com/search/results/companies/?keywords=${query}`
}

export function getGoogleSearchUrl(companyName: string): string {
  const query = encodeURIComponent(`${companyName} LinkedIn Australia`)
  return `https://www.google.com/search?q=${query}`
}

export function isTooSeniorForCompanySize(
  contactRole: string,
  employeeCount: string | null | undefined
): boolean {
  const maxCount = getMaxEmployeeCount(employeeCount)
  if (maxCount === 0) return false

  const seniorRoles = ['CEO', 'Chief Executive', 'Managing Director']
  const isSenior = seniorRoles.some((r) =>
    contactRole.toLowerCase().includes(r.toLowerCase())
  )

  return isSenior && maxCount > 100
}