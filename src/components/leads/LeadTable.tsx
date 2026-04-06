// src/components/leads/LeadTable.tsx
import { useState } from 'react'
import { ExternalLink, Mail, Phone, Building2, Calendar, MapPin, ChevronLeft, ChevronRight, Linkedin, Globe } from 'lucide-react'
import { LeadStatusBadge, EnrichmentBadge, PlatformBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Lead, LeadStatus } from '@/types'
import { formatDate } from '@/utils/dateUtils'
import { useLeads } from '@/hooks/useLeads'
import { cn } from '@/utils/cn'

interface LeadTableProps {
  leads: Lead[]
  isLoading: boolean
  onRowClick: (lead: Lead) => void
}

const PAGE_SIZE = 20

export function LeadTable({ leads, isLoading, onRowClick }: LeadTableProps) {
  const { updateLead, bulkUpdateStatus } = useLeads()
  const [selected, setSelected] = useState<string[]>([])
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(leads.length / PAGE_SIZE)
  const paginated = leads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    setSelected(
      selected.length === paginated.length ? [] : paginated.map((l) => l.id)
    )
  }

  const handleBulkStatus = (status: LeadStatus) => {
    bulkUpdateStatus({ ids: selected, status })
    setSelected([])
  }

  // Calculate match assessment based on available data
  const getMatchAssessment = (lead: Lead): { level: 'High' | 'Medium' | 'Low'; color: string } => {
    let score = 0
    
    // Check if we have contact info
    if (lead.contactEmail || lead.contactPhone) score += 2
    if (lead.contactName) score += 1
    if (lead.contactJobTitle) score += 1
    
    // Check if company has good size
    if (lead.companyEmployeeCount && !lead.companyEmployeeCount.includes('1-10')) score += 1
    
    // Check if not flagged
    if (!lead.isRecruitmentAgency && !lead.noAgencyDisclaimer) score += 1
    
    if (score >= 4) return { level: 'High', color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' }
    if (score >= 2) return { level: 'Medium', color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' }
    return { level: 'Low', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <EmptyState
        title="No leads found"
        description="Try adjusting your filters or run the scraper to find new leads"
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Bulk Actions */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selected.length} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {(['assessed', 'called', 'converted', 'closed'] as LeadStatus[]).map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                onClick={() => handleBulkStatus(s)}
              >
                Mark {s}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selected.length === paginated.length && paginated.length > 0}
                  onChange={toggleAll}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lead Added</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Source</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">City</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Company Name</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Job Title</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Location</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Link</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date Posted</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact Name</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role Title</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">LinkedIn</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Company URL</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Match Assessment</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ops Comments</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {paginated.map((lead) => {
              const matchAssessment = getMatchAssessment(lead)
              
              return (
                <tr
                  key={lead.id}
                  className={cn(
                    'bg-white dark:bg-slate-800 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50',
                    lead.followUpRequired && 'border-l-2 border-l-orange-400',
                    selected.includes(lead.id) && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                  onClick={() => onRowClick(lead)}
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.includes(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                    {formatDate(lead.createdAt)}
                  </td>
                  <td className="px-3 py-3">
                    <PlatformBadge platform={lead.platform} />
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                    {lead.city}
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-200 max-w-[150px] truncate">
                    {lead.companyName}
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                    {lead.jobTitle}
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    {lead.city}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <a
                      href={lead.jobAdUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"
                      title="View job ad"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                    {formatDate(lead.datePosted)}
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-400 max-w-[120px] truncate">
                    {lead.contactName || '—'}
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-400 max-w-[120px] truncate">
                    {lead.contactJobTitle || '—'}
                  </td>
                  <td className="px-3 py-3">
                    {lead.contactPhone ? (
                      <a
                        href={`tel:${lead.contactPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        <span className="text-xs">{lead.contactPhone}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {lead.contactEmail ? (
                      <a
                        href={`mailto:${lead.contactEmail}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Mail className="w-3 h-3" />
                        <span className="text-xs truncate max-w-[120px]">{lead.contactEmail}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {lead.contactLinkedinUrl ? (
                      <a
                        href={lead.contactLinkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {lead.companyWebsite ? (
                      <a
                        href={lead.companyWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Globe className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                      matchAssessment.color
                    )}>
                      {matchAssessment.level}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <LeadStatusBadge status={lead.status} />
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400 max-w-[150px] truncate">
                    {lead.opsComments || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
         </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, leads.length)} of {leads.length} leads
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Prev
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}