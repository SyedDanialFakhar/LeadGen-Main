// src/components/enrichment/EnrichmentTable.tsx
import { Sparkles, Linkedin, Globe, SkipForward } from 'lucide-react'
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
}

export function EnrichmentTable({
  leads,
  isLoading,
  enrichingId,
  onHunter,
  onApollo,
  onSkip,
}: EnrichmentTableProps) {
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
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            {[
              'Company',
              'Contact Name',
              'Recommended Role',
              'Size',
              'City',
              'Actions',
            ].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {leads.map((lead) => {
            const recommendation = getRecommendedContactRole(
              lead.companyEmployeeCount,
              lead.contactName,
              lead.reportingTo
            )
            const linkedInUrl = getLinkedInPeopleSearchUrl(
              lead.companyName,
              recommendation.role
            )
            const googleUrl = getGoogleSearchUrl(lead.companyName)
            const isEnriching = enrichingId === lead.id

            return (
              <tr
                key={lead.id}
                className="bg-white dark:bg-slate-800"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {lead.companyName}
                  </p>
                  <p className="text-xs text-slate-400 truncate max-w-[140px]">
                    {lead.jobTitle}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  {lead.contactName ?? (
                    <span className="text-slate-300 dark:text-slate-600 italic">
                      Unknown
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                      {recommendation.role}
                    </p>
                    <p className="text-xs text-slate-400 max-w-[180px] truncate">
                      {recommendation.reason}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                  {lead.companyEmployeeCount ?? '—'}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {lead.city}
                </td>
                <td className="px-4 py-3">
                  {isEnriching ? (
                    <div className="flex items-center gap-2">
                      <Spinner size="sm" />
                      <span className="text-xs text-slate-400">
                        Enriching...
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Tooltip content="Find email via Hunter.io">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onHunter(lead)}
                          leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                        >
                          Hunter
                        </Button>
                      </Tooltip>
                      <Tooltip content="Search Apollo.io for contact">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onApollo(lead)}
                        >
                          Apollo
                        </Button>
                      </Tooltip>
                      <Tooltip content="Search on LinkedIn">
  <a
    href={linkedInUrl}
    target="_blank"
    rel="noopener noreferrer"
  >
    <Button variant="outline" size="sm">
      <Linkedin className="w-3.5 h-3.5" />
    </Button>
  </a>
</Tooltip>

<Tooltip content="Search on Google">
  <a
    href={googleUrl}
    target="_blank"
    rel="noopener noreferrer"
  >
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
    </div>
  )
}