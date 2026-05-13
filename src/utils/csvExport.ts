import type { Lead } from '@/types'
import { formatDate } from './dateUtils'

export function leadsToCSV(leads: Lead[]): string {
  const headers = [
    'Date Posted',
    'Platform',
    'City',
    'Company Name',
    'Job Title',
    'Contact Name',
    'Contact Role',
    'Email',
    'Phone',
    'LinkedIn URL',
    'Company Size',
    'Status',
    'Enrichment Status',
    'Follow Up Required',
    'Email Sent',
    'OPS Comments',
    'Charlie Feedback',
    'Job Ad URL',
    'Created At',
  ]

  const rows = leads.map((lead) => [
    formatDate(lead.datePosted),
    lead.platform,
    lead.city,
    lead.companyName,
    lead.jobTitle,
    lead.contactName ?? '',
    lead.contactJobTitle ?? '',
    lead.contactEmail ?? '',
    lead.contactPhone ?? '',
    lead.contactLinkedinUrl ?? '',
    lead.companyEmployeeCount ?? '',
    lead.status,
    lead.enrichmentStatus,
    lead.followUpRequired ? 'Yes' : 'No',
    lead.emailSent ? 'Yes' : 'No',
    lead.opsComments ?? '',
    lead.charlieFeedback ?? '',
    lead.jobAdUrl,
    formatDate(lead.createdAt),
  ])

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    .join('\n')

  return csvContent
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}