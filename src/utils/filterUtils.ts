import { AGENCY_KEYWORDS, NO_AGENCY_PHRASES, MAX_EMPLOYEE_COUNT, EMPLOYEE_COUNT_RANGES } from './constants'

// Check if company name suggests it is a recruitment agency
export function isRecruitmentAgency(companyName: string): boolean {
  const lower = companyName.toLowerCase()
  return AGENCY_KEYWORDS.some((keyword) => lower.includes(keyword))
}

// Check if ad body contains "no agency" disclaimer
export function hasNoAgencyDisclaimer(adDescription: string): boolean {
  const lower = adDescription.toLowerCase()
  return NO_AGENCY_PHRASES.some((phrase) => lower.includes(phrase))
}

// Check if ad is old enough (14+ days)
export function isAdOldEnough(datePosted: string, minAgeDays: number = 14): boolean {
  const posted = new Date(datePosted)
  const now = new Date()
  const diffMs = now.getTime() - posted.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return diffDays >= minAgeDays
}

// Parse employee count range string and check if under max
export function isCompanySizeValid(employeeCount: string | null | undefined): boolean {
  if (!employeeCount) return true // unknown = assume valid, will verify later

  const range = EMPLOYEE_COUNT_RANGES[employeeCount]
  if (!range) {
    // Try to parse raw numbers like "250 employees" or "~500"
    const match = employeeCount.match(/\d+/)
    if (match) {
      const count = parseInt(match[0], 10)
      return count < MAX_EMPLOYEE_COUNT
    }
    return true // can't parse = assume valid
  }

  const [, max] = range
  return max < MAX_EMPLOYEE_COUNT
}

// Get max employee count from range string
export function getMaxEmployeeCount(employeeCount: string | null | undefined): number {
  if (!employeeCount) return 0

  const range = EMPLOYEE_COUNT_RANGES[employeeCount]
  if (range) return range[1]

  const match = employeeCount.match(/\d+/)
  if (match) return parseInt(match[0], 10)

  return 0
}

// Extract domain from website URL
export function extractDomain(website: string | null | undefined): string | null {
  if (!website) return null
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`)
    return url.hostname.replace('www.', '')
  } catch {
    return null
  }
}

// Calculate how many days ago a date was
export function daysAgo(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}