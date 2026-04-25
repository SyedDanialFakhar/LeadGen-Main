// src/components/enrichment/ContactFinderModal.tsx
import { useEffect, useState, useCallback } from 'react'
import {
  Building2, CheckCircle2, XCircle, AlertCircle, ChevronRight,
  UserCheck, Search, Mail, Linkedin, ExternalLink, Users,
  SkipForward, Loader2, Zap, Globe, Award, Info,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useContactFinder, type LeadFinderEntry } from '@/hooks/useContactFinder'
import type { Lead } from '@/types'
import type { ContactDecision, ContactFinderPhase } from '@/services/contactFinderService'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContactFinderModalProps {
  isOpen: boolean
  leads: Lead[]
  onConfirm: (decisions: ContactDecision[]) => void
  onClose: () => void
}

// ─── Step definitions ─────────────────────────────────────────────────────────

interface Step {
  phase: ContactFinderPhase[]
  label: string
  icon: React.ElementType
}

const STEPS: Step[] = [
  { phase: ['finding_company'], label: 'Company lookup', icon: Building2 },
  { phase: ['checking_size'],   label: 'Size check',     icon: Users },
  { phase: ['finding_contact'], label: 'Find person',    icon: Search },
  { phase: ['finding_email'],   label: 'Get email',      icon: Mail },
]

function getStepStatus(step: Step, currentPhase: ContactFinderPhase): 'done' | 'active' | 'upcoming' {
  const completedPhases: ContactFinderPhase[] = ['done', 'skipped', 'error']
  const phaseOrder: ContactFinderPhase[] = [
    'idle', 'finding_company', 'checking_size', 'finding_contact', 'finding_email',
    'done', 'skipped', 'error',
  ]

  if (completedPhases.includes(currentPhase)) return 'done'
  const stepIdx = Math.max(...step.phase.map(p => phaseOrder.indexOf(p)))
  const curIdx = phaseOrder.indexOf(currentPhase)
  if (curIdx > stepIdx) return 'done'
  if (step.phase.includes(currentPhase)) return 'active'
  return 'upcoming'
}

// ─── StepTracker (the 4-step flow bar for a single lead) ─────────────────────

function StepTracker({ phase }: { phase: ContactFinderPhase }) {
  if (phase === 'idle') return null

  return (
    <div className="flex items-center gap-1 mt-2">
      {STEPS.map((step, i) => {
        const status = getStepStatus(step, phase)
        const Icon = step.icon
        return (
          <div key={i} className="flex items-center gap-1 flex-1">
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all flex-1 justify-center',
                status === 'done' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                status === 'active' && 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-600',
                status === 'upcoming' && 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600',
              )}
            >
              {status === 'active' ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" />
              ) : status === 'done' ? (
                <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
              ) : (
                <Icon className="w-2.5 h-2.5 shrink-0" />
              )}
              <span className="hidden sm:inline truncate">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-4 h-px shrink-0 transition-colors',
                  status === 'done' ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-slate-200 dark:bg-slate-700',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── LeadProgressRow (running view) ──────────────────────────────────────────

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
        'rounded-xl border p-3 transition-all duration-300',
        isActive && 'border-indigo-200 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-900/20 shadow-sm',
        hasEmail && 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10',
        isDone && !hasEmail && 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50',
        isSkipped && 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 opacity-75',
        isError && 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10',
        isIdle && 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/30 opacity-40',
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2.5">
        {/* Status icon */}
        <div className="shrink-0 w-5 h-5 flex items-center justify-center">
          {isIdle && <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />}
          {isActive && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
          {hasEmail && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          {isDone && !hasEmail && !result.contactName && <AlertCircle className="w-4 h-4 text-slate-400" />}
          {isDone && !hasEmail && result.contactName && <UserCheck className="w-4 h-4 text-slate-500" />}
          {isSkipped && <SkipForward className="w-4 h-4 text-amber-500" />}
          {isError && <XCircle className="w-4 h-4 text-red-500" />}
        </div>

        {/* Company name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
              {result.companyName}
            </span>
            {result.industry && (
              <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-slate-500 truncate">
                {result.industry}
              </span>
            )}
          </div>

          {/* Sub-line: contact name or status */}
          {isDone && result.contactName && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {result.contactName}
              {result.contactTitle && <span className="text-slate-400"> · {result.contactTitle}</span>}
            </p>
          )}
          {isSkipped && result.skipReason && (
            <p className="text-xs text-amber-600 dark:text-amber-400 truncate">{result.skipReason}</p>
          )}
          {isError && result.error && (
            <p className="text-xs text-red-500 truncate">{result.error}</p>
          )}
          {isDone && !result.contactName && !result.skipReason && (
            <p className="text-xs text-slate-400 italic">No matching contact found</p>
          )}
        </div>

        {/* Right badges */}
        <div className="shrink-0 flex items-center gap-1.5">
          {result.employeeCount !== null && (
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">
              {result.employeeCount.toLocaleString()} emp
            </span>
          )}
          {hasEmail && result.emailSource && (
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full',
                result.emailSource === 'apollo'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
              )}
            >
              {result.emailSource}
            </span>
          )}
        </div>
      </div>

      {/* Step tracker (only show for active lead) */}
      {isActive && <StepTracker phase={result.phase} />}
    </div>
  )
}

// ─── Email status badge ───────────────────────────────────────────────────────

function EmailStatusBadge({ status }: { status: string | null }) {
  if (!status) return null
  const map: Record<string, string> = {
    verified: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    likely_to_engage: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    unverified: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    unavailable: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  }
  const label: Record<string, string> = {
    verified: '✓ Verified',
    likely_to_engage: 'Likely valid',
    unverified: 'Unverified',
    unavailable: 'Unavailable',
  }
  const cls = map[status] ?? 'bg-slate-100 text-slate-500'
  return (
    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide', cls)}>
      {label[status] ?? status}
    </span>
  )
}

// ─── ContactResultCard (review view) ─────────────────────────────────────────

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

  // Skipped / error / no contact — compact info card
  if (result.phase === 'skipped') {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/20 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <SkipForward className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
              {result.companyName}
              {result.employeeCount && (
                <span className="text-xs font-normal text-slate-400 ml-2">
                  {result.employeeCount.toLocaleString()} employees
                </span>
              )}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">{result.skipReason}</p>
          </div>
          <span className="shrink-0 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 font-semibold px-1.5 py-0.5 rounded">
            SKIPPED
          </span>
        </div>
      </div>
    )
  }

  if (result.phase === 'error') {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-900/20 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{result.companyName}</p>
            <p className="text-xs text-red-500">{result.error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!result.contactName) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{result.companyName}</p>
            <p className="text-xs text-slate-400">
              No matching contact found on Apollo
              {result.employeeCount !== null && ` · ${result.employeeCount.toLocaleString()} employees`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border-2 transition-all duration-200',
        accepted
          ? 'border-emerald-300 dark:border-emerald-600 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-900/20 dark:to-slate-800'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
            {result.companyName}
          </span>
          {result.employeeCount !== null && (
            <span className="shrink-0 text-xs text-slate-400">
              {result.employeeCount.toLocaleString()} emp
            </span>
          )}
          {result.industry && (
            <span className="hidden md:inline shrink-0 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
              {result.industry}
            </span>
          )}
        </div>

        <button
          onClick={onToggle}
          className={cn(
            'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
            accepted
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600',
          )}
        >
          {accepted
            ? <><CheckCircle2 className="w-3.5 h-3.5" /> Accepted</>
            : <><XCircle className="w-3.5 h-3.5" /> Skip</>
          }
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 dark:bg-slate-700/50 mx-4" />

      {/* Contact details */}
      <div className="px-4 py-3 space-y-2">
        {/* Name + Title */}
        <div className="flex items-start gap-2">
          <UserCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {result.contactName}
            </span>
            {result.contactTitle && (
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                {result.contactTitle}
              </span>
            )}
          </div>
        </div>

        {/* Email */}
        {result.contactEmail ? (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm text-slate-700 dark:text-slate-200 font-mono">
              {result.contactEmail}
            </span>
            <EmailStatusBadge status={result.emailStatus} />
            {result.emailSource && (
              <span
                className={cn(
                  'shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full tracking-wide',
                  result.emailSource === 'apollo'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
                )}
              >
                {result.emailSource}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
            <span className="text-xs text-slate-400 italic">
              Email not found — contact can still be saved
            </span>
          </div>
        )}

        {/* LinkedIn profile */}
        {result.contactLinkedinUrl && (
          <div className="flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-[#0077B5] shrink-0" />
            <a
              href={result.contactLinkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              onClick={e => e.stopPropagation()}
            >
              LinkedIn Profile
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        )}
      </div>

      {/* Company links footer */}
      {(result.companyWebsite || result.companyLinkedinUrl) && (
        <div className="flex items-center gap-4 px-4 pb-3 pt-1 border-t border-slate-100 dark:border-slate-700/50">
          {result.companyWebsite && (
            <a
              href={result.companyWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <Globe className="w-3 h-3" />
              Website
            </a>
          )}
          {result.companyLinkedinUrl && (
            <a
              href={result.companyLinkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#0077B5] transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <Linkedin className="w-3 h-3" />
              Company Page
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Summary stats bar ────────────────────────────────────────────────────────

function SummaryBar({
  entries,
  totalCreditsUsed,
}: {
  entries: LeadFinderEntry[]
  totalCreditsUsed: number
}) {
  const withEmail = entries.filter(e => e.result.contactEmail).length
  const withContact = entries.filter(e => e.result.contactName && !e.result.contactEmail).length
  const skipped = entries.filter(e => e.result.phase === 'skipped').length
  const notFound = entries.filter(
    e => e.result.phase === 'done' && !e.result.contactName,
  ).length

  return (
    <div className="flex items-center gap-3 px-6 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex-wrap">
      {withEmail > 0 && (
        <div className="flex items-center gap-1.5 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">{withEmail}</span>
          <span className="text-slate-500">with email</span>
        </div>
      )}
      {withContact > 0 && (
        <div className="flex items-center gap-1.5 text-xs">
          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-600 dark:text-slate-300">{withContact}</span>
          <span className="text-slate-500">contact only</span>
        </div>
      )}
      {skipped > 0 && (
        <div className="flex items-center gap-1.5 text-xs">
          <SkipForward className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-amber-600 dark:text-amber-400">{skipped}</span>
          <span className="text-slate-500">too large</span>
        </div>
      )}
      {notFound > 0 && (
        <div className="flex items-center gap-1.5 text-xs">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-500">{notFound}</span>
          <span className="text-slate-500">not found</span>
        </div>
      )}
      <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
        <Zap className="w-3.5 h-3.5" />
        <span>{totalCreditsUsed} Apollo credit{totalCreditsUsed !== 1 ? 's' : ''} used</span>
      </div>
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
  const { entries, activeIndex, isRunning, isDone, totalCreditsUsed, runForLeads, stop, reset } =
    useContactFinder()

  const [decisions, setDecisions] = useState<Record<string, boolean>>({})
  const [hasStarted, setHasStarted] = useState(false)

  // Auto-start when modal opens
  useEffect(() => {
    if (isOpen && leads.length > 0 && !hasStarted) {
      setHasStarted(true)
      runForLeads(leads)
    }
  }, [isOpen, leads, hasStarted, runForLeads])

  // Auto-accept contacts that have an email
  useEffect(() => {
    if (isDone && entries.length > 0) {
      const auto: Record<string, boolean> = {}
      entries.forEach(e => {
        // Accept if we found a contact (even without email)
        auto[e.result.leadId] =
          e.result.phase === 'done' && !!e.result.contactName
      })
      setDecisions(auto)
    }
  }, [isDone, entries])

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      reset()
      setHasStarted(false)
      setDecisions({})
    }
  }, [isOpen, reset])

  // Keyboard: Enter = confirm, Escape = close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || isRunning) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && isDone && acceptedCount > 0) handleConfirm()
    },
    [isOpen, isRunning, isDone],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

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
    onConfirm(
      entries.map(e => ({
        leadId: e.result.leadId,
        accept: decisions[e.result.leadId] ?? false,
        contactName: e.result.contactName,
        contactTitle: e.result.contactTitle,
        contactLinkedinUrl: e.result.contactLinkedinUrl,
        contactEmail: e.result.contactEmail,
        employeeCount: e.result.employeeCount,
        companyLinkedinUrl: e.result.companyLinkedinUrl,
        companyWebsite: e.result.companyWebsite,
        industry: e.result.industry,
      }))
    )
  }

  const completedCount = entries.filter(e =>
    ['done', 'skipped', 'error'].includes(e.result.phase),
  ).length

  const acceptedCount = Object.values(decisions).filter(Boolean).length
  const hasAnyResult = entries.some(e => e.result.contactName)

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
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900/50">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Contact Finder
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    via Apollo.io
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isRunning
                    ? `Searching ${leads.length} compan${leads.length !== 1 ? 'ies' : 'y'}…`
                    : isDone
                    ? `Processed ${leads.length} compan${leads.length !== 1 ? 'ies' : 'y'}`
                    : `${leads.length} lead${leads.length !== 1 ? 's' : ''} queued`}
                </p>
              </div>
            </div>

            {!isRunning && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* ── Progress bar ── */}
          {(isRunning || isDone) && leads.length > 0 && (
            <div className="px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>{completedCount} / {leads.length} processed</span>
                {isRunning && activeIndex >= 0 && (
                  <span className="text-indigo-500 dark:text-indigo-400">
                    {entries[activeIndex]?.result.companyName}…
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-700 ease-out"
                  style={{
                    width: leads.length > 0
                      ? `${(completedCount / leads.length) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Summary bar (done only) ── */}
          {isDone && entries.length > 0 && (
            <SummaryBar entries={entries} totalCreditsUsed={totalCreditsUsed} />
          )}

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto">
            {/* Running view */}
            {isRunning && (
              <div className="px-6 py-4 space-y-2">
                {entries.map((entry, i) => (
                  <LeadProgressRow
                    key={entry.result.leadId}
                    entry={entry}
                    isActive={i === activeIndex}
                  />
                ))}
              </div>
            )}

            {/* Done view */}
            {isDone && (
              <div className="px-6 py-4 space-y-3">
                {/* Bulk actions */}
                {entries.length > 1 && hasAnyResult && (
                  <div className="flex items-center gap-2 pb-1">
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
                      {acceptedCount} of {entries.filter(e => e.result.contactName).length} selected
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

                {/* Credit info note */}
                <div className="flex items-start gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 mt-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {totalCreditsUsed} Apollo credit{totalCreditsUsed !== 1 ? 's' : ''} used.
                    Employee counts come from LinkedIn via Apollo. Emails from Apollo require 1 credit each.
                    Hunter.io is used as fallback when Apollo doesn't return an email.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
            {isRunning ? (
              <>
                <p className="text-xs text-slate-400">
                  Searching Apollo — each company takes a few seconds…
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
                    : 'Toggle cards above to select contacts'}
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
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md active:scale-95'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed',
                    )}
                  >
                    Save {acceptedCount > 0 ? acceptedCount : ''}{' '}
                    Contact{acceptedCount !== 1 ? 's' : ''}
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