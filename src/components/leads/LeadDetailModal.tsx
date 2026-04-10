// src/components/leads/LeadDetailModal.tsx
import { useState, useEffect } from 'react'
import {
  ExternalLink,
  Mail,
  Phone,
  Linkedin,
  Building2,
  MapPin,
  Calendar,
  AlertTriangle,
  Users,
  Briefcase,
  Globe,
  Star,
  ThumbsUp,
  ThumbsDown,
  Minus,
  FileText,
  MessageSquare,
  Send,
  CheckCircle,
  XCircle,
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

// Email status options
const EMAIL_STATUS_OPTIONS = [
  { value: 'Not Sent', label: '📧 Not Sent' },
  { value: 'Email 1', label: '📧 Email 1 Sent' },
  { value: 'Email 2', label: '📧 Email 2 Sent' },
  { value: 'Email 3', label: '📧 Email 3 Sent' },
]

// Match assessment options
const MATCH_ASSESSMENT_OPTIONS = [
  { value: '', label: '⭐ Not Set' },
  { value: 'High', label: '🔥 High Match' },
  { value: 'Medium', label: '📊 Medium Match' },
  { value: 'Low', label: '⚠️ Low Match' },
]

// Response options
const RESPONSE_OPTIONS = [
  { value: 'none', label: '⚪ None' },
  { value: 'positive', label: '👍 Positive' },
  { value: 'negative', label: '👎 Negative' },
]

export function LeadDetailModal({ lead, onClose }: LeadDetailModalProps) {
  const { updateLead, isUpdating } = useLeads()
  const { showToast } = useToast()
  
  // Local state for editable fields
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

  // Helper to extract response from comments
  const getResponseFromComments = (comments: string | null): ResponseStatus => {
    if (!comments) return 'none'
    const match = comments.match(/\[Response:\s*(positive|negative|none)\]/i)
    if (match) {
      return match[1].toLowerCase() as ResponseStatus
    }
    return 'none'
  }

  // Helper to get clean comments without response tag
  const getCleanComments = (comments: string | null): string => {
    if (!comments) return ''
    return comments.replace(/\[Response:\s*(positive|negative|none)\]\s*/i, '')
  }

  // Update local state when lead changes
  useEffect(() => {
    if (lead) {
      setOpsComments(getCleanComments(lead.opsComments))
      setCharlieFeedback(lead.charlieFeedback || '')
      setStatus(lead.status)
      setMatchAssessment(lead.matchAssessment)
      setResponse(getResponseFromComments(lead.opsComments))
      setContactName(lead.contactName || '')
      setContactJobTitle(lead.contactJobTitle || '')
      setContactEmail(lead.contactEmail || '')
      setContactPhone(lead.contactPhone || '')
      setContactLinkedinUrl(lead.contactLinkedinUrl || '')
    }
  }, [lead])

  if (!lead) return null

  const handleSave = () => {
    // Build the response tag for comments
    const cleanCurrentComments = getCleanComments(lead.opsComments)
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
        contactName: contactName || null,
        contactJobTitle: contactJobTitle || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        contactLinkedinUrl: contactLinkedinUrl || null,
      },
    })
    showToast('Lead updated successfully', 'success')
    onClose()
  }

  // Get response badge style
  const getResponseBadgeStyle = (resp: ResponseStatus) => {
    switch (resp) {
      case 'positive': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      case 'negative': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      default: return 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
    }
  }

  const getResponseIcon = (resp: ResponseStatus) => {
    switch (resp) {
      case 'positive': return <ThumbsUp className="w-3.5 h-3.5" />
      case 'negative': return <ThumbsDown className="w-3.5 h-3.5" />
      default: return <Minus className="w-3.5 h-3.5" />
    }
  }

  return (
    <Modal
      isOpen={!!lead}
      onClose={onClose}
      title={`${lead.companyName} - ${lead.jobTitle}`}
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={isUpdating}>
            Save Changes
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto px-1">
        {/* Warnings */}
        {(lead.isRecruitmentAgency || lead.noAgencyDisclaimer) && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 dark:text-red-300">
              {lead.isRecruitmentAgency && <p>⚠️ Flagged as recruitment agency</p>}
              {lead.noAgencyDisclaimer && <p>⚠️ Ad contains "no agency" disclaimer</p>}
            </div>
          </div>
        )}

        {/* Header Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <PlatformBadge platform={lead.platform} />
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
            getResponseBadgeStyle(response)
          )}>
            {getResponseIcon(response)}
            {response === 'positive' ? 'Positive' : response === 'negative' ? 'Negative' : 'No Response'}
          </span>
          {lead.followUpRequired && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              Follow-up Required
            </span>
          )}
          {lead.emailSent && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              Email Sent
            </span>
          )}
        </div>

        {/* Two Column Layout for Basic Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Company
            </p>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-900 dark:text-white">
                {lead.companyName}
              </span>
              {lead.companyEmployeeCount && (
                <span className="text-xs text-slate-400">
                  ({lead.companyEmployeeCount} emp)
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Job Title
            </p>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-900 dark:text-white">
                {lead.jobTitle}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Location
            </p>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300">
                {lead.city}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Date Posted
            </p>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300">
                {formatDate(lead.datePosted)}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Applicants
            </p>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300">
                {lead.applicantCount ? lead.applicantCount : '—'}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Company Website
            </p>
            {lead.companyWebsite ? (
              <a
                href={lead.companyWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {lead.companyWebsite.replace('https://', '').replace('http://', '').replace('www.', '')}
                </span>
              </a>
            ) : (
              <p className="text-sm text-slate-400">—</p>
            )}
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Contact Information
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                Name
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Contact name"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                Role Title
              </label>
              <input
                type="text"
                value={contactJobTitle}
                onChange={(e) => setContactJobTitle(e.target.value)}
                placeholder="Role title"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                LinkedIn URL
              </label>
              <input
                type="url"
                value={contactLinkedinUrl}
                onChange={(e) => setContactLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Job Ad Link */}
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Job Ad URL
          </p>
          <a
            href={lead.jobAdUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            {lead.jobAdUrl}
          </a>
        </div>

        {/* Status and Assessment Row */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Email Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
            options={EMAIL_STATUS_OPTIONS}
          />
          <Select
            label="Match Assessment"
            value={matchAssessment || ''}
            onChange={(e) => setMatchAssessment(e.target.value as MatchAssessment || null)}
            options={MATCH_ASSESSMENT_OPTIONS}
          />
        </div>

        {/* Response Selection */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
            Response
          </label>
          <div className="flex gap-2">
            {RESPONSE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setResponse(opt.value as ResponseStatus)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  response === opt.value
                    ? opt.value === 'positive'
                      ? "bg-green-500 text-white shadow-md"
                      : opt.value === 'negative'
                      ? "bg-red-500 text-white shadow-md"
                      : "bg-slate-500 text-white shadow-md"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                )}
              >
                {opt.value === 'positive' && <ThumbsUp className="w-4 h-4" />}
                {opt.value === 'negative' && <ThumbsDown className="w-4 h-4" />}
                {opt.value === 'none' && <Minus className="w-4 h-4" />}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* OPS Comments */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
            OPS Comments
          </label>
          <textarea
            value={opsComments}
            onChange={(e) => setOpsComments(e.target.value)}
            rows={3}
            placeholder="Add your comments here..."
            className={cn(
              'w-full rounded-lg border text-sm px-3 py-2 resize-none',
              'bg-white dark:bg-slate-800',
              'text-slate-900 dark:text-slate-100',
              'border-slate-300 dark:border-slate-600',
              'placeholder:text-slate-400 dark:placeholder:text-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              'dark:focus:ring-blue-400'
            )}
          />
        </div>

        {/* Charlie Feedback */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
            Charlie's Feedback
          </label>
          <textarea
            value={charlieFeedback}
            onChange={(e) => setCharlieFeedback(e.target.value)}
            rows={3}
            placeholder="Charlie's notes on this lead..."
            className={cn(
              'w-full rounded-lg border text-sm px-3 py-2 resize-none',
              'bg-white dark:bg-slate-800',
              'text-slate-900 dark:text-slate-100',
              'border-slate-300 dark:border-slate-600',
              'placeholder:text-slate-400 dark:placeholder:text-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              'dark:focus:ring-blue-400'
            )}
          />
        </div>

        {/* Enrichment Info (if available) */}
        {(lead.enrichmentStatus === 'enriched') && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
              Enrichment Data
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {lead.companyIndustry && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Industry:</span>
                  <span className="ml-2 text-slate-700 dark:text-slate-300">{lead.companyIndustry}</span>
                </div>
              )}
              {lead.companySize && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Company Size:</span>
                  <span className="ml-2 text-slate-700 dark:text-slate-300">{lead.companySize}</span>
                </div>
              )}
              {lead.companyRating && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Rating:</span>
                  <span className="ml-2 text-slate-700 dark:text-slate-300">⭐ {lead.companyRating}/5</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}