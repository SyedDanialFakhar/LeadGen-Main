// src/components/leads/EnrichmentConfirmModal.tsx
import { useState } from 'react'
import { ExternalLink, Globe, Linkedin, CheckCircle2, XCircle, RefreshCw, ChevronRight, AlertCircle, Zap, Building2 } from 'lucide-react'
import { cn } from '@/utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EnrichmentResult {
  leadId: string
  companyName: string
  website: string | null
  linkedinUrl: string | null
  confidence: number
  source: 'clearbit' | 'apify' | 'google' | 'duckduckgo' | 'none'  // ADDED 'duckduckgo'
  // existing values so user can compare
  existingWebsite: string | null
  existingLinkedin: string | null
}

export type EnrichmentDecision = {
  leadId: string
  acceptWebsite: boolean
  acceptLinkedin: boolean
}

interface EnrichmentConfirmModalProps {
  isOpen: boolean
  results: EnrichmentResult[]
  isLoading: boolean
  loadingLabel?: string
  onConfirm: (decisions: EnrichmentDecision[]) => void
  onClose: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sourceLabel: Record<string, string> = {
  knowledgegraph: 'Google Knowledge Graph',
  clearbit: 'Clearbit',
  apify: 'Apify',
  google: 'Google Search',
  duckduckgo: 'DuckDuckGo',  // ADDED
  none: 'Not found',
}

const sourceColour: Record<string, string> = {
  knowledgegraph: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  clearbit: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  apify: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  google: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  duckduckgo: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',  // ADDED
  none: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
}

function ConfidencePips({ value }: { value: number }) {
  const filled = Math.round((value / 10) * 5)
  return (
    <div className="flex items-center gap-0.5" title={`Confidence: ${value}/10`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 w-4 rounded-full transition-colors',
            i < filled
              ? value >= 8 ? 'bg-emerald-500' : value >= 5 ? 'bg-amber-400' : 'bg-red-400'
              : 'bg-slate-200 dark:bg-slate-700'
          )}
        />
      ))}
      <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">{value}/10</span>
    </div>
  )
}

function UrlPreview({
  label,
  icon: Icon,
  found,
  existing,
  accepted,
  onToggle,
  iconColour,
}: {
  label: string
  icon: React.ElementType
  found: string | null
  existing: string | null
  accepted: boolean
  onToggle: () => void
  iconColour: string
}) {
  const displayUrl = found
    ? found.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
    : null

  const existingDisplay = existing
    ? existing.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
    : null

  const isNew = found && !existing
  const isReplacing = found && existing && found !== existing
  const noChange = found && existing && found === existing
  const notFound = !found

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 p-3 transition-all duration-200',
        notFound
          ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-60'
          : accepted
          ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg', iconColour)}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            {label}
          </span>
          {isNew && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              New
            </span>
          )}
          {isReplacing && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              Update
            </span>
          )}
          {noChange && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              Same
            </span>
          )}
        </div>

        {found && (
          <button
            onClick={onToggle}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all',
              accepted
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            )}
          >
            {accepted ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Accept</>
            ) : (
              <><XCircle className="w-3.5 h-3.5" /> Skip</>
            )}
          </button>
        )}
      </div>

      {/* URL display */}
      {notFound ? (
        <div className="flex items-center gap-2 py-1">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 italic">Not found</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Found URL */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 w-12 shrink-0">Found:</span>
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className={cn(
                'text-xs font-medium truncate',
                accepted ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'
              )}>
                {displayUrl}
              </span>
              {found && (
                <a
                  href={found}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 p-0.5 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  title="Open link"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Existing value */}
          {existingDisplay && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-12 shrink-0">Current:</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 truncate line-through">
                {existingDisplay}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EnrichmentConfirmModal({
  isOpen,
  results,
  isLoading,
  loadingLabel,
  onConfirm,
  onClose,
}: EnrichmentConfirmModalProps) {
  const [decisions, setDecisions] = useState<Record<string, { website: boolean; linkedin: boolean }>>(() =>
    Object.fromEntries(
      results.map(r => [
        r.leadId,
        { website: !!(r.website && r.website !== r.existingWebsite), linkedin: !!(r.linkedinUrl && r.linkedinUrl !== r.existingLinkedin) },
      ])
    )
  )

  // Re-initialise when results change (new enrichment run)
  const [prevResults, setPrevResults] = useState(results)
  if (results !== prevResults) {
    setPrevResults(results)
    setDecisions(
      Object.fromEntries(
        results.map(r => [
          r.leadId,
          { website: !!(r.website && r.website !== r.existingWebsite), linkedin: !!(r.linkedinUrl && r.linkedinUrl !== r.existingLinkedin) },
        ])
      )
    )
  }

  if (!isOpen) return null

  const toggle = (leadId: string, field: 'website' | 'linkedin') => {
    setDecisions(prev => ({
      ...prev,
      [leadId]: { ...prev[leadId], [field]: !prev[leadId]?.[field] },
    }))
  }

  const acceptAll = () => {
    setDecisions(
      Object.fromEntries(results.map(r => [r.leadId, { website: !!r.website, linkedin: !!r.linkedinUrl }]))
    )
  }

  const rejectAll = () => {
    setDecisions(Object.fromEntries(results.map(r => [r.leadId, { website: false, linkedin: false }])))
  }

  const handleConfirm = () => {
    const out: EnrichmentDecision[] = results.map(r => ({
      leadId: r.leadId,
      acceptWebsite: decisions[r.leadId]?.website ?? false,
      acceptLinkedin: decisions[r.leadId]?.linkedin ?? false,
    }))
    onConfirm(out)
  }

  const totalAccepted = Object.values(decisions).filter(d => d.website || d.linkedin).length
  const hasAnyResult = results.some(r => r.website || r.linkedinUrl)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
                <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Enrichment Results
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Review found data before saving
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-indigo-200 dark:border-indigo-900 animate-spin border-t-indigo-500" />
                <Building2 className="absolute inset-0 m-auto w-5 h-5 text-indigo-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {loadingLabel ?? 'Searching company data…'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Trying Google Knowledge Graph → DuckDuckGo → Clearbit → Google Search
                </p>
              </div>
            </div>
          )}

          {/* Results list */}
          {!isLoading && (
            <>
              {/* Bulk actions */}
              {results.length > 1 && (
                <div className="flex items-center gap-2 px-6 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-500 mr-1">
                    {results.length} companies
                  </span>
                  <button
                    onClick={acceptAll}
                    className="px-2.5 py-1 text-xs rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 font-medium transition-colors"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={rejectAll}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 font-medium transition-colors"
                  >
                    Skip All
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                {results.map(r => (
                  <div key={r.leadId} className="space-y-3">
                    {/* Company header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-[260px]">
                          {r.companyName}
                        </span>
                        <span className={cn('px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wide', sourceColour[r.source])}>
                          {sourceLabel[r.source]}
                        </span>
                      </div>
                      <ConfidencePips value={r.confidence} />
                    </div>

                    {/* URL cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <UrlPreview
                        label="Website"
                        icon={Globe}
                        found={r.website}
                        existing={r.existingWebsite}
                        accepted={decisions[r.leadId]?.website ?? false}
                        onToggle={() => toggle(r.leadId, 'website')}
                        iconColour="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
                      />
                      <UrlPreview
                        label="LinkedIn"
                        icon={Linkedin}
                        found={r.linkedinUrl}
                        existing={r.existingLinkedin}
                        accepted={decisions[r.leadId]?.linkedin ?? false}
                        onToggle={() => toggle(r.leadId, 'linkedin')}
                        iconColour="bg-blue-100 text-[#0077B5] dark:bg-blue-900/40 dark:text-blue-300"
                      />
                    </div>

                    {/* No data at all */}
                    {!r.website && !r.linkedinUrl && (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="text-xs text-red-600 dark:text-red-400">
                          No data found — check company name spelling or add URLs manually
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {hasAnyResult
                    ? `${totalAccepted} of ${results.length} company${results.length > 1 ? 'ies' : 'y'} will be updated`
                    : 'No enrichment data available'}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!hasAnyResult}
                    className={cn(
                      'flex items-center gap-2 px-5 py-2 text-sm rounded-xl font-semibold transition-all',
                      hasAnyResult
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    Save Selected
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}