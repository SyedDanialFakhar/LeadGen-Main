// src/components/leads/CompanyEnrichmentModal.tsx
import { useEffect } from 'react'
import {
  Linkedin, XCircle, CheckCircle2, AlertCircle, Loader2,
  Building2, Users, Globe, ExternalLink, ChevronRight,
  SkipForward, ShieldCheck, Info, Zap,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useCompanyEnrichment } from '@/hooks/useCompanyEnrichment'
import type { Lead } from '@/types'
import type { LinkedInCompanyMatch } from '@/services/linkedinCompanySearch'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface CompanyEnrichmentDecision {
  leadId: string
  accept: boolean
  linkedinUrl: string | null
  employeeCount: number | null
  industry: string | null
  websiteUrl: string | null
  companyPhone: string | null
}

interface CompanyEnrichmentModalProps {
  isOpen: boolean
  leads: Lead[]
  onConfirm: (decisions: CompanyEnrichmentDecision[]) => void
  onClose: () => void
}

// ─── Progress row (while running) ─────────────────────────────────────────────

function ProgressRow({
  lead,
  phase,
  isActive,
}: {
  lead: Lead
  phase: 'idle' | 'searching' | 'done' | 'error' | 'skipped'
  isActive: boolean
}) {
  const isIdle     = phase === 'idle'
  const isSearching = phase === 'searching'
  const isDone     = phase === 'done'
  const isError    = phase === 'error'

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-300',
      isActive    && 'border-indigo-200 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-900/20 shadow-sm',
      isDone      && 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10',
      isError     && 'border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-900/10',
      isIdle      && 'border-slate-100 dark:border-slate-800 opacity-35',
      !isActive && !isDone && !isError && !isIdle && 'border-slate-200 dark:border-slate-700',
    )}>
      <div className="shrink-0 w-5 flex justify-center">
        {isIdle      && <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />}
        {isSearching && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
        {isDone      && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        {isError     && <XCircle className="w-4 h-4 text-red-500" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
          {lead.companyName}
        </p>
        <p className="text-xs text-slate-400 truncate">{lead.city}</p>
      </div>

      <span className={cn(
        'shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wide',
        isIdle      && 'bg-slate-100 text-slate-400 dark:bg-slate-800',
        isSearching && 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300',
        isDone      && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        isError     && 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
      )}>
        {isIdle      ? 'Waiting'   : ''}
        {isSearching ? 'Searching' : ''}
        {isDone      ? 'Found'     : ''}
        {isError     ? 'Error'     : ''}
      </span>
    </div>
  )
}

// ─── Result card (after done) ─────────────────────────────────────────────────

function ResultCard({
  lead,
  match,
  error,
  accepted,
  onToggle,
}: {
  lead: Lead
  match: LinkedInCompanyMatch | null
  error: string | null
  accepted: boolean
  onToggle: () => void
}) {
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{lead.companyName}</p>
            <p className="text-xs text-red-500 mt-0.5 whitespace-pre-line">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{lead.companyName}</p>
            <p className="text-xs text-slate-400 mt-0.5 italic">No matching company found on LinkedIn</p>
          </div>
        </div>
      </div>
    )
  }

  // Format employee count display
  const empDisplay = match.employeeCount
    ? match.employeeCount.toLocaleString()
    : match.employeeCountRange
    ? `${match.employeeCountRange.start.toLocaleString()}–${match.employeeCountRange.end.toLocaleString()}`
    : null

  return (
    <div className={cn(
      'rounded-xl border-2 overflow-hidden transition-all duration-200',
      accepted
        ? 'border-emerald-300 dark:border-emerald-600 bg-gradient-to-b from-emerald-50/60 to-white dark:from-emerald-900/15 dark:to-slate-800'
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          {match.logo ? (
            <img
              src={match.logo}
              alt={match.name}
              className="w-7 h-7 rounded-md object-cover shrink-0 border border-slate-100 dark:border-slate-700"
              onError={e => (e.currentTarget.style.display = 'none')}
            />
          ) : (
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
          )}

          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px]">
              {match.name}
            </p>
            {match.tagline && (
              <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{match.tagline}</p>
            )}
          </div>

          {/* Match quality badge */}
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0',
            match.matchScore >= 85
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : match.matchScore >= 60
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
          )}>
            {match.matchScore >= 85 ? 'Exact' : match.matchScore >= 60 ? 'Close' : 'Partial'}
          </span>
        </div>

        <button
          onClick={onToggle}
          className={cn(
            'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95',
            accepted
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600',
          )}
        >
          {accepted
            ? <><CheckCircle2 className="w-3.5 h-3.5" /> Accepted</>
            : <><SkipForward className="w-3.5 h-3.5" /> Skip</>}
        </button>
      </div>

      {/* Details */}
      <div className="px-4 py-3 space-y-2">
        {/* LinkedIn URL */}
        <div className="flex items-center gap-2">
          <Linkedin className="w-4 h-4 text-[#0077B5] shrink-0" />
          <a
            href={match.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            onClick={e => e.stopPropagation()}
          >
            {match.linkedinUrl.replace('https://www.', '')}
            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
          </a>
        </div>

        {/* Employee count */}
        {empDisplay && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {empDisplay} employees
            </span>
            <span className="text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded font-medium">
              LinkedIn verified
            </span>
          </div>
        )}

        {/* Industry */}
        {match.industry && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500 dark:text-slate-400">{match.industry}</span>
          </div>
        )}

        {/* Website */}
        {match.websiteUrl && (
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
            <a
              href={match.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              onClick={e => e.stopPropagation()}
            >
              {match.websiteUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main modal ────────────────────────────────────────────────────────────────

export function CompanyEnrichmentModal({
  isOpen, leads, onConfirm, onClose,
}: CompanyEnrichmentModalProps) {
  const {
    entries, activeIndex, isRunning, isDone,
    acceptedCount, foundCount, errorCount, completedCount,
    runForLeads, toggleAccepted, acceptAll, skipAll, stop, reset,
  } = useCompanyEnrichment()

  // Auto-start
  useEffect(() => {
    if (isOpen && leads.length > 0) {
      runForLeads(leads)
    }
  }, [isOpen])

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      reset()
    }
  }, [isOpen])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen || isRunning) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && isDone && acceptedCount > 0) handleConfirm()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, isRunning, isDone, acceptedCount])

  const handleConfirm = () => {
    const decisions: CompanyEnrichmentDecision[] = entries.map(e => ({
      leadId:       e.lead.id,
      accept:       e.accepted,
      linkedinUrl:  e.match?.linkedinUrl ?? null,
      employeeCount: e.match?.employeeCount
        ?? (e.match?.employeeCountRange ? e.match.employeeCountRange.end : null),
      industry:     e.match?.industry ?? null,
      websiteUrl:   e.match?.websiteUrl ?? null,
      companyPhone: e.match?.phone ?? null,
    }))
    onConfirm(decisions)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={isRunning ? undefined : onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black/10 dark:ring-white/10 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-[#0077B5] shadow-md shadow-blue-200 dark:shadow-blue-900/50">
                <Linkedin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Company LinkedIn Finder
                  <span className="ml-1.5 text-xs font-normal text-slate-400">via Apify</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isRunning
                    ? `Searching ${leads.length} compan${leads.length > 1 ? 'ies' : 'y'} on LinkedIn…`
                    : isDone
                    ? `Done — ${completedCount}/${leads.length} processed · ${foundCount} found`
                    : `${leads.length} lead${leads.length > 1 ? 's' : ''} queued`}
                </p>
              </div>
            </div>
            {!isRunning && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Progress bar */}
          {(isRunning || isDone) && (
            <div className="px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>{completedCount} / {leads.length} processed</span>
                {isRunning && activeIndex >= 0 && entries[activeIndex] && (
                  <span className="text-indigo-500 font-medium truncate max-w-[200px]">
                    {entries[activeIndex].lead.companyName}…
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-[#0077B5] rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${leads.length > 0 ? (completedCount / leads.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Summary bar (after done) */}
          {isDone && entries.length > 0 && (
            <div className="flex items-center gap-4 px-6 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 shrink-0 text-xs flex-wrap">
              {foundCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{foundCount}</span>
                  <span className="text-slate-500">found</span>
                </div>
              )}
              {entries.length - foundCount - errorCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-slate-500">{entries.length - foundCount - errorCount}</span>
                  <span className="text-slate-500">not found</span>
                </div>
              )}
              {errorCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                  <span className="font-bold text-red-600 dark:text-red-400">{errorCount}</span>
                  <span className="text-slate-500">error</span>
                </div>
              )}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {/* Running view */}
            {isRunning && (
              <div className="px-6 py-4 space-y-2">
                {entries.map((entry, i) => (
                  <ProgressRow
                    key={entry.lead.id}
                    lead={entry.lead}
                    phase={entry.phase}
                    isActive={i === activeIndex}
                  />
                ))}
              </div>
            )}

            {/* Done view */}
            {isDone && (
              <div className="px-6 py-4 space-y-3">
                {/* Accept/Skip all */}
                {entries.length > 1 && foundCount > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={acceptAll}
                      className="px-2.5 py-1 text-xs rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 font-semibold transition-colors"
                    >
                      Accept All
                    </button>
                    <button
                      onClick={skipAll}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300 font-semibold transition-colors"
                    >
                      Skip All
                    </button>
                    <span className="text-xs text-slate-400">
                      {acceptedCount} / {foundCount} selected
                    </span>
                  </div>
                )}

                {entries.map(entry => (
                  <ResultCard
                    key={entry.lead.id}
                    lead={entry.lead}
                    match={entry.match}
                    error={entry.error}
                    accepted={entry.accepted}
                    onToggle={() => toggleAccepted(entry.lead.id)}
                  />
                ))}

                {/* Info footer */}
                <div className="flex items-start gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Company LinkedIn URL and employee count (LinkedIn-verified) will be saved.
                    Employee count from LinkedIn is used for size-gating in Contact Finder.
                    Press <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">Enter</span> to save,{' '}
                    <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">Esc</span> to close.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
            {isRunning ? (
              <>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Zap className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                  <span>Searching LinkedIn via Apify — each company takes ~30–60s…</span>
                </div>
                <button
                  onClick={stop}
                  className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
                >
                  Stop
                </button>
              </>
            ) : isDone ? (
              <>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {acceptedCount > 0
                    ? `${acceptedCount} company LinkedIn URL${acceptedCount > 1 ? 's' : ''} will be saved`
                    : 'Toggle cards above to select which to save'}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={acceptedCount === 0}
                    className={cn(
                      'flex items-center gap-2 px-5 py-2 text-sm rounded-xl font-semibold transition-all',
                      acceptedCount > 0
                        ? 'bg-[#0077B5] hover:bg-[#005885] text-white shadow-sm hover:shadow-md active:scale-95'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed',
                    )}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Save {acceptedCount > 0 ? acceptedCount : ''} LinkedIn URL{acceptedCount !== 1 ? 's' : ''}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}