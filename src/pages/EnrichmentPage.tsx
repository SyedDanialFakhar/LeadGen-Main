// src/pages/EnrichmentPage.tsx
import { Sparkles, RefreshCw } from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { PageHeader } from '@/components/layout/PageHeader'
import { EnrichmentTable } from '@/components/enrichment/EnrichmentTable'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useEnrichment } from '@/hooks/useEnrichment'
import type { Lead } from '@/types'

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

  return (
    <div className="flex flex-col min-h-screen">
      <TopNav
        title="Enrichment"
        subtitle={`${pendingLeads.length} leads awaiting enrichment`}
        actions={
          <Button
            size="sm"
            leftIcon={<Sparkles className="w-4 h-4" />}
            onClick={enrichAll}
            disabled={pendingLeads.length === 0 || !!enrichingId}
            isLoading={!!enrichingId}
          >
            Enrich All
          </Button>
        }
      />

      <div className="flex-1 p-6 flex flex-col gap-6">
        <PageHeader
          title="Contact Enrichment"
          description="Find emails, phone numbers, and LinkedIn profiles for your leads"
        />

        {/* Credit counters */}
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
                Apollo.io Phone Credits
              </p>
              <ProgressBar
                value={0}
                max={5}
                label="0 of 5 phone lookups used this month"
                color="blue"
              />
              <p className="text-xs text-slate-400 mt-1">
                ⚠️ Only 5 free phone lookups/month — use carefully
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Enrichment table */}
        <EnrichmentTable
          leads={pendingLeads}
          isLoading={isLoading}
          enrichingId={enrichingId}
          onHunter={(lead: Lead) => enrichLead(lead, 'hunter')}
          onApollo={(lead: Lead) => enrichLead(lead, 'apollo')}
          onSkip={skipLead}
        />
      </div>
    </div>
  )
}