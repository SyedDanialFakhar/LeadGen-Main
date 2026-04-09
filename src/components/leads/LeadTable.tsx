// src/components/leads/LeadTable.tsx
import { useState } from 'react'
import { ExternalLink, Mail, Phone, Building2, Calendar, MapPin, ChevronLeft, ChevronRight, Linkedin, Globe, Edit2, Check, X, Star, User, Briefcase, Trash2, AlertTriangle } from 'lucide-react'
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
  
  // Editing states for different fields
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCharlieId, setEditingCharlieId] = useState<string | null>(null)
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null)
  const [editingContactNameId, setEditingContactNameId] = useState<string | null>(null)
  const [editingContactRoleId, setEditingContactRoleId] = useState<string | null>(null)
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null)
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null)
  const [editingLinkedinId, setEditingLinkedinId] = useState<string | null>(null)
  const [editingWebsiteId, setEditingWebsiteId] = useState<string | null>(null)
  
  // Temp values for editing
  const [tempComment, setTempComment] = useState('')
  const [tempCharlie, setTempCharlie] = useState('')
  const [tempMatch, setTempMatch] = useState<MatchAssessment | null>(null)
  const [tempContactName, setTempContactName] = useState('')
  const [tempContactRole, setTempContactRole] = useState('')
  const [tempPhone, setTempPhone] = useState('')
  const [tempEmail, setTempEmail] = useState('')
  const [tempLinkedin, setTempLinkedin] = useState('')
  const [tempWebsite, setTempWebsite] = useState('')

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
      // Delete leads one by one or use bulk delete API
      for (const id of selected) {
        await deleteLead(id)
      }
      setSelected([])
      setBulkDeleteModalOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  // Comment handlers
  const handleSaveComment = (leadId: string, comment: string) => {
    updateLead({ id: leadId, updates: { opsComments: comment } })
    setEditingCommentId(null)
    setTempComment('')
  }

  const handleEditComment = (lead: Lead) => {
    setTempComment(lead.opsComments || '')
    setEditingCommentId(lead.id)
  }

  const handleCancelCommentEdit = () => {
    setEditingCommentId(null)
    setTempComment('')
  }

  // Charlie feedback handlers
  const handleSaveCharlie = (leadId: string, charlie: string) => {
    updateLead({ id: leadId, updates: { charlieFeedback: charlie } })
    setEditingCharlieId(null)
    setTempCharlie('')
  }

  const handleEditCharlie = (lead: Lead) => {
    setTempCharlie(lead.charlieFeedback || '')
    setEditingCharlieId(lead.id)
  }

  const handleCancelCharlieEdit = () => {
    setEditingCharlieId(null)
    setTempCharlie('')
  }

  // Match assessment handlers
  const handleSaveMatchAssessment = (leadId: string, assessment: MatchAssessment) => {
    updateLead({ id: leadId, updates: { matchAssessment: assessment } })
    setEditingMatchId(null)
    setTempMatch(null)
  }

  const handleEditMatchAssessment = (lead: Lead) => {
    setTempMatch(lead.matchAssessment)
    setEditingMatchId(lead.id)
  }

  const handleCancelMatchEdit = () => {
    setEditingMatchId(null)
    setTempMatch(null)
  }

  // Contact Name handlers
  const handleSaveContactName = (leadId: string, contactName: string) => {
    updateLead({ id: leadId, updates: { contactName: contactName || null } })
    setEditingContactNameId(null)
    setTempContactName('')
  }

  const handleEditContactName = (lead: Lead) => {
    setTempContactName(lead.contactName || '')
    setEditingContactNameId(lead.id)
  }

  const handleCancelContactNameEdit = () => {
    setEditingContactNameId(null)
    setTempContactName('')
  }

  // Contact Role handlers
  const handleSaveContactRole = (leadId: string, contactRole: string) => {
    updateLead({ id: leadId, updates: { contactJobTitle: contactRole || null } })
    setEditingContactRoleId(null)
    setTempContactRole('')
  }

  const handleEditContactRole = (lead: Lead) => {
    setTempContactRole(lead.contactJobTitle || '')
    setEditingContactRoleId(lead.id)
  }

  const handleCancelContactRoleEdit = () => {
    setEditingContactRoleId(null)
    setTempContactRole('')
  }

  // Phone handlers
  const handleSavePhone = (leadId: string, phone: string) => {
    updateLead({ id: leadId, updates: { contactPhone: phone || null } })
    setEditingPhoneId(null)
    setTempPhone('')
  }

  const handleEditPhone = (lead: Lead) => {
    setTempPhone(lead.contactPhone || '')
    setEditingPhoneId(lead.id)
  }

  const handleCancelPhoneEdit = () => {
    setEditingPhoneId(null)
    setTempPhone('')
  }

  // Email handlers
  const handleSaveEmail = (leadId: string, email: string) => {
    updateLead({ id: leadId, updates: { contactEmail: email || null } })
    setEditingEmailId(null)
    setTempEmail('')
  }

  const handleEditEmail = (lead: Lead) => {
    setTempEmail(lead.contactEmail || '')
    setEditingEmailId(lead.id)
  }

  const handleCancelEmailEdit = () => {
    setEditingEmailId(null)
    setTempEmail('')
  }

  // LinkedIn handlers
  const handleSaveLinkedin = (leadId: string, linkedin: string) => {
    updateLead({ id: leadId, updates: { contactLinkedinUrl: linkedin || null } })
    setEditingLinkedinId(null)
    setTempLinkedin('')
  }

  const handleEditLinkedin = (lead: Lead) => {
    setTempLinkedin(lead.contactLinkedinUrl || '')
    setEditingLinkedinId(lead.id)
  }

  const handleCancelLinkedinEdit = () => {
    setEditingLinkedinId(null)
    setTempLinkedin('')
  }

  // Company Website handlers
  const handleSaveWebsite = (leadId: string, website: string) => {
    updateLead({ id: leadId, updates: { companyWebsite: website || null } })
    setEditingWebsiteId(null)
    setTempWebsite('')
  }

  const handleEditWebsite = (lead: Lead) => {
    setTempWebsite(lead.companyWebsite || '')
    setEditingWebsiteId(lead.id)
  }

  const handleCancelWebsiteEdit = () => {
    setEditingWebsiteId(null)
    setTempWebsite('')
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
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Link</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date Posted</th>
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
                      className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"
                      title="View job ad"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                    {formatDate(lead.datePosted)}
                  </td>
                  
                  {/* Editable Contact Name */}
                  <td className="px-3 py-3 max-w-[150px]" onClick={(e) => e.stopPropagation()}>
                    {editingContactNameId === lead.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={tempContactName}
                          onChange={(e) => setTempContactName(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                          placeholder="Contact name"
                        />
                        <button
                          onClick={() => handleSaveContactName(lead.id, tempContactName)}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={handleCancelContactNameEdit}
                          className="p-1 text-red-600 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="group flex items-center gap-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-1 py-0.5 transition-colors"
                        onClick={() => handleEditContactName(lead)}
                      >
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-400 text-xs truncate flex-1">
                          {lead.contactName || 'Click to add'}
                        </span>
                        <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </td>
                  
                  {/* Editable Role Title */}
                  <td className="px-3 py-3 max-w-[150px]" onClick={(e) => e.stopPropagation()}>
                    {editingContactRoleId === lead.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={tempContactRole}
                          onChange={(e) => setTempContactRole(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                          placeholder="Role title"
                        />
                        <button
                          onClick={() => handleSaveContactRole(lead.id, tempContactRole)}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={handleCancelContactRoleEdit}
                          className="p-1 text-red-600 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="group flex items-center gap-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-1 py-0.5 transition-colors"
                        onClick={() => handleEditContactRole(lead)}
                      >
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-400 text-xs truncate flex-1">
                          {lead.contactJobTitle || 'Click to add'}
                        </span>
                        <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </td>
                  
                  {/* Editable Phone */}
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    {editingPhoneId === lead.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={tempPhone}
                          onChange={(e) => setTempPhone(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                          placeholder="Phone number"
                        />
                        <button
                          onClick={() => handleSavePhone(lead.id, tempPhone)}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={handleCancelPhoneEdit}
                          className="p-1 text-red-600 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="group flex items-center gap-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-1 py-0.5 transition-colors"
                        onClick={() => handleEditPhone(lead)}
                      >
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-400 text-xs truncate flex-1">
                          {lead.contactPhone || 'Click to add'}
                        </span>
                        <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </td>
                  
                  {/* Editable Email */}
                  <td className="px-3 py-3 max-w-[150px]" onClick={(e) => e.stopPropagation()}>
                    {editingEmailId === lead.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="email"
                          value={tempEmail}
                          onChange={(e) => setTempEmail(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                          placeholder="email@example.com"
                        />
                        <button
                          onClick={() => handleSaveEmail(lead.id, tempEmail)}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={handleCancelEmailEdit}
                          className="p-1 text-red-600 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="group flex items-center gap-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-1 py-0.5 transition-colors"
                        onClick={() => handleEditEmail(lead)}
                      >
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-400 text-xs truncate flex-1">
                          {lead.contactEmail || 'Click to add'}
                        </span>
                        <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </td>
                  
                  {/* Editable LinkedIn */}
                  <td className="px-3 py-3 max-w-[150px]" onClick={(e) => e.stopPropagation()}>
                    {editingLinkedinId === lead.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="url"
                          value={tempLinkedin}
                          onChange={(e) => setTempLinkedin(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                          placeholder="https://linkedin.com/in/..."
                        />
                        <button
                          onClick={() => handleSaveLinkedin(lead.id, tempLinkedin)}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={handleCancelLinkedinEdit}
                          className="p-1 text-red-600 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="group flex items-center gap-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-1 py-0.5 transition-colors"
                        onClick={() => handleEditLinkedin(lead)}
                      >
                        <Linkedin className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-400 text-xs truncate flex-1">
                          {lead.contactLinkedinUrl ? 'View' : 'Click to add'}
                        </span>
                        <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </td>
                  
                  {/* Editable Company URL */}
                  <td className="px-3 py-3 max-w-[150px]" onClick={(e) => e.stopPropagation()}>
                    {editingWebsiteId === lead.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="url"
                          value={tempWebsite}
                          onChange={(e) => setTempWebsite(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                          placeholder="https://company.com"
                        />
                        <button
                          onClick={() => handleSaveWebsite(lead.id, tempWebsite)}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={handleCancelWebsiteEdit}
                          className="p-1 text-red-600 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="group flex items-center gap-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-1 py-0.5 transition-colors"
                        onClick={() => handleEditWebsite(lead)}
                      >
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-400 text-xs truncate flex-1">
                          {lead.companyWebsite ? 'View' : 'Click to add'}
                        </span>
                        <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </td>
                  
                  {/* Match Assessment Column */}
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    {editingMatchId === lead.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={tempMatch || ''}
                          onChange={(e) => setTempMatch(e.target.value as MatchAssessment)}
                          className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        >
                          <option value="">Select...</option>
                          <option value="High">🔥 High Match</option>
                          <option value="Medium">📊 Medium Match</option>
                          <option value="Low">⚠️ Low Match</option>
                        </select>
                        <button
                          onClick={() => {
                            if (tempMatch) {
                              handleSaveMatchAssessment(lead.id, tempMatch)
                            }
                          }}
                          className="p-1 text-green-600 hover:text-green-700"
                          disabled={!tempMatch}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={handleCancelMatchEdit}
                          className="p-1 text-red-600 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
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
                        onClick={() => handleEditMatchAssessment(lead)}
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
                  
                  {/* Ops Comments */}
                  <td className="px-3 py-3 max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                    {editingCommentId === lead.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={tempComment}
                          onChange={(e) => setTempComment(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveComment(lead.id, tempComment)}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={handleCancelCommentEdit}
                          className="p-1 text-red-600 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="group flex items-center gap-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-1 py-0.5 transition-colors"
                        onClick={() => handleEditComment(lead)}
                      >
                        <span className="text-slate-500 dark:text-slate-400 text-xs truncate flex-1">
                          {lead.opsComments || 'Click to add comment'}
                        </span>
                        <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </td>
                  
                  {/* Charlie's Feedback */}
                  <td className="px-3 py-3 max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                    {editingCharlieId === lead.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={tempCharlie}
                          onChange={(e) => setTempCharlie(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveCharlie(lead.id, tempCharlie)}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={handleCancelCharlieEdit}
                          className="p-1 text-red-600 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="group flex items-center gap-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-1 py-0.5 transition-colors"
                        onClick={() => handleEditCharlie(lead)}
                      >
                        <span className="text-slate-500 dark:text-slate-400 text-xs truncate flex-1">
                          {lead.charlieFeedback || 'Click to add feedback'}
                        </span>
                        <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
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