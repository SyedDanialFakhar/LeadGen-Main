// src/components/enrichment/ContactFinderModal.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Building2, CheckCircle2, XCircle, AlertCircle, ChevronRight,
  UserCheck, Search, Mail, Linkedin, ExternalLink, Users,
  SkipForward, Loader2, Zap, Globe, Info, TrendingUp, Coins,
  ShieldCheck, Clock, ArrowUpRight,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useContactFinder, type LeadFinderEntry } from '@/hooks/useContactFinder'
import type { Lead } from '@/types'
import {
  type ContactDecision,
  type ContactFinderPhase,
  estimateCredits,
} from '@/services/contactFinderService'

interface ContactFinderModalProps {
  isOpen: boolean
  leads: Lead[]
  onConfirm: (decisions: ContactDecision[]) => void
  onClose: () => void
}

// ─── Step tracker config ───────────────────────────────────────────────────────

const PHASE_ORDER: ContactFinderPhase[] = [
  'finding_company', 'checking_size', 'finding_contact', 'finding_email',
]

const PHASE_META: Record<string, { label: string; icon: React.ElementType; free?: boolean }> = {
  finding_company:  { label: 'Company lookup', icon: Building2 },
  checking_size:    { label: 'Size check',     icon: Users,   free: true },
  finding_contact:  { label: 'Find person',    icon: Search,  free: true },
  finding_email:    { label: 'Get email',       icon: Mail },
}

function StepTracker({ phase }: { phase: ContactFinderPhase }) {
  if (phase === 'idle') return null
  const finished = ['done', 'skipped', 'error'].includes(phase)
  const curIdx = PHASE_ORDER.indexOf(phase)

  return (
    <div className="flex items-center gap-0 mt-2.5">
      {PHASE_ORDER.map((p, i) => {
        const meta   = PHASE_META[p]!
        const Icon   = meta.icon
        const isDone   = finished || i < curIdx
        const isActive = !finished && i === curIdx

        return (
          <div key={p} className="flex items-center flex-1 min-w-0">
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold flex-1 justify-center transition-all duration-300 min-w-0',
              isDone   && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
              isActive && 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 ring-1 ring-indigo-300/60',
              !isDone && !isActive && 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600',
            )}>
              {isActive ? <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" />
                : isDone ? <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                : <Icon className="w-2.5 h-2.5 shrink-0" />}
              <span className="hidden sm:inline truncate">{meta.label}</span>
              {meta.free && isActive && <span className="hidden md:inline text-[9px] opacity-60 ml-0.5">FREE</span>}
            </div>
            {i < PHASE_ORDER.length - 1 && (
              <div className={cn('w-1.5 h-px shrink-0', isDone ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-slate-200 dark:bg-slate-700')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── LeadProgressRow ─────────────────────────────────────────────────────────

function LeadProgressRow({ entry, isActive }: { entry: LeadFinderEntry; isActive: boolean }) {
  const { result } = entry
  const { phase } = result
  const isIdle    = phase === 'idle'
  const isRunning = !isIdle && !['done', 'skipped', 'error'].includes(phase)
  const isDone    = phase === 'done'
  const isSkipped = phase === 'skipped'
  const isError   = phase === 'error'
  const hasEmail  = isDone && !!result.contactEmail

  // Detect Seek vs LinkedIn count mismatch
  const seekN  = result.seekEmployeeCount
    ? parseInt(result.seekEmployeeCount.replace(/[^0-9]/g, ''))
    : null
  const countDiffers = seekN !== null && result.employeeCount !== null &&
    Math.abs(seekN - result.employeeCount) > 20

  return (
    <div className={cn(
      'rounded-xl border px-4 py-3 transition-all duration-300',
      isActive  && 'border-indigo-200 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-900/20 shadow-sm',
      hasEmail  && 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10',
      isDone && !hasEmail && 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60',
      isSkipped && 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 opacity-80',
      isError   && 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10',
      isIdle    && 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/30 opacity-35',
    )}>
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-5 flex justify-center">
          {isIdle    && <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />}
          {isRunning && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
          {hasEmail  && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          {isDone && !hasEmail && result.contactName && <UserCheck className="w-4 h-4 text-slate-400" />}
          {isDone && !hasEmail && !result.contactName && <AlertCircle className="w-4 h-4 text-slate-400" />}
          {isSkipped && <SkipForward className="w-4 h-4 text-amber-500" />}
          {isError   && <XCircle className="w-4 h-4 text-red-500" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
              {result.companyName}
            </span>
            {result.industry && (
              <span className="hidden sm:inline text-[10px] text-slate-400 truncate max-w-[100px]">
                {result.industry}
              </span>
            )}
          </div>
          {isDone && result.contactName && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {result.contactName}
              {result.contactTitle && <span className="text-slate-400"> · {result.contactTitle}</span>}
            </p>
          )}
          {isSkipped && result.skipReason && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 line-clamp-2">{result.skipReason}</p>
          )}
          {isError && result.error && (
            <p className="text-xs text-red-500 mt-0.5 line-clamp-2">{result.error}</p>
          )}
          {isDone && !result.contactName && !result.skipReason && (
            <p className="text-xs text-slate-400 italic mt-0.5">No matching contact found on Apollo</p>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
          {result.employeeCount !== null && (
            <div className="flex items-center gap-1">
              {countDiffers && (
                <span className="text-[9px] text-slate-300 dark:text-slate-600 line-through">
                  {result.seekEmployeeCount}
                </span>
              )}
              <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                {result.employeeCount.toLocaleString()}
                {countDiffers && <span className="text-indigo-400 ml-0.5">LI</span>}
              </span>
            </div>
          )}
          {hasEmail && result.emailSource && (
            <span className={cn(
              'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full tracking-wide',
              result.emailSource === 'apollo'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
            )}>
              {result.emailSource}
            </span>
          )}
        </div>
      </div>

      {isActive && <StepTracker phase={phase} />}
    </div>
  )
}

// ─── EmailStatusChip ──────────────────────────────────────────────────────────

function EmailStatusChip({ status }: { status: string | null }) {
  if (!status) return null
  const map: Record<string, { cls: string; text: string }> = {
    verified:         { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', text: '✓ Verified' },
    likely_to_engage: { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', text: 'Likely valid' },
    unverified:       { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', text: 'Unverified' },
    unavailable:      { cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400', text: 'Unavailable' },
  }
  const cfg = map[status] ?? { cls: 'bg-slate-100 text-slate-500', text: status }
  return (
    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0', cfg.cls)}>
      {cfg.text}
    </span>
  )
}

// ─── ContactResultCard ────────────────────────────────────────────────────────

function ContactResultCard({
  entry, accepted, onToggle,
}: { entry: LeadFinderEntry; accepted: boolean; onToggle: () => void }) {
  const { result } = entry

  const seekN = result.seekEmployeeCount
    ? parseInt(result.seekEmployeeCount.replace(/[^0-9]/g, ''))
    : null
  const countDiffers = seekN !== null && result.employeeCount !== null &&
    Math.abs(seekN - result.employeeCount) > 20

  if (result.phase === 'skipped') {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <SkipForward className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{result.companyName}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{result.skipReason}</p>
          </div>
          <span className="shrink-0 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 font-bold px-2 py-0.5 rounded uppercase">
            Skipped
          </span>
        </div>
      </div>
    )
  }

  if (result.phase === 'error') {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{result.companyName}</p>
            <p className="text-xs text-red-500 mt-0.5 whitespace-pre-wrap break-words">{result.error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!result.contactName) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{result.companyName}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              No contact found on Apollo
              {result.employeeCount !== null && ` · ${result.employeeCount.toLocaleString()} employees (LinkedIn)`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'rounded-xl border-2 overflow-hidden transition-all duration-200',
      accepted
        ? 'border-emerald-300 dark:border-emerald-600 bg-gradient-to-b from-emerald-50/60 to-white dark:from-emerald-900/15 dark:to-slate-800'
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
    )}>
      {/* Card header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-[180px]">
            {result.companyName}
          </span>

          {/* Employee count — shows correction if Apollo differs from Seek */}
          {result.employeeCount !== null && (
            <div className="flex items-center gap-1">
              {countDiffers && (
                <span className="text-[10px] text-slate-300 dark:text-slate-600 line-through">
                  {result.seekEmployeeCount}
                </span>
              )}
              <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                {result.employeeCount.toLocaleString()} emp
                {countDiffers && <span className="text-indigo-400 dark:text-indigo-500 ml-1 text-[9px]">LinkedIn</span>}
              </span>
            </div>
          )}

          {result.industry && (
            <span className="hidden lg:inline text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700/40 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">
              {result.industry}
            </span>
          )}
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
            : <><XCircle className="w-3.5 h-3.5" /> Skip</>
          }
        </button>
      </div>

      {/* Contact details */}
      <div className="px-4 py-3 space-y-2">
        {/* Name + Title */}
        <div className="flex items-start gap-2">
          <UserCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
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
          <div className="flex items-center gap-2 flex-wrap">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm text-slate-700 dark:text-slate-200 font-mono break-all">
              {result.contactEmail}
            </span>
            <EmailStatusChip status={result.emailStatus} />
            {result.emailSource && (
              <span className={cn(
                'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full tracking-wide shrink-0',
                result.emailSource === 'apollo'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
              )}>
                via {result.emailSource}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
            <span className="text-xs text-slate-400 italic">
              Email not found — contact saved without email
            </span>
          </div>
        )}

        {/* LinkedIn */}
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
              LinkedIn Profile <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        )}
      </div>

      {/* Company links + count correction note */}
      {(result.companyWebsite || result.companyLinkedinUrl || countDiffers) && (
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-100 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-800/30 flex-wrap">
          {result.companyWebsite && (
            <a
              href={result.companyWebsite} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <Globe className="w-3 h-3" /> Website
            </a>
          )}
          {result.companyLinkedinUrl && (
            <a
              href={result.companyLinkedinUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#0077B5] transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <Linkedin className="w-3 h-3" /> Company Page
            </a>
          )}
          {countDiffers && (
            <span className="ml-auto text-[10px] text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Seek said {result.seekEmployeeCount}, LinkedIn says {result.employeeCount?.toLocaleString()}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Summary bar ──────────────────────────────────────────────────────────────

function SummaryBar({ entries, totalCreditsUsed, totalCreditsSaved }: {
  entries: LeadFinderEntry[]
  totalCreditsUsed: number
  totalCreditsSaved: number
}) {
  const withEmail   = entries.filter(e => e.result.contactEmail).length
  const withContact = entries.filter(e => e.result.contactName && !e.result.contactEmail).length
  const tooLarge    = entries.filter(e => e.result.phase === 'skipped').length
  const notFound    = entries.filter(e => e.result.phase === 'done' && !e.result.contactName).length
  const errors      = entries.filter(e => e.result.phase === 'error').length

  return (
    <div className="flex items-center gap-3 px-6 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex-wrap text-xs shrink-0">
      {withEmail > 0 && (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-bold text-emerald-700 dark:text-emerald-400">{withEmail}</span>
          <span className="text-slate-500">with email</span>
        </div>
      )}
      {withContact > 0 && (
        <div className="flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-600 dark:text-slate-300">{withContact}</span>
          <span className="text-slate-500">contact only</span>
        </div>
      )}
      {tooLarge > 0 && (
        <div className="flex items-center gap-1.5">
          <SkipForward className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold text-amber-600 dark:text-amber-400">{tooLarge}</span>
          <span className="text-slate-500">too large</span>
        </div>
      )}
      {notFound > 0 && (
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-500">{notFound}</span>
          <span className="text-slate-500">not found</span>
        </div>
      )}
      {errors > 0 && (
        <div className="flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 text-red-400" />
          <span className="font-bold text-red-600 dark:text-red-400">{errors}</span>
          <span className="text-slate-500">error</span>
        </div>
      )}
      <div className="ml-auto flex items-center gap-3">
        {totalCreditsSaved > 0 && (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <TrendingUp className="w-3 h-3" /> {totalCreditsSaved} saved
          </div>
        )}
        <div className="flex items-center gap-1 text-slate-400">
          <Zap className="w-3 h-3" /> {totalCreditsUsed} credit{totalCreditsUsed !== 1 ? 's' : ''} used
        </div>
      </div>
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function ContactFinderModal({
  isOpen, leads, onConfirm, onClose,
}: ContactFinderModalProps) {
  const {
    entries, activeIndex, isRunning, isDone,
    totalCreditsUsed, totalCreditsSaved,
    runForLeads, stop, reset,
  } = useContactFinder()

  const [decisions, setDecisions]  = useState<Record<string, boolean>>({})
  const hasStartedRef = useRef(false)

  // Auto-start when modal opens
  useEffect(() => {
    if (isOpen && leads.length > 0 && !hasStartedRef.current) {
      hasStartedRef.current = true
      runForLeads(leads)
    }
  }, [isOpen, leads, runForLeads])

  // Auto-accept contacts with name when done
  useEffect(() => {
    if (isDone && entries.length > 0) {
      const auto: Record<string, boolean> = {}
      entries.forEach(e => {
        auto[e.result.leadId] = e.result.phase === 'done' && !!e.result.contactName
      })
      setDecisions(auto)
    }
  }, [isDone, entries])

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      reset()
      hasStartedRef.current = false
      setDecisions({})
    }
  }, [isOpen, reset])

  const acceptedCount  = Object.values(decisions).filter(Boolean).length
  const hasAnyContact  = entries.some(e => e.result.contactName)
  const completedCount = entries.filter(e => ['done', 'skipped', 'error'].includes(e.result.phase)).length

  const toggle    = (id: string) => setDecisions(p => ({ ...p, [id]: !p[id] }))
  const acceptAll = () => {
    const all: Record<string, boolean> = {}
    entries.forEach(e => { if (e.result.contactName) all[e.result.leadId] = true })
    setDecisions(all)
  }
  const skipAll = () => setDecisions({})

  const handleConfirm = useCallback(() => {
    onConfirm(entries.map(e => ({
      leadId:             e.result.leadId,
      accept:             decisions[e.result.leadId] ?? false,
      contactName:        e.result.contactName,
      contactTitle:       e.result.contactTitle,
      contactLinkedinUrl: e.result.contactLinkedinUrl,
      contactEmail:       e.result.contactEmail,
      employeeCount:      e.result.employeeCount,
      companyLinkedinUrl: e.result.companyLinkedinUrl,
      companyWebsite:     e.result.companyWebsite,
      industry:           e.result.industry,
    })))
  }, [entries, decisions, onConfirm])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen || isRunning) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && isDone && acceptedCount > 0) handleConfirm()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, isRunning, isDone, acceptedCount, handleConfirm, onClose])

  if (!isOpen) return null

  const est = estimateCredits(leads)

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={isRunning ? undefined : onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black/10 dark:ring-white/10 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900/50">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Contact Finder
                  <span className="ml-1.5 text-xs font-normal text-slate-400">via Apollo.io</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isRunning
                    ? `Verifying ${leads.length} compan${leads.length > 1 ? 'ies' : 'y'} against LinkedIn via Apollo…`
                    : isDone
                    ? `Done — ${completedCount}/${leads.length} processed`
                    : `${leads.length} lead${leads.length > 1 ? 's' : ''} queued`}
                </p>
              </div>
            </div>
            {!isRunning && (
              <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Credit estimate (before start) */}
          {!isRunning && !isDone && leads.length > 0 && (
            <div className="flex items-start gap-2.5 px-6 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-900/40 shrink-0">
              <Coins className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                  Estimated: {est.label}
                </p>
                <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
                  Apollo will verify employee counts against LinkedIn (more accurate than Seek).
                  People search is always free. Role priority follows: HR → GM → Director → Ops → Regional → MD → Sales → CEO.
                </p>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {(isRunning || isDone) && leads.length > 0 && (
            <div className="px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>{completedCount} / {leads.length} processed</span>
                {isRunning && activeIndex >= 0 && entries[activeIndex] && (
                  <span className="text-indigo-500 font-medium truncate max-w-[200px]">
                    {entries[activeIndex].result.companyName}…
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${leads.length > 0 ? (completedCount / leads.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Summary bar */}
          {isDone && entries.length > 0 && (
            <SummaryBar entries={entries} totalCreditsUsed={totalCreditsUsed} totalCreditsSaved={totalCreditsSaved} />
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {isRunning && (
              <div className="px-6 py-4 space-y-2">
                {entries.map((entry, i) => (
                  <LeadProgressRow key={entry.result.leadId} entry={entry} isActive={i === activeIndex} />
                ))}
              </div>
            )}

            {isDone && (
              <div className="px-6 py-4 space-y-3">
                {entries.length > 1 && hasAnyContact && (
                  <div className="flex items-center gap-2">
                    <button onClick={acceptAll} className="px-2.5 py-1 text-xs rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 font-semibold transition-colors">
                      Accept All
                    </button>
                    <button onClick={skipAll} className="px-2.5 py-1 text-xs rounded-lg bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300 font-semibold transition-colors">
                      Skip All
                    </button>
                    <span className="text-xs text-slate-400">
                      {acceptedCount} / {entries.filter(e => e.result.contactName).length} selected
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

                <div className="flex items-start gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {totalCreditsUsed} Apollo credit{totalCreditsUsed !== 1 ? 's' : ''} used.
                    Employee counts sourced from LinkedIn via Apollo — overrides Seek data.
                    Hunter.io email fallback uses your Hunter quota (not Apollo credits).
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
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Searching Apollo — each company takes a few seconds…</span>
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
                    ? `${acceptedCount} contact${acceptedCount > 1 ? 's' : ''} will be saved to leads`
                    : 'Toggle cards above to select contacts to save'}
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
                    <ShieldCheck className="w-4 h-4" />
                    Save {acceptedCount > 0 ? acceptedCount : ''} Contact{acceptedCount !== 1 ? 's' : ''}
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