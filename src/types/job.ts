// src/types/job.ts
export interface JobResult {
  id: string
  companyId: string
  companyName: string
  companyWebsite: string
  companyIndustry: string
  companySize: string
  companyRating: number
  companyOverview: string
  jobTitle: string
  jobLink: string
  applyLink: string
  salary: string | null
  datePosted: string
  datePostedRaw: string
  expiresAt: string | null
  city: string
  state: string
  country: string
  workType: string | null
  workArrangement: string | null
  numApplicants: string | null
  classification: string
  subClassification: string
  emails: string[]
  phones: string[]
  contactName: string | null
  description: string
  isVerified: boolean
  platform: 'seek' | 'linkedin'
}