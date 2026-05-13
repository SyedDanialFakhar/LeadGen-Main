// src/services/emailService.ts
// Manages the email queue in Supabase and sends via Resend

import { supabase } from '@/lib/supabaseClient'
import type { EmailQueueItem, EmailStats, EmailTemplate } from '@/types'
import type { Lead } from '@/types'
import { sendEmail } from './resendApi'
import { DAILY_EMAIL_LIMIT } from '@/utils/constants'
import { getTodayISO } from '@/utils/dateUtils'

function dbRowToEmailQueueItem(row: Record<string, unknown>): EmailQueueItem {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    leadId: row.lead_id as string,
    toEmail: row.to_email as string,
    toName: row.to_name as string,
    subject: row.subject as string,
    bodyHtml: row.body_html as string,
    status: row.status as EmailQueueItem['status'],
    sentAt: (row.sent_at as string) ?? null,
    errorMessage: (row.error_message as string) ?? null,
    retryCount: (row.retry_count as number) ?? 0,
  }
}

export function buildEmailFromTemplate(
  lead: Lead,
  template: EmailTemplate
): { subject: string; bodyHtml: string } {
  const firstName = lead.contactName?.split(' ')[0] ?? 'there'
  const city = lead.city

  const subject = template.subject
    .replace('[ContactFirstName]', firstName)
    .replace('[CompanyName]', lead.companyName)
    .replace('[JobTitle]', lead.jobTitle)
    .replace('[City]', city)

  const bodyHtml = template.bodyHtml
    .replace(/\[ContactFirstName\]/g, firstName)
    .replace(/\[CompanyName\]/g, lead.companyName)
    .replace(/\[JobTitle\]/g, lead.jobTitle)
    .replace(/\[City\]/g, city)
    .replace(/\[ContactRole\]/g, lead.contactJobTitle ?? 'Hiring Manager')

  return { subject, bodyHtml }
}

export async function addToEmailQueue(
  lead: Lead,
  template: EmailTemplate
): Promise<void> {
  if (!lead.contactEmail) throw new Error('Lead has no contact email')
  if (lead.noAgencyDisclaimer) throw new Error('Lead has no-agency disclaimer')
  if (lead.emailSent) throw new Error('Email already sent for this lead')

  const { subject, bodyHtml } = buildEmailFromTemplate(lead, template)

  const { error } = await supabase.from('email_queue').insert({
    lead_id: lead.id,
    to_email: lead.contactEmail,
    to_name: lead.contactName ?? 'Hiring Manager',
    subject,
    body_html: bodyHtml,
    status: 'queued',
  })

  if (error) throw new Error(`Failed to queue email: ${error.message}`)
}

export async function getEmailQueue(): Promise<EmailQueueItem[]> {
  const { data, error } = await supabase
    .from('email_queue')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch email queue: ${error.message}`)

  return (data ?? []).map(dbRowToEmailQueueItem)
}

export async function getEmailStats(): Promise<EmailStats> {
  const { data, error } = await supabase
    .from('email_queue')
    .select('status, sent_at')

  if (error) throw new Error(`Failed to fetch email stats: ${error.message}`)

  const today = getTodayISO()
  const items = data ?? []

  const sentToday = items.filter(
    (i) => i.status === 'sent' && i.sent_at?.startsWith(today)
  ).length

  return {
    queued: items.filter((i) => i.status === 'queued').length,
    sent: items.filter((i) => i.status === 'sent').length,
    failed: items.filter((i) => i.status === 'failed').length,
    sentToday,
    dailyLimit: DAILY_EMAIL_LIMIT,
    remaining: Math.max(0, DAILY_EMAIL_LIMIT - sentToday),
  }
}

export async function sendQueuedEmails(
  onProgress?: (sent: number, total: number) => void
): Promise<{ sent: number; failed: number }> {
  const stats = await getEmailStats()

  if (stats.remaining <= 0) {
    throw new Error(`Daily email limit of ${DAILY_EMAIL_LIMIT} reached`)
  }

  const { data, error } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'queued')
    .limit(stats.remaining)

  if (error) throw new Error(`Failed to fetch queued emails: ${error.message}`)

  const queue = (data ?? []).map(dbRowToEmailQueueItem)
  let sent = 0
  let failed = 0

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i]
    onProgress?.(i, queue.length)

    try {
      await sendEmail({
        to: item.toEmail,
        toName: item.toName,
        subject: item.subject,
        html: item.bodyHtml,
      })

      await supabase
        .from('email_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', item.id)

      await supabase
        .from('leads')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
          follow_up_required: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.leadId)

      sent++
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'

      await supabase
        .from('email_queue')
        .update({
          status: 'failed',
          error_message: message,
          retry_count: item.retryCount + 1,
        })
        .eq('id', item.id)

      failed++
    }

    // Small delay between emails
    await new Promise((res) => setTimeout(res, 500))
  }

  onProgress?.(queue.length, queue.length)
  return { sent, failed }
}