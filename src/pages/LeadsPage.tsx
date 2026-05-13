// src/pages/LeadsPage.tsx
import { useState } from 'react'
import { Download, Plus } from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { PageHeader } from '@/components/layout/PageHeader'
import { LeadFilters } from '@/components/leads/LeadFilters'
import { LeadTable } from '@/components/leads/LeadTable'
import { LeadDetailModal } from '@/components/leads/LeadDetailModal'
import { AddLeadModal } from '@/components/leads/AddLeadModal'
import { LeadStatsBar } from '@/components/leads/LeadStatsBar'
import { Button } from '@/components/ui/Button'
import { useLeads } from '@/hooks/useLeads'
import { useFilters } from '@/hooks/useFilters'
import type { Lead } from '@/types'

export function LeadsPage() {
  const { filters } = useFilters()
  const { leads, isLoading, stats, exportToCSV } = useLeads(filters)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopNav
        title="Leads"
        subtitle={`${leads.length} leads`}
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

      <div className="flex-1 flex flex-col gap-4 p-6">
        <PageHeader
          title="All Leads"
          description="Manage and track your recruitment leads"
        />

        {stats && <LeadStatsBar stats={stats} />}

        <LeadFilters />

        <LeadTable
          leads={leads}
          isLoading={isLoading}
          onRowClick={setSelectedLead}
        />
      </div>

      <LeadDetailModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />

      <AddLeadModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  )
}