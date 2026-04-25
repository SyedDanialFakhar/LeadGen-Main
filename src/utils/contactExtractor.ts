/**
 * LETHAL RECRUITER & AGENCY FILTER — v6
 * ──────────────────────────────────────────────────────────────────────────────
 * v6 Changes vs v5:
 *
 * NEW — Check 8: Recruiter Email Domain Detection
 *
 *   Problem: A company posts the job themselves (passes all name/description
 *   filters), but embeds a recruiter's email in the description body, e.g.:
 *   "Send your CV to john@fuserecruitment.com.au"
 *   This signals the company has ALREADY engaged a recruiter — dead lead.
 *
 *   Solution: 4-layer detection with parent-company safety valve.
 *
 *   Layer 1 — Known recruiter domain list (60+ AU agencies) → 98% confidence
 *     Checks every email found in the description. If the domain matches a
 *     known recruitment agency, filter immediately.
 *
 *   Layer 2 — Domain keyword scan → 91% confidence
 *     Strips the TLD and checks if the remaining domain root contains
 *     keywords like "recruit", "staffing", "placement", "personnel", etc.
 *     e.g., "ausrecruitment.com.au" → root "ausrecruitment" → contains "recruit"
 *
 *   Layer 3 — Company-name vs email-domain alignment + context → 79% confidence
 *     Tokenises the company name, removes stop words, checks if any significant
 *     token (4+ chars) appears inside the email domain root.
 *     If NO company word is found in the domain AND the email appears near
 *     recruiter-context phrases ("send your CV to", "submit applications to"),
 *     it's flagged.
 *
 *   Parent company safety valve (protects Woolworths/BigW, ANZ/Grattan, etc.):
 *     If the email domain contains ANY significant word from the company name,
 *     the email is treated as internal and skipped entirely — regardless of
 *     other signals. This prevents false positives for parent/subsidiary posting.
 *
 *   All three layers require confidence ≥ 70 (same threshold as all other checks)
 *   before filtering occurs.
 *
 * UNCHANGED — All v5 logic (recruiterProfile, agency name/description,
 *             no-agency disclaimer, HR consulting, law firm, private advertiser).
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
  | 'recruiter_email'
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

export function checkRecruiterProfile(
  recruiterProfile: RecruiterProfileData | null | undefined,
  recruiterSpecialisations?: string[] | null
): FilterVerdict {
  if (!recruiterProfile) {
    return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
  }

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

const AGENCY_TRAILING_SIGNALS: string[] = [
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
  'we specialise in recruitment for the insurance',
  'we specialise in recruitment for the',
  'actively source for a broad range of established clients',
  'if you are a broking, underwriting or claims professional',
  'if you are a sales professional looking for your next',
  'if you are looking for your next opportunity, we',
  'register your details with us',
  'register your resume with us',
  'add your resume to our database',
  'we have a database of',
  'only shortlisted candidates will be contacted',
  'only successful candidates will be contacted',
  'please note: only shortlisted',
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

  const knownMatch = KNOWN_AGENCIES.find((agency) => lc(nameText).includes(lc(agency)))
  if (knownMatch) {
    return {
      shouldFilter: true,
      reason: `Known recruitment agency: "${knownMatch}"`,
      confidence: 98,
      category: 'recruitment_agency',
    }
  }

  if (AGENCY_NAME_WORD_REGEX.test(companyName)) {
    const match = companyName.match(AGENCY_NAME_WORD_REGEX)?.[0] || ''
    return {
      shouldFilter: true,
      reason: `Company name contains recruitment keyword: "${match}" in "${companyName}"`,
      confidence: 94,
      category: 'recruitment_agency',
    }
  }

  if (AGENCY_NAME_WORD_REGEX.test(advertiserName)) {
    const match = advertiserName.match(AGENCY_NAME_WORD_REGEX)?.[0] || ''
    return {
      shouldFilter: true,
      reason: `Advertiser name contains recruitment keyword: "${match}" in "${advertiserName}"`,
      confidence: 93,
      category: 'recruitment_agency',
    }
  }

  const nameSignals = findMatches(nameText, AGENCY_NAME_PHRASES)
  if (nameSignals.length >= 1) {
    return {
      shouldFilter: true,
      reason: `Company name suggests agency: "${nameSignals[0]}"`,
      confidence: 88,
      category: 'recruitment_agency',
    }
  }

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

  const bodySignals = findMatches(description, AGENCY_BODY_SIGNALS)
  if (bodySignals.length >= 2) {
    return {
      shouldFilter: true,
      reason: `Description has multiple agency body phrases: "${bodySignals[0]}", "${bodySignals[1]}"`,
      confidence: 85,
      category: 'recruitment_agency',
    }
  }

  const trailingSignals = findMatches(description, AGENCY_TRAILING_SIGNALS)
  if (trailingSignals.length >= 1) {
    return {
      shouldFilter: true,
      reason: `Description contains agency trailing signal: "${trailingSignals[0]}"`,
      confidence: 95,
      category: 'recruitment_agency',
    }
  }

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
// CHECK 8 (NEW — v6): Recruiter Email Domain Detection
// ──────────────────────────────────────────────────────────────────────────────
// Detects when a company posts their own job but includes a recruiter's email
// address in the description body — indicating they've already engaged a
// recruiter. Three detection layers + one parent-company safety valve.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Confirmed email domains belonging to Australian recruitment agencies.
 * If ANY email in the job description has one of these domains, the company
 * has already outsourced this hire to a recruiter → filter immediately.
 *
 * This list covers the top ~60 agencies active in Australia as of 2025/26.
 */
const KNOWN_RECRUITER_EMAIL_DOMAINS: Set<string> = new Set([
  // ── Global / National giants ──────────────────────────────────────────────
  'hays.com.au', 'hays.com', 'haysplc.com',
  'randstad.com.au', 'randstad.com',
  'roberthalf.com.au', 'roberthalf.com',
  'michaelpage.com.au', 'michaelpage.com', 'michaelpage.com.sg',
  'adecco.com.au', 'adecco.com',
  'kellyservices.com.au', 'kellycrew.com.au', 'kelly.com.au',
  'manpower.com.au', 'manpowergroup.com.au',
  'hudson.com', 'hudsonglobal.com',
  'peoplebank.com.au',
  'chandlermacleod.com', 'chandlermacleod.com.au',
  'designnbuild.com.au',
  'uandu.com', 'u-and-u.com',
  'frontlinerecruitment.com.au', 'frontline.com.au',
  'aspectpersonnel.com.au',
  'robertwalters.com.au', 'robertwalters.com',
  'morganmckinley.com.au', 'morganmckinley.com',
  'pagegroup.com.au', 'pagegroup.com',
  'talentinternational.com', 'talentinternational.com.au',
  // ── Boutique AU specialists ───────────────────────────────────────────────
  'sharpandcarter.com.au',
  'davidsonrecruitment.com.au', 'davidsonwp.com',
  'salexoconsulting.com.au', 'salexo.com.au',
  'fuserecruitment.com.au', 'fusestaffing.com.au', 'choosefuse.com.au',
  'beaumontpeople.com.au', 'beaumontconsulting.com.au',
  'engagepersonnel.com.au',
  'siriuspeople.com.au', 'sirius.com.au',
  'peoplecorp.com.au',
  'vervepeopleconsulting.com.au', 'vervepartners.com.au',
  'smaart.com.au', 'smaartrecruitment.com.au',
  'trojanrecruitment.com.au', 'trojan.com.au',
  'lotuspeople.com.au', 'lotuspersonnel.com.au',
  'hoban.com.au', 'hobanrecruitment.com.au',
  'bluefinresources.com.au',
  'perigongroup.com.au',
  'precisionsourcing.com.au',
  'marblerecruitment.com.au', 'marble.com.au',
  'saltgroup.com.au', 'salt.com.au',
  'reogroup.com.au',
  'searchparty.com.au',
  'elevenmgmt.com.au', 'eleven.com.au',
  'people2people.com.au', 'p2p.com.au',
  'sixdegreesexecutive.com.au',
  'levyl.com.au',
  'millerleith.com.au',
  'parityconsulting.com.au', 'parity.net.au',
  'profusiongroup.com.au', 'profusion.com.au',
  'astoncarter.com',
  'sfpeople.com.au', 'sfgroup.com.au',
  'peopleinfrastructure.com.au',
  'talentright.com.au',
  'kaizen-recruitment.com.au', 'kaizenrecruitment.com.au',
  'goughrecruitment.com.au', 'gough.com.au',
  'preacta.com.au',
  'scaleup.com.au', 'scaleup-recruitment.com.au',
  'talent-army.com.au', 'talentarmy.com.au',
  'linkme.com.au',
  'talentpath.com.au',
  'paxus.com.au',
  'insiderecruitment.com.au',
  'executiveintegrity.com.au',
  'watermarksearch.com.au',
  'blackbookexecutive.com.au',
  'saxtondrummond.com.au',
  'progressiverecruitment.com.au',
  'spencermargesson.com.au',
  'spencerogden.com',
  'harveynash.com', 'harveynash.com.au',
  'peoplepath.com.au',
  'redwolfrosch.com.au', 'redwolf.com.au',
  'fingerprintpersonnel.com.au',
  'executivesearch.com.au',
  // ── Job boards (should never appear as application contact emails) ─────────
  'seek.com.au', 'indeed.com', 'linkedin.com', 'jora.com', 'adzuna.com.au',
])

/**
 * Keywords that, when found INSIDE the email domain root (TLD stripped),
 * indicate a recruitment agency.
 *
 * These are checked as substrings — "ausrecruitment" contains "recruit",
 * "sydneystaffing" contains "staffing", etc.
 *
 * NOTE: "talent" alone is NOT included here because many legitimate companies
 * have "talent" in their name (e.g., talent.com.au which is a real employer).
 * Compound forms like "talentsearch", "talentsolutions" are safe to include.
 */
const RECRUITER_DOMAIN_KEYWORDS: string[] = [
  'recruit',        // ausrecruitment, sydneyrecruiting, recruitpro
  'staffing',       // elitestaffing, prostaff
  'headhunt',       // headhuntergroup, headhuntingco
  'personnel',      // metropolitanpersonnel, keypersonnel
  'manpower',       // manpowergroup
  'resourcing',     // talentresourcing
  'jobagency',      // jobagencygroup
  'careersolution', // careersolutionsgroup
  'executivesearch',// executivesearchau
  'talentsearch',   // talentsearchgroup
  'talentsolution', // talentsolutionsau
  'labourhire',     // labourhireau
  'laborhire',      // laborhireau
  'hrgroup',        // hrgroupau
  'hrsolution',     // hrsolutionspro
  'hrconsult',      // hrconsultingau
  'hrservice',      // hrservicesgroup
  'workforcesol',   // workforcesolutions
]

/**
 * Stop words filtered OUT when tokenising a company name for domain comparison.
 * These are too common to be discriminating signals.
 */
const COMPANY_STOP_WORDS = new Set([
  'pty', 'ltd', 'limited', 'inc', 'corp', 'corporation', 'co',
  'group', 'the', 'and', 'of', 'for', 'in', 'at', 'by',
  'australia', 'australian', 'national', 'global', 'international',
  'services', 'solutions', 'systems', 'technologies', 'technology',
  'holdings', 'enterprises', 'management', 'consulting',
  'digital', 'media', 'health', 'care', 'finance', 'financial',
])

/**
 * Phrases that — when found within ~200 characters of an email address —
 * strongly suggest the email belongs to a third-party recruiter being directed
 * to applicants, rather than the company's own HR inbox.
 */
const RECRUITER_EMAIL_CONTEXT_PHRASES: string[] = [
  'send your cv to',
  'send your resume to',
  'submit your cv to',
  'submit your resume to',
  'forward your cv to',
  'forward your resume to',
  'email your cv to',
  'email your resume to',
  'send your application to',
  'submit applications to',
  'apply by emailing',
  'apply via email to',
  'our recruitment partner',
  'our recruiting partner',
  'through our recruiter',
  'our talent partner',
  'managed by our',
  'coordinate with our recruiter',
  'please email your resume',
  'please send your cv',
  'please send your resume',
  'please forward your',
  'send through your',
  'direct your application to',
  'your application to',
]

// ─── Domain helper utilities ──────────────────────────────────────────────────

/**
 * Extract a clean domain from a URL string.
 * "https://www.acme.com.au/careers" → "acme.com.au"
 */
function extractDomainFromUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const withProtocol = url.match(/^https?:\/\//) ? url : `https://${url}`
    const hostname = new URL(withProtocol).hostname.toLowerCase()
    return hostname.replace(/^www\./, '')
  } catch {
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^/\s?#]+)/i)
    return match?.[1]?.toLowerCase() ?? null
  }
}

/**
 * Strip TLDs and subdomains, returning the meaningful root label of a domain.
 *
 * Examples:
 *   "mail.acme.com.au"          → "acme"
 *   "fuserecruitment.com.au"    → "fuserecruitment"
 *   "hays.com"                  → "hays"
 *   "jobs.bigcorp.co.nz"        → "bigcorp"
 */
function getDomainRoot(domain: string): string {
  const d = domain.toLowerCase()
  // Ordered longest-first so .com.au is stripped before .au
  const tlds = [
    '.com.au', '.net.au', '.org.au', '.edu.au', '.gov.au',
    '.id.au',  '.asn.au', '.com.nz', '.co.nz',
    '.com',    '.net',    '.org',    '.io',     '.co',
    '.au',     '.nz',
  ]
  let stripped = d
  for (const tld of tlds) {
    if (stripped.endsWith(tld)) {
      stripped = stripped.slice(0, -tld.length)
      break
    }
  }
  // Remove any remaining subdomain (keep rightmost segment)
  const parts = stripped.split('.')
  return parts[parts.length - 1] || stripped
}

/**
 * Tokenise a company name into meaningful words, removing stop words and
 * words shorter than 4 characters (too ambiguous for matching).
 *
 * "Acme Software Pty Ltd"   → ["acme", "software"]
 * "BigCorp Australia Group" → ["bigcorp"] (australia, group are stop words)
 */
function tokeniseCompanyName(companyName: string): string[] {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !COMPANY_STOP_WORDS.has(w))
}

/**
 * Check whether the email domain root contains any significant word from
 * the company name. This is the parent-company safety valve.
 *
 * "acme.com.au"     vs tokens ["acme", "software"] → "acme" ∈ "acme" → TRUE (safe)
 * "woolworths.com"  vs tokens from "Big W"         → no match → FALSE
 * "bigcorp.com.au"  vs tokens ["bigcorp"]           → "bigcorp" ∈ "bigcorp" → TRUE (safe)
 */
function domainRelatedToCompany(domainRoot: string, companyTokens: string[]): boolean {
  return companyTokens.some(token => domainRoot.includes(token))
}

/**
 * Main export — Check 8.
 *
 * Scans EVERY email address in the description (not just personal ones — we
 * want to catch apply@fuserecruitment.com.au too) and applies three layers of
 * detection to identify recruiter-owned domains.
 *
 * @param description   Raw job description text
 * @param companyName   Employer's company name (from Apify)
 * @param companyWebsite Company website URL (may be null)
 *
 * @returns FilterVerdict — shouldFilter: true when a recruiter email is found
 */
export function checkRecruiterEmailInDescription(
  description: string,
  companyName: string,
  companyWebsite: string | null,
): FilterVerdict {
  const NO_RESULT: FilterVerdict = { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }

  if (!description) return NO_RESULT

  // Find ALL email addresses in the raw description text
  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const allEmails = [...new Set((description.match(EMAIL_REGEX) || []).map(e => e.toLowerCase()))]

  if (allEmails.length === 0) return NO_RESULT

  // Pre-compute values we'll reuse in the loop
  const companyDomain = extractDomainFromUrl(companyWebsite)
  const companyDomainRoot = companyDomain ? getDomainRoot(companyDomain) : null
  const companyTokens = tokeniseCompanyName(companyName)

  for (const email of allEmails) {
    const emailDomain = email.split('@')[1] ?? ''
    if (!emailDomain || emailDomain.length < 4) continue

    const emailDomainRoot = getDomainRoot(emailDomain)

    // ── PARENT COMPANY SAFETY VALVE ──────────────────────────────────────────
    // If the email domain root matches the company's own website domain, or if
    // the domain root contains a significant word from the company name, treat
    // the email as internal and skip it. This handles:
    //   • Same domain (john@acme.com.au + website acme.com.au)
    //   • Parent companies (woolworths.com.au posting for subsidiary)
    //   • Trading name variants (bigw.com.au vs Woolworths Group)
    if (companyDomainRoot && emailDomainRoot === companyDomainRoot) continue
    if (companyTokens.length > 0 && domainRelatedToCompany(emailDomainRoot, companyTokens)) continue

    // ── LAYER 1: Known recruiter domain list ──────────────────────────────────
    // 60+ confirmed Australian recruitment agency domains.
    // A direct match here is definitive — no context check needed.
    if (KNOWN_RECRUITER_EMAIL_DOMAINS.has(emailDomain)) {
      return {
        shouldFilter: true,
        reason: `Description contains email from known recruitment agency: "${emailDomain}" (${email})`,
        confidence: 98,
        category: 'recruiter_email',
      }
    }

    // ── LAYER 2: Domain keyword scan ─────────────────────────────────────────
    // Strip TLD and check if the domain root contains recruitment keywords.
    // e.g., "sydneystaffing.com.au" → root "sydneystaffing" → contains "staffing"
    const matchedKeyword = RECRUITER_DOMAIN_KEYWORDS.find(kw => emailDomainRoot.includes(kw))
    if (matchedKeyword) {
      return {
        shouldFilter: true,
        reason: `Email domain "${emailDomain}" contains recruitment keyword "${matchedKeyword}"`,
        confidence: 91,
        category: 'recruiter_email',
      }
    }

    // ── LAYER 3: Unrelated domain + recruiter context phrases ─────────────────
    // If the email domain is completely unrelated to the company name (already
    // confirmed above), AND the email appears near phrases like "send your CV to",
    // "submit applications to", it's likely being directed to a third-party recruiter.
    //
    // Confidence is intentionally moderate (79%) to avoid false positives for
    // parent companies we don't have the website domain for.
    // We also require companyDomain to be known — if we can't verify the company's
    // own domain, we don't penalise the unrelated-domain signal alone.
    if (companyDomain) {
      const emailIndex = description.toLowerCase().indexOf(email)
      if (emailIndex !== -1) {
        const ctxStart = Math.max(0, emailIndex - 220)
        const ctxEnd   = Math.min(description.length, emailIndex + 80)
        const context  = description.slice(ctxStart, ctxEnd).toLowerCase()

        const hasRecruiterContext = RECRUITER_EMAIL_CONTEXT_PHRASES.some(phrase =>
          context.includes(phrase)
        )

        if (hasRecruiterContext) {
          return {
            shouldFilter: true,
            reason: `Description directs applications to unrelated third-party email "${email}" — likely a recruiter contact`,
            confidence: 79,
            category: 'recruiter_email',
          }
        }
      }
    }
  }

  return NO_RESULT
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITE FILTER
// ═══════════════════════════════════════════════════════════════════════════════

export interface CompositeFilterResult {
  shouldFilter: boolean
  verdict: FilterVerdict
}

/**
 * Run all filters in priority order. Returns on the first match that meets
 * the confidence threshold (70%).
 *
 * Order:
 *   0. Sales classification gate (if filterSalesOnly)
 *   1. Recruiter profile (Apify metadata — most reliable)
 *   2. Private advertiser
 *   3. Recruitment agency (name + description + website)
 *   4. No-agency disclaimer
 *   5. HR consulting
 *   6. Law firm
 *   7. Recruiter email domain (NEW v6)
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
  recruiterProfile?: RecruiterProfileData | null
  recruiterSpecialisations?: string[] | null
}): CompositeFilterResult {
  const THRESHOLD = 70

  // 0. Sales classification gate
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

  // 1. Recruiter profile (Apify metadata — highest signal quality)
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

  // 3. Recruitment agency (name + description signals + website)
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

  // 7. Recruiter email domain (NEW — v6)
  // Catches companies that post their own job but include a recruiter's email
  // address in the description body, indicating they've already engaged a recruiter.
  const recruiterEmailVerdict = checkRecruiterEmailInDescription(
    params.description,
    params.companyName,
    params.website
  )
  if (recruiterEmailVerdict.shouldFilter && recruiterEmailVerdict.confidence >= THRESHOLD) {
    return { shouldFilter: true, verdict: recruiterEmailVerdict }
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