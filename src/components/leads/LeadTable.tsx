// src/components/leads/LeadTable.tsx
import { useState, useRef, useEffect } from 'react'
import { ExternalLink, Mail, Phone, Building2, Calendar, MapPin, ChevronLeft, ChevronRight, Linkedin, Globe, Edit2, Check, X, Star, User, Briefcase, Trash2, AlertTriangle, Users } from 'lucide-react'
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
  
  // Single editing state (only one field can be edited at a time)
  const [editingField, setEditingField] = useState<{
    leadId: string
    field: string
    value: string
  } | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when editing starts
  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editingField])

  // Handle save on Enter key
  const handleKeyDown = (e: React.KeyboardEvent, leadId: string, field: string, value: string, saveCallback: () => void) => {
    if (e.key === 'Enter') {
      saveCallback()
    } else if (e.key === 'Escape') {
      setEditingField(null)
    }
  }

  // Handle click outside to cancel
  const handleBlur = (saveCallback: () => void) => {
    // Small delay to allow save button click to register
    setTimeout(() => {
      if (editingField) {
        saveCallback()
      }
    }, 150)
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

  const handleBulkStatus = (status: LeadStatus) => {
    bulkUpdateStatus({ ids: selected, status })
    setSelected([])
  }

  // Single delete handlers
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

  // Bulk delete handlers
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

  // Generic save handler
  const saveField = (leadId: string, field: string, value: string, updateFn: (id: string, value: string) => void) => {
    if (value.trim() === '') {
      updateFn(leadId, '')
    } else {
      updateFn(leadId, value)
    }
    setEditingField(null)
  }

  // Specific update functions
  const updateContactName = (leadId: string, value: string) => {
    updateLead({ id: leadId, updates: { contactName: value || null } })
  }

  const updateContactRole = (leadId: string, value: string) => {
    updateLead({ id: leadId, updates: { contactJobTitle: value || null } })
  }

  const updatePhone = (leadId: string, value: string) => {
    updateLead({ id: leadId, updates: { contactPhone: value || null } })
  }

  const updateEmail = (leadId: string, value: string) => {
    updateLead({ id: leadId, updates: { contactEmail: value || null } })
  }

  const updateLinkedin = (leadId: string, value: string) => {
    updateLead({ id: leadId, updates: { contactLinkedinUrl: value || null } })
  }

  const updateComment = (leadId: string, value: string) => {
    updateLead({ id: leadId, updates: { opsComments: value || null } })
  }

  const updateCharlie = (leadId: string, value: string) => {
    updateLead({ id: leadId, updates: { charlieFeedback: value || null } })
  }

  const updateMatchAssessment = (leadId: string, value: MatchAssessment) => {
    updateLead({ id: leadId, updates: { matchAssessment: value } })
  }

  // Start editing a field
  const startEditing = (lead: Lead, field: string, currentValue: string | null | undefined) => {
    setEditingField({
      leadId: lead.id,
      field,
      value: currentValue || ''
    })
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

  // Render cell with inline editing support
  const renderEditableCell = (
    lead: Lead,
    field: string,
    displayValue: string | null | undefined,
    placeholder: string,
    updateFn: (leadId: string, value: string) => void,
    inputType: 'text' | 'email' | 'tel' | 'url' = 'text'
  ) => {
    const isEditing = editingField?.leadId === lead.id && editingField?.field === field
    const value = displayValue || ''

    if (isEditing) {
      return (
        <div className="flex items-center gap-1 min-w-[140px]">
          <input
            ref={inputRef}
            type={inputType}
            value={editingField?.value || ''}
            onChange={(e) => setEditingField(prev => prev ? { ...prev, value: e.target.value } : null)}
            onKeyDown={(e) => handleKeyDown(e, lead.id, field, editingField?.value || '', () => saveField(lead.id, field, editingField?.value || '', updateFn))}
            onBlur={() => handleBlur(() => saveField(lead.id, field, editingField?.value || '', updateFn))}
            className="flex-1 px-2 py-1 text-xs rounded border border-blue-400 dark:border-blue-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder={placeholder}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation()
              saveField(lead.id, field, editingField?.value || '', updateFn)
            }}
            className="p-1 text-green-600 hover:text-green-700 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditingField(null)
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
          startEditing(lead, field, displayValue)
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
            {(['assessed', 'called', 'converted', 'closed'] as LeadStatus[]).map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                onClick={() => handleBulkStatus(s)}
              >
                Mark {s}
              </Button>
            ))}
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
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ops Comments</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Charlie's Feedback</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {paginated.map((lead) => {
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
                  
                  {/* Contact Name - Editable */}
                  <td className="px-3 py-3">
                    {renderEditableCell(lead, 'contactName', lead.contactName, 'Click to add', updateContactName, 'text')}
                  </td>
                  
                  {/* Role Title - Editable */}
                  <td className="px-3 py-3">
                    {renderEditableCell(lead, 'contactRole', lead.contactJobTitle, 'Click to add', updateContactRole, 'text')}
                  </td>
                  
                  {/* Phone - Editable */}
                  <td className="px-3 py-3">
                    {renderEditableCell(lead, 'phone', lead.contactPhone, 'Click to add', updatePhone, 'tel')}
                  </td>
                  
                  {/* Email - Editable */}
                  <td className="px-3 py-3">
                    {renderEditableCell(lead, 'email', lead.contactEmail, 'Click to add', updateEmail, 'email')}
                  </td>
                  
                  {/* LinkedIn - Editable */}
                  <td className="px-3 py-3">
                    {renderEditableCell(lead, 'linkedin', lead.contactLinkedinUrl, 'Click to add', updateLinkedin, 'url')}
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
                  
                  {/* Match Assessment Column - Special dropdown */}
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    {editingField?.leadId === lead.id && editingField?.field === 'matchAssessment' ? (
                      <div className="flex items-center gap-1">
                        <select
                          ref={inputRef as any}
                          value={editingField?.value || ''}
                          onChange={(e) => setEditingField(prev => prev ? { ...prev, value: e.target.value } : null)}
                          onBlur={() => {
                            if (editingField?.value) {
                              updateMatchAssessment(lead.id, editingField.value as MatchAssessment)
                            }
                            setEditingField(null)
                          }}
                          className="px-2 py-1 text-xs rounded border border-blue-400 dark:border-blue-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select...</option>
                          <option value="High">🔥 High Match</option>
                          <option value="Medium">📊 Medium Match</option>
                          <option value="Low">⚠️ Low Match</option>
                        </select>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "group flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity px-2 py-1 rounded-md",
                          lead.matchAssessment 
                            ? MATCH_ASSESSMENT_STYLES[lead.matchAssessment] 
                            : "bg-slate-100 dark:bg-slate-700/50 text-slate-500"
                        )}
                        onClick={() => startEditing(lead, 'matchAssessment', lead.matchAssessment)}
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
                  
                  <td className="px-3 py-3">
                    <LeadStatusBadge status={lead.status} />
                  </td>
                  
                  {/* Ops Comments - Editable */}
                  <td className="px-3 py-3 max-w-[200px]">
                    {renderEditableCell(lead, 'opsComments', lead.opsComments, 'Click to add comment', updateComment, 'text')}
                  </td>
                  
                  {/* Charlie's Feedback - Editable */}
                  <td className="px-3 py-3 max-w-[200px]">
                    {renderEditableCell(lead, 'charlieFeedback', lead.charlieFeedback, 'Click to add feedback', updateCharlie, 'text')}
                  </td>
                  
                  {/* Actions Column - Delete Button */}
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