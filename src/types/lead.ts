// src/types/lead.ts

// Simplified - ONLY email statuses
export type LeadStatus = 
  | 'Not Sent'
  | 'Email 1'
  | 'Email 2'
  | 'Email 3'

export type EnrichmentStatus =
  | 'pending'
  | 'enriched'
  | 'not_found'
  | 'failed'

export type Platform = 'seek' | 'linkedin'

export type City = string

export type MatchAssessment = 'Low' | 'Medium' | 'High'

export type ResponseStatus = 'positive' | 'negative' | 'none'

export interface Lead {
  id: string
  createdAt: string
  updatedAt: string
  datePosted: string
  jobAdUrl: string
  platform: Platform
  city: City
  companyName: string
  jobTitle: string
  contactName: string | null
  contactJobTitle: string | null
  contactEmail: string | null
  contactPhone: string | null
  contactLinkedinUrl: string | null
  companyEmployeeCount: string | null
  companyLinkedinUrl: string | null
  companyWebsite: string | null
  isRecruitmentAgency: boolean
  noAgencyDisclaimer: boolean
  adDescription: string | null
  reportingTo: string | null
  applicantCount: number | null
  opsComments: string | null
  charlieFeedback: string | null
  status: LeadStatus
  enrichmentStatus: EnrichmentStatus
  emailSent: boolean
  emailSentAt: string | null
  followUpRequired: boolean
  rawScrapeData: Record<string, unknown> | null
  extractedEmails?: string[]
  extractedPhones?: string[]
  extractedContactName?: string | null
  
  companyId: string | null
  companyIndustry: string | null
  companySize: string | null
  companyRating: number | null
  companyOverview: string | null
  jobLink: string | null
  applyLink: string | null
  salary: string | null
  workType: string | null
  workArrangement: string | null
  classification: string | null
  subClassification: string | null
  datePostedRaw: string | null
  expiresAt: string | null
  state: string | null
  country: string | null
  isVerified: boolean
  matchAssessment: MatchAssessment | null
  
  // NEW: Response column
  response: ResponseStatus | null
}

export interface NewLead {
  datePosted: string
  jobAdUrl: string
  platform: Platform
  city: City | null  
  companyName: string
  jobTitle: string
  contactName?: string | null
  contactJobTitle?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  contactLinkedinUrl?: string | null
  companyEmployeeCount?: string | null
  companyLinkedinUrl?: string | null
  companyWebsite?: string | null
  isRecruitmentAgency?: boolean
  noAgencyDisclaimer?: boolean
  adDescription?: string | null
  reportingTo?: string | null
  applicantCount?: number | null
  opsComments?: string | null
  charlieFeedback?: string | null
  status?: LeadStatus
  enrichmentStatus?: EnrichmentStatus
  emailSent?: boolean
  emailSentAt?: string | null
  followUpRequired?: boolean
  rawScrapeData?: Record<string, unknown> | null
  extractedEmails?: string[]
  extractedPhones?: string[]
  extractedContactName?: string | null
  companyId?: string | null
  companyIndustry?: string | null
  companySize?: string | null
  companyRating?: number | null
  companyOverview?: string | null
  jobLink?: string | null
  applyLink?: string | null
  salary?: string | null
  workType?: string | null
  workArrangement?: string | null
  classification?: string | null
  subClassification?: string | null
  datePostedRaw?: string | null
  expiresAt?: string | null
  state?: string | null
  country?: string | null
  isVerified?: boolean
  matchAssessment?: MatchAssessment | null
  response?: ResponseStatus | null  // NEW
}

export interface LeadFilters {
  platform?: Platform | 'all'
  city?: City | 'all'
  status?: LeadStatus | 'all'
  enrichmentStatus?: EnrichmentStatus | 'all'
  followUpOnly?: boolean
  search?: string
  dateFrom?: string
  dateTo?: string
  matchAssessment?: MatchAssessment | 'all' | 'null' | null
  response?: ResponseStatus | 'all' | null
}

export interface LeadStats {
  total: number
  newToday: number
  awaitingEnrichment: number
  followUpNeeded: number
  converted: number
  called: number
}