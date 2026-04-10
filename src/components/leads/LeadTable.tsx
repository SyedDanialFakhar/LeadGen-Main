// src/components/leads/LeadTable.tsx
import { useState, useRef, useEffect } from 'react'
import { ExternalLink, Mail, Phone, Building2, Calendar, MapPin, ChevronLeft, ChevronRight, Linkedin, Globe, Edit2, Check, X, Star, User, Briefcase, Trash2, AlertTriangle, Users, ThumbsUp, ThumbsDown, Minus } from 'lucide-react'
import { LeadStatusBadge, EnrichmentBadge, PlatformBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import type { Lead, LeadStatus, MatchAssessment } from '@/types'
import { formatDate } from '@/utils/dateUtils'
import { useLeads } from '@/hooks/useLeads'
import { cn } from '@/utils/cn'

interface LeadTableProps {
  leads: Lead[]
  isLoading: boolean
  onRowClick: (lead: Lead) => void
}

const PAGE_SIZE = 20

// Response types
type ResponseStatus = 'positive' | 'negative' | 'none'

// Match assessment styles
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

// Email status styles with colors
const getEmailStatusStyle = (status: string): string => {
  switch (status) {
    case 'Not Sent': return 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
    case 'Email 1': return 'bg-emerald-500 text-white shadow-sm'
    case 'Email 2': return 'bg-blue-500 text-white shadow-sm'
    case 'Email 3': return 'bg-purple-500 text-white shadow-sm'
    default: return 'bg-slate-100 dark:bg-slate-700/50 text-slate-500'
  }
}

// Response styles
const getResponseStyle = (response: ResponseStatus): string => {
  switch (response) {
    case 'positive': return 'bg-emerald-500 text-white shadow-sm'
    case 'negative': return 'bg-red-500 text-white shadow-sm'
    case 'none': return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
    default: return 'bg-slate-100 dark:bg-slate-800 text-slate-500'
  }
}

export function LeadTable({ leads, isLoading, onRowClick }: LeadTableProps) {
  const { updateLead, bulkUpdateStatus, deleteLead } = useLeads()
  const [selected, setSelected] = useState<string[]>([])
  const [page, setPage] = useState(0)
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Bulk delete modal state
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  
  // Single editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')
  const [originalValue, setOriginalValue] = useState<string>('')
  
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editingId])

  // Handle save on Enter key
  const handleKeyDown = (e: React.KeyboardEvent, leadId: string, field: string, currentValue: string, originalVal: string) => {
    if (e.key === 'Enter') {
      handleSave(leadId, field, currentValue, originalVal)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingField(null)
    setEditingValue('')
    setOriginalValue('')
  }

  const handleSave = (leadId: string, field: string, newValue: string, originalVal: string) => {
    // Only update if value changed
    if (newValue !== originalVal) {
      const updates: Partial<Lead> = {}
      
      switch (field) {
        case 'contactName':
          updates.contactName = newValue || null
          break
        case 'contactRole':
          updates.contactJobTitle = newValue || null
          break
        case 'phone':
          updates.contactPhone = newValue || null
          break
        case 'email':
          updates.contactEmail = newValue || null
          break
        case 'linkedin':
          updates.contactLinkedinUrl = newValue || null
          break
        case 'opsComments':
          updates.opsComments = newValue || null
          break
        case 'charlieFeedback':
          updates.charlieFeedback = newValue || null
          break
        case 'matchAssessment':
          if (newValue) {
            updates.matchAssessment = newValue as MatchAssessment
          }
          break
      }
      
      if (Object.keys(updates).length > 0) {
        updateLead({ id: leadId, updates })
      }
    }
    
    cancelEdit()
  }

  const startEdit = (leadId: string, field: string, currentValue: string | null | undefined) => {
    const val = currentValue || ''
    setEditingId(leadId)
    setEditingField(field)
    setEditingValue(val)
    setOriginalValue(val)
  }

  const totalPages = Math.ceil(leads.length / PAGE_SIZE)
  const paginated = leads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    setSelected(
      selected.length === paginated.length ? [] : paginated.map((l) => l.id)
    )
  }

  const handleBulkEmailStatus = (status: LeadStatus) => {
    for (const id of selected) {
      updateLead({ id, updates: { status } })
    }
    setSelected([])
  }

  const handleBulkResponse = (response: ResponseStatus) => {
    for (const id of selected) {
      const lead = leads.find(l => l.id === id)
      if (lead) {
        const cleanComments = (lead.opsComments || '').replace(/\[Response:\s*(positive|negative|none)\]\s*/i, '')
        const responseText = response !== 'none' ? `[Response: ${response}] ${cleanComments}` : cleanComments
        updateLead({ id, updates: { opsComments: responseText.trim() || null } })
      }
    }
    setSelected([])
  }

  const handleDeleteClick = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation()
    setLeadToDelete(lead)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!leadToDelete) return
    
    setIsDeleting(true)
    try {
      await deleteLead(leadToDelete.id)
      setDeleteModalOpen(false)
      setLeadToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkDeleteClick = () => {
    if (selected.length === 0) return
    setBulkDeleteModalOpen(true)
  }

  const handleConfirmBulkDelete = async () => {
    setIsDeleting(true)
    try {
      for (const id of selected) {
        await deleteLead(id)
      }
      setSelected([])
      setBulkDeleteModalOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  // Helper to extract response from opsComments
  const getResponseFromComments = (comments: string | null): ResponseStatus => {
    if (!comments) return 'none'
    const match = comments.match(/\[Response:\s*(positive|negative|none)\]/i)
    if (match) {
      return match[1].toLowerCase() as ResponseStatus
    }
    return 'none'
  }

  // Get clean comments without response tag
  const getCleanComments = (comments: string | null): string => {
    if (!comments) return ''
    return comments.replace(/\[Response:\s*(positive|negative|none)\]\s*/i, '')
  }

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
        title="No leads found"
        description="Try adjusting your filters or run the scraper to find new leads"
      />
    )
  }

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
        <div className="flex items-center gap-1 min-w-[140px]">
          <input
            ref={inputRef}
            type={inputType}
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, leadId, field, editingValue, originalValue)}
            onBlur={() => handleSave(leadId, field, editingValue, originalValue)}
            className="flex-1 px-2 py-1 text-xs rounded border border-blue-400 dark:border-blue-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder={placeholder}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleSave(leadId, field, editingValue, originalValue)
            }}
            className="p-1 text-green-600 hover:text-green-700 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              cancelEdit()
            }}
            className="p-1 text-red-600 hover:text-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }

    return (
      <div
        className="group flex items-center gap-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-1 py-0.5 transition-colors min-w-[80px]"
        onClick={(e) => {
          e.stopPropagation()
          startEdit(leadId, field, displayValue)
        }}
      >
        <span className="text-slate-600 dark:text-slate-400 text-xs truncate flex-1">
          {displayValue || placeholder}
        </span>
        <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Bulk actions bar */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selected.length} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-500 mr-1">Email Status:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkEmailStatus('Email 1')}
              className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            >
              Email 1
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkEmailStatus('Email 2')}
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              Email 2
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkEmailStatus('Email 3')}
              className="border-purple-200 text-purple-600 hover:bg-purple-50"
            >
              Email 3
            </Button>
            <span className="text-xs text-slate-500 ml-2 mr-1">Response:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkResponse('positive')}
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            >
              <ThumbsUp className="w-3 h-3 mr-1" />
              Positive
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkResponse('negative')}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <ThumbsDown className="w-3 h-3 mr-1" />
              Negative
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkResponse('none')}
            >
              <Minus className="w-3 h-3 mr-1" />
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDeleteClick}
              leftIcon={<Trash2 className="w-4 h-4" />}
              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              Delete {selected.length}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selected.length === paginated.length && paginated.length > 0}
                  onChange={toggleAll}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lead Added</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Source</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">City</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Company Name</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Job Title</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Location</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Job Link</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date Posted</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Applicants</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact Name</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role Title</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">LinkedIn</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Company URL</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Match Assessment</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Status</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Response</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ops Comments</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Charlie's Feedback</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {paginated.map((lead) => {
              const response = getResponseFromComments(lead.opsComments)
              
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
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.includes(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                    {formatDate(lead.createdAt)}
                  </td>
                  <td className="px-3 py-3">
                    <PlatformBadge platform={lead.platform} />
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                    {lead.city}
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-200 max-w-[150px] truncate">
                    {lead.companyName}
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                    {lead.jobTitle}
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    {lead.city}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <a
                      href={lead.jobAdUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
                      title="View job ad"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="text-xs">View</span>
                    </a>
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                    {formatDate(lead.datePosted)}
                  </td>
                  <td className="px-3 py-3">
                    {lead.applicantCount ? (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {lead.applicantCount}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  
                  <td className="px-3 py-3">
                    {renderEditableCell(lead.id, 'contactName', lead.contactName, 'Click to add', 'text')}
                  </td>
                  <td className="px-3 py-3">
                    {renderEditableCell(lead.id, 'contactRole', lead.contactJobTitle, 'Click to add', 'text')}
                  </td>
                  <td className="px-3 py-3">
                    {renderEditableCell(lead.id, 'phone', lead.contactPhone, 'Click to add', 'tel')}
                  </td>
                  <td className="px-3 py-3">
                    {renderEditableCell(lead.id, 'email', lead.contactEmail, 'Click to add', 'email')}
                  </td>
                  <td className="px-3 py-3">
                    {renderEditableCell(lead.id, 'linkedin', lead.contactLinkedinUrl, 'Click to add', 'url')}
                  </td>
                  
                  {/* Company URL - Non-editable clickable link */}
                  <td className="px-3 py-3">
                    {lead.companyWebsite ? (
                      <a
                        href={lead.companyWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-xs truncate max-w-[120px]"
                        title={lead.companyWebsite}
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {lead.companyWebsite.replace('https://', '').replace('http://', '').replace('www.', '')}
                        </span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  
                  {/* Match Assessment Column */}
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    {editingId === lead.id && editingField === 'matchAssessment' ? (
                      <div className="flex items-center gap-1">
                        <select
                          ref={inputRef as any}
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleSave(lead.id, 'matchAssessment', editingValue, originalValue)}
                          className="px-2 py-1 text-xs rounded border border-blue-400 dark:border-blue-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select...</option>
                          <option value="High">🔥 High Match</option>
                          <option value="Medium">📊 Medium Match</option>
                          <option value="Low">⚠️ Low Match</option>
                        </select>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSave(lead.id, 'matchAssessment', editingValue, originalValue)
                          }}
                          className="p-1 text-green-600 hover:text-green-700 rounded hover:bg-green-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            cancelEdit()
                          }}
                          className="p-1 text-red-600 hover:text-red-700 rounded hover:bg-red-50"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "group flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity px-2 py-1 rounded-md",
                          lead.matchAssessment 
                            ? MATCH_ASSESSMENT_STYLES[lead.matchAssessment] 
                            : "bg-slate-100 dark:bg-slate-700/50 text-slate-500"
                        )}
                        onClick={() => startEdit(lead.id, 'matchAssessment', lead.matchAssessment)}
                      >
                        {!lead.matchAssessment ? (
                          <>
                            <Star className="w-3.5 h-3.5" />
                            <span className="text-xs">Set match</span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm">{MATCH_ASSESSMENT_ICONS[lead.matchAssessment]}</span>
                            <span className="text-xs font-medium">{lead.matchAssessment}</span>
                          </>
                        )}
                        <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                      </div>
                    )}
                  </td>
                  
                  {/* Email Status Column - Colored Dropdown */}
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={lead.status}
                      onChange={(e) => {
                        updateLead({ id: lead.id, updates: { status: e.target.value as LeadStatus } })
                      }}
                      className={cn(
                        "px-2 py-1 text-xs rounded border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 font-medium",
                        getEmailStatusStyle(lead.status)
                      )}
                    >
                      <option value="Not Sent">📧 Not Sent</option>
                      <option value="Email 1">📧 Email 1 Sent</option>
                      <option value="Email 2">📧 Email 2 Sent</option>
                      <option value="Email 3">📧 Email 3 Sent</option>
                    </select>
                   </td>
                  
                  {/* Response Column - Dropdown with colors */}
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={response}
                      onChange={(e) => {
                        const newResponse = e.target.value as ResponseStatus
                        const cleanComments = getCleanComments(lead.opsComments)
                        const responseText = newResponse !== 'none' ? `[Response: ${newResponse}] ${cleanComments}` : cleanComments
                        updateLead({ id: lead.id, updates: { opsComments: responseText.trim() || null } })
                      }}
                      className={cn(
                        "px-2 py-1 text-xs rounded border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 font-medium",
                        getResponseStyle(response)
                      )}
                    >
                      <option value="none">⚪ None</option>
                      <option value="positive">👍 Positive</option>
                      <option value="negative">👎 Negative</option>
                    </select>
                   </td>
                  
                  {/* Ops Comments - Clean display without response tag */}
                  <td className="px-3 py-3 max-w-[200px]">
                    {renderEditableCell(lead.id, 'opsComments', getCleanComments(lead.opsComments), 'Click to add comment', 'text')}
                   </td>
                  <td className="px-3 py-3 max-w-[200px]">
                    {renderEditableCell(lead.id, 'charlieFeedback', lead.charlieFeedback, 'Click to add feedback', 'text')}
                   </td>
                  
                  <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleDeleteClick(lead, e)}
                      className="p-1 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Delete lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                   </td>
                 </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, leads.length)} of {leads.length} leads
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Prev
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        title="Delete Lead"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? <Spinner size="sm" /> : 'Delete'}
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 py-2">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              Are you sure you want to delete this lead?
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Company: <span className="font-medium">{leadToDelete?.companyName}</span>
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Job: {leadToDelete?.jobTitle}
            </p>
            <p className="text-xs text-red-500 mt-2">
              This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={bulkDeleteModalOpen}
        onClose={() => !isDeleting && setBulkDeleteModalOpen(false)}
        title="Delete Multiple Leads"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? <Spinner size="sm" /> : `Delete ${selected.length} Leads`}
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 py-2">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              Are you sure you want to delete {selected.length} lead(s)?
            </p>
            <p className="text-xs text-red-500 mt-2">
              This action cannot be undone. All data for these leads will be permanently removed.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}