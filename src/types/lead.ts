// src/types/lead.ts

// Simplified - ONLY email statuses
export type LeadStatus = 
  | 'Not Sent'
  | 'Closed'
  | 'Email 1'
  | 'Email 2'
  | 'Email 3'
  | 'Sequence Closed'

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
  location: string | null  
  companyName: string
  companyLogo: string | null 
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
  lastActionDate: string | null  
  nextActionDays: number | null   
  nextActionDate: string | null  
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
  response: string | null
}

export interface NewLead {
  datePosted: string
  jobAdUrl: string
  platform: Platform
  city: City | null  
  location?: string | null 
  companyName: string
  companyLogo?: string | null
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
  lastActionDate?: string | null
  nextActionDays?: number | null
  nextActionDate?: string | null
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
  response?: string | null
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