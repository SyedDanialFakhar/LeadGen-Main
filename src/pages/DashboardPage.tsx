// src/pages/DashboardPage.tsx
import { useNavigate } from 'react-router-dom'
import { TopNav } from '@/components/layout/TopNav'
import { StatsGrid } from '@/components/dashboard/StatsGrid'
import { RecentLeadsTable } from '@/components/dashboard/RecentLeadsTable'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { ApiStatusCard } from '@/components/dashboard/ApiStatusCard'
import { useLeads } from '@/hooks/useLeads'

export function DashboardPage() {
  const navigate = useNavigate()
  const { leads, isLoading, stats, statsLoading } = useLeads()

  const handleCardClick = (filter: string) => {
    switch (filter) {
      case 'enrichment':
        navigate('/enrichment')
        break
      case 'followup':
        // response is null / 'none' / '' — no reply yet
        navigate('/leads?response=none')
        break
      case 'converted':
        // response === 'positive'
        navigate('/leads?response=positive')
        break
      case 'closed':
        // response === 'negative'
        navigate('/leads?response=negative')
        break
      default:
        navigate('/leads')
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const dateStr = new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopNav
        title="Dashboard"
        subtitle="Welcome back — here's your lead gen overview"
      />

      <div className="flex-1 px-6 py-8 flex flex-col gap-8 max-w-[1600px] mx-auto w-full">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
              {dateStr}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {greeting} 👋
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Here's what's happening with your pipeline today.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Live</span>
          </div>
        </div>

        {/* Stats */}
        <StatsGrid
          stats={stats}
          isLoading={statsLoading}
          onCardClick={handleCardClick}
        />

        {/* Main content grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <RecentLeadsTable leads={leads} isLoading={isLoading} />
          </div>
          <div className="flex flex-col gap-5">
            <QuickActions />
            <ApiStatusCard />
          </div>
        </div>

      </div>
    </div>
  )
}