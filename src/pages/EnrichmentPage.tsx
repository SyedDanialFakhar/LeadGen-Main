// src/pages/EnrichmentPage.tsx
import { useState } from 'react'
import { Sparkles, UserCheck, X } from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { PageHeader } from '@/components/layout/PageHeader'
import { EnrichmentTable } from '@/components/enrichment/EnrichmentTable'
import { ContactFinderModal } from '@/components/enrichment/ContactFinderModal'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useEnrichment } from '@/hooks/useEnrichment'
import { useLeads } from '@/hooks/useLeads'
import type { Lead } from '@/types'
import type { ContactDecision } from '@/services/contactFinderService'

export function EnrichmentPage() {
  const {
    pendingLeads,
    isLoading,
    enrichingId,
    enrichLead,
    skipLead,
    enrichAll,
    hunterCredits,
  } = useEnrichment()

  const { updateLead } = useLeads()

  // ── Selection state ─────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [contactFinderOpen, setContactFinderOpen] = useState(false)

  const selectedLeads = pendingLeads.filter(l => selectedIds.includes(l.id))

  // ── Handle ContactFinder confirm ────────────────────────────────────────────
  const handleContactFinderConfirm = (decisions: ContactDecision[]) => {
    const accepted = decisions.filter(d => d.accept)

    for (const d of accepted) {
      const updates: Partial<Lead> = {}

      if (d.contactName)       updates.contactName        = d.contactName
      if (d.contactTitle)      updates.contactJobTitle    = d.contactTitle
      if (d.contactLinkedinUrl) updates.contactLinkedinUrl = d.contactLinkedinUrl
      if (d.contactEmail)      updates.contactEmail       = d.contactEmail
      if (d.companyLinkedinUrl) updates.companyLinkedinUrl = d.companyLinkedinUrl
      if (d.companyWebsite)    updates.companyWebsite     = d.companyWebsite
      if (d.employeeCount != null) {
        updates.companyEmployeeCount = String(d.employeeCount)
      }
      // Mark as enriched only if we found an email
      if (d.contactEmail) {
        updates.enrichmentStatus = 'enriched'
      }

      if (Object.keys(updates).length > 0) {
        updateLead({ id: d.leadId, updates })
      }
    }

    setContactFinderOpen(false)
    setSelectedIds([])
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopNav
        title="Enrichment"
        subtitle={`${pendingLeads.length} lead${pendingLeads.length !== 1 ? 's' : ''} awaiting enrichment`}
        actions={
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button
                size="sm"
                leftIcon={<UserCheck className="w-4 h-4" />}
                onClick={() => setContactFinderOpen(true)}
              >
                Find Contacts ({selectedIds.length})
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Sparkles className="w-4 h-4" />}
              onClick={enrichAll}
              disabled={pendingLeads.length === 0 || !!enrichingId}
              isLoading={!!enrichingId}
            >
              Enrich All
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 flex flex-col gap-6">
        <PageHeader
          title="Contact Enrichment"
          description="Find emails and LinkedIn profiles for your leads. Select one or more leads and click Find Contacts to run the full Apollo flow."
        />

        {/* ── Selection action bar ── */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {selectedIds.length} lead{selectedIds.length !== 1 ? 's' : ''} selected
            </span>

            <Button
              size="sm"
              leftIcon={<UserCheck className="w-3.5 h-3.5" />}
              onClick={() => setContactFinderOpen(true)}
              className="h-7 px-3 text-xs"
            >
              Find Contacts via Apollo
            </Button>

            <p className="text-xs text-blue-500 dark:text-blue-400">
              Apollo will search for the right person + email at each company
            </p>

            <button
              onClick={() => setSelectedIds([])}
              className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        )}

        {/* ── Credit counters ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardBody>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Hunter.io Credits
              </p>
              <ProgressBar
                value={hunterCredits.used}
                max={hunterCredits.total}
                label={`${hunterCredits.used} of ${hunterCredits.total} searches used this month`}
                color={
                  hunterCredits.used >= hunterCredits.total
                    ? 'red'
                    : hunterCredits.used > hunterCredits.total * 0.8
                    ? 'yellow'
                    : 'blue'
                }
              />
              {hunterCredits.used >= hunterCredits.total && (
                <p className="text-xs text-red-500 mt-1">
                  ⚠️ Monthly limit reached. Resets next month.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Apollo.io Export Credits (free tier)
              </p>
              <ProgressBar
                value={0}
                max={50}
                label="50 email reveals/month — used when Apollo needs to reveal an email"
                color="blue"
              />
              <p className="text-xs text-slate-400 mt-1">
                ℹ️ Emails already in Apollo search results are free. Reveals cost 1 credit each.
              </p>
            </CardBody>
          </Card>
        </div>

        {/* ── Enrichment table ── */}
        <EnrichmentTable
          leads={pendingLeads}
          isLoading={isLoading}
          enrichingId={enrichingId}
          onHunter={(lead: Lead) => enrichLead(lead, 'hunter')}
          onApollo={(lead: Lead) => enrichLead(lead, 'apollo')}
          onSkip={skipLead}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>

      {/* ── Contact Finder Modal ── */}
      <ContactFinderModal
        isOpen={contactFinderOpen}
        leads={selectedLeads}
        onConfirm={handleContactFinderConfirm}
        onClose={() => setContactFinderOpen(false)}
      />
    </div>
  )
}