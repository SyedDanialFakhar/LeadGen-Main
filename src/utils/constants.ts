// src/utils/constants.ts
import type { Platform, LeadStatus } from '@/types'

// Cities - can be expanded to include any Australian city
export const CITIES: string[] = [
  'Australia',  // All Australia
  'Melbourne',
  'Sydney', 
  'Brisbane',
  'Perth',
  'Adelaide',
  'Canberra',
  'Hobart',
  'Northern Territory',
  'Darwin',
  'Gold Coast',
  'Newcastle',
  'Wollongong',
  'Geelong',
  'Cairns',
  'Toowoomba',
  'Sunshine Coast',
  'Central Coast',
]

export const PLATFORMS: Platform[] = ['seek', 'linkedin']

// Complete job roles list
export const JOB_ROLES: string[] = [
  // Business Development Roles
  'Business Development Manager',
  'Business Development Representative',
  'Business Development Executive',
  'Business Development Specialist',
  'BDM',
  'Bid Manager',
  
  // Sales Roles
  'Sales Representative',
  'Sales Executive',
  'Sales Development Representative',
  'Sales Associate',
  'Sales Assistant',
  'Sales Consultant',
  'Sales Co-ordinator',
  'Sales Specialist',
  
  // Account Management Roles
  'Account Representative',
  'Account Manager',
  'Account Executive',
  
  // Customer Success Roles
  'Customer Success Manager',
  'Client Success Manager',
  
  // Sales Leadership Roles
  'Sales Manager',
  'Head of Sales',
  'Sales and Marketing Manager',
  'Sales Director',
  
  // Customer Service Leadership
  'Customer Service Manager',
  'Customer Service Director',
  'Head of Customer Service',
  'Customer Service Team Lead',
  'Team Leader',
]

// Minimum ad age - set to 7 to only show jobs older than 7 days
export const MIN_AD_AGE_DAYS = 7

export const MAX_EMPLOYEE_COUNT = 500
export const DAILY_EMAIL_LIMIT = 100
export const HUNTER_MONTHLY_LIMIT = 25
export const APOLLO_PHONE_MONTHLY_LIMIT = 5

// Enhanced agency keywords for better filtering
export const AGENCY_KEYWORDS: string[] = [
  'recruitment',
  'recruiter',
  'recruiting',
  'talent',
  'staffing',
  'advisory',
  'consulting',
  'consultancy',
  'headhunt',
  'gough recruitment',
'gough',
'recruitment',
'staffing',
'talent',
'consulting',
'hays',
'randstad',
'robert half',
'michael page',
'kelly services',
'adecco',
'hudson',
'peoplebank',
'chandler macleod',
  'executive search',
  'people solutions',
  'hr solutions',
  'hr consulting',
  'workforce',
  'placement',
  'resourcing',
  'manpower',
  'hays',
  'randstad',
  'robert half',
  'michael page',
  'kelly services',
  'adecco',
  'chandler macleod',
  'hudson',
  'talent international',
  'peoplebank',
  'design & build',
  'u&u',
  'talentweb',
  'aspect personnel',
  'frontline recruitment',
  'robert walters',
  'morgan mckinley',
  'pagegroup',
  'manpowergroup',
]

// Enhanced unwanted phrases for filtering
export const NO_AGENCY_PHRASES: string[] = [
  'agencies do not contact',
  'no agencies',
  'no recruitment agencies',
  'do not contact us if you are a recruitment',
  'unsolicited applications from recruitment',
  'agency fee will not be accepted',
  'recruitment agencies need not apply',
  'no agency contact',
  'agency approaches will not be accepted',
  'please do not contact',
  'no unsolicited resumes',
  'we have covered this one',
  'agencies please do not contact',
  'strictly no agencies',
  'no agency calls',
  'agencies will not be considered',
  'do not send agency candidates',
]

// Private advertiser indicators
export const PRIVATE_ADVERTISER_KEYWORDS: string[] = [
  'Private Advertiser',
  'Confidential',
  'Private',
  'Direct Employer',
]

// src/types/lead.ts - Add these exports

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  'Not Sent': 'Not Sent',
  'Closed': 'Closed',
  'Email 1': 'Email 1 Sent',
  'Email 2': 'Email 2 Sent',
  'Email 3': 'Email 3 Sent',
  'Sequence Closed': 'Sequence Closed',
}

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  'Not Sent': 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400',
  'Email 1': 'bg-emerald-500 text-white shadow-sm',
  'Email 2': 'bg-blue-500 text-white shadow-sm',
  'Email 3': 'bg-purple-500 text-white shadow-sm',
  'Closed': 'bg-gray-500 text-white shadow-sm',
  'Sequence Closed': 'bg-slate-700 text-white shadow-sm',
}

export const EMPLOYEE_COUNT_RANGES: Record<string, [number, number]> = {
  '1-10': [1, 10],
  '11-50': [11, 50],
  '51-200': [51, 200],
  '201-500': [201, 500],
  '501-1000': [501, 1000],
  '1001-5000': [1001, 5000],
  '5001-10000': [5001, 10000],
  '10001+': [10001, Infinity],
}

export const SEEK_SEARCH_BASE_URL = 'https://www.seek.com.au/jobs'

export const LINKEDIN_JOBS_GUEST_URL =
  'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search'

export const LINKEDIN_JOB_DETAIL_URL =
  'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting'

// Theme
export const THEMES = ['light', 'dark'] as const
export type Theme = typeof THEMES[number]