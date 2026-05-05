/**
 * CONTACT PICKER UTILITIES
 * ─────────────────────────────────────────────────────────────────────────────
 * Defines priority title groups for Apollo people search based on company size.
 * Used in Phase 3 (finding_contact) of the contact finder pipeline.
 *
 * LOGIC:
 *   Tiny  (1-10)   → Owner / Founder / MD (they handle everything)
 *   Small (11-50)  → HR Manager / Office Manager → GM / Director fallback
 *   Mid   (51-200) → HR Manager / P&C Manager / Talent Acquisition → HR Director
 *   Large (201-500)→ Talent Acquisition / HR Manager / HR Director
 *
 * Each group searches Apollo with include_similar_titles=true, which means
 * Apollo automatically includes close variants (e.g. "People Lead" for "HR Manager").
 *
 * Apollo seniority values (verified from docs):
 *   owner | founder | c_suite | partner | vp | head | director | manager | senior | entry | intern
 */

export interface TitleGroup {
  label: string
  titles: string[]
  seniorities?: string[]
}

export interface ContactRoleRecommendation {
  role: string
  reason: string
}

// ─── Title groups by size ──────────────────────────────────────────────────────

export function getTitleGroupsBySize(employeeCount: number | null): TitleGroup[] {
  // Micro (1–10): owner makes all decisions including hiring
  if (employeeCount !== null && employeeCount <= 10) {
    return [
      {
        label: 'Owner / Founder / MD',
        titles: [
          'owner', 'co-owner', 'business owner', 'founder', 'co-founder',
          'managing director', 'principal', 'director', 'chief executive officer',
          'ceo', 'president', 'managing partner',
        ],
        seniorities: ['owner', 'founder', 'c_suite', 'partner', 'director'],
      },
      {
        label: 'General Manager (fallback)',
        titles: ['general manager', 'operations manager', 'office manager', 'business manager'],
        seniorities: ['manager', 'director'],
      },
    ]
  }

  // Small (11–50): should have HR manager or office manager
  if (employeeCount !== null && employeeCount <= 50) {
    return [
      {
        label: 'HR / People Manager',
        titles: [
          'hr manager', 'human resources manager', 'people manager',
          'people and culture manager', 'p&c manager', 'hr generalist',
          'people operations manager', 'hr coordinator', 'talent manager',
          'recruitment manager', 'recruiter', 'talent acquisition', 'office manager',
        ],
        seniorities: ['manager', 'senior', 'director', 'head'],
      },
      {
        label: 'General Manager / Director',
        titles: [
          'general manager', 'operations director', 'operations manager',
          'business manager', 'director of operations', 'managing director',
        ],
        seniorities: ['manager', 'director', 'c_suite'],
      },
      {
        label: 'Owner / Founder (fallback)',
        titles: ['owner', 'founder', 'co-founder', 'ceo', 'principal', 'managing partner'],
        seniorities: ['owner', 'founder', 'c_suite'],
      },
    ]
  }

  // Medium (51–200): dedicated HR or People & Culture team
  if (employeeCount !== null && employeeCount <= 200) {
    return [
      {
        label: 'HR / Talent / P&C Manager',
        titles: [
          'hr manager', 'human resources manager', 'people and culture manager',
          'p&c manager', 'talent acquisition manager', 'recruitment manager',
          'head of hr', 'head of people', 'head of talent', 'people operations manager',
          'hr business partner', 'talent acquisition lead', 'talent acquisition specialist',
          'recruiter', 'people lead',
        ],
        seniorities: ['manager', 'head', 'director', 'senior'],
      },
      {
        label: 'HR Director / VP People',
        titles: [
          'hr director', 'director of human resources', 'director of people',
          'vp of hr', 'vp of people', 'vice president of human resources',
          'chief people officer', 'chief hr officer', 'chro',
        ],
        seniorities: ['director', 'vp', 'c_suite'],
      },
      {
        label: 'GM / Regional (fallback)',
        titles: ['general manager', 'regional manager', 'operations manager', 'state manager', 'branch manager'],
        seniorities: ['manager', 'director'],
      },
    ]
  }

  // Large (201–500): dedicated TA team + HR leadership
  return [
    {
      label: 'Talent Acquisition / Recruitment',
      titles: [
        'talent acquisition manager', 'talent acquisition lead', 'recruitment manager',
        'senior recruiter', 'recruiter', 'talent acquisition partner',
        'senior talent acquisition specialist', 'head of talent acquisition', 'head of recruitment',
      ],
      seniorities: ['manager', 'head', 'senior', 'director'],
    },
    {
      label: 'HR Manager / P&C',
      titles: [
        'hr manager', 'human resources manager', 'people and culture manager',
        'hr business partner', 'senior hr business partner', 'people operations manager', 'hr generalist',
      ],
      seniorities: ['manager', 'senior', 'head'],
    },
    {
      label: 'HR Director / Head of People',
      titles: [
        'hr director', 'director of human resources', 'director of people',
        'director of people and culture', 'head of hr', 'head of people',
        'head of people and culture', 'vp of people', 'vp of hr',
        'chief people officer', 'chro',
      ],
      seniorities: ['director', 'head', 'vp', 'c_suite'],
    },
    {
      label: 'GM (last resort)',
      titles: ['general manager', 'regional general manager', 'operations director'],
      seniorities: ['director', 'manager'],
    },
  ]
}

// ─── Single role recommendation (for enrichment table display) ─────────────────

export function getRecommendedContactRole(
  employeeCount: string | null | undefined,
  existingContactName: string | null | undefined,
  reportingTo: string | null | undefined,
): ContactRoleRecommendation {
  if (existingContactName) {
    return {
      role: reportingTo ?? 'Contact found',
      reason: 'Contact name already exists for this lead',
    }
  }

  const count = parseEmployeeCountStr(employeeCount)

  if (count === null) return { role: 'HR Manager / Owner', reason: 'Unknown size — starting with HR then Owner' }
  if (count <= 10)    return { role: 'Owner / MD', reason: `Micro business (${count} emp) — owner makes all decisions` }
  if (count <= 50)    return { role: 'HR Manager / Office Manager', reason: `Small company (${count} emp)` }
  if (count <= 200)   return { role: 'HR / People & Culture Manager', reason: `Mid-size (${count} emp) — dedicated P&C team` }
  return { role: 'Talent Acquisition / HR Manager', reason: `Larger company (${count} emp) — dedicated TA team` }
}

function parseEmployeeCountStr(str: string | null | undefined): number | null {
  if (!str) return null
  const range = str.match(/(\d[\d,]*)\s*[-–]\s*(\d[\d,]*)/)
  if (range) return parseInt(range[2].replace(/,/g, ''))
  const plus = str.match(/(\d[\d,]*)\s*\+/)
  if (plus) return parseInt(plus[1].replace(/,/g, ''))
  const plain = str.replace(/[^0-9]/g, '')
  return plain ? parseInt(plain) : null
}

// ─── LinkedIn + Google search URLs (for manual research in table) ───────────────

export function getLinkedInPeopleSearchUrl(companyName: string, role: string): string {
  const keyword = role.split('/')[0].trim()
  const q = encodeURIComponent(`${keyword} ${companyName}`)
  return `https://www.linkedin.com/search/results/people/?keywords=${q}&origin=GLOBAL_SEARCH_HEADER`
}

export function getGoogleSearchUrl(companyName: string): string {
  const q = encodeURIComponent(`"${companyName}" HR manager OR "people and culture" site:linkedin.com`)
  return `https://www.google.com/search?q=${q}`
}