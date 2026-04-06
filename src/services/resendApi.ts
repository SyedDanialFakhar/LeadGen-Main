// src/services/resendApi.ts
// Resend email API — 3,000 emails/month, 100/day free

import { getResendApiKey, getSenderEmail, getSenderName } from './settingsService'

const RESEND_BASE = 'https://api.resend.com'

export async function sendEmail(params: {
  to: string
  toName: string
  subject: string
  html: string
}): Promise<{ id: string }> {
  const apiKey = await getResendApiKey()
  if (!apiKey) throw new Error('Resend API key not configured. Please add it in Settings.')

  const fromEmail = await getSenderEmail()
  if (!fromEmail) throw new Error('Sender email not configured. Please add it in Settings.')

  const fromName = await getSenderName()
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail

  const response = await fetch(`${RESEND_BASE}/emails`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [`${params.toName} <${params.to}>`],
      subject: params.subject,
      html: params.html,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Resend error: ${error.message ?? response.statusText}`)
  }

  const data = await response.json()
  return { id: data.id }
}