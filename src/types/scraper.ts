// src/types/scraper.ts
import type { City, Platform } from './lead'

// src/types/scraper.ts - Add these fields to ScrapeConfig
export interface ScrapeConfig {
  platform: Platform
  city: City
  roleQuery: string
  minAgeDays: number
  maxResults?: number  // Add this
  offset?: number      // Add this
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

// Updated RawSeekJob to match Apify's actual data structure
export interface RawSeekJob {
  id: string
  title: string
  jobLink: string
  applyLink: string
  salary: string | null
  numApplicants: string | null
  workArrangements: string | null
  workTypes: string | null
  phoneNumbers: string[]
  emails: string[]
  listedAt: string
  expiresAtUtc: string
  content: {
    bulletPoints: string[]
    jobHook: string
    unEditedContent: string
    sections: string[]
  }
  advertiser: {
    id: string
    name: string
    logo: string | null
    isVerified: boolean
    isPrivate: boolean
    registrationDate: string
  }
  joblocationInfo: {
    area: string
    displayLocation: string
    location: string
    country: string
    countryCode: string
    suburb: string
  }
  classificationInfo: {
    classification: string
    subClassification: string
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
  // Fallback fields for compatibility
  location?: string
  company?: string
  companyName?: string
  jobAdUrl?: string
  url?: string
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