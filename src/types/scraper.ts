// src/types/scraper.ts
import type { City, Platform } from './lead'

export interface ScrapeConfig {
  platform: Platform
  city: City
  roleQuery: string
  minAgeDays: number
  maxResults?: number
  offset?: number
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

// ParseForge actor field mapping
export interface RawSeekJob {
  // ParseForge specific fields
  jobId: string
  title: string
  companyName: string
  location: string
  salaryLabel: string | null
  workType: string | null
  workArrangement: string | null
  classification: string
  subClassification: string
  teaser: string
  listingDate: string
  listingDateDisplay: string
  isFeatured: boolean
  bulletPoints: string[]
  advertiserId: string
  companyProfileUrl: string | null
  jobContent: string
  jobAbstract: string
  questionnaire: any[]
  isExpired: boolean
  phoneNumber: string | null
  url: string
  shareLink: string
  scrapedAt: string
  imageUrl: string | null
  
  // Keep these for compatibility with existing code
  id?: string
  jobLink?: string
  applyLink?: string
  emails?: string[]
  phoneNumbers?: string[]
  listedAt?: string
  expiresAtUtc?: string
  isVerified?: boolean
  hasRoleRequirements?: boolean
  content?: {
    bulletPoints: string[]
    jobHook: string
    unEditedContent: string
    sections: string[]
  }
  joblocationInfo?: {
    area: string
    displayLocation: string
    location: string
    country: string
    countryCode: string
    suburb: string
  }
  classificationInfo?: {
    classification: string
    subClassification: string
  }
  employerQuestions?: any[]
  employerVideo?: string | null
  companyProfile?: {
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
  companyOpenJobs?: string
  companyTags?: string[]
  advertiser?: {
    id: string
    name: string
    logo: string | null
    isVerified: boolean
    isPrivate: boolean
    registrationDate: string
  }
  recruiterProfile?: {
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
  // Fallback fields (no duplicate location)
  company?: string
  companyNameFallback?: string
  jobAdUrl?: string
  urlFallback?: string
  datePosted?: string
  postedAt?: string
  publishedAt?: string
  description?: string
  jobDescription?: string
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