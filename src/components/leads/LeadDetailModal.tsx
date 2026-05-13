// src/components/leads/LeadDetailModal.tsx
import { useState, useEffect } from 'react'
import {
  ExternalLink, Mail, Phone, Linkedin, Building2, MapPin,
  Calendar, AlertTriangle, Users, Globe, Star,
  ThumbsUp, ThumbsDown, Minus, CheckCircle,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { LeadStatusBadge, EnrichmentBadge, PlatformBadge } from '@/components/ui/Badge'
import { useLeads } from '@/hooks/useLeads'
import { useToast } from '@/hooks/useToast'
import type { Lead, LeadStatus, MatchAssessment } from '@/types'
import { formatDate } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'

interface LeadDetailModalProps {
  lead: Lead | null
  onClose: () => void
}

type ResponseStatus = 'positive' | 'negative' | 'none'

const EMAIL_STATUS_OPTIONS = [
  { value: 'Not Sent', label: '📧 Not Sent' },
  { value: 'Email 1', label: '📧 Email 1 Sent' },
  { value: 'Email 2', label: '📧 Email 2 Sent' },
  { value: 'Email 3', label: '📧 Email 3 Sent' },
  { value: 'Closed', label: '🔒 Closed' },
  { value: 'Sequence Closed', label: '✅ Sequence Closed' },
]

const MATCH_ASSESSMENT_OPTIONS = [
  { value: '', label: '⭐ Not Set' },
  { value: 'High', label: '🔥 High Match' },
  { value: 'Medium', label: '📊 Medium Match' },
  { value: 'Low', label: '⚠️ Low Match' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
      {children}
    </p>
  )
}

function InfoRow({ icon: Icon, label, value, href }: {
  icon: React.ElementType
  label: string
  value: string | null | undefined
  href?: string
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <span className="text-xs text-slate-400 block">{label}</span>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline truncate block">
            {value}
          </a>
        ) : (
          <span className="text-slate-700 dark:text-slate-300">{value}</span>
        )}
      </div>
    </div>
  )
}

function ResponseButton({ value, current, onChange }: {
  value: ResponseStatus
  current: ResponseStatus
  onChange: (v: ResponseStatus) => void
}) {
  const isActive = value === current
  const config = {
    positive: { label: 'Positive', icon: ThumbsUp, active: 'bg-emerald-500 text-white shadow-md', hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
    negative: { label: 'Negative', icon: ThumbsDown, active: 'bg-red-500 text-white shadow-md', hover: 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400' },
    none: { label: 'No Response', icon: Minus, active: 'bg-slate-500 text-white shadow-md', hover: 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500' },
  }[value]

  const Icon = config.icon
  return (
    <button
      onClick={() => onChange(value)}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center',
        'bg-slate-100 dark:bg-slate-700/60 border border-transparent',
        isActive ? config.active : cn('text-slate-500 dark:text-slate-400', config.hover)
      )}
    >
      <Icon className="w-4 h-4" />
      {config.label}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LeadDetailModal({ lead, onClose }: LeadDetailModalProps) {
  const { updateLead, isUpdating } = useLeads()
  const { showToast } = useToast()

  const [opsComments, setOpsComments] = useState('')
  const [charlieFeedback, setCharlieFeedback] = useState('')
  const [status, setStatus] = useState<LeadStatus>('Not Sent')
  const [matchAssessment, setMatchAssessment] = useState<MatchAssessment | null>(null)
  const [response, setResponse] = useState<ResponseStatus>('none')
  const [contactName, setContactName] = useState('')
  const [contactJobTitle, setContactJobTitle] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactLinkedinUrl, setContactLinkedinUrl] = useState('')

  const getResponseFromComments = (comments: string | null): ResponseStatus => {
    if (!comments) return 'none'
    const match = comments.match(/\[Response:\s*(positive|negative|none)\]/i)
    return match ? (match[1].toLowerCase() as ResponseStatus) : 'none'
  }

  const getCleanComments = (comments: string | null): string => {
    if (!comments) return ''
    return comments.replace(/\[Response:\s*(positive|negative|none)\]\s*/i, '').trim()
  }

  useEffect(() => {
    if (lead) {
      setOpsComments(getCleanComments(lead.opsComments))
      setCharlieFeedback(lead.charlieFeedback || '')
      setStatus(lead.status)
      setMatchAssessment(lead.matchAssessment)
      setResponse(lead.response as ResponseStatus ?? getResponseFromComments(lead.opsComments))
      setContactName(lead.contactName || '')
      setContactJobTitle(lead.contactJobTitle || '')
      setContactEmail(lead.contactEmail || '')
      setContactPhone(lead.contactPhone || '')
      setContactLinkedinUrl(lead.contactLinkedinUrl || '')
    }
  }, [lead])

  if (!lead) return null

  const handleSave = () => {
    const newComments = response !== 'none'
      ? `[Response: ${response}] ${opsComments}`
      : opsComments
    updateLead({
      id: lead.id,
      updates: {
        opsComments: newComments.trim() || null,
        charlieFeedback: charlieFeedback || null,
        status,
        matchAssessment: matchAssessment || null,
        response: response === 'none' ? null : response,
        contactName: contactName || null,
        contactJobTitle: contactJobTitle || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        contactLinkedinUrl: contactLinkedinUrl || null,
      },
    })
    showToast('Lead updated', 'success')
    onClose()
  }

  return (
    <Modal
      isOpen={!!lead}
      onClose={onClose}
      title={`${lead.companyName} — ${lead.jobTitle}`}
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} isLoading={isUpdating}>Save Changes</Button>
        </div>
      }
    >
      <div className="max-h-[72vh] overflow-y-auto space-y-5 pr-1">

        {/* ── Warnings ── */}
        {(lead.isRecruitmentAgency || lead.noAgencyDisclaimer) && (
          <div className="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {lead.isRecruitmentAgency && <p>Flagged as recruitment agency</p>}
              {lead.noAgencyDisclaimer && <p>Ad contains "no agency" disclaimer</p>}
            </div>
          </div>
        )}

        {/* ── Badges row ── */}
        <div className="flex flex-wrap gap-2">
          <PlatformBadge platform={lead.platform} />
          <EnrichmentBadge status={lead.enrichmentStatus} />
          {lead.followUpRequired && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              Follow-up Required
            </span>
          )}
          {lead.emailSent && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              <CheckCircle className="w-3 h-3" /> Email Sent
            </span>
          )}
        </div>

        {/* ── Two column layout ── */}
        <div className="grid grid-cols-2 gap-5">

          {/* LEFT: Company + Job Info */}
          <div className="space-y-4">
            <div>
              <SectionLabel>Company</SectionLabel>
              <div className="space-y-2">
                <InfoRow icon={Building2} label="Company" value={lead.companyName} />
                <InfoRow icon={MapPin} label="Location" value={lead.location ?? lead.city} />
                <InfoRow icon={Users} label="Size" value={lead.companyEmployeeCount} />
                <InfoRow icon={Globe} label="Website" value={lead.companyWebsite} href={lead.companyWebsite ?? undefined} />
                <InfoRow icon={Linkedin} label="LinkedIn" value={lead.companyLinkedinUrl ? 'View LinkedIn Page' : null} href={lead.companyLinkedinUrl ?? undefined} />
              </div>
            </div>

            <div>
              <SectionLabel>Job Details</SectionLabel>
              <div className="space-y-2">
                <InfoRow icon={Calendar} label="Posted" value={formatDate(lead.datePosted)} />
                {lead.salary && <InfoRow icon={Star} label="Salary" value={lead.salary} />}
                {lead.workType && <InfoRow icon={Building2} label="Work Type" value={lead.workType} />}
                <div className="mt-1">
                  <a
                    href={lead.jobAdUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View Job Ad
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Contact Info (editable) */}
          <div>
            <SectionLabel>Contact Details</SectionLabel>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="Contact name"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Role Title</label>
                <input
                  type="text"
                  value={contactJobTitle}
                  onChange={e => setContactJobTitle(e.target.value)}
                  placeholder="Role title"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Phone</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="04xx xxx xxx"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={contactLinkedinUrl}
                  onChange={e => setContactLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="border-t border-slate-100 dark:border-slate-700" />

        {/* ── Status controls ── */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Email Status"
            value={status}
            onChange={e => setStatus(e.target.value as LeadStatus)}
            options={EMAIL_STATUS_OPTIONS}
          />
          <Select
            label="Match Assessment"
            value={matchAssessment || ''}
            onChange={e => setMatchAssessment(e.target.value as MatchAssessment || null)}
            options={MATCH_ASSESSMENT_OPTIONS}
          />
        </div>

        {/* ── Response ── */}
        <div>
          <SectionLabel>Response</SectionLabel>
          <div className="flex gap-2">
            <ResponseButton value="positive" current={response} onChange={setResponse} />
            <ResponseButton value="negative" current={response} onChange={setResponse} />
            <ResponseButton value="none" current={response} onChange={setResponse} />
          </div>
        </div>

        {/* ── Notes ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <SectionLabel>OPS Comments</SectionLabel>
            <textarea
              value={opsComments}
              onChange={e => setOpsComments(e.target.value)}
              rows={3}
              placeholder="Add your comments here..."
              className="w-full rounded-lg border text-sm px-3 py-2 resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <SectionLabel>Charlie's Feedback</SectionLabel>
            <textarea
              value={charlieFeedback}
              onChange={e => setCharlieFeedback(e.target.value)}
              rows={3}
              placeholder="Charlie's notes on this lead..."
              className="w-full rounded-lg border text-sm px-3 py-2 resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* ── Enrichment data (if available) ── */}
        {lead.enrichmentStatus === 'enriched' && (lead.companyIndustry || lead.companySize || lead.companyRating) && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
            <SectionLabel>Enrichment Data</SectionLabel>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {lead.companyIndustry && (
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Industry</span>
                  <span className="text-slate-700 dark:text-slate-300">{lead.companyIndustry}</span>
                </div>
              )}
              {lead.companySize && (
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Size</span>
                  <span className="text-slate-700 dark:text-slate-300">{lead.companySize}</span>
                </div>
              )}
              {lead.companyRating && (
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Rating</span>
                  <span className="text-slate-700 dark:text-slate-300">⭐ {lead.companyRating}/5</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Ad description (collapsible) ── */}
        {lead.adDescription && (
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-slate-400 uppercase tracking-widest select-none list-none flex items-center gap-1.5">
              <span className="transition-transform group-open:rotate-90">▶</span>
              Ad Description
            </summary>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
              {lead.adDescription}
            </p>
          </details>
        )}
      </div>
    </Modal>
  )
}