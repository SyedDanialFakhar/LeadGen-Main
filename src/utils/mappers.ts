import type { Lead, NewLead } from '@/types'

// Convert DB snake_case row to TypeScript camelCase Lead
export function dbRowToLead(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    datePosted: row.date_posted as string,
    jobAdUrl: row.job_ad_url as string,
    platform: row.platform as Lead['platform'],
    city: row.city as Lead['city'],
    companyName: row.company_name as string,
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
    status: row.status as Lead['status'],
    enrichmentStatus: row.enrichment_status as Lead['enrichmentStatus'],
    emailSent: (row.email_sent as boolean) ?? false,
    emailSentAt: (row.email_sent_at as string) ?? null,
    followUpRequired: (row.follow_up_required as boolean) ?? false,
    rawScrapeData: (row.raw_scrape_data as Record<string, unknown>) ?? null,
  }
}

// Convert camelCase NewLead to DB snake_case object
export function newLeadToDbRow(lead: NewLead): Record<string, unknown> {
  return {
    date_posted: lead.datePosted,
    job_ad_url: lead.jobAdUrl,
    platform: lead.platform,
    city: lead.city,
    company_name: lead.companyName,
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
    status: lead.status ?? 'new',
    enrichment_status: lead.enrichmentStatus ?? 'pending',
    follow_up_required: lead.followUpRequired ?? false,
    raw_scrape_data: lead.rawScrapeData ?? null,
  }
}

// Convert partial Lead updates to DB snake_case
export function leadUpdatesToDbRow(updates: Partial<Lead>): Record<string, unknown> {
  const dbRow: Record<string, unknown> = {}

  if (updates.datePosted !== undefined) dbRow.date_posted = updates.datePosted
  if (updates.jobAdUrl !== undefined) dbRow.job_ad_url = updates.jobAdUrl
  if (updates.platform !== undefined) dbRow.platform = updates.platform
  if (updates.city !== undefined) dbRow.city = updates.city
  if (updates.companyName !== undefined) dbRow.company_name = updates.companyName
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
  if (updates.enrichmentStatus !== undefined) dbRow.enrichment_status = updates.enrichmentStatus
  if (updates.emailSent !== undefined) dbRow.email_sent = updates.emailSent
  if (updates.emailSentAt !== undefined) dbRow.email_sent_at = updates.emailSentAt
  if (updates.followUpRequired !== undefined) dbRow.follow_up_required = updates.followUpRequired
  if (updates.rawScrapeData !== undefined) dbRow.raw_scrape_data = updates.rawScrapeData

  dbRow.updated_at = new Date().toISOString()

  return dbRow
}
export function dbRowToScrapeRun(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    platform: row.platform as string,
    city: row.city as string,
    jobTitleQuery: row.job_title_query as string,
    status: row.status as 'running' | 'completed' | 'failed',
    leadsFound: (row.leads_found as number) ?? 0,
    leadsFilteredOut: (row.leads_filtered_out as number) ?? 0,
    leadsAdded: (row.leads_added as number) ?? 0,
    errorMessage: (row.error_message as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
    apifyRunId: (row.apify_run_id as string) ?? null,
  }
}