// src/components/enrichment/EnrichmentTable.tsx
import { Sparkles, Linkedin, Globe, SkipForward, UserCheck } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Lead } from '@/types'
import {
  getRecommendedContactRole,
  getLinkedInPeopleSearchUrl,
  getGoogleSearchUrl,
} from '@/utils/contactPicker'

interface EnrichmentTableProps {
  leads: Lead[]
  isLoading: boolean
  enrichingId: string | null
  onHunter: (lead: Lead) => void
  onApollo: (lead: Lead) => void
  onSkip: (lead: Lead) => void
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

export function EnrichmentTable({
  leads,
  isLoading,
  enrichingId,
  onHunter,
  onApollo,
  onSkip,
  selectedIds,
  onSelectionChange,
}: EnrichmentTableProps) {
  const allSelected = leads.length > 0 && selectedIds.length === leads.length
  const someSelected = selectedIds.length > 0 && selectedIds.length < leads.length

  const toggleAll = () =>
    onSelectionChange(allSelected ? [] : leads.map(l => l.id))

  const toggleOne = (id: string) =>
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter(s => s !== id)
        : [...selectedIds, id],
    )

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
        icon={<Sparkles className="w-12 h-12" />}
        title="All caught up!"
        description="No leads are waiting for enrichment"
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            {/* Checkbox */}
            <th className="px-4 py-3 w-10">
              <input
                type="checkbox"
                ref={el => {
                  if (el) el.indeterminate = someSelected
                }}
                checked={allSelected}
                onChange={toggleAll}
                className="rounded border-slate-300 dark:border-slate-600 cursor-pointer accent-indigo-500"
                title={allSelected ? 'Deselect all' : 'Select all'}
              />
            </th>
            {['Company', 'Contact Name', 'Target Role', 'Size', 'City', 'Actions'].map(h => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {leads.map(lead => {
            const recommendation = getRecommendedContactRole(
              lead.companyEmployeeCount,
              lead.contactName,
              lead.reportingTo,
            )
            const linkedInUrl = getLinkedInPeopleSearchUrl(lead.companyName, recommendation.role)
            const googleUrl = getGoogleSearchUrl(lead.companyName)
            const isEnriching = enrichingId === lead.id
            const isSelected = selectedIds.includes(lead.id)

            return (
              <tr
                key={lead.id}
                className={cn(
                  'transition-colors',
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-900/20'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/30',
                )}
              >
                {/* Checkbox */}
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(lead.id)}
                    className="rounded border-slate-300 dark:border-slate-600 cursor-pointer accent-indigo-500"
                  />
                </td>

                {/* Company */}
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {lead.companyName}
                  </p>
                  <p className="text-xs text-slate-400 truncate max-w-[140px]">
                    {lead.jobTitle}
                  </p>
                </td>

                {/* Contact Name */}
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  {lead.contactName ?? (
                    <span className="text-slate-300 dark:text-slate-600 italic text-xs">
                      Unknown
                    </span>
                  )}
                </td>

                {/* Target Role */}
                <td className="px-4 py-3 min-w-[160px]">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {recommendation.role}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-[180px] truncate leading-tight mt-0.5">
                    {recommendation.reason}
                  </p>
                </td>

                {/* Size */}
                <td className="px-4 py-3">
                  {lead.companyEmployeeCount ? (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {lead.companyEmployeeCount}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Unknown</span>
                  )}
                </td>

                {/* City */}
                <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {lead.city}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  {isEnriching ? (
                    <div className="flex items-center gap-2">
                      <Spinner size="sm" />
                      <span className="text-xs text-slate-400">Enriching…</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Tooltip content="Find email via Hunter.io">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onHunter(lead)}
                          leftIcon={<Sparkles className="w-3 h-3" />}
                        >
                          Hunter
                        </Button>
                      </Tooltip>

                      <Tooltip content="Quick Apollo search">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onApollo(lead)}
                        >
                          Apollo
                        </Button>
                      </Tooltip>

                      <Tooltip content="Search on LinkedIn">
                        <a href={linkedInUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <Linkedin className="w-3.5 h-3.5 text-[#0077B5]" />
                          </Button>
                        </a>
                      </Tooltip>

                      <Tooltip content="Search on Google">
                        <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <Globe className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      </Tooltip>

                      <Tooltip content="Skip this lead">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSkip(lead)}
                        >
                          <SkipForward className="w-3.5 h-3.5" />
                        </Button>
                      </Tooltip>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Selection hint footer */}
      {leads.length > 0 && selectedIds.length === 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
          <p className="text-xs text-slate-400">
            Select leads above and click <span className="font-semibold text-indigo-500">Find Contacts via Apollo</span> to auto-find the right person + email
          </p>
        </div>
      )}
    </div>
  )
}