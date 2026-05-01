// src/utils/contactPicker.ts
/**
 * CONTACT PICKER — Exact hierarchy from instructions image
 * ─────────────────────────────────────────────────────────────────────────────
 * Priority list (exact from instructions):
 *   1. HR Manager / People & Culture / Human Resource Manager / Talent Acquisition
 *   2. General Manager
 *   3. Director
 *   4. Operations Manager
 *   5. Regional Manager
 *   6. Managing Director
 *   7. Sales Manager / Director of Sales / Head of Sales
 *   8. CEO
 *
 * Size rules:
 *   ≤ 5 employees   → ALWAYS CEO (user rule: small enough owner does everything)
 *   < 100 employees → Follow hierarchy 1–8 (small company, no dedicated HR yet)
 *   ≥ 100 employees → HR Person FIRST, or Sales Manager/Executive
 *   > 500 employees → SKIP entirely
 */

// ─── Employee count parser ─────────────────────────────────────────────────────

/**
 * Converts Seek/Apollo employee count string to MAX number in range.
 * "1-10" → 10, "51-200" → 200, "201-500" → 500, "500+" → 500
 * Returns 0 for unknown/null.
 */
export function getMaxEmployeeCount(str: string | null | undefined): number {
  if (!str) return 0
  const s = str.trim()

  // "51-200", "201-500", "1-10" etc.
  const rangeMatch = s.match(/^(\d+)\s*[-–]\s*(\d+)/)
  if (rangeMatch) return parseInt(rangeMatch[2])

  // "500+", "1000+" etc.
  const plusMatch = s.match(/^(\d+)\s*[+]/)
  if (plusMatch) return parseInt(plusMatch[1])

  // Plain number "250"
  const plain = parseInt(s.replace(/[^0-9]/g, ''))
  return isNaN(plain) ? 0 : plain
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RecommendedContactRole =
  | 'CEO'
  | 'Director'
  | 'Founder / Owner'
  | 'Managing Director'
  | 'Operations Manager'
  | 'Regional Manager'
  | 'General Manager'
  | 'HR Manager'
  | 'People & Culture Manager'
  | 'Talent Acquisition Manager'
  | 'Sales Manager'
  | 'Hiring Manager'

export interface ContactRecommendation {
  role: RecommendedContactRole
  reason: string
  priority: number
  /** All Apollo search titles for this recommendation */
  searchTitles: string[]
}

// ─── Title groups (used by Apollo people search) ───────────────────────────────

export interface TitleGroup {
  label: string
  titles: string[]
  seniorities: string[]
}

/**
 * Returns Apollo search title groups in priority order.
 * Based on LinkedIn-verified employee count (NOT Seek data).
 *
 * ≤ 5 employees:   CEO always
 * < 100 employees: Hierarchy 1–8 (no dedicated HR, owner/director recruits)
 * ≥ 100 employees: HR first, then Sales Manager, then rest of hierarchy
 * > 500 employees: Never called (filtered out before this)
 */
export function getTitleGroupsBySize(employeeCount: number | null): TitleGroup[] {
  const n = employeeCount ?? 0

  // ── ≤ 5: CEO always (owner does everything at this size) ──
  if (n > 0 && n <= 5) {
    return [
      {
        label: 'CEO / Owner',
        titles: [
          'CEO', 'Chief Executive Officer', 'Founder', 'Co-Founder',
          'Owner', 'Managing Director', 'Director', 'Principal',
        ],
        seniorities: ['owner', 'founder', 'c_suite'],
      },
    ]
  }

  // ── Unknown size OR < 100: Follow hierarchy 1–8 ──
  // (No dedicated HR dept yet at this size)
  if (n === 0 || n < 100) {
    return [
      {
        // Priority 1: HR (even small companies might have one)
        label: '1 - HR / People & Culture',
        titles: [
          'HR Manager', 'Human Resources Manager',
          'People and Culture Manager', 'People & Culture Manager',
          'Talent Acquisition Manager', 'Head of People',
          'HR Business Partner', 'Recruitment Manager',
          'Human Resource Manager', 'Head of HR',
        ],
        seniorities: ['head', 'manager'],
      },
      {
        // Priority 2: General Manager
        label: '2 - General Manager',
        titles: ['General Manager', 'Country Manager', 'Business Manager'],
        seniorities: ['director', 'manager'],
      },
      {
        // Priority 3: Director
        label: '3 - Director',
        titles: ['Director', 'Executive Director'],
        seniorities: ['director'],
      },
      {
        // Priority 4: Operations Manager
        label: '4 - Operations Manager',
        titles: [
          'Operations Manager', 'Operations Director',
          'Chief Operating Officer', 'COO',
        ],
        seniorities: ['director', 'manager'],
      },
      {
        // Priority 5: Regional Manager
        label: '5 - Regional Manager',
        titles: ['Regional Manager', 'Area Manager', 'State Manager'],
        seniorities: ['manager'],
      },
      {
        // Priority 6: Managing Director
        label: '6 - Managing Director',
        titles: ['Managing Director', 'MD'],
        seniorities: ['c_suite', 'director'],
      },
      {
        // Priority 7: Sales
        label: '7 - Sales Manager / Head of Sales',
        titles: [
          'Sales Manager', 'Director of Sales', 'Head of Sales',
          'Sales Director', 'VP Sales', 'Sales Executive',
        ],
        seniorities: ['director', 'manager'],
      },
      {
        // Priority 8: CEO (last resort)
        label: '8 - CEO',
        titles: [
          'CEO', 'Chief Executive Officer', 'Founder',
          'Co-Founder', 'Owner', 'Principal',
        ],
        seniorities: ['owner', 'founder', 'c_suite'],
      },
    ]
  }

  // ── ≥ 100: HR person FIRST, or Sales Manager/Executive ──
  // (Dedicated HR team exists at this size)
  return [
    {
      // HR is PRIMARY at this size
      label: '1 - HR / People & Culture / Talent',
      titles: [
        'HR Manager', 'Human Resources Manager',
        'People and Culture Manager', 'People & Culture Manager',
        'Talent Acquisition Manager', 'Talent Acquisition Lead',
        'Head of People', 'Head of HR', 'Head of People and Culture',
        'HR Director', 'HR Business Partner',
        'Recruitment Manager', 'Talent Manager',
        'Human Resource Manager', 'HR Generalist',
      ],
      seniorities: ['head', 'director', 'manager'],
    },
    {
      // Sales Manager also relevant per instructions
      label: '7 - Sales Manager / Head of Sales',
      titles: [
        'Sales Manager', 'Director of Sales', 'Head of Sales',
        'Sales Director', 'VP of Sales', 'VP Sales',
        'National Sales Manager', 'State Sales Manager',
      ],
      seniorities: ['director', 'manager', 'vp'],
    },
    {
      label: '2 - General Manager',
      titles: ['General Manager', 'Country Manager', 'Business Manager'],
      seniorities: ['director', 'manager'],
    },
    {
      label: '3 - Director',
      titles: ['Director', 'Executive Director'],
      seniorities: ['director'],
    },
    {
      label: '4 - Operations Manager',
      titles: ['Operations Manager', 'Operations Director', 'COO'],
      seniorities: ['director', 'manager'],
    },
    {
      label: '5 - Regional Manager',
      titles: ['Regional Manager', 'Area Manager', 'State Manager'],
      seniorities: ['manager'],
    },
    {
      label: '6 - Managing Director',
      titles: ['Managing Director'],
      seniorities: ['c_suite', 'director'],
    },
    {
      label: '8 - CEO (last resort)',
      titles: ['CEO', 'Chief Executive Officer', 'Founder', 'Owner'],
      seniorities: ['owner', 'founder', 'c_suite'],
    },
  ]
}

// ─── UI recommendation (for table display) ────────────────────────────────────

/**
 * Returns a single recommended role label + reason for display in the table.
 * Based on the same size rules.
 */
export function getRecommendedContactRole(
  employeeCount: string | null | undefined,
  linkedinHirerName?: string | null,
  reportingTo?: string | null,
): ContactRecommendation {
  // Concrete person already known from LinkedIn job post
  if (linkedinHirerName) {
    return {
      role: 'Hiring Manager',
      reason: `LinkedIn shows ${linkedinHirerName} is hiring`,
      priority: 0,
      searchTitles: [],
    }
  }

  // Ad says who role reports to
  if (reportingTo) {
    return {
      role: 'General Manager',
      reason: `Reports to: ${reportingTo}`,
      priority: 2,
      searchTitles: ['General Manager', 'Director'],
    }
  }

  const n = getMaxEmployeeCount(employeeCount)

  if (n === 0) {
    return {
      role: 'HR Manager',
      reason: 'Size unknown — HR Manager is safest starting point',
      priority: 1,
      searchTitles: ['HR Manager', 'General Manager', 'Director'],
    }
  }

  if (n <= 5) {
    return {
      role: 'CEO',
      reason: `Very small company (${employeeCount}) — CEO handles everything`,
      priority: 8,
      searchTitles: ['CEO', 'Founder', 'Owner', 'Managing Director'],
    }
  }

  if (n < 100) {
    return {
      role: 'HR Manager',
      reason: `Small company (${employeeCount}) — follow hierarchy: HR → GM → Director → CEO`,
      priority: 1,
      searchTitles: ['HR Manager', 'General Manager', 'Director'],
    }
  }

  return {
    role: 'HR Manager',
    reason: `${employeeCount} employees — HR/P&C team manages hiring`,
    priority: 1,
    searchTitles: [
      'HR Manager', 'People and Culture Manager',
      'Talent Acquisition Manager', 'Head of HR',
    ],
  }
}

// ─── URL helpers ───────────────────────────────────────────────────────────────

export function getLinkedInPeopleSearchUrl(
  companyName: string,
  contactRole: string,
): string {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${contactRole} ${companyName}`)}`
}

export function getLinkedInCompanySearchUrl(companyName: string): string {
  return `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`
}

export function getGoogleSearchUrl(companyName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${companyName} LinkedIn Australia`)}`
}