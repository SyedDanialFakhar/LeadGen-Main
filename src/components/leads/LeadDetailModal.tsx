// src/components/leads/LeadDetailModal.tsx
import { useState } from 'react'
import {
  ExternalLink,
  Mail,
  Phone,
  Linkedin,
  Building2,
  MapPin,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { LeadStatusBadge, EnrichmentBadge, PlatformBadge } from '@/components/ui/Badge'
import { useLeads } from '@/hooks/useLeads'
import { useToast } from '@/hooks/useToast'
import type { Lead, LeadStatus } from '@/types'
import { formatDate } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'

interface LeadDetailModalProps {
  lead: Lead | null
  onClose: () => void
}

export function LeadDetailModal({ lead, onClose }: LeadDetailModalProps) {
  const { updateLead, isUpdating } = useLeads()
  const { showToast } = useToast()
  const [opsComments, setOpsComments] = useState(lead?.opsComments ?? '')
  const [charlieFeedback, setCharlieFeedback] = useState(
    lead?.charlieFeedback ?? ''
  )
  const [status, setStatus] = useState<LeadStatus>(lead?.status ?? 'new')

  if (!lead) return null

  const handleSave = () => {
    updateLead({
      id: lead.id,
      updates: { opsComments, charlieFeedback, status },
    })
    showToast('Lead updated', 'success')
    onClose()
  }

  return (
    <Modal
      isOpen={!!lead}
      onClose={onClose}
      title="Lead Details"
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={isUpdating}>
            Save Changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Warnings */}
        {(lead.isRecruitmentAgency || lead.noAgencyDisclaimer) && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 dark:text-red-300">
              {lead.isRecruitmentAgency && (
                <p>⚠️ Flagged as recruitment agency</p>
              )}
              {lead.noAgencyDisclaimer && (
                <p>⚠️ Ad contains "no agency" disclaimer</p>
              )}
            </div>
          </div>
        )}

        {/* Header info */}
        <div className="grid grid-cols-2 gap-4">
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
                  ({lead.companyEmployeeCount} employees)
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Job Title
            </p>
            <p className="font-semibold text-slate-900 dark:text-white">
              {lead.jobTitle}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Location
            </p>
            <div className="flex items-center gap-1.5">
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
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300">
                {formatDate(lead.datePosted)}
              </span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <PlatformBadge platform={lead.platform} />
          <LeadStatusBadge status={lead.status} />
          <EnrichmentBadge status={lead.enrichmentStatus} />
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

        {/* Contact Info */}
        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Contact Information
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                Name
              </p>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {lead.contactName ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                Role
              </p>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {lead.contactJobTitle ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                Email
              </p>
              {lead.contactEmail ? (
                <a
                  href={`mailto:${lead.contactEmail}`}
                  className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {lead.contactEmail}
                </a>
              ) : (
                <p className="text-sm text-slate-400">—</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                Phone
              </p>
              {lead.contactPhone ? (
                <a
                  href={`tel:${lead.contactPhone}`}
                  className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {lead.contactPhone}
                </a>
              ) : (
                <p className="text-sm text-slate-400">—</p>
              )}
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                LinkedIn
              </p>
              {lead.contactLinkedinUrl ? (
                <a
                  href={lead.contactLinkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  {lead.contactLinkedinUrl}
                </a>
              ) : (
                <p className="text-sm text-slate-400">—</p>
              )}
            </div>
          </div>
        </div>

        {/* Job Ad Link */}
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Job Ad
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

        {/* Status change */}
        <Select
          label="Update Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as LeadStatus)}
          options={[
            { value: 'new', label: 'New' },
            { value: 'assessed', label: 'Assessed' },
            { value: 'called', label: 'Called' },
            { value: 'converted', label: 'Converted' },
            { value: 'closed', label: 'Closed' },
            { value: 'deleted', label: 'Deleted' },
          ]}
        />

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
      </div>
    </Modal>
  )
}