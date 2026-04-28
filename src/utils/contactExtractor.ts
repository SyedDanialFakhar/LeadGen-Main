/**
 * LETHAL RECRUITER & AGENCY FILTER — v8
 * ──────────────────────────────────────────────────────────────────────────────
 * FULL CHANGE-LOG (all versions summarised here for reference)
 *
 * v8 NEW — Check 9: External Recruiter Text-Phrase Detection
 *   Problem: A company posts their own job on Seek, passes every name/description
 *   filter, but in the "How to Apply" section writes:
 *     "Please contact our external HR Consultant for more details."
 *     "For further information contact our recruiter directly."
 *     "This role is managed by an external search consultant."
 *   This proves the company has ALREADY hired an outside recruiter to fill the
 *   role — they are NOT seeking agency approaches, they've already engaged one.
 *   Dead lead — do not waste outreach on this employer.
 *
 *   Fix — EXTERNAL_RECRUITER_TEXT_SIGNALS list (35+ phrases).
 *   Checked against the FULL description (these phrases appear anywhere).
 *   One match → filter with 93% confidence.
 *   These phrases are linguistically impossible for a direct employer to write
 *   unless they have literally hired an external person for this.
 *
 * v7 — Personal email overhaul + Check 8 (recruiter email domain) safety fixes.
 * v6 — Check 8: recruiter email domain detection (Layer 1/2/3).
 * v5 — v4 bug-fix: 600-char window expanded; referral bonus signals; trailing signals.
 * v4 — HR multi-word phrases; extractEmails personal-only filtering.
 * v3 — Recruiter profile check (Apify metadata, highest priority).
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
  | 'external_recruiter'
  | 'pass'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lc(s: string): string {
  return s.toLowerCase()
}

function findMatches(text: string, terms: string[]): string[] {
  const t = lc(text)
  return terms.filter((term) => t.includes(lc(term)))
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONAL EMAIL DETECTION — v7 (unchanged in v8)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Full exhaustive list of generic/role email prefixes.
 * Exact-match against the whole prefix before @.
 * Compound detection (e.g. "hr.manager") is handled by DEFINITIVE_GENERIC_SEGMENTS.
 */
const GENERIC_EMAIL_PREFIXES: Set<string> = new Set([
  // Greetings / generic contact
  'info', 'information', 'hello', 'hi', 'hey', 'greetings',
  'contact', 'contactus', 'contact-us', 'contactme',
  'getintouch', 'get-in-touch', 'reachout', 'reach-out', 'reachme',
  'connect', 'connectwithus', 'letsconnect', 'touch',
  'enquiries', 'enquiry', 'inquiries', 'inquiry', 'enquire',
  'general', 'general-enquiries', 'generalenquiries', 'generalinfo',
  // Admin / Office
  'admin', 'administration', 'administrator',
  'office', 'officeadmin', 'frontoffice', 'front-office',
  'reception', 'receptionist', 'front-desk', 'frontdesk',
  'secretary', 'pa', 'ea',
  'mail', 'email', 'post', 'postmaster', 'mailbox',
  'noreply', 'no-reply', 'donotreply', 'do-not-reply', 'donot',
  // HR / People / Culture
  'hr', 'hrd', 'hrteam', 'hr-team', 'hrmanager', 'hr-manager',
  'hrdirector', 'hradmin', 'hroffice', 'hrdesk', 'hrhelp',
  'humanresources', 'human-resources', 'human.resources', 'humanresource',
  'people', 'peopleteam', 'people-team', 'peopleops', 'people-ops',
  'peopleandculture', 'people-and-culture', 'peopleanddevelopment',
  'peoplexp', 'peopleexperience', 'people-experience',
  'culture', 'cultureclub', 'workculture',
  'talentteam', 'talent-team', 'talentops', 'talent-ops',
  'talentacquisition', 'talent-acquisition', 'talentmanagement',
  'talentadmin', 'talentandculture',
  'workforce', 'workforceplanning', 'workforcemanagement',
  'employeeexperience', 'employee-experience', 'employeeops',
  'employeerelations', 'employee-relations',
  // Recruitment / Hiring
  'recruitment', 'recruit', 'recruiting', 'recruiter', 'recruiters',
  'recruits', 'recruitteam', 'recruit-team',
  'hiring', 'hire', 'hireaus', 'hireteam', 'hire-team',
  'talent', 'talentsourcing', 'talentsearch',
  'staffing', 'staffingteam',
  'placements', 'placement',
  'resourcing', 'resourceteam',
  // Job application
  'apply', 'applications', 'application', 'applyhere', 'applynow',
  'applyonline', 'applytoday', 'applydirect', 'apply-now', 'apply-here',
  'jobs', 'job', 'jobinfo', 'jobsau', 'jobsaustralia',
  'careers', 'career', 'careerinfo', 'careersau', 'careersaustralia',
  'careersinfo', 'careeradvice', 'careersteam', 'career-team',
  'opportunities', 'opportunity', 'openroles', 'openpositions',
  'vacancies', 'vacancy', 'positions', 'position',
  'joinourteam', 'join-our-team', 'jointheteen', 'jointeam',
  'join', 'joinus', 'join-us', 'comejoin',
  'workwithus', 'work-with-us', 'workforus', 'workhq',
  'resumes', 'resume', 'cv', 'cvs', 'sendcv', 'sendresume',
  'submitcv', 'submitresume',
  // Departments
  'sales', 'salesteam', 'sales-team', 'salesdesk', 'salesadmin',
  'marketing', 'marketingteam', 'digital', 'digitalteam',
  'accounts', 'accounting', 'accountsteam',
  'finance', 'financeteam', 'financeadmin',
  'billing', 'billingteam',
  'payroll', 'payrollteam',
  'operations', 'ops', 'opsteam', 'operationsteam',
  'support', 'supports', 'help', 'helpdesk', 'helpcenter',
  'customerservice', 'customer-service', 'customersupport', 'customercare',
  'service', 'services',
  'legal', 'legalteam', 'compliance', 'complianceteam',
  'procurement', 'purchasing', 'purchasing-team',
  'logistics', 'logisticsteam',
  'tech', 'techteam', 'technology', 'technical', 'techsupport',
  'it', 'itteam', 'itsupport', 'itdesk', 'ithelp',
  'webmaster', 'web', 'webteam', 'website',
  'devops', 'dev', 'developers',
  'data', 'datateam',
  'security', 'infosec', 'cybersecurity',
  // Communications / PR
  'news', 'newsletter', 'newsletters', 'updates', 'notifications',
  'press', 'media', 'mediateam', 'pr', 'prteam', 'publicrelations',
  'communications', 'comms', 'commsteam', 'media-enquiries',
  'investor', 'investors', 'investorrelations',
  'partners', 'partnerships', 'business-enquiries',
  // Misc
  'management', 'manager', 'managers',
  'staff', 'staffteam',
  'team', 'theteam', 'ourteam',
  'privacy', 'abuse', 'report', 'reporting',
  'feedback', 'feedbackteam', 'suggestions',
  'accommodations', 'accessibility', 'diversity', 'inclusion',
  'reasonableaccommodations',
  'eoi', 'expressions', 'expressionofinterest',
  'submissions', 'submission',
  'unsubscribe',
])

/**
 * When ANY dot/dash/underscore-separated segment of the prefix matches one of
 * these words, the email is generic regardless of what else is in the prefix.
 * Examples caught: recruitment.team@, people.culture@, hr.manager@, jobs.au@
 */
const DEFINITIVE_GENERIC_SEGMENTS: Set<string> = new Set([
  'hr', 'hrd',
  'recruitment', 'recruit', 'recruiting', 'recruiter',
  'hiring', 'hire',
  'careers', 'career',
  'jobs', 'job',
  'apply', 'application', 'applications',
  'resume', 'resumes', 'cv', 'cvs',
  'talent', 'staffing',
  'people', 'culture',
  'humanresources',
  'admin', 'administration',
  'office', 'reception', 'receptionist',
  'info', 'information',
  'contact', 'enquiries', 'enquiry', 'inquiries',
  'general', 'mail', 'noreply',
  'support', 'helpdesk', 'help',
  'team', 'staff',
  'manager', 'management',
  'operations', 'ops',
  'finance', 'accounts', 'billing', 'payroll',
  'sales', 'marketing',
  'legal', 'compliance',
  'opportunities', 'vacancy', 'vacancies', 'positions',
  'join', 'work',
  'feedback', 'privacy', 'security',
  'media', 'press', 'news',
  'tech', 'technical', 'it',
])

/** Prefixes that can NEVER be a real person — system/role/test addresses. */
const NEVER_PERSONAL_PATTERNS: RegExp[] = [
  /\d{3,}/,           // 3+ consecutive digits
  /^[a-z]{1,2}$/,     // 1-2 char prefix
  /^test/i, /^demo/i, /^bot/i, /^api/i,
  /^system/i, /^automated/i,
  /^notifications?/i, /^alert/i,
  /^no[_.-]?reply/i,  /^do[_.-]?not/i,
]

/**
 * Positive name-shape patterns. After passing all negative checks, the prefix
 * must match one of these to be considered a real person's email.
 * Accepts: john, sarah.jones, j.smith, sarah_jones, j.r.smith, sarah.j, john2
 */
const NAME_SHAPE_PATTERNS: RegExp[] = [
  /^[a-z]{2,20}[._-][a-z]{2,20}$/,   // firstname.lastname / firstname_lastname
  /^[a-z]\.[a-z]{3,20}$/,            // f.lastname
  /^[a-z]{3,20}\.[a-z]$/,            // firstname.l
  /^[a-z]\.[a-z]\.[a-z]{3,20}$/,     // f.m.lastname
  /^[a-z]{3,15}$/,                   // firstname only (3–15 chars)
  /^[a-z]{3,15}\d{1}$/,              // firstname + single digit (john2)
]

/**
 * Core personal email check.
 * Used by extractEmails() to filter contact lists — only personal name-based
 * emails make it through. Rejects all generic/role/department addresses.
 */
export function isPersonalEmail(email: string): boolean {
  const prefix = email.split('@')[0]?.toLowerCase() ?? ''
  if (!prefix || prefix.length < 2) return false

  // 1. Never-personal system patterns
  for (const p of NEVER_PERSONAL_PATTERNS) {
    if (p.test(prefix)) return false
  }

  // 2. Exact match in generic list
  if (GENERIC_EMAIL_PREFIXES.has(prefix)) return false

  // 3. Starts-with generic (careers.au@, hr-team@, jobsinfo@)
  for (const generic of GENERIC_EMAIL_PREFIXES) {
    if (
      prefix.startsWith(generic + '.') ||
      prefix.startsWith(generic + '-') ||
      prefix.startsWith(generic + '_') ||
      prefix.startsWith(generic + '+') ||
      (prefix.startsWith(generic) &&
        prefix.length <= generic.length + 4 &&
        !/^[a-z]$/.test(prefix[generic.length] ?? ''))
    ) {
      return false
    }
  }

  // 4. Segment-based generic check (recruitment.team@, people.culture@)
  const segments = prefix.split(/[._\-+]/).filter(s => s.length >= 2)
  for (const seg of segments) {
    if (DEFINITIVE_GENERIC_SEGMENTS.has(seg)) return false
  }

  // 5. Positive name-shape gate (must look like a real person's name)
  return NAME_SHAPE_PATTERNS.some(p => p.test(prefix))
}

/** Extract only personal (name-based) emails from text. */
export function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  return [...new Set(text.match(emailRegex) || [])].filter(isPersonalEmail)
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
  'external', 'internal', 'independent', 'consultant', 'partner',
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
// CHECK 0: Recruiter Profile (Apify metadata — highest priority)
// ═══════════════════════════════════════════════════════════════════════════════

export function checkRecruiterProfile(
  recruiterProfile: RecruiterProfileData | null | undefined,
  recruiterSpecialisations?: string[] | null
): FilterVerdict {
  if (!recruiterProfile) return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
  if (Object.keys(recruiterProfile).length === 0) return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }

  if (isRealValue(recruiterProfile.name)) {
    const a = isRealValue(recruiterProfile.agencyName) ? ` (${recruiterProfile.agencyName})` : ''
    return { shouldFilter: true, reason: `Job posted by recruiter: "${recruiterProfile.name}"${a}`, confidence: 100, category: 'recruiter_profile' }
  }
  if (isRealValue(recruiterProfile.agencyName)) {
    return { shouldFilter: true, reason: `Job posted by recruitment agency: "${recruiterProfile.agencyName}"`, confidence: 99, category: 'recruiter_profile' }
  }
  if (isRealValue(recruiterProfile.agencyWebsite)) {
    return { shouldFilter: true, reason: `Job posted through recruiter website: "${recruiterProfile.agencyWebsite}"`, confidence: 97, category: 'recruiter_profile' }
  }
  if (Array.isArray(recruiterSpecialisations) && recruiterSpecialisations.length > 0) {
    return { shouldFilter: true, reason: `Job posted by recruiter with specialisations: ${recruiterSpecialisations.slice(0, 2).join(', ')}`, confidence: 96, category: 'recruiter_profile' }
  }
  if (isRealValue(recruiterProfile.placementCount)) {
    const c = Number(recruiterProfile.placementCount)
    if (!isNaN(c) && c > 0) return { shouldFilter: true, reason: `Job posted by recruiter with ${c} Seek placements`, confidence: 95, category: 'recruiter_profile' }
  }
  if (isRealValue(recruiterProfile.reviewCount)) {
    const c = Number(recruiterProfile.reviewCount)
    if (!isNaN(c) && c > 0) return { shouldFilter: true, reason: `Job posted by recruiter with ${c} Seek reviews`, confidence: 93, category: 'recruiter_profile' }
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
  'talentbay', 'talent bay', 'placed recruitment', 'sharp & carter',
  'sharp and carter', 'davidson recruitment', 'spencer ogden',
  'cts recruitment', 'salexo consulting', 'sales focus', 'on q recruitment',
  'pulse staffing', 'recruitment edge', 'resource solutions',
  'horner recruitment', 'sportspeople', 'miller leith', 'profusion group',
  'preacta recruitment', 'scaleup recruitment', 'levyl',
  'beaumont people', 'beaumont consulting', 'engage personnel',
  'lawson elliot', 'lawson & elliot', 'peoplecorp', 'people corp',
  'talent web', 'talentweb', 'parity consulting', 'capability group',
  'careerone', 'career one', 'trojan recruitment', 'trojan staffing',
  'veritas recruitment', 'sirius people', 'watermark search',
  'lotus people', 'verve partners', 'smaart recruitment',
  'hoban recruitment', 'aston carter', 'harvey nash', 'allegis group',
  'sf people', 'sf recruitment', 'people infrastructure',
  'peak talent', 'peak recruitment', 'recruitment solutions',
  'atlas recruitment', 'pronto recruitment', 'momentum consulting',
  'momentum recruitment', 'people collective', 'people connect',
  'talent right', 'talent focus', 'talent connect', 'talent search',
  'talent scout', 'talent link', 'talent now', 'talent army',
  'bluefin resources', 'blue fin resources', 'go recruitment',
  'link recruitment', 'link talent', 'impact talent', 'impact recruitment',
  'core talent', 'cornerstone recruitment', 'oxygen recruitment',
  'red wolf group', 'fuse recruitment', 'fuse staffing', 'fuse talent',
  'redwolf + rosch', 'redwolf rosch', 'tiger recruitment', 'tiger staffing',
  'green bay recruitment', 'eleven recruitment', 'kaizen recruitment',
  'marble recruitment', 'reo group', 'search party', 'fetch recruitment',
  'ivy recruitment', 'byronhurst', 'blackbook executive',
  'precision sourcing', 'perigon group', 'saxton drummond', 'execucare',
  'limerence talent', 'limerence recruitment', 'salted talent',
  'tss talent', 'salt agency', 'salt recruitment',
  'people path', 'people source', 'people plus',
  'people2people recruitment', 'found careers', 'talent scout australia',
  'seek talent solutions', 'new recruitment', 'now recruitment',
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
  'people solutions', 'people group', 'talent group', 'talent agency', 'search firm',
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
  'we are partnering with a', 'recruited by',
  'this role has been exclusively', 'this search is being',
  'this position is being managed by',
  'as a specialist recruiter', 'as a leading recruitment',
  'as a boutique recruitment', 'we are a recruitment',
  'we specialise in placing', 'we specialise in recruiting',
  'our specialist recruitment', 'our recruitment team',
  'our experienced recruitment', 'our team of recruiters',
  'working with our client base', 'we are partnering with', 'we partner with',
  'for a confidential discussion', 'confidential discussion',
  'if you would like a confidential', 'for a confidential chat',
  'we are exclusively recruiting', 'exclusively recruiting for',
  'partnered exclusively with', 'our client, an award',
  'this role sits within a confidential', 'the business is a',
  'our client operates', 'the organisation is seeking',
  'we are working with a leading', 'we have been engaged by',
  'we are engaged by', 'retained by', 'our retained client',
]

const AGENCY_BODY_SIGNALS: string[] = [
  'registering for future roles', 'submit your resume to our talent pool',
  'connect with our recruitment team', 'join our talent community',
  'talent community', 'we specialise in recruitment for',
  'we are a leading recruitment', 'our recruitment consultants',
  'our team of recruitment', 'speak with one of our consultants',
  'our consultants specialise', 'we match candidates',
  'placing candidates', 'we place candidates', 'sourcing top talent',
]

const AGENCY_TRAILING_SIGNALS: string[] = [
  "refer them to us and we'll give you", "refer them to us and we will give you",
  'refer a friend and receive', 'referral fee of $', 'referral bonus of $',
  '$500 if we find them a new role', '$500 referral', 'referral reward',
  "we'll give you $", 'refer your friends and earn',
  'know someone looking for a job? refer', 'if you know someone looking for a job',
  'we specialise in recruitment for the',
  'actively source for a broad range of established clients',
  'register your details with us', 'register your resume with us',
  'add your resume to our database', 'we have a database of',
  'only shortlisted candidates will be contacted',
  'only successful candidates will be contacted',
  'please note: only shortlisted',
  '#choose fuse', '#choose people2people', '#choose hays',
  '#choose randstad', '#choose robert half',
]

export function checkRecruitmentAgency(
  companyName: string,
  advertiserName: string,
  description: string,
  website: string | null
): FilterVerdict {
  const nameText = `${companyName} ${advertiserName}`

  const knownMatch = KNOWN_AGENCIES.find((a) => lc(nameText).includes(lc(a)))
  if (knownMatch) return { shouldFilter: true, reason: `Known recruitment agency: "${knownMatch}"`, confidence: 98, category: 'recruitment_agency' }

  if (AGENCY_NAME_WORD_REGEX.test(companyName)) {
    const m = companyName.match(AGENCY_NAME_WORD_REGEX)?.[0] || ''
    return { shouldFilter: true, reason: `Company name contains recruitment keyword: "${m}"`, confidence: 94, category: 'recruitment_agency' }
  }
  if (AGENCY_NAME_WORD_REGEX.test(advertiserName)) {
    const m = advertiserName.match(AGENCY_NAME_WORD_REGEX)?.[0] || ''
    return { shouldFilter: true, reason: `Advertiser name contains recruitment keyword: "${m}"`, confidence: 93, category: 'recruitment_agency' }
  }

  const nameSignals = findMatches(nameText, AGENCY_NAME_PHRASES)
  if (nameSignals.length >= 1) return { shouldFilter: true, reason: `Company name suggests agency: "${nameSignals[0]}"`, confidence: 88, category: 'recruitment_agency' }

  const introSignals = findMatches(description.slice(0, 900), AGENCY_INTRO_SIGNALS)
  if (introSignals.length >= 2) return { shouldFilter: true, reason: `Multiple agency intro phrases: "${introSignals[0]}", "${introSignals[1]}"`, confidence: 96, category: 'recruitment_agency' }
  if (introSignals.length === 1) return { shouldFilter: true, reason: `Agency intro phrase: "${introSignals[0]}"`, confidence: 88, category: 'recruitment_agency' }

  const bodySignals = findMatches(description, AGENCY_BODY_SIGNALS)
  if (bodySignals.length >= 2) return { shouldFilter: true, reason: `Multiple agency body phrases: "${bodySignals[0]}", "${bodySignals[1]}"`, confidence: 85, category: 'recruitment_agency' }

  const trailingSignals = findMatches(description, AGENCY_TRAILING_SIGNALS)
  if (trailingSignals.length >= 1) return { shouldFilter: true, reason: `Agency trailing signal: "${trailingSignals[0]}"`, confidence: 95, category: 'recruitment_agency' }

  if (/#(?:SCR|scr)-[a-zA-Z]/.test(description)) {
    const m = description.match(/#(?:SCR|scr)-[a-zA-Z][^\s]*/)?.[0] || '#SCR-...'
    return { shouldFilter: true, reason: `Seek recruiter tracking hashtag: ${m}`, confidence: 97, category: 'recruitment_agency' }
  }
  if (/#[Cc]hoose\s+\w/.test(description)) {
    const m = description.match(/#[Cc]hoose\s+\w[^\s<]*/)?.[0] || '#Choose ...'
    return { shouldFilter: true, reason: `Seek agency hashtag: ${m}`, confidence: 96, category: 'recruitment_agency' }
  }
  if (website && isRecruitmentWebsite(website)) {
    return { shouldFilter: true, reason: `Company website indicates recruitment firm: ${website}`, confidence: 85, category: 'recruitment_website' }
  }

  return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
}

export function isRecruitmentAgency(companyName: string, advertiserName?: string): boolean {
  return checkRecruitmentAgency(companyName, advertiserName || '', '', null).shouldFilter
}

export function hasRecruitmentIntro(description: string): boolean {
  const v = checkRecruitmentAgency('', '', description, null)
  return v.shouldFilter && v.category === 'recruitment_agency' && v.confidence >= 80
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 2: No-Agency Disclaimer
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
  'we are managing this search internally', 'this role is being filled internally',
  'we have engaged a preferred supplier', 'we have preferred recruitment suppliers',
  'we have an approved supplier list', 'no agency approaches',
  'agency approaches will not be accepted', 'we are not accepting agency',
]

export function checkNoAgencyDisclaimer(description: string): FilterVerdict {
  const matches = findMatches(description, NO_AGENCY_PHRASES)
  if (matches.length === 0) return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
  return { shouldFilter: true, reason: `Job explicitly blocks agencies: "${matches[0]}"`, confidence: 97, category: 'no_agency_disclaimer' }
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
  'we provide hr services to', 'hr consulting firm', 'our hr consultants',
  'outsourced hr', 'fractional hr', 'interim hr',
  'we help businesses manage their hr', 'hr business partner services',
  'we provide people & culture',
]

export function checkHRConsulting(companyName: string, description: string): FilterVerdict {
  const nameMatches = findMatches(companyName, HR_COMPANY_SIGNALS)
  if (nameMatches.length >= 2) return { shouldFilter: true, reason: `Company name suggests HR consultancy: "${nameMatches.slice(0, 2).join(', ')}"`, confidence: 88, category: 'hr_consulting' }
  if (nameMatches.length === 1) {
    const descMatches = findMatches(description, HR_DESCRIPTION_SIGNALS)
    if (descMatches.length > 0) return { shouldFilter: true, reason: `HR consultancy: name "${nameMatches[0]}" + description confirms`, confidence: 82, category: 'hr_consulting' }
    return { shouldFilter: true, reason: `Company name suggests HR consultancy: "${nameMatches[0]}"`, confidence: 65, category: 'hr_consulting' }
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

export function checkLawFirm(companyName: string, jobTitle: string, description: string, website?: string | null): FilterVerdict {
  if (LAW_FIRM_PATTERN.test(companyName)) {
    const desc = findMatches(description, LAW_DESCRIPTION_TERMS)
    if (desc.length > 0) return { shouldFilter: true, reason: `Law firm: "${companyName}" + description confirms legal practice`, confidence: 93, category: 'law_firm' }
    return { shouldFilter: true, reason: `Company name suggests law firm: "${companyName}"`, confidence: 72, category: 'law_firm' }
  }
  const nameMatches = findMatches(companyName, LAW_FIRM_NAME_SIGNALS)
  if (nameMatches.length > 0) return { shouldFilter: true, reason: `Company name contains legal term: "${nameMatches[0]}"`, confidence: 78, category: 'law_firm' }
  const combined = `${companyName} ${jobTitle} ${description.slice(0, 500)} ${website || ''}`
  const descMatches = findMatches(combined, LAW_FIRM_DESCRIPTION_SIGNALS)
  if (descMatches.length >= 2) return { shouldFilter: true, reason: `Description indicates law firm: "${descMatches.slice(0, 2).join(', ')}"`, confidence: 80, category: 'law_firm' }
  return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
}

export function isLawFirmRelated(companyName: string, jobTitle: string, description: string, website?: string | null): boolean {
  return checkLawFirm(companyName, jobTitle, description, website).shouldFilter
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 5: Private Advertiser
// ═══════════════════════════════════════════════════════════════════════════════

export function checkPrivateAdvertiser(advertiserName?: string, isPrivate?: boolean): FilterVerdict {
  if (isPrivate === true) return { shouldFilter: true, reason: 'Marked as private advertiser by Seek', confidence: 99, category: 'private_advertiser' }
  if (!advertiserName) return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
  const exactPrivate = ['Private Advertiser', 'Confidential', 'Confidential Company', 'Anonymous']
  if (exactPrivate.includes(advertiserName)) return { shouldFilter: true, reason: `Advertiser listed as "${advertiserName}"`, confidence: 99, category: 'private_advertiser' }
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
  return RECRUITMENT_WEBSITE_KEYWORDS.some((kw) => lc(website).includes(kw))
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 7: Sales Classification
// ═══════════════════════════════════════════════════════════════════════════════

export function isSalesJob(classification: string): boolean {
  return !!classification && lc(classification).includes('sales')
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 8: Recruiter Email Domain Detection (v7 — unchanged in v8)
// ──────────────────────────────────────────────────────────────────────────────
// Catches a company that posts its own job but embeds a recruiter's email in
// the description body — proving they've engaged a third-party recruiter.
// Three layers; Layers 2+3 require confirmed domain mismatch (zero false positives).
// ═══════════════════════════════════════════════════════════════════════════════

const KNOWN_RECRUITER_EMAIL_DOMAINS: Set<string> = new Set([
  'hays.com.au', 'hays.com', 'haysplc.com',
  'randstad.com.au', 'randstad.com',
  'roberthalf.com.au', 'roberthalf.com',
  'michaelpage.com.au', 'michaelpage.com',
  'adecco.com.au', 'adecco.com',
  'kellyservices.com.au', 'kellycrew.com.au', 'kelly.com.au',
  'manpower.com.au', 'manpowergroup.com.au',
  'hudson.com', 'hudsonglobal.com',
  'peoplebank.com.au',
  'chandlermacleod.com', 'chandlermacleod.com.au',
  'designnbuild.com.au', 'uandu.com', 'u-and-u.com',
  'frontlinerecruitment.com.au', 'frontline.com.au',
  'aspectpersonnel.com.au',
  'robertwalters.com.au', 'robertwalters.com',
  'morganmckinley.com.au', 'morganmckinley.com',
  'pagegroup.com.au', 'pagegroup.com',
  'talentinternational.com', 'talentinternational.com.au',
  'sharpandcarter.com.au', 'davidsonrecruitment.com.au', 'davidsonwp.com',
  'salexoconsulting.com.au', 'salexo.com.au',
  'fuserecruitment.com.au', 'fusestaffing.com.au', 'choosefuse.com.au',
  'beaumontpeople.com.au', 'beaumontconsulting.com.au',
  'engagepersonnel.com.au', 'siriuspeople.com.au',
  'peoplecorp.com.au', 'vervepartners.com.au',
  'smaart.com.au', 'smaartrecruitment.com.au',
  'trojanrecruitment.com.au',
  'lotuspeople.com.au', 'lotuspersonnel.com.au',
  'hoban.com.au', 'hobanrecruitment.com.au',
  'bluefinresources.com.au', 'perigongroup.com.au',
  'precisionsourcing.com.au', 'marblerecruitment.com.au',
  'saltgroup.com.au', 'salt.com.au', 'reogroup.com.au',
  'elevenmgmt.com.au', 'people2people.com.au',
  'sixdegreesexecutive.com.au', 'levyl.com.au',
  'millerleith.com.au', 'parityconsulting.com.au', 'parity.net.au',
  'profusiongroup.com.au', 'astoncarter.com',
  'sfpeople.com.au', 'sfgroup.com.au',
  'peopleinfrastructure.com.au', 'talentright.com.au',
  'kaizen-recruitment.com.au', 'kaizenrecruitment.com.au',
  'goughrecruitment.com.au', 'gough.com.au',
  'preacta.com.au', 'talentarmy.com.au', 'talentpath.com.au',
  'paxus.com.au', 'watermarksearch.com.au', 'blackbookexecutive.com.au',
  'saxtondrummond.com.au', 'harveynash.com', 'harveynash.com.au',
  'redwolfrosch.com.au', 'peoplepath.com.au',
  'seek.com.au', 'indeed.com', 'linkedin.com', 'jora.com', 'adzuna.com.au',
])

const RECRUITER_DOMAIN_KEYWORDS: string[] = [
  'recruit', 'headhunt', 'headhunters', 'labourhire', 'laborhire',
  'jobagency', 'talentsearch', 'talentsolution', 'executivesearch',
  'placementgroup', 'staffingagency', 'staffinggroup',
]

const RECRUITER_EMAIL_CONTEXT_PHRASES: string[] = [
  'send your cv to', 'send your resume to', 'submit your cv to',
  'submit your resume to', 'forward your cv to', 'forward your resume to',
  'email your cv to', 'email your resume to', 'send your application to',
  'submit applications to', 'apply by emailing', 'apply via email to',
  'our recruitment partner', 'our recruiting partner', 'through our recruiter',
  'our talent partner', 'managed by our',
  'please email your resume', 'please send your cv', 'please send your resume',
  'please forward your', 'send through your', 'direct your application to',
  'reach out to our', 'please contact our',
]

const COMPANY_STOP_WORDS = new Set([
  'pty', 'ltd', 'limited', 'inc', 'corp', 'corporation', 'co',
  'group', 'the', 'and', 'of', 'for', 'in', 'at', 'by',
  'australia', 'australian', 'national', 'global', 'international',
  'services', 'solutions', 'systems', 'technologies', 'technology',
  'holdings', 'enterprises', 'management', 'consulting',
  'digital', 'media', 'health', 'care', 'finance', 'financial',
])

function extractDomainFromUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const w = url.match(/^https?:\/\//) ? url : `https://${url}`
    return new URL(w).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    const m = url.match(/(?:https?:\/\/)?(?:www\.)?([^/\s?#]+)/i)
    return m?.[1]?.toLowerCase() ?? null
  }
}

function getDomainRoot(domain: string): string {
  const d = domain.toLowerCase()
  const tlds = ['.com.au','.net.au','.org.au','.edu.au','.gov.au','.id.au','.asn.au','.com.nz','.co.nz','.com','.net','.org','.io','.co','.au','.nz']
  let s = d
  for (const tld of tlds) { if (s.endsWith(tld)) { s = s.slice(0, -tld.length); break } }
  const parts = s.split('.')
  return parts[parts.length - 1] || s
}

function tokeniseCompanyName(name: string): string[] {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 4 && !COMPANY_STOP_WORDS.has(w))
}

export function checkRecruiterEmailInDescription(
  description: string,
  companyName: string,
  companyWebsite: string | null,
): FilterVerdict {
  const PASS: FilterVerdict = { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
  if (!description) return PASS

  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const allEmails = [...new Set((description.match(EMAIL_REGEX) || []).map(e => e.toLowerCase()))]
  if (allEmails.length === 0) return PASS

  const companyDomain = extractDomainFromUrl(companyWebsite)
  const companyRoot   = companyDomain ? getDomainRoot(companyDomain) : null
  const companyTokens = tokeniseCompanyName(companyName)

  for (const email of allEmails) {
    const domain = email.split('@')[1] ?? ''
    if (!domain || domain.length < 4) continue
    const emailRoot = getDomainRoot(domain)

    // Safety valve: same domain or company name token in domain → skip
    if (companyRoot && emailRoot === companyRoot) continue
    if (companyTokens.length > 0 && companyTokens.some(t => emailRoot.includes(t))) continue

    // Layer 1: Known recruiter domain (no extra confirmation needed)
    if (KNOWN_RECRUITER_EMAIL_DOMAINS.has(domain)) {
      return { shouldFilter: true, reason: `Email from known recruitment agency "${domain}" in description — employer has already engaged a recruiter`, confidence: 98, category: 'recruiter_email' }
    }

    // Layers 2+3: require confirmed different domain
    const confirmedExternal = companyRoot !== null && emailRoot !== companyRoot
    if (!confirmedExternal) continue

    // Layer 2: Domain root contains recruitment-specific keyword
    const kw = RECRUITER_DOMAIN_KEYWORDS.find(k => emailRoot.includes(k))
    if (kw) {
      return { shouldFilter: true, reason: `Email domain "${domain}" contains recruitment keyword "${kw}" — employer has engaged an external recruiter`, confidence: 89, category: 'recruiter_email' }
    }

    // Layer 3: Email appears near recruiter-direction phrases
    const idx = description.toLowerCase().indexOf(email)
    if (idx !== -1) {
      const ctx = description.slice(Math.max(0, idx - 250), Math.min(description.length, idx + 80)).toLowerCase()
      const phrase = RECRUITER_EMAIL_CONTEXT_PHRASES.find(p => ctx.includes(p))
      if (phrase) {
        return { shouldFilter: true, reason: `Description directs applicants to external email "${email}" ("${phrase}") — employer has engaged a recruiter`, confidence: 79, category: 'recruiter_email' }
      }
    }
  }

  return PASS
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 9 (NEW — v8): External Recruiter Text-Phrase Detection
// ──────────────────────────────────────────────────────────────────────────────
// Catches companies that post their own job but ADMIT in the text they've
// engaged an external recruiter/HR consultant, even without an email present.
//
// Examples caught:
//   "Please contact our external HR Consultant for further information."
//   "For more details contact our recruiter directly."
//   "This role is managed by an external search consultant."
//   "Applications are being handled by our external recruitment partner."
//   "Recruitment for this role is being managed externally."
//
// These phrases are linguistically impossible for a direct employer to write
// unless they have literally hired an external person for this search.
// One match = 93% confidence → always above the 70% threshold → filter.
// ═══════════════════════════════════════════════════════════════════════════════

const EXTERNAL_RECRUITER_TEXT_SIGNALS: string[] = [
  // Direct "contact our external ___" patterns
  'contact our external hr consultant',
  'contact our external recruiter',
  'contact our external consultant',
  'contact our external hr',
  'contact our external search',
  'contact our external talent',
  'contact the external recruiter',
  'contact the external consultant',
  'contact the external hr',
  // "our external ___" standalone (not just contact)
  'our external hr consultant',
  'our external recruiter',
  'our external hr partner',
  'our external recruitment partner',
  'our external talent partner',
  'our external search consultant',
  'our external search firm',
  'an external hr consultant',
  'an external recruiter',
  'an external search consultant',
  // "managed by ___" patterns
  'managed by an external recruiter',
  'managed by an external hr',
  'managed by our external',
  'being managed by an external',
  'this role is being managed by',
  'recruitment is being managed by',
  'this search is being managed by',
  'applications are being managed by',
  'applications are managed by an external',
  // "handled by ___" patterns
  'handled by an external recruiter',
  'handled by our external',
  'being handled by our recruitment partner',
  'recruitment is being handled by',
  // "through/via our external ___"
  'through our external recruiter',
  'through our external hr',
  'via our external recruiter',
  'via our external consultant',
  // Explicit "we have engaged" / "we have appointed" an external party
  'we have engaged an external recruiter',
  'we have engaged an external hr',
  'we have engaged a recruitment',
  'we have appointed an external',
  'we have engaged an independent',
  'engaged an external consultant',
  // "please contact the consultant"
  'please contact the consultant',
  'please contact our consultant',
  'please contact the recruiter',
  'contact the recruiter on',
  'contact the recruiter at',
  'contact the recruiter directly',
  'contact our consultant directly',
  'contact our search consultant',
  // Referral to "independently managed" / "externally managed"
  'independently managed by',
  'externally managed recruitment',
  'recruitment is managed externally',
  'this search is managed externally',
  // Common "how to apply" section phrases that reveal external party
  'contact our external hr for',
  'contact our external for further',
  'speak with our external',
  'speak to our external',
  'reach out to our external',
  // Independent contractor / consultant variations
  'independent hr consultant',
  'independent recruiter',
  'independent search consultant',
  'using an independent',
]

export function checkExternalRecruiterTextPhrases(description: string): FilterVerdict {
  const matches = findMatches(description, EXTERNAL_RECRUITER_TEXT_SIGNALS)
  if (matches.length === 0) return { shouldFilter: false, reason: '', confidence: 0, category: 'pass' }
  return {
    shouldFilter: true,
    reason: `Description reveals employer has engaged an external recruiter: "${matches[0]}"`,
    confidence: 93,
    category: 'external_recruiter',
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITE FILTER — runAllFilters
// ═══════════════════════════════════════════════════════════════════════════════

export interface CompositeFilterResult {
  shouldFilter: boolean
  verdict: FilterVerdict
}

/**
 * Run all checks in priority order.
 * Returns on the first check that meets the confidence threshold (70%).
 *
 * Priority order:
 *   0. Sales classification gate
 *   1. Recruiter profile (Apify metadata — most reliable signal)
 *   2. Private advertiser
 *   3. Recruitment agency (name + description signals + website)
 *   4. No-agency disclaimer
 *   5. HR consulting
 *   6. Law firm
 *   7. Recruiter email domain (v7)
 *   8. External recruiter text phrases (v8 NEW)
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
  const T = 70

  // 0. Sales gate
  if (params.filterSalesOnly && !isSalesJob(params.classification)) {
    return { shouldFilter: true, verdict: { shouldFilter: true, reason: `Classification "${params.classification || 'unknown'}" is not Sales`, confidence: 100, category: 'non_sales' } }
  }

  // 1. Recruiter profile
  const r0 = checkRecruiterProfile(params.recruiterProfile, params.recruiterSpecialisations)
  if (r0.shouldFilter && r0.confidence >= T) return { shouldFilter: true, verdict: r0 }

  // 2. Private advertiser
  const r1 = checkPrivateAdvertiser(params.advertiserName, params.isPrivate)
  if (r1.shouldFilter && r1.confidence >= T) return { shouldFilter: true, verdict: r1 }

  // 3. Recruitment agency (name + description + website)
  const r2 = checkRecruitmentAgency(params.companyName, params.advertiserName, params.description, params.website)
  if (r2.shouldFilter && r2.confidence >= T) return { shouldFilter: true, verdict: r2 }

  // 4. No-agency disclaimer
  const r3 = checkNoAgencyDisclaimer(params.description)
  if (r3.shouldFilter && r3.confidence >= T) return { shouldFilter: true, verdict: r3 }

  // 5. HR consulting
  const r4 = checkHRConsulting(params.companyName, params.description)
  if (r4.shouldFilter && r4.confidence >= T) return { shouldFilter: true, verdict: r4 }

  // 6. Law firm
  const r5 = checkLawFirm(params.companyName, params.jobTitle, params.description, params.website)
  if (r5.shouldFilter && r5.confidence >= T) return { shouldFilter: true, verdict: r5 }

  // 7. Recruiter email domain (v7)
  const r6 = checkRecruiterEmailInDescription(params.description, params.companyName, params.website)
  if (r6.shouldFilter && r6.confidence >= T) return { shouldFilter: true, verdict: r6 }

  // 8. External recruiter text phrases (v8 NEW)
  const r7 = checkExternalRecruiterTextPhrases(params.description)
  if (r7.shouldFilter && r7.confidence >= T) return { shouldFilter: true, verdict: r7 }

  return { shouldFilter: false, verdict: { shouldFilter: false, reason: '', confidence: 0, category: 'pass' } }
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