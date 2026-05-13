// src/types/job.ts or wherever your JobResult interface is defined

export interface JobResult {
  id: string
  companyId: string | null
  companyName: string
  companyLogo: string | null
  companyWebsite: string | null
  companyIndustry: string | null
  companySize: string | null
  companyRating: number | null
  companyOverview: string | null
  companySlug: string | null
  companyProfileLink: string | null
  companyNumberOfReviews: number | null
  companyPerksAndBenefits: string | null
  companyOpenJobs: string | null
  companyTags: string[]
  jobTitle: string
  jobLink: string
  applyLink: string
  salary: string | null
  datePosted: string
  datePostedRaw: string
  expiresAt: string | null
  city: string
  location: string | null  // ADD THIS - full location like "Brisbane QLD"
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