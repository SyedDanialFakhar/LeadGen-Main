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

// Core logic — returns the best contact role to target based on company size
export function getRecommendedContactRole(
  employeeCount: string | null | undefined,
  linkedinHirerName?: string | null,
  reportingTo?: string | null
): ContactRecommendation {
  // If LinkedIn shows exactly who is hiring — use them directly
  if (linkedinHirerName) {
    return {
      role: 'Hiring Manager',
      reason: `LinkedIn shows ${linkedinHirerName} is actively hiring for this role`,
      priority: 1,
    }
  }

  // If the ad mentions who the role reports to — target that person
  if (reportingTo) {
    return {
      role: 'General Manager',
      reason: `Ad states role reports to: ${reportingTo}`,
      priority: 2,
    }
  }

  const maxCount = getMaxEmployeeCount(employeeCount)

  // Unknown size — default to General Manager as safe middle ground
  if (maxCount === 0) {
    return {
      role: 'General Manager',
      reason: 'Company size unknown — General Manager is the safest default',
      priority: 5,
    }
  }

  // Very small businesses — go straight to Director/CEO
  if (maxCount <= 30) {
    return {
      role: 'Director',
      reason: `Small company (${employeeCount} employees) — Director is likely handling hiring directly`,
      priority: 1,
    }
  }

  // Small-medium — General Manager or Sales Manager
  if (maxCount <= 100) {
    return {
      role: 'General Manager',
      reason: `Mid-small company (${employeeCount} employees) — General Manager oversees hiring`,
      priority: 2,
    }
  }

  // Medium — HR Manager is now handling recruitment
  if (maxCount <= 300) {
    return {
      role: 'HR Manager',
      reason: `Medium company (${employeeCount} employees) — HR Manager runs recruitment process`,
      priority: 3,
    }
  }

  // Larger — dedicated People & Culture team
  return {
    role: 'People & Culture Manager',
    reason: `Larger company (${employeeCount} employees) — People & Culture team manages hiring`,
    priority: 4,
  }
}

// Generate a LinkedIn people search URL for the operator to open manually
export function getLinkedInPeopleSearchUrl(
  companyName: string,
  contactRole: RecommendedContactRole
): string {
  const query = encodeURIComponent(`${contactRole} ${companyName}`)
  return `https://www.linkedin.com/search/results/people/?keywords=${query}`
}

// Generate a LinkedIn company search URL
export function getLinkedInCompanySearchUrl(companyName: string): string {
  const query = encodeURIComponent(companyName)
  return `https://www.linkedin.com/search/results/companies/?keywords=${query}`
}

// Generate a Google search URL to find company website/LinkedIn
export function getGoogleSearchUrl(companyName: string): string {
  const query = encodeURIComponent(`${companyName} LinkedIn Australia`)
  return `https://www.google.com/search?q=${query}`
}

// Check if a contact role is too senior for a given company size
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

  // CEO is too senior for companies over 100 employees
  return isSenior && maxCount > 100
}