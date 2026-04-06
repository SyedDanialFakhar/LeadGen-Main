// src/pages/DashboardPage.tsx
import { useNavigate } from 'react-router-dom'
import { TopNav } from '@/components/layout/TopNav'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatsGrid } from '@/components/dashboard/StatsGrid'
import { RecentLeadsTable } from '@/components/dashboard/RecentLeadsTable'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { ApiStatusCard } from '@/components/dashboard/ApiStatusCard'
import { useLeads } from '@/hooks/useLeads'

export function DashboardPage() {
  const navigate = useNavigate()
  const { leads, isLoading, stats, statsLoading } = useLeads()

  const handleCardClick = (filter: string) => {
    if (filter === 'enrichment') {
      navigate('/enrichment')
    } else if (filter === 'followup') {
      navigate('/emails')
    } else {
      navigate('/leads')
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopNav
        title="Dashboard"
        subtitle="Welcome back — here's your lead gen overview"
      />
      <div className="flex-1 p-6 flex flex-col gap-6">
        <PageHeader
          title="Overview"
          description="Real-time snapshot of your lead generation pipeline"
        />

        {/* Stats */}
        <StatsGrid
          stats={stats}
          isLoading={statsLoading}
          onCardClick={handleCardClick}
        />

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent leads — takes 2 cols */}
          <div className="lg:col-span-2">
            <RecentLeadsTable leads={leads} isLoading={isLoading} />
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-4">
            <QuickActions />
            <ApiStatusCard />
          </div>
        </div>
      </div>
    </div>
  )
}