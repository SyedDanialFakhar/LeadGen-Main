// src/components/leads/LeadTable.tsx
import { useState, useRef, useEffect } from 'react'
import {
  ExternalLink, Mail, Phone, Building2, Calendar, MapPin,
  ChevronLeft, ChevronRight, Linkedin, Globe, Edit2, Check, X,
  Star, User, Briefcase, Trash2, AlertTriangle, Users,
  ThumbsUp, ThumbsDown, Minus, RefreshCw, Clock,
} from 'lucide-react'
import { LeadStatusBadge, EnrichmentBadge, PlatformBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import type { Lead, LeadStatus, MatchAssessment } from '@/types'
import { formatDate } from '@/utils/dateUtils'
import { useLeads } from '@/hooks/useLeads'
import { enrichMultipleCompanies } from '@/services/companyEnrichment'
import { EnrichmentConfirmModal, type EnrichmentResult, type EnrichmentDecision} from './EnrichmentConfirmModal'
import { cn } from '@/utils/cn'

interface LeadTableProps {
  leads: Lead[]
  isLoading: boolean
  onRowClick: (lead: Lead) => void
}

const PAGE_SIZE = 20
type ResponseStatus = 'positive' | 'negative' | 'none'

// ─── Helper to format days ago beautifully ────────────────────────────────────
const formatDaysAgo = (dateString: string): string => {
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  
  const diffTime = today.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return '1 week ago'
  if (diffDays < 21) return '2 weeks ago'
  if (diffDays < 30) return '3 weeks ago'
  if (diffDays < 60) return '1 month ago'
  if (diffDays < 90) return '2 months ago'
  if (diffDays < 120) return '3 months ago'
  return `${Math.floor(diffDays / 30)} months ago`
}

const getDaysAgoColor = (daysAgo: number): string => {
  if (daysAgo === 0) return 'text-green-600 dark:text-green-400'
  if (daysAgo <= 3) return 'text-emerald-600 dark:text-emerald-400'
  if (daysAgo <= 7) return 'text-yellow-600 dark:text-yellow-400'
  if (daysAgo <= 14) return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const MATCH_ASSESSMENT_STYLES: Record<MatchAssessment, string> = {
  High: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  Medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  Low: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
}

const MATCH_ASSESSMENT_ICONS: Record<MatchAssessment, string> = {
  High: '🔥',
  Medium: '📊',
  Low: '⚠️',
}

const getEmailStatusStyle = (status: string): string => {
  switch (status) {
    case 'Not Sent': return 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
    case 'Email 1': return 'bg-emerald-500 text-white shadow-sm'
    case 'Email 2': return 'bg-blue-500 text-white shadow-sm'
    case 'Email 3': return 'bg-purple-500 text-white shadow-sm'
    case 'Closed': return 'bg-gray-500 text-white shadow-sm'
    case 'Sequence Closed': return 'bg-slate-700 text-white shadow-sm'
    default: return 'bg-slate-100 dark:bg-slate-700/50 text-slate-500'
  }
}

const getResponseStyle = (response: ResponseStatus): string => {
  switch (response) {
    case 'positive': return 'bg-emerald-500 text-white shadow-sm'
    case 'negative': return 'bg-red-500 text-white shadow-sm'
    case 'none': return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
    default: return 'bg-slate-100 dark:bg-slate-800 text-slate-500'
  }
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const calculateNextActionDate = (lastActionDate: string | null, nextActionDays = 5): string | null => {
  if (!lastActionDate) return null
  const d = new Date(lastActionDate)
  d.setDate(d.getDate() + nextActionDays + 2)
  return d.toISOString()
}

const formatActionDate = (dateString: string | null): string => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── EditableLinkCell ─────────────────────────────────────────────────────────

const EditableLinkCell = ({
  url,
  onSave,
  placeholder,
  icon: Icon,
}: {
  url: string | null
  onSave: (value: string) => void
  placeholder: string
  icon: React.ElementType
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(url || '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (isEditing) inputRef.current?.focus() }, [isEditing])

  const handleSave = () => { onSave(editValue); setIsEditing(false) }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setEditValue(url || ''); setIsEditing(false) }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 min-w-[200px]" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="url"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-blue-400 dark:border-blue-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder={placeholder}
        />
        <button onClick={handleSave} className="p-1 text-green-600 hover:text-green-700 rounded hover:bg-green-50 shrink-0">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={() => { setEditValue(url || ''); setIsEditing(false) }} className="p-1 text-red-600 hover:text-red-700 rounded hover:bg-red-50 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  if (url) {
    return (
      <div className="group flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline text-sm truncate max-w-[180px]"
          title={url}
        >
          <Icon className="w-4 h-4 shrink-0 text-blue-500" />
          <span className="truncate">
            {url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
          </span>
          <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
        </a>
        <button
          onClick={e => { e.stopPropagation(); setEditValue(url); setIsEditing(true) }}
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
        >
          <Edit2 className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
        </button>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <span className="text-sm text-slate-400 dark:text-slate-500 italic">{placeholder}</span>
      <button
        onClick={e => { e.stopPropagation(); setIsEditing(true) }}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Edit2 className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LeadTable({ leads, isLoading, onRowClick }: LeadTableProps) {
  const { updateLead, deleteLead } = useLeads()
  const [selected, setSelected] = useState<string[]>([])
  const [page, setPage] = useState(0)

  // Delete modals
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)

  // Enrichment modal
  const [enrichModalOpen, setEnrichModalOpen] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)
  const [enrichmentResults, setEnrichmentResults] = useState<EnrichmentResult[]>([])
  const [enrichingLabel, setEnrichingLabel] = useState('')

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [originalValue, setOriginalValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editingId) inputRef.current?.focus() }, [editingId])

  // ── Editing helpers ──────────────────────────────────────────────────────

  const cancelEdit = () => { setEditingId(null); setEditingField(null); setEditingValue(''); setOriginalValue('') }

  const handleSave = (leadId: string, field: string, newValue: string, originalVal: string) => {
    if (newValue !== originalVal) {
      const updates: Partial<Lead> = {}
      switch (field) {
        case 'contactName': updates.contactName = newValue || null; break
        case 'contactRole': updates.contactJobTitle = newValue || null; break
        case 'phone': updates.contactPhone = newValue || null; break
        case 'email': updates.contactEmail = newValue || null; break
        case 'opsComments': updates.opsComments = newValue || null; break
        case 'charlieFeedback': updates.charlieFeedback = newValue || null; break
        case 'matchAssessment': if (newValue) updates.matchAssessment = newValue as MatchAssessment; break
      }
      if (Object.keys(updates).length > 0) updateLead({ id: leadId, updates })
    }
    cancelEdit()
  }

  const startEdit = (leadId: string, field: string, currentValue: string | null | undefined) => {
    const val = currentValue || ''
    setEditingId(leadId); setEditingField(field); setEditingValue(val); setOriginalValue(val)
  }

  const handleKeyDown = (e: React.KeyboardEvent, leadId: string, field: string, currentValue: string, originalVal: string) => {
    if (e.key === 'Enter') handleSave(leadId, field, currentValue, originalVal)
    else if (e.key === 'Escape') cancelEdit()
  }

  // ── Email status ─────────────────────────────────────────────────────────

  const handleEmailStatusChange = (lead: Lead, newStatus: LeadStatus) => {
    const updates: Partial<Lead> = { status: newStatus }
    if (newStatus === 'Email 1' || newStatus === 'Email 2' || newStatus === 'Email 3') {
      const now = new Date().toISOString()
      updates.lastActionDate = now
      updates.nextActionDate = calculateNextActionDate(now)
      updates.nextActionDays = 5
    }
    if (newStatus === 'Closed' || newStatus === 'Sequence Closed') {
      updates.nextActionDate = null
      updates.nextActionDays = null
    }
    updateLead({ id: lead.id, updates })
  }

  // ── Enrichment ────────────────────────────────────────────────────────────

  const handleEnrichSelected = async () => {
    if (selected.length === 0) return

    setEnrichingLabel(
      selected.length === 1
        ? `Searching data for ${leads.find(l => l.id === selected[0])?.companyName ?? 'company'}…`
        : `Enriching ${selected.length} companies…`
    )
    setEnrichmentResults([])
    setEnrichModalOpen(true)
    setIsEnriching(true)

    try {
      const selectedLeads = leads.filter(l => selected.includes(l.id))
      const toEnrich = selectedLeads.map(l => ({ id: l.id, name: l.companyName, city: l.city }))
      const enrichedMap = await enrichMultipleCompanies(toEnrich)

      const results: EnrichmentResult[] = selectedLeads.map(lead => {
        const data = enrichedMap.get(lead.id)
        return {
          leadId: lead.id,
          companyName: lead.companyName,
          website: data?.website ?? null,
          linkedinUrl: data?.linkedinUrl ?? null,
          confidence: data?.confidence ?? 0,
          source: data?.source ?? 'none',
          existingWebsite: lead.companyWebsite ?? null,
          existingLinkedin: lead.contactLinkedinUrl ?? null,
        }
      })

      setEnrichmentResults(results)
    } catch (err) {
      console.error('Enrichment failed:', err)
      setEnrichmentResults(
        leads
          .filter(l => selected.includes(l.id))
          .map(l => ({
            leadId: l.id,
            companyName: l.companyName,
            website: null,
            linkedinUrl: null,
            confidence: 0,
            source: 'none' as const,
            existingWebsite: l.companyWebsite ?? null,
            existingLinkedin: l.contactLinkedinUrl ?? null,
          }))
      )
    } finally {
      setIsEnriching(false)
    }
  }

  const handleEnrichConfirm = (decisions: EnrichmentDecision[]) => {
    for (const d of decisions) {
      const result = enrichmentResults.find(r => r.leadId === d.leadId)
      if (!result) continue
      const updates: Partial<Lead> = {}
      if (d.acceptWebsite && result.website) updates.companyWebsite = result.website
      if (d.acceptLinkedin && result.linkedinUrl) updates.contactLinkedinUrl = result.linkedinUrl
      if (Object.keys(updates).length > 0) updateLead({ id: d.leadId, updates })
    }
    setEnrichModalOpen(false)
    setSelected([])
  }

  // ── Pagination & selection ────────────────────────────────────────────────

  const totalPages = Math.ceil(leads.length / PAGE_SIZE)
  const paginated = leads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  const toggleAll = () => setSelected(selected.length === paginated.length ? [] : paginated.map(l => l.id))

  // ── Bulk actions ──────────────────────────────────────────────────────────

  const handleBulkEmailStatus = (status: LeadStatus) => {
    const now = new Date().toISOString()
    for (const id of selected) {
      const updates: Partial<Lead> = { status }
      if (status === 'Email 1' || status === 'Email 2' || status === 'Email 3') {
        updates.lastActionDate = now
        updates.nextActionDate = calculateNextActionDate(now)
        updates.nextActionDays = 5
      }
      if (status === 'Closed' || status === 'Sequence Closed') {
        updates.nextActionDate = null
        updates.nextActionDays = null
      }
      updateLead({ id, updates })
    }
    setSelected([])
  }

  const handleBulkResponse = (response: ResponseStatus) => {
    for (const id of selected) {
      const lead = leads.find(l => l.id === id)
      if (!lead) continue
      const clean = (lead.opsComments || '').replace(/\[Response:\s*(positive|negative|none)\]\s*/i, '')
      const text = response !== 'none' ? `[Response: ${response}] ${clean}` : clean
      updateLead({ id, updates: { opsComments: text.trim() || null } })
    }
    setSelected([])
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDeleteClick = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation(); setLeadToDelete(lead); setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!leadToDelete) return
    setIsDeleting(true)
    try {
      await deleteLead(leadToDelete.id)
      setSelected(prev => prev.filter(id => id !== leadToDelete.id))
      setDeleteModalOpen(false); setLeadToDelete(null)
    } finally { setIsDeleting(false) }
  }

  const handleConfirmBulkDelete = async () => {
    setIsDeleting(true)
    try {
      for (const id of selected) await deleteLead(id)
      setSelected([]); setBulkDeleteModalOpen(false)
    } finally { setIsDeleting(false) }
  }

  // ── Comments helpers ──────────────────────────────────────────────────────

  const getResponseFromComments = (comments: string | null): ResponseStatus => {
    if (!comments) return 'none'
    const m = comments.match(/\[Response:\s*(positive|negative|none)\]/i)
    return m ? (m[1].toLowerCase() as ResponseStatus) : 'none'
  }

  const getCleanComments = (comments: string | null): string =>
    (comments || '').replace(/\[Response:\s*(positive|negative|none)\]\s*/i, '')

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderEditableCell = (
    leadId: string,
    field: string,
    displayValue: string | null | undefined,
    placeholder: string,
    inputType: 'text' | 'email' | 'tel' | 'url' = 'text'
  ) => {
    const isEditing = editingId === leadId && editingField === field

    if (isEditing) {
      return (
        <div className="flex items-center gap-1 min-w-[200px]">
          <input
            ref={inputRef}
            type={inputType}
            value={editingValue}
            onChange={e => setEditingValue(e.target.value)}
            onKeyDown={e => handleKeyDown(e, leadId, field, editingValue, originalValue)}
            onBlur={() => handleSave(leadId, field, editingValue, originalValue)}
            className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-blue-400 dark:border-blue-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder={placeholder}
            onClick={e => e.stopPropagation()}
          />
          <button onClick={e => { e.stopPropagation(); handleSave(leadId, field, editingValue, originalValue) }} className="p-1 text-green-600 hover:text-green-700 rounded hover:bg-green-50 dark:hover:bg-green-900/20 shrink-0">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={e => { e.stopPropagation(); cancelEdit() }} className="p-1 text-red-600 hover:text-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )
    }

    return (
      <div
        className="group flex items-center gap-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-1 py-0.5 transition-colors min-w-[100px]"
        onClick={e => { e.stopPropagation(); startEdit(leadId, field, displayValue) }}
      >
        <span className="text-slate-600 dark:text-slate-400 text-sm truncate flex-1">
          {displayValue || <span className="text-slate-400 dark:text-slate-500 italic">{placeholder}</span>}
        </span>
        <Edit2 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (leads.length === 0) return <EmptyState title="No leads found" description="Try adjusting your filters or run the scraper to find new leads" />

  return (
    <div className="flex flex-col gap-3">

      {/* ── Enrichment Confirm Modal ── */}
      <EnrichmentConfirmModal
        isOpen={enrichModalOpen}
        results={enrichmentResults}
        isLoading={isEnriching}
        loadingLabel={enrichingLabel}
        onConfirm={handleEnrichConfirm}
        onClose={() => { setEnrichModalOpen(false); if (!isEnriching) setSelected([]) }}
      />

      {/* ── Bulk actions bar ── */}
      {selected.length > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap">
            {selected.length} selected
          </span>
          <div className="h-5 w-px bg-blue-300 dark:bg-blue-600 mx-1" />

          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 mr-1">Email:</span>
            <div className="flex gap-1">
              {(['Email 1', 'Email 2', 'Email 3'] as LeadStatus[]).map((s, i) => (
                <Button key={s} variant="outline" size="sm" onClick={() => handleBulkEmailStatus(s)}
                  className={cn('h-7 px-2 text-xs', [
                    'border-emerald-200 text-emerald-600 hover:bg-emerald-50',
                    'border-blue-200 text-blue-600 hover:bg-blue-50',
                    'border-purple-200 text-purple-600 hover:bg-purple-50',
                  ][i])}>
                  E{i + 1}
                </Button>
              ))}
              <Button variant="outline" size="sm" onClick={() => handleBulkEmailStatus('Closed')} className="h-7 px-2 text-xs border-gray-300 text-gray-600 hover:bg-gray-50">Close</Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkEmailStatus('Sequence Closed')} className="h-7 px-2 text-xs border-slate-400 text-slate-600 hover:bg-slate-50">Seq</Button>
            </div>
          </div>

          <div className="h-5 w-px bg-blue-300 dark:bg-blue-600" />

          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 mr-1">Response:</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => handleBulkResponse('positive')} className="h-7 px-2 text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50">👍 Pos</Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkResponse('negative')} className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50">👎 Neg</Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkResponse('none')} className="h-7 px-2 text-xs">⚪ Clear</Button>
            </div>
          </div>

          <div className="h-5 w-px bg-blue-300 dark:bg-blue-600" />

          <div className="flex gap-1">
            <Button
              variant="outline" size="sm"
              onClick={handleEnrichSelected}
              isLoading={isEnriching}
              leftIcon={<Building2 className="w-3 h-3" />}
              className="h-7 px-2 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            >
              Enrich
            </Button>
            <Button variant="outline" size="sm" onClick={() => setBulkDeleteModalOpen(true)} leftIcon={<Trash2 className="w-3 h-3" />} className="h-7 px-2 text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300">
              Delete
            </Button>
          </div>

          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={() => setSelected([])} className="h-7 px-2 text-xs">✕ Clear</Button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={selected.length === paginated.length && paginated.length > 0} onChange={toggleAll} className="rounded border-slate-300" />
              </th>
              {[
                'Lead Added', 'Source', 'City', 'Location', 'Company Name', 'Job Title',
                'Job Link', 'Date Posted', 'Applicants', 'Contact Name', 'Role Title',
                'Phone', 'Email', 'LinkedIn', 'Company URL', 'Match Assessment',
                'Email Status', 'Last Action', 'Next Days', 'Next Date',
                'Response', 'Ops Comments', "Charlie's Feedback", 'Actions',
              ].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {paginated.map(lead => {
              const response = getResponseFromComments(lead.opsComments)
              const daysAgo = lead.datePosted ? (() => {
                const date = new Date(lead.datePosted)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                date.setHours(0, 0, 0, 0)
                return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
              })() : 0
              
              return (
                <tr
                  key={lead.id}
                  className={cn(
                    'bg-white dark:bg-slate-800 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50',
                    lead.followUpRequired && 'border-l-2 border-l-orange-400',
                    selected.includes(lead.id) && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                  onClick={() => onRowClick(lead)}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggleSelect(lead.id)} className="rounded border-slate-300" />
                  </td>

                  {/* Lead Added */}
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">{formatDate(lead.createdAt)}</td>

                  {/* Source */}
                  <td className="px-4 py-3"><PlatformBadge platform={lead.platform} /></td>

                  {/* City */}
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">{lead.city}</td>

                  {/* Location */}
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">{lead.location || lead.city}</td>

                  {/* Company Name */}
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {lead.companyName}
                    </p>
                    {lead.classification && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">{lead.classification}</span>
                    )}
                  </td>

                  {/* Job Title - Full text, not truncated */}
                  <td className="px-4 py-3">
                    <p className="text-slate-700 dark:text-slate-300 font-medium min-w-[200px] max-w-[300px]">
                      {lead.jobTitle}
                    </p>
                  </td>

                  {/* Job Link */}
                  <td className="px-4 py-3 text-center">
                    <a href={lead.jobAdUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 inline-flex items-center gap-1 text-sm"
                      title="View job ad">
                      <ExternalLink className="w-4 h-4" />
                      <span>View</span>
                    </a>
                  </td>

                  {/* Date Posted */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-400 text-sm">{formatDate(lead.datePosted)}</span>
                    </div>
                  </td>

                  {/* Applicants */}
                  <td className="px-4 py-3">
                    {lead.applicantCount ? (
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{lead.applicantCount}</span>
                      </div>
                    ) : <span className="text-sm text-slate-400">—</span>}
                  </td>

                  {/* Contact Name */}
                  <td className="px-4 py-3 min-w-[140px]">{renderEditableCell(lead.id, 'contactName', lead.contactName, 'Add name')}</td>

                  {/* Role Title */}
                  <td className="px-4 py-3 min-w-[140px]">{renderEditableCell(lead.id, 'contactRole', lead.contactJobTitle, 'Add role')}</td>

                  {/* Phone */}
                  <td className="px-4 py-3 min-w-[130px]">{renderEditableCell(lead.id, 'phone', lead.contactPhone, 'Add phone', 'tel')}</td>

                  {/* Email */}
                  <td className="px-4 py-3 min-w-[180px]">{renderEditableCell(lead.id, 'email', lead.contactEmail, 'Add email', 'email')}</td>

                  {/* LinkedIn */}
                  <td className="px-4 py-3 min-w-[160px]">
                    <EditableLinkCell
                      url={lead.contactLinkedinUrl}
                      onSave={value => updateLead({ id: lead.id, updates: { contactLinkedinUrl: value || null } })}
                      placeholder="Add LinkedIn"
                      icon={Linkedin}
                    />
                  </td>

                  {/* Company URL */}
                  <td className="px-4 py-3 min-w-[160px]">
                    <EditableLinkCell
                      url={lead.companyWebsite}
                      onSave={value => updateLead({ id: lead.id, updates: { companyWebsite: value || null } })}
                      placeholder="Add website"
                      icon={Globe}
                    />
                  </td>

                  {/* Match Assessment */}
                  <td className="px-4 py-3 min-w-[110px]" onClick={e => e.stopPropagation()}>
                    {editingId === lead.id && editingField === 'matchAssessment' ? (
                      <div className="flex items-center gap-1 min-w-[150px]">
                        <select
                          ref={inputRef as any}
                          value={editingValue}
                          onChange={e => setEditingValue(e.target.value)}
                          onBlur={() => handleSave(lead.id, 'matchAssessment', editingValue, originalValue)}
                          className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-blue-400 dark:border-blue-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select…</option>
                          <option value="High">🔥 High Match</option>
                          <option value="Medium">📊 Medium Match</option>
                          <option value="Low">⚠️ Low Match</option>
                        </select>
                        <button onClick={e => { e.stopPropagation(); handleSave(lead.id, 'matchAssessment', editingValue, originalValue) }} className="p-1 text-green-600 hover:text-green-700 rounded hover:bg-green-50 shrink-0"><Check className="w-4 h-4" /></button>
                        <button onClick={e => { e.stopPropagation(); cancelEdit() }} className="p-1 text-red-600 hover:text-red-700 rounded hover:bg-red-50 shrink-0"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'group flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity px-2 py-1 rounded-lg',
                          lead.matchAssessment ? MATCH_ASSESSMENT_STYLES[lead.matchAssessment] : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500'
                        )}
                        onClick={() => startEdit(lead.id, 'matchAssessment', lead.matchAssessment)}
                      >
                        {!lead.matchAssessment ? (
                          <><Star className="w-4 h-4" /><span className="text-sm">Set match</span></>
                        ) : (
                          <><span className="text-base">{MATCH_ASSESSMENT_ICONS[lead.matchAssessment]}</span><span className="text-sm font-medium">{lead.matchAssessment}</span></>
                        )}
                        <Edit2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                      </div>
                    )}
                  </td>

                  {/* Email Status - Improved dropdown with better dark mode */}
                  <td className="px-4 py-3 min-w-[140px]" onClick={e => e.stopPropagation()}>
                    <select
                      value={lead.status}
                      onChange={e => handleEmailStatusChange(lead, e.target.value as LeadStatus)}
                      className={cn(
                        'px-2 py-1.5 text-sm rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 font-medium w-full',
                        'bg-white dark:bg-slate-800',
                        'border-slate-300 dark:border-slate-600',
                        'text-slate-700 dark:text-slate-200',
                        getEmailStatusStyle(lead.status)
                      )}
                    >
                      <option value="Not Sent" className="text-slate-700 dark:text-slate-200">📧 Not Sent</option>
                      <option value="Email 1" className="text-emerald-700 dark:text-emerald-300">📧 Email 1 Sent</option>
                      <option value="Email 2" className="text-blue-700 dark:text-blue-300">📧 Email 2 Sent</option>
                      <option value="Email 3" className="text-purple-700 dark:text-purple-300">📧 Email 3 Sent</option>
                      <option value="Closed" className="text-gray-700 dark:text-gray-300">🔒 Closed</option>
                      <option value="Sequence Closed" className="text-slate-700 dark:text-slate-300">✅ Sequence Closed</option>
                    </select>
                  </td>

                  {/* Last Action Date */}
                  <td className="px-4 py-3 min-w-[100px]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">{formatActionDate(lead.lastActionDate)}</span>
                    </div>
                  </td>

                  {/* Next Action Days */}
                  <td className="px-4 py-3 min-w-[80px]">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {lead.nextActionDays != null ? `${lead.nextActionDays} days` : '—'}
                    </span>
                  </td>

                  {/* Next Action Date */}
                  <td className="px-4 py-3 min-w-[110px]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{formatActionDate(lead.nextActionDate)}</span>
                    </div>
                  </td>

                  {/* Response */}
                  <td className="px-4 py-3 min-w-[120px]" onClick={e => e.stopPropagation()}>
                    <select
                      value={response}
                      onChange={e => {
                        const r = e.target.value as ResponseStatus
                        const clean = getCleanComments(lead.opsComments)
                        const text = r !== 'none' ? `[Response: ${r}] ${clean}` : clean
                        updateLead({ id: lead.id, updates: { opsComments: text.trim() || null } })
                      }}
                      className={cn(
                        'px-2 py-1.5 text-sm rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 font-medium w-full',
                        'bg-white dark:bg-slate-800',
                        'border-slate-300 dark:border-slate-600',
                        'text-slate-700 dark:text-slate-200',
                        getResponseStyle(response)
                      )}
                    >
                      <option value="none" className="text-slate-500 dark:text-slate-400">⚪ None</option>
                      <option value="positive" className="text-emerald-700 dark:text-emerald-300">👍 Positive</option>
                      <option value="negative" className="text-red-700 dark:text-red-300">👎 Negative</option>
                    </select>
                  </td>

                  {/* Ops Comments */}
                  <td className="px-4 py-3 max-w-[260px] min-w-[180px]">
                    {renderEditableCell(lead.id, 'opsComments', getCleanComments(lead.opsComments), 'Add comment')}
                  </td>

                  {/* Charlie's Feedback */}
                  <td className="px-4 py-3 max-w-[260px] min-w-[180px]">
                    {renderEditableCell(lead.id, 'charlieFeedback', lead.charlieFeedback, 'Add feedback')}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <button onClick={e => handleDeleteClick(lead, e)} className="p-1 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 transition-colors" title="Delete lead">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, leads.length)} of {leads.length} leads
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0} leftIcon={<ChevronLeft className="w-4 h-4" />}>Prev</Button>
            <span className="text-sm text-slate-600 dark:text-slate-400">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} rightIcon={<ChevronRight className="w-4 h-4" />}>Next</Button>
          </div>
        </div>
      )}

      {/* ── Single Delete Modal ── */}
      <Modal isOpen={deleteModalOpen} onClose={() => !isDeleting && setDeleteModalOpen(false)} title="Delete Lead" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>Cancel</Button>
          <Button onClick={handleConfirmDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
            {isDeleting ? <Spinner size="sm" /> : 'Delete'}
          </Button>
        </>}>
        <div className="flex items-center gap-3 py-2">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200">Delete this lead?</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Company: <span className="font-medium">{leadToDelete?.companyName}</span></p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Job: {leadToDelete?.jobTitle}</p>
            <p className="text-xs text-red-500 mt-2">This action cannot be undone.</p>
          </div>
        </div>
      </Modal>

      {/* ── Bulk Delete Modal ── */}
      <Modal isOpen={bulkDeleteModalOpen} onClose={() => !isDeleting && setBulkDeleteModalOpen(false)} title="Delete Multiple Leads" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setBulkDeleteModalOpen(false)} disabled={isDeleting}>Cancel</Button>
          <Button onClick={handleConfirmBulkDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
            {isDeleting ? <Spinner size="sm" /> : `Delete ${selected.length} Leads`}
          </Button>
        </>}>
        <div className="flex items-center gap-3 py-2">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200">Delete {selected.length} lead(s)?</p>
            <p className="text-xs text-red-500 mt-2">This action cannot be undone.</p>
          </div>
        </div>
      </Modal>
    </div>
  )
}