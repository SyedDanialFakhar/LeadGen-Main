// src/pages/EnrichmentPage.tsx
import { useState } from 'react'
import { Sparkles, UserCheck, X, Zap, Info, Phone } from 'lucide-react'
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

  const [selectedIds, setSelectedIds]             = useState<string[]>([])
  const [contactFinderOpen, setContactFinderOpen] = useState(false)

  const selectedLeads = pendingLeads.filter(l => selectedIds.includes(l.id))

  // src/pages/EnrichmentPage.tsx

const handleContactFinderConfirm = async (decisions: ContactDecision[]) => {
  const accepted = decisions.filter(d => d.accept)

  for (const d of accepted) {
    const updates: Partial<Lead> = {}

    if (d.contactName)        updates.contactName        = d.contactName
    if (d.contactTitle)       updates.contactJobTitle    = d.contactTitle
    if (d.contactLinkedinUrl) updates.contactLinkedinUrl = d.contactLinkedinUrl
    if (d.contactEmail)       updates.contactEmail       = d.contactEmail
    if (d.companyPhone)       updates.contactPhone       = d.companyPhone
    if (d.companyLinkedinUrl) updates.companyLinkedinUrl = d.companyLinkedinUrl
    if (d.companyWebsite)     updates.companyWebsite     = d.companyWebsite
    if (d.industry)           updates.companyIndustry    = d.industry
    if (d.employeeCount != null)
      updates.companyEmployeeCount = String(d.employeeCount)

    if (d.contactEmail) updates.enrichmentStatus = 'enriched'

    if (Object.keys(updates).length > 0) {
      // ✅ CORRECT - passing object with id and updates
      updateLead({ id: d.leadId, updates })
    }
  }

  setContactFinderOpen(false)
  setSelectedIds([])
}

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
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

      <div className="flex-1 p-6 flex flex-col gap-5">
        <PageHeader
          title="Contact Enrichment"
          description="Find the right hiring decision maker at each company — email, LinkedIn, and company phone via Apollo.io"
        />

        {/* Selection action bar */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                {selectedIds.length}
              </div>
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                lead{selectedIds.length !== 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="h-4 w-px bg-indigo-200 dark:bg-indigo-700" />

            <Button
              size="sm"
              leftIcon={<UserCheck className="w-3.5 h-3.5" />}
              onClick={() => setContactFinderOpen(true)}
              className="h-7 px-3 text-xs"
            >
              Find Contacts via Apollo
            </Button>

            <p className="text-xs text-indigo-500 dark:text-indigo-400 hidden sm:block">
              Finds HR/Owner → gets email + company phone automatically
            </p>

            <button
              onClick={() => setSelectedIds([])}
              className="ml-auto flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        )}

        {/* Credit cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-sm">
            <CardBody>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Hunter.io Credits</p>
              </div>
              <ProgressBar
                value={hunterCredits.used}
                max={hunterCredits.total}
                label={`${hunterCredits.used} of ${hunterCredits.total} searches used this month`}
                color={hunterCredits.used >= hunterCredits.total ? 'red' : hunterCredits.used > hunterCredits.total * 0.8 ? 'yellow' : 'blue'}
              />
              {hunterCredits.used >= hunterCredits.total && (
                <p className="text-xs text-red-500 mt-1.5">⚠️ Monthly limit reached. Resets next month.</p>
              )}
              <p className="text-xs text-slate-400 mt-1.5">Email fallback when Apollo has no match</p>
            </CardBody>
          </Card>

          <Card className="shadow-sm">
            <CardBody>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <Zap className="w-4 h-4 text-indigo-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Apollo.io Credits</p>
              </div>
              <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold shrink-0">FREE</span>
                  <span>People search — finds person + pre-scores by email availability</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold shrink-0">1 credit</span>
                  <span>Org enrichment — LinkedIn employee count + HQ phone + domain</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold shrink-0">1 credit</span>
                  <span>Email reveal (only for pre-scored candidates with has_email=true)</span>
                </div>
              </div>
              <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400">
                  HQ phone comes free from org enrichment. Personal mobiles require async webhook — not supported.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>

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

      <ContactFinderModal
        isOpen={contactFinderOpen}
        leads={selectedLeads}
        onConfirm={handleContactFinderConfirm}
        onClose={() => setContactFinderOpen(false)}
      />
    </div>
  )
}