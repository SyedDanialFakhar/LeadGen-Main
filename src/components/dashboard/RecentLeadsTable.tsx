// src/components/dashboard/RecentLeadsTable.tsx
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Clock } from 'lucide-react'
import type { Lead } from '@/types'
import { formatDate } from '@/utils/dateUtils'

interface RecentLeadsTableProps {
  leads: Lead[]
  isLoading: boolean
}

// ─── Avatar helpers ────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

const LETTER_COLORS: Record<string, string> = {
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
  K: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  L: 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300',
  M: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
}

function avatarColor(name: string) {
  const letter = name?.[0]?.toUpperCase() ?? 'A'
  return LETTER_COLORS[letter] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
}

// ─── Email Status badge ───────────────────────────────────────────────────────
// Matches real LeadStatus: 'Not Sent' | 'Closed' | 'Email 1' | 'Email 2' | 'Email 3' | 'Sequence Closed'

const STATUS_CONFIG: Record<string, { dot: string; pill: string; label: string }> = {
  'Not Sent': {
    dot: 'bg-slate-400',
    pill: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700',
    label: 'Not Sent',
  },
  'Email 1': {
    dot: 'bg-blue-400',
    pill: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800',
    label: 'Email 1',
  },
  'Email 2': {
    dot: 'bg-violet-400',
    pill: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800',
    label: 'Email 2',
  },
  'Email 3': {
    dot: 'bg-amber-400',
    pill: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800',
    label: 'Email 3',
  },
  'Sequence Closed': {
    dot: 'bg-orange-400',
    pill: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-800',
    label: 'Seq. Closed',
  },
  Closed: {
    dot: 'bg-red-400',
    pill: 'bg-red-50 text-red-600 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800',
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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset whitespace-nowrap ${cfg.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ─── Response indicator ───────────────────────────────────────────────────────

const RESPONSE_CONFIG = {
  positive: { dot: 'bg-emerald-400', label: 'Positive', cls: 'text-emerald-600 dark:text-emerald-400' },
  negative: { dot: 'bg-red-400',     label: 'Negative', cls: 'text-red-500 dark:text-red-400' },
  none:     { dot: 'bg-slate-300',   label: 'No reply', cls: 'text-slate-400 dark:text-slate-500' },
} as const

type ResponseKey = keyof typeof RESPONSE_CONFIG

function resolveResponseKey(response: string | null | undefined): ResponseKey {
  if (response === 'positive') return 'positive'
  if (response === 'negative') return 'negative'
  return 'none' // covers null, '', 'none'
}

// ─── Platform chip ────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { cls: string; label: string }> = {
  seek:     { cls: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800',         label: 'Seek' },
  linkedin: { cls: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800',   label: 'LinkedIn' },
  indeed:   { cls: 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-800', label: 'Indeed' },
}

function PlatformChip({ platform }: { platform: string }) {
  const cfg = PLATFORM_CONFIG[platform?.toLowerCase()] ?? {
    cls: 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700',
    label: platform,
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ring-inset ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[140, 120, 72, 60, 88, 64, 64].map((w, i) => (
        <td key={i} className="px-3 py-3.5 first:pl-5 last:pr-5">
          <div className={`h-3.5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse`} style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyLeads() {
  return (
    <tr>
      <td colSpan={7}>
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <Clock className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">No leads yet</p>
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
              {['Company', 'Role', 'City', 'Platform', 'Email Status', 'Response', 'Posted'].map((label) => (
                <th
                  key={label}
                  className="py-2.5 px-3 first:pl-5 last:pr-5 text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap"
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
              recent.map((lead) => {
                const responseKey = resolveResponseKey(lead.response)
                const responseCfg = RESPONSE_CONFIG[responseKey]

                return (
                  <tr
                    key={lead.id}
                    onClick={() => navigate('/leads')}
                    className="group hover:bg-blue-50/40 dark:hover:bg-blue-900/10 cursor-pointer transition-colors duration-100"
                  >
                    {/* Company */}
                    <td className="px-3 pl-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {lead.companyLogo ? (
                          <img
                            src={lead.companyLogo}
                            alt={lead.companyName}
                            className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-100 dark:border-slate-700 shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const sibling = e.currentTarget.nextElementSibling as HTMLElement
                              if (sibling) sibling.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-8 h-8 rounded-lg items-center justify-center text-xs font-bold shrink-0 ${avatarColor(lead.companyName)} ${lead.companyLogo ? 'hidden' : 'flex'}`}
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

                    {/* Email Status */}
                    <td className="px-3 py-3">
                      <StatusPill status={lead.status} />
                    </td>

                    {/* Response */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${responseCfg.dot}`} />
                        <span className={`text-xs font-medium ${responseCfg.cls}`}>
                          {responseCfg.label}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-3 pr-5 py-3 text-slate-400 dark:text-slate-500 whitespace-nowrap text-xs">
                      {formatDate(lead.datePosted)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
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