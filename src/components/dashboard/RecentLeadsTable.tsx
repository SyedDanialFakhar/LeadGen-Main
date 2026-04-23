// src/components/dashboard/RecentLeadsTable.tsx
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Clock } from 'lucide-react'
import type { Lead } from '@/types'
import { formatDate } from '@/utils/dateUtils'

interface RecentLeadsTableProps {
  leads: Lead[]
  isLoading: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

const AVATAR_COLORS: Record<string, string> = {
  A: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  B: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  C: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  D: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  E: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  F: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  G: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  H: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  I: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  J: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
}

function avatarColor(name: string) {
  const letter = name?.[0]?.toUpperCase() ?? 'A'
  return (
    AVATAR_COLORS[letter] ??
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  )
}

// ─── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { dot: string; pill: string; label: string }
> = {
  new: {
    dot: 'bg-blue-400',
    pill: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800',
    label: 'New',
  },
  enriched: {
    dot: 'bg-violet-400',
    pill: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800',
    label: 'Enriched',
  },
  emailed: {
    dot: 'bg-amber-400',
    pill: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800',
    label: 'Emailed',
  },
  follow_up: {
    dot: 'bg-orange-400',
    pill: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-800',
    label: 'Follow-up',
  },
  converted: {
    dot: 'bg-emerald-400',
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800',
    label: 'Converted',
  },
  closed: {
    dot: 'bg-slate-400',
    pill: 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700',
    label: 'Closed',
  },
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    dot: 'bg-slate-300',
    pill: 'bg-slate-50 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700',
    label: status,
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${cfg.pill}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ─── Platform badge ────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { cls: string; label: string }> = {
  seek: {
    cls: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800',
    label: 'Seek',
  },
  linkedin: {
    cls: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800',
    label: 'LinkedIn',
  },
  indeed: {
    cls: 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-800',
    label: 'Indeed',
  },
}

function PlatformChip({ platform }: { platform: string }) {
  const cfg = PLATFORM_CONFIG[platform?.toLowerCase()] ?? {
    cls: 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700',
    label: platform,
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ring-inset ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  )
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
          <div className="h-3.5 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-5 w-14 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
      </td>
    </tr>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyLeads() {
  return (
    <tr>
      <td colSpan={6}>
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <Clock className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            No leads yet
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[200px]">
            Run the scraper to start finding leads and they'll show up here.
          </p>
        </div>
      </td>
    </tr>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RecentLeadsTable({ leads, isLoading }: RecentLeadsTableProps) {
  const navigate = useNavigate()
  const recent = leads.slice(0, 10)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-slate-900 dark:text-white text-base tracking-tight">
            Recent Leads
          </h3>
          {!isLoading && recent.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
              {recent.length} of {leads.length}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/leads')}
          className="group flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          View all
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
              {[
                { label: 'Company', cls: 'pl-5' },
                { label: 'Role', cls: '' },
                { label: 'City', cls: '' },
                { label: 'Platform', cls: '' },
                { label: 'Status', cls: '' },
                { label: 'Posted', cls: 'pr-5' },
              ].map(({ label, cls }) => (
                <th
                  key={label}
                  className={`py-2.5 text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap px-3 first:pl-5 last:pr-5 ${cls}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/80">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : recent.length === 0 ? (
              <EmptyLeads />
            ) : (
              recent.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => navigate('/leads')}
                  className="group hover:bg-blue-50/40 dark:hover:bg-blue-900/10 cursor-pointer transition-colors duration-100"
                >
                  {/* Company */}
                  <td className="px-3 pl-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(lead.companyName)}`}
                      >
                        {getInitials(lead.companyName)}
                      </div>
                      <span className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[130px] group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                        {lead.companyName}
                      </span>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400 max-w-[150px]">
                    <span className="truncate block">{lead.jobTitle}</span>
                  </td>

                  {/* City */}
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {lead.city || '—'}
                  </td>

                  {/* Platform */}
                  <td className="px-3 py-3">
                    <PlatformChip platform={lead.platform} />
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3">
                    <StatusPill status={lead.status} />
                  </td>

                  {/* Date */}
                  <td className="px-3 pr-5 py-3 text-slate-400 dark:text-slate-500 whitespace-nowrap text-xs">
                    {formatDate(lead.datePosted)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer — only when there are more leads than shown */}
      {!isLoading && leads.length > 10 && (
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
          <button
            onClick={() => navigate('/leads')}
            className="w-full text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            + {leads.length - 10} more leads — view all
          </button>
        </div>
      )}
    </div>
  )
}