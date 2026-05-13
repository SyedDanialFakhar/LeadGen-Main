// src/utils/mappers.ts
import type { Lead, NewLead, MatchAssessment } from '@/types'

export function dbRowToLead(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    datePosted: row.date_posted as string,
    jobAdUrl: row.job_ad_url as string,
    platform: row.platform as Lead['platform'],
    city: row.city as Lead['city'],
    location: (row.location as string) ?? null,
    companyName: row.company_name as string,
    companyLogo: (row.company_logo as string) ?? null,
    jobTitle: row.job_title as string,
    contactName: (row.contact_name as string) ?? null,
    contactJobTitle: (row.contact_job_title as string) ?? null,
    contactEmail: (row.contact_email as string) ?? null,
    contactPhone: (row.contact_phone as string) ?? null,
    contactLinkedinUrl: (row.contact_linkedin_url as string) ?? null,
    companyEmployeeCount: (row.company_employee_count as string) ?? null,
    companyLinkedinUrl: (row.company_linkedin_url as string) ?? null,
    companyWebsite: (row.company_website as string) ?? null,
    isRecruitmentAgency: (row.is_recruitment_agency as boolean) ?? false,
    noAgencyDisclaimer: (row.no_agency_disclaimer as boolean) ?? false,
    adDescription: (row.ad_description as string) ?? null,
    reportingTo: (row.reporting_to as string) ?? null,
    applicantCount: (row.applicant_count as number) ?? null,
    opsComments: (row.ops_comments as string) ?? null,
    charlieFeedback: (row.charlie_feedback as string) ?? null,
    status: (row.status as Lead['status']) || 'Not Sent',
    lastActionDate: (row.last_action_date as string) ?? null,
    nextActionDays: (row.next_action_days as number) ?? 5,
    nextActionDate: (row.next_action_date as string) ?? null,
    enrichmentStatus: row.enrichment_status as Lead['enrichmentStatus'],
    emailSent: (row.email_sent as boolean) ?? false,
    emailSentAt: (row.email_sent_at as string) ?? null,
    followUpRequired: (row.follow_up_required as boolean) ?? false,
    rawScrapeData: (row.raw_scrape_data as Record<string, unknown>) ?? null,
    extractedEmails: (row.extracted_emails as string[]) ?? null,
    extractedPhones: (row.extracted_phones as string[]) ?? null,
    extractedContactName: (row.extracted_contact_name as string) ?? null,
    companyId: (row.company_id as string) ?? null,
    companyIndustry: (row.company_industry as string) ?? null,
    companySize: (row.company_size as string) ?? null,
    companyRating: row.company_rating as number ?? null,
    companyOverview: (row.company_overview as string) ?? null,
    jobLink: (row.job_link as string) ?? null,
    applyLink: (row.apply_link as string) ?? null,
    salary: (row.salary as string) ?? null,
    workType: (row.work_type as string) ?? null,
    workArrangement: (row.work_arrangement as string) ?? null,
    classification: (row.classification as string) ?? null,
    subClassification: (row.sub_classification as string) ?? null,
    datePostedRaw: (row.date_posted_raw as string) ?? null,
    expiresAt: (row.expires_at as string) ?? null,
    state: (row.state as string) ?? null,
    country: (row.country as string) ?? null,
    isVerified: (row.is_verified as boolean) ?? false,
    matchAssessment: (row.match_assessment as MatchAssessment) ?? null,
    response: (row.response as string) ?? null,
  }
}

export function newLeadToDbRow(lead: NewLead): Record<string, unknown> {
  return {
    date_posted: lead.datePosted,
    job_ad_url: lead.jobAdUrl,
    platform: lead.platform,
    city: lead.city ?? null,
    location: lead.location ?? null,
    company_name: lead.companyName,
    company_logo: lead.companyLogo ?? null,
    job_title: lead.jobTitle,
    contact_name: lead.contactName ?? null,
    contact_job_title: lead.contactJobTitle ?? null,
    contact_email: lead.contactEmail ?? null,
    contact_phone: lead.contactPhone ?? null,
    contact_linkedin_url: lead.contactLinkedinUrl ?? null,
    company_employee_count: lead.companyEmployeeCount ?? null,
    company_linkedin_url: lead.companyLinkedinUrl ?? null,
    company_website: lead.companyWebsite ?? null,
    is_recruitment_agency: lead.isRecruitmentAgency ?? false,
    no_agency_disclaimer: lead.noAgencyDisclaimer ?? false,
    ad_description: lead.adDescription ?? null,
    reporting_to: lead.reportingTo ?? null,
    applicant_count: lead.applicantCount ?? null,
    ops_comments: lead.opsComments ?? null,
    charlie_feedback: lead.charlieFeedback ?? null,
    status: lead.status ?? 'Not Sent',
    last_action_date: lead.lastActionDate ?? null,
    next_action_days: lead.nextActionDays ?? 5,
    next_action_date: lead.nextActionDate ?? null,
    enrichment_status: lead.enrichmentStatus ?? 'pending',
    follow_up_required: lead.followUpRequired ?? false,
    raw_scrape_data: lead.rawScrapeData ?? null,
    extracted_emails: lead.extractedEmails ?? null,
    extracted_phones: lead.extractedPhones ?? null,
    extracted_contact_name: lead.extractedContactName ?? null,
    company_id: lead.companyId ?? null,
    company_industry: lead.companyIndustry ?? null,
    company_size: lead.companySize ?? null,
    company_rating: lead.companyRating ?? null,
    company_overview: lead.companyOverview ?? null,
    job_link: lead.jobLink ?? null,
    apply_link: lead.applyLink ?? null,
    salary: lead.salary ?? null,
    work_type: lead.workType ?? null,
    work_arrangement: lead.workArrangement ?? null,
    classification: lead.classification ?? null,
    sub_classification: lead.subClassification ?? null,
    date_posted_raw: lead.datePostedRaw ?? null,
    expires_at: lead.expiresAt ?? null,
    state: lead.state ?? null,
    country: lead.country ?? null,
    is_verified: lead.isVerified ?? false,
    match_assessment: lead.matchAssessment ?? null,
    response: lead.response ?? null,
  }
}

export function leadUpdatesToDbRow(updates: Partial<Lead>): Record<string, unknown> {
  const dbRow: Record<string, unknown> = {}

  if (updates.datePosted !== undefined) dbRow.date_posted = updates.datePosted
  if (updates.jobAdUrl !== undefined) dbRow.job_ad_url = updates.jobAdUrl
  if (updates.platform !== undefined) dbRow.platform = updates.platform
  if (updates.city !== undefined) dbRow.city = updates.city
  if (updates.location !== undefined) dbRow.location = updates.location
  if (updates.companyName !== undefined) dbRow.company_name = updates.companyName
  if (updates.companyLogo !== undefined) dbRow.company_logo = updates.companyLogo
  if (updates.jobTitle !== undefined) dbRow.job_title = updates.jobTitle
  if (updates.contactName !== undefined) dbRow.contact_name = updates.contactName
  if (updates.contactJobTitle !== undefined) dbRow.contact_job_title = updates.contactJobTitle
  if (updates.contactEmail !== undefined) dbRow.contact_email = updates.contactEmail
  if (updates.contactPhone !== undefined) dbRow.contact_phone = updates.contactPhone
  if (updates.contactLinkedinUrl !== undefined) dbRow.contact_linkedin_url = updates.contactLinkedinUrl
  if (updates.companyEmployeeCount !== undefined) dbRow.company_employee_count = updates.companyEmployeeCount
  if (updates.companyLinkedinUrl !== undefined) dbRow.company_linkedin_url = updates.companyLinkedinUrl
  if (updates.companyWebsite !== undefined) dbRow.company_website = updates.companyWebsite
  if (updates.isRecruitmentAgency !== undefined) dbRow.is_recruitment_agency = updates.isRecruitmentAgency
  if (updates.noAgencyDisclaimer !== undefined) dbRow.no_agency_disclaimer = updates.noAgencyDisclaimer
  if (updates.adDescription !== undefined) dbRow.ad_description = updates.adDescription
  if (updates.reportingTo !== undefined) dbRow.reporting_to = updates.reportingTo
  if (updates.applicantCount !== undefined) dbRow.applicant_count = updates.applicantCount
  if (updates.opsComments !== undefined) dbRow.ops_comments = updates.opsComments
  if (updates.charlieFeedback !== undefined) dbRow.charlie_feedback = updates.charlieFeedback
  if (updates.status !== undefined) dbRow.status = updates.status
  if (updates.lastActionDate !== undefined) dbRow.last_action_date = updates.lastActionDate
  if (updates.nextActionDays !== undefined) dbRow.next_action_days = updates.nextActionDays
  if (updates.nextActionDate !== undefined) dbRow.next_action_date = updates.nextActionDate
  if (updates.enrichmentStatus !== undefined) dbRow.enrichment_status = updates.enrichmentStatus
  if (updates.emailSent !== undefined) dbRow.email_sent = updates.emailSent
  if (updates.emailSentAt !== undefined) dbRow.email_sent_at = updates.emailSentAt
  if (updates.followUpRequired !== undefined) dbRow.follow_up_required = updates.followUpRequired
  if (updates.rawScrapeData !== undefined) dbRow.raw_scrape_data = updates.rawScrapeData
  if (updates.extractedEmails !== undefined) dbRow.extracted_emails = updates.extractedEmails
  if (updates.extractedPhones !== undefined) dbRow.extracted_phones = updates.extractedPhones
  if (updates.extractedContactName !== undefined) dbRow.extracted_contact_name = updates.extractedContactName
  if (updates.companyId !== undefined) dbRow.company_id = updates.companyId
  if (updates.companyIndustry !== undefined) dbRow.company_industry = updates.companyIndustry
  if (updates.companySize !== undefined) dbRow.company_size = updates.companySize
  if (updates.companyRating !== undefined) dbRow.company_rating = updates.companyRating
  if (updates.companyOverview !== undefined) dbRow.company_overview = updates.companyOverview
  if (updates.jobLink !== undefined) dbRow.job_link = updates.jobLink
  if (updates.applyLink !== undefined) dbRow.apply_link = updates.applyLink
  if (updates.salary !== undefined) dbRow.salary = updates.salary
  if (updates.workType !== undefined) dbRow.work_type = updates.workType
  if (updates.workArrangement !== undefined) dbRow.work_arrangement = updates.workArrangement
  if (updates.classification !== undefined) dbRow.classification = updates.classification
  if (updates.subClassification !== undefined) dbRow.sub_classification = updates.subClassification
  if (updates.datePostedRaw !== undefined) dbRow.date_posted_raw = updates.datePostedRaw
  if (updates.expiresAt !== undefined) dbRow.expires_at = updates.expiresAt
  if (updates.state !== undefined) dbRow.state = updates.state
  if (updates.country !== undefined) dbRow.country = updates.country
  if (updates.isVerified !== undefined) dbRow.is_verified = updates.isVerified
  if (updates.matchAssessment !== undefined) dbRow.match_assessment = updates.matchAssessment
  if (updates.response !== undefined) dbRow.response = updates.response

  dbRow.updated_at = new Date().toISOString()

  return dbRow
}