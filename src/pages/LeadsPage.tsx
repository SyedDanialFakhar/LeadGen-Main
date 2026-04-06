// src/pages/LeadsPage.tsx
import { useState } from 'react'
import { Download, Plus } from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { PageHeader } from '@/components/layout/PageHeader'
import { LeadFilters } from '@/components/leads/LeadFilters'
import { LeadTable } from '@/components/leads/LeadTable'
import { LeadDetailModal } from '@/components/leads/LeadDetailModal'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useLeads } from '@/hooks/useLeads'
import { useFilters } from '@/hooks/useFilters'
import { CITIES, PLATFORMS, JOB_ROLES } from '@/utils/constants'
import type { Lead, NewLead } from '@/types'

export function LeadsPage() {
  const { filters } = useFilters()
  const { leads, isLoading, exportToCSV, createLeads } = useLeads(filters)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newLead, setNewLead] = useState<Partial<NewLead>>({
    platform: 'seek',
    city: 'Melbourne',
    status: 'new',
    enrichmentStatus: 'pending',
  })

  const handleAddLead = () => {
    if (!newLead.companyName || !newLead.jobTitle || !newLead.jobAdUrl || !newLead.datePosted) return
    createLeads([newLead as NewLead])
    setShowAddModal(false)
    setNewLead({ platform: 'seek', city: 'Melbourne', status: 'new', enrichmentStatus: 'pending' })
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopNav
        title="Leads"
        subtitle={`${leads.length} leads total`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={exportToCSV}
            >
              Export CSV
            </Button>
            <Button
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowAddModal(true)}
            >
              Add Lead
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 flex flex-col gap-4">
        <PageHeader
          title="All Leads"
          description="Manage and track all your recruitment leads"
        />

        <LeadFilters />

        <LeadTable
          leads={leads}
          isLoading={isLoading}
          onRowClick={setSelectedLead}
        />
      </div>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />

      {/* Add Lead Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Lead Manually"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddLead}
              disabled={
                !newLead.companyName ||
                !newLead.jobTitle ||
                !newLead.jobAdUrl ||
                !newLead.datePosted
              }
            >
              Add Lead
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Platform"
              value={newLead.platform ?? 'seek'}
              onChange={(e) =>
                setNewLead((p) => ({
                  ...p,
                  platform: e.target.value as NewLead['platform'],
                }))
              }
              options={PLATFORMS.map((p) => ({
                value: p,
                label: p === 'seek' ? 'Seek' : 'LinkedIn',
              }))}
            />
            <Select
              label="City"
              value={newLead.city ?? 'Melbourne'}
              onChange={(e) =>
                setNewLead((p) => ({
                  ...p,
                  city: e.target.value as NewLead['city'],
                }))
              }
              options={CITIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <Input
            label="Company Name *"
            value={newLead.companyName ?? ''}
            onChange={(e) =>
              setNewLead((p) => ({ ...p, companyName: e.target.value }))
            }
            placeholder="Blue Star Logistics"
          />
          <Select
            label="Job Title *"
            value={newLead.jobTitle ?? ''}
            onChange={(e) =>
              setNewLead((p) => ({ ...p, jobTitle: e.target.value }))
            }
            options={JOB_ROLES.map((r) => ({ value: r, label: r }))}
          />
          <Input
            label="Job Ad URL *"
            value={newLead.jobAdUrl ?? ''}
            onChange={(e) =>
              setNewLead((p) => ({ ...p, jobAdUrl: e.target.value }))
            }
            placeholder="https://www.seek.com.au/job/..."
          />
          <Input
            label="Date Posted *"
            type="date"
            value={newLead.datePosted ?? ''}
            onChange={(e) =>
              setNewLead((p) => ({ ...p, datePosted: e.target.value }))
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contact Name"
              value={newLead.contactName ?? ''}
              onChange={(e) =>
                setNewLead((p) => ({ ...p, contactName: e.target.value }))
              }
              placeholder="Moss Cassidy"
            />
            <Input
              label="Contact Role"
              value={newLead.contactJobTitle ?? ''}
              onChange={(e) =>
                setNewLead((p) => ({
                  ...p,
                  contactJobTitle: e.target.value,
                }))
              }
              placeholder="General Manager"
            />
          </div>
          <Select
            label="Company Size"
            value={newLead.companyEmployeeCount ?? ''}
            onChange={(e) =>
              setNewLead((p) => ({
                ...p,
                companyEmployeeCount: e.target.value,
              }))
            }
            options={[
              { value: '', label: 'Unknown' },
              { value: '1-10', label: '1-10 employees' },
              { value: '11-50', label: '11-50 employees' },
              { value: '51-200', label: '51-200 employees' },
              { value: '201-500', label: '201-500 employees' },
            ]}
          />
        </div>
      </Modal>
    </div>
  )
}