// src/components/enrichment/ContactFinderModal.tsx
import { useEffect, useState } from 'react'
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  UserCheck,
  Search,
  Mail,
  Linkedin,
  ExternalLink,
  Users,
  SkipForward,
  Loader2,
  Clock,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useContactFinder, type LeadFinderEntry } from '@/hooks/useContactFinder'
import type { Lead } from '@/types'
import type {
  ContactDecision,
  ContactFinderPhase,
} from '@/services/contactFinderService'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContactFinderModalProps {
  isOpen: boolean
  leads: Lead[]
  onConfirm: (decisions: ContactDecision[]) => void
  onClose: () => void
}

// ─── Phase display config ─────────────────────────────────────────────────────

const PHASE_LABELS: Record<ContactFinderPhase, string> = {
  idle: 'Waiting…',
  finding_company: 'Looking up company on Apollo…',
  checking_size: 'Checking employee count…',
  finding_contact: 'Searching for the right person…',
  finding_email: 'Finding email address…',
  done: 'Done',
  skipped: 'Skipped',
  error: 'Error',
}

const PHASE_ICONS: Record<ContactFinderPhase, React.ElementType> = {
  idle: Clock,
  finding_company: Building2,
  checking_size: Users,
  finding_contact: Search,
  finding_email: Mail,
  done: CheckCircle2,
  skipped: SkipForward,
  error: AlertCircle,
}

// ─── PhaseIndicator ───────────────────────────────────────────────────────────

function PhaseIndicator({ phase }: { phase: ContactFinderPhase }) {
  const Icon = PHASE_ICONS[phase]
  const isActive = !['done', 'skipped', 'error', 'idle'].includes(phase)

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs',
        phase === 'done' && 'text-emerald-600 dark:text-emerald-400',
        phase === 'skipped' && 'text-amber-600 dark:text-amber-400',
        phase === 'error' && 'text-red-600 dark:text-red-400',
        phase === 'idle' && 'text-slate-400',
        isActive && 'text-indigo-600 dark:text-indigo-400',
      )}
    >
      {isActive ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
      <span>{PHASE_LABELS[phase]}</span>
    </div>
  )
}

// ─── LeadProgressRow (used while running) ────────────────────────────────────

function LeadProgressRow({
  entry,
  isActive,
}: {
  entry: LeadFinderEntry
  isActive: boolean
}) {
  const { result } = entry
  const isDone = result.phase === 'done'
  const isSkipped = result.phase === 'skipped'
  const isError = result.phase === 'error'
  const isIdle = result.phase === 'idle'
  const hasEmail = isDone && !!result.contactEmail

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all',
        isActive &&
          'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700',
        hasEmail &&
          'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800',
        isDone &&
          !hasEmail &&
          'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
        isSkipped &&
          'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 opacity-75',
        isError &&
          'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
        isIdle && 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-40',
      )}
    >
      {/* Status dot / icon */}
      <div className="shrink-0 w-4 flex justify-center">
        {isIdle && (
          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
        )}
        {isActive && (
          <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
        )}
        {hasEmail && (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        )}
        {isDone && !hasEmail && (
          <AlertCircle className="w-4 h-4 text-slate-400" />
        )}
        {isSkipped && (
          <SkipForward className="w-4 h-4 text-amber-500" />
        )}
        {isError && <XCircle className="w-4 h-4 text-red-500" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
          {result.companyName}
        </p>
        {isActive && <PhaseIndicator phase={result.phase} />}
        {isDone && result.contactName && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {result.contactName}
            {result.contactTitle && ` · ${result.contactTitle}`}
          </p>
        )}
        {(isSkipped || (isDone && !result.contactName)) &&
          result.skipReason && (
            <p className="text-xs text-amber-600 dark:text-amber-400 truncate">
              {result.skipReason}
            </p>
          )}
        {isError && result.error && (
          <p className="text-xs text-red-500 truncate">{result.error}</p>
        )}
      </div>

      {/* Email source badge */}
      {hasEmail && result.emailSource && (
        <span
          className={cn(
            'shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-full tracking-wide',
            result.emailSource === 'apollo'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
              : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
          )}
        >
          {result.emailSource === 'apollo' ? 'Apollo' : 'Hunter'}
        </span>
      )}

      {/* Employee count */}
      {result.employeeCount !== null && (
        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
          {result.employeeCount.toLocaleString()} emp
        </span>
      )}
    </div>
  )
}

// ─── ContactResultCard (used in review view) ──────────────────────────────────

function ContactResultCard({
  entry,
  accepted,
  onToggle,
}: {
  entry: LeadFinderEntry
  accepted: boolean
  onToggle: () => void
}) {
  const { result } = entry

  if (result.phase === 'skipped') {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
        <div className="flex items-center gap-2 mb-1">
          <SkipForward className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {result.companyName}
          </span>
          {result.employeeCount !== null && (
            <span className="text-xs text-slate-400">
              ({result.employeeCount.toLocaleString()} employees)
            </span>
          )}
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-400 pl-6">
          {result.skipReason}
        </p>
      </div>
    )
  }

  if (result.phase === 'error') {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {result.companyName}
          </span>
        </div>
        <p className="text-xs text-red-500 pl-6">{result.error}</p>
      </div>
    )
  }

  if (!result.contactName) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {result.companyName}
          </span>
        </div>
        <p className="text-xs text-slate-400 pl-6">
          No suitable contact found on Apollo for this company
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border-2 p-4 transition-all duration-200',
        accepted
          ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
      )}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
            {result.companyName}
          </span>
          {result.employeeCount !== null && (
            <span className="text-xs text-slate-400 shrink-0">
              · {result.employeeCount.toLocaleString()} emp
            </span>
          )}
        </div>

        <button
          onClick={onToggle}
          className={cn(
            'shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
            accepted
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600',
          )}
        >
          {accepted ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" /> Accept
            </>
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5" /> Skip
            </>
          )}
        </button>
      </div>

      {/* Contact details */}
      <div className="space-y-1.5 pl-1">
        {/* Name + Title */}
        <div className="flex items-center gap-2">
          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {result.contactName}
          </span>
          {result.contactTitle && (
            <span className="text-xs text-slate-400 truncate">
              — {result.contactTitle}
            </span>
          )}
        </div>

        {/* Email */}
        {result.contactEmail ? (
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {result.contactEmail}
            </span>
            {result.emailSource && (
              <span
                className={cn(
                  'px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-full tracking-wide shrink-0',
                  result.emailSource === 'apollo'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
                )}
              >
                {result.emailSource === 'apollo' ? 'Apollo' : 'Hunter'}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="text-xs text-slate-400 italic">
              Email not found — will save contact without email
            </span>
          </div>
        )}

        {/* LinkedIn profile */}
        {result.contactLinkedinUrl && (
          <div className="flex items-center gap-2">
            <Linkedin className="w-3.5 h-3.5 text-[#0077B5] shrink-0" />
            <a
              href={result.contactLinkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View LinkedIn Profile
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Company links */}
      {(result.companyWebsite || result.companyLinkedinUrl) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700 flex items-center gap-4">
          {result.companyWebsite && (
            <a
              href={result.companyWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Website
            </a>
          )}
          {result.companyLinkedinUrl && (
            <a
              href={result.companyLinkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              <Linkedin className="w-3 h-3" />
              Company LinkedIn
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function ContactFinderModal({
  isOpen,
  leads,
  onConfirm,
  onClose,
}: ContactFinderModalProps) {
  const { entries, activeIndex, isRunning, isDone, runForLeads, stop, reset } =
    useContactFinder()

  // Track which results the user has accepted (true) or skipped (false)
  const [decisions, setDecisions] = useState<Record<string, boolean>>({})
  const [hasStarted, setHasStarted] = useState(false)

  // Auto-start the finder when modal opens
  useEffect(() => {
    if (isOpen && leads.length > 0 && !hasStarted) {
      setHasStarted(true)
      runForLeads(leads)
    }
  }, [isOpen, leads, hasStarted, runForLeads])

  // Auto-accept contacts that have an email when processing completes
  useEffect(() => {
    if (isDone && entries.length > 0) {
      const auto: Record<string, boolean> = {}
      entries.forEach(e => {
        auto[e.result.leadId] =
          e.result.phase === 'done' && !!e.result.contactEmail
      })
      setDecisions(auto)
    }
  }, [isDone, entries])

  // Clean up when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset()
      setHasStarted(false)
      setDecisions({})
    }
  }, [isOpen, reset])

  if (!isOpen) return null

  const toggle = (leadId: string) =>
    setDecisions(prev => ({ ...prev, [leadId]: !prev[leadId] }))

  const acceptAll = () => {
    const all: Record<string, boolean> = {}
    entries.forEach(e => {
      if (e.result.contactName) all[e.result.leadId] = true
    })
    setDecisions(all)
  }

  const skipAll = () => setDecisions({})

  const handleConfirm = () => {
    const result: ContactDecision[] = entries.map(e => ({
      leadId: e.result.leadId,
      accept: decisions[e.result.leadId] ?? false,
      contactName: e.result.contactName,
      contactTitle: e.result.contactTitle,
      contactLinkedinUrl: e.result.contactLinkedinUrl,
      contactEmail: e.result.contactEmail,
      employeeCount: e.result.employeeCount,
      companyLinkedinUrl: e.result.companyLinkedinUrl,
      companyWebsite: e.result.companyWebsite,
    }))
    onConfirm(result)
  }

  // ── Computed stats ────────────────────────────────────────────────────────
  const completedCount = entries.filter(e =>
    ['done', 'skipped', 'error'].includes(e.result.phase),
  ).length
  const foundEmailCount = entries.filter(
    e => e.result.phase === 'done' && e.result.contactEmail,
  ).length
  const foundContactCount = entries.filter(
    e => e.result.phase === 'done' && e.result.contactName,
  ).length
  const acceptedCount = Object.values(decisions).filter(Boolean).length

  return (
    <>
      {/* Backdrop — not clickable while running */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={isRunning ? undefined : onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
                <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Contact Finder
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isRunning
                    ? `Processing ${leads.length} compan${leads.length !== 1 ? 'ies' : 'y'} via Apollo…`
                    : isDone
                    ? `Found ${foundEmailCount} email${foundEmailCount !== 1 ? 's' : ''}, ${foundContactCount} contact${foundContactCount !== 1 ? 's' : ''} across ${leads.length} compan${leads.length !== 1 ? 'ies' : 'y'}`
                    : `${leads.length} lead${leads.length !== 1 ? 's' : ''} queued`}
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

          {/* ── Progress bar ── */}
          {(isRunning || isDone) && (
            <div className="px-6 pt-3 pb-1">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span>
                  {completedCount} / {leads.length} processed
                </span>
                {isDone && foundEmailCount > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {foundEmailCount} email{foundEmailCount !== 1 ? 's' : ''} found
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width:
                      leads.length > 0
                        ? `${(completedCount / leads.length) * 100}%`
                        : '0%',
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Running view — compact per-lead progress */}
            {isRunning && (
              <div className="space-y-2">
                {entries.map((entry, i) => (
                  <LeadProgressRow
                    key={entry.result.leadId}
                    entry={entry}
                    isActive={i === activeIndex}
                  />
                ))}
              </div>
            )}

            {/* Done view — review and accept/skip */}
            {isDone && (
              <div className="space-y-3">
                {/* Accept/Skip All bar (only when multiple leads) */}
                {entries.length > 1 && (
                  <div className="flex items-center gap-2 pb-1">
                    <button
                      onClick={acceptAll}
                      className="px-2.5 py-1 text-xs rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 font-medium transition-colors"
                    >
                      Accept All
                    </button>
                    <button
                      onClick={skipAll}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300 font-medium transition-colors"
                    >
                      Skip All
                    </button>
                    <span className="text-xs text-slate-400 ml-1">
                      {acceptedCount} of {entries.length} selected
                    </span>
                  </div>
                )}

                {entries.map(entry => (
                  <ContactResultCard
                    key={entry.result.leadId}
                    entry={entry}
                    accepted={decisions[entry.result.leadId] ?? false}
                    onToggle={() => toggle(entry.result.leadId)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
            {isRunning ? (
              <>
                <p className="text-xs text-slate-400">
                  Please wait — Apollo searches take a few seconds each…
                </p>
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
                    ? `${acceptedCount} contact${acceptedCount !== 1 ? 's' : ''} will be saved to leads`
                    : 'Select contacts above to save them'}
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
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed',
                    )}
                  >
                    Save {acceptedCount > 0 ? acceptedCount : ''} Contact
                    {acceptedCount !== 1 ? 's' : ''}
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