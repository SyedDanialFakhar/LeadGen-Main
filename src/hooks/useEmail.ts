// src/hooks/useEmail.ts
import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { EmailTemplate, Lead } from '@/types'
import {
  getEmailQueue,
  getEmailStats,
  sendQueuedEmails,
  addToEmailQueue,
} from '@/services/emailService'
import { useToast } from './useToast'

const QUEUE_KEY = 'email-queue'
const STATS_KEY = 'email-stats'

const DEFAULT_TEMPLATE: EmailTemplate = {
  subject: 'Quick question re your [JobTitle] search — [CompanyName]',
  bodyHtml: `<p>Hi [ContactFirstName],</p>
<p>I noticed <strong>[CompanyName]</strong> is currently looking for a <strong>[JobTitle]</strong> in [City].</p>
<p>I specialise in placing top-tier sales talent across [City] and have a strong network of pre-screened candidates who may not be actively applying on job boards.</p>
<p>Would you be open to a quick 10-minute call this week to see if we can help?</p>
<p>Warm regards,<br/>Charlie</p>`,
}

export function useEmail() {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [template, setTemplate] = useState<EmailTemplate>(DEFAULT_TEMPLATE)
  const [isSending, setIsSending] = useState(false)
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 })

  const queueQuery = useQuery({
    queryKey: [QUEUE_KEY],
    queryFn: getEmailQueue,
  })

  const statsQuery = useQuery({
    queryKey: [STATS_KEY],
    queryFn: getEmailStats,
    refetchInterval: 30000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [QUEUE_KEY] })
    queryClient.invalidateQueries({ queryKey: [STATS_KEY] })
    queryClient.invalidateQueries({ queryKey: ['leads'] })
  }

  const sendAll = useCallback(async () => {
    setIsSending(true)
    setSendProgress({ sent: 0, total: 0 })

    try {
      const { sent, failed } = await sendQueuedEmails((sent, total) => {
        setSendProgress({ sent, total })
      })

      invalidate()
      showToast(
        `Sent ${sent} emails${failed > 0 ? `, ${failed} failed` : ''}`,
        failed > 0 ? 'warning' : 'success'
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Send error'
      showToast(message, 'error')
    } finally {
      setIsSending(false)
      setSendProgress({ sent: 0, total: 0 })
    }
  }, [showToast])

  const addLeadToQueue = useCallback(
    async (lead: Lead) => {
      try {
        await addToEmailQueue(lead, template)
        invalidate()
        showToast('Added to email queue', 'success')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Queue error'
        showToast(message, 'error')
      }
    },
    [template, showToast]
  )

  return {
    queue: queueQuery.data ?? [],
    stats: statsQuery.data,
    isLoading: queueQuery.isLoading,
    isSending,
    sendProgress,
    template,
    setTemplate,
    sendAll,
    addLeadToQueue,
  }
}