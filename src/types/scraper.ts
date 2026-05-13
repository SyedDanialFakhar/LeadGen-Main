// src/types/scraper.ts
import type { City, Platform } from './lead'

export interface ScrapeConfig {
  platform: Platform
  city: City
  roleQuery: string
  minAgeDays: number
  maxResults?: number
  offset?: number
  salesOnly?: boolean
  filterOlderThan7Days?: boolean   // ⭐ NEW — drives daterange + auto-skip logic
}

export interface ScrapeRun {
  id: string
  createdAt: string
  platform: Platform
  city: City
  jobTitleQuery: string
  status: 'running' | 'completed' | 'failed'
  leadsFound: number
  leadsFilteredOut: number
  leadsAdded: number
  errorMessage: string | null
  completedAt: string | null
  apifyRunId: string | null
}

// Complete websift/seek-job-scraper field mapping
export interface RawSeekJob {
  // Core identifiers
  id: string
  roleId: string
  title: string
  jobLink: string
  applyLink: string

  // Advertiser/Company info
  advertiser: {
    id: string
    name: string
    logo: string | null
    isVerified: boolean
    isPrivate: boolean
    registrationDate: string
  }

  // Company Profile (rich data)
  companyProfile: {
    id: string
    name: string
    companyNameSlug: string
    industry: string
    size: string
    profile: string
    website: string
    numberOfReviews: number
    rating: number
    overview: string
    perksAndBenefits: string | null
  }
  companyOpenJobs: string
  companyTags: string[]

  // Location info
  joblocationInfo: {
    area: string
    displayLocation: string
    location: string
    country: string
    countryCode: string
    suburb: string
  }

  // Dates
  listedAt: string
  expiresAtUtc: string

  // Classification
  classificationInfo: {
    classification: string
    subClassification: string
  }

  // Salary & Work details
  salary: string
  workTypes: string[]
  workArrangements: string[]

  // Content
  content: {
    bulletPoints: string[]
    jobHook: string
    unEditedContent: string
    sections: string[]
  }

  // Flags
  isVerified: boolean
  isExternalApply: boolean
  hasRoleRequirements: boolean

  // Contact info (extracted by the actor!)
  emails: string[]
  phoneNumbers: string[]

  // Applicant metrics
  numApplicants: string

  // Video
  employerVideo: string | null

  // Recruiter info (if applicable)
  recruiterProfile: {
    name: string
    rating: number
    reviewCount: number
    contactNumber: string
    agencyName: string
    agencyWebsite: string
    location: {
      country: string
      postcode: string
      state: string
      city: string
    }
    specialisations: string[]
    placementCount: number
  }
  recruiterSpecialisations: string[]

  // Employer questions
  employerQuestions: any[]

  // Percentage requirements
  coverLetterPercentage: number
  resumePercentage: number

  // For backward compatibility with existing code
  companyName?: string
  companyWebsite?: string
  location?: string
  city?: string
  state?: string
  country?: string
  description?: string
  jobDescription?: string
  datePosted?: string
  datePostedRaw?: string
  workType?: string
  workArrangement?: string
  classification?: string
  subClassification?: string
  salaryLabel?: string
  isExpired?: boolean
  url?: string
}

export interface RawLinkedInJob {
  jobId: string
  jobTitle: string
  companyName: string
  companyLinkedInUrl: string
  location: string
  postedAt: string
  hirerName: string | null
  hirerTitle: string | null
  hirerLinkedInUrl: string | null
  applicantCount: number | null
  jobDescription: string
  isPromoted: boolean
  jobAdUrl: string
}

export interface ScraperProgress {
  step: string
  current: number
  total: number
  logs: ScraperLog[]
}

export interface ScraperLog {
  timestamp: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export interface FilterResult {
  passed: RawSeekJob[] | RawLinkedInJob[]
  filteredOut: FilteredOutItem[]
}

export interface FilteredOutItem {
  companyName: string
  reason: string
}