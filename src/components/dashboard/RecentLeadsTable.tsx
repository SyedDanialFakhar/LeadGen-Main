// src/components/dashboard/RecentLeadsTable.tsx
import { useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { LeadStatusBadge, PlatformBadge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Lead } from '@/types'
import { formatDate } from '@/utils/dateUtils'

interface RecentLeadsTableProps {
  leads: Lead[]
  isLoading: boolean
}

export function RecentLeadsTable({ leads, isLoading }: RecentLeadsTableProps) {
  const navigate = useNavigate()
  const recent = leads.slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Recent Leads
          </h3>
          <button
            onClick={() => navigate('/leads')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            View all
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            title="No leads yet"
            description="Run the scraper to start finding leads"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  {['Company', 'Job Title', 'City', 'Platform', 'Status', 'Date'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {recent.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => navigate('/leads')}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 max-w-[160px] truncate">
                      {lead.companyName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[160px] truncate">
                      {lead.jobTitle}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {lead.city}
                    </td>
                    <td className="px-4 py-3">
                      <PlatformBadge platform={lead.platform} />
                    </td>
                    <td className="px-4 py-3">
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(lead.datePosted)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  )
}