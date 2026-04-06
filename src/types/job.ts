// src/types/job.ts
export interface JobResult {
  id: string
  companyName: string
  jobTitle: string
  datePosted: string
  city: string
  jobAdUrl: string
  description: string
  emails: string[]
  phones: string[]
  contactName: string | null
  platform: 'seek' | 'linkedin'
}