// src/components/leads/LeadStatsBar.tsx
import { Target, Clock, Bell, TrendingUp } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { LeadStats } from '@/types'

interface LeadStatsBarProps {
  stats: LeadStats
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: number
  accent: string
  iconBg: string
}

function StatCard({ icon: Icon, label, value, accent, iconBg }: StatCardProps) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl border',
      'bg-white dark:bg-slate-800',
      'border-slate-200 dark:border-slate-700',
      'shadow-sm'
    )}>
      <div className={cn('p-2 rounded-lg', iconBg)}>
        <Icon className={cn('w-4 h-4', accent)} />
      </div>
      <div>
        <p className={cn('text-xl font-bold leading-none', accent)}>{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export function LeadStatsBar({ stats }: LeadStatsBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        icon={TrendingUp}
        label="Total Leads"
        value={stats.total}
        accent="text-blue-600 dark:text-blue-400"
        iconBg="bg-blue-50 dark:bg-blue-900/30"
      />
      <StatCard
        icon={Target}
        label="Added Today"
        value={stats.newToday}
        accent="text-emerald-600 dark:text-emerald-400"
        iconBg="bg-emerald-50 dark:bg-emerald-900/30"
      />
      <StatCard
        icon={Clock}
        label="Needs Enrichment"
        value={stats.awaitingEnrichment}
        accent="text-amber-600 dark:text-amber-400"
        iconBg="bg-amber-50 dark:bg-amber-900/30"
      />
      <StatCard
        icon={Bell}
        label="Follow-ups Due"
        value={stats.followUpNeeded}
        accent="text-red-600 dark:text-red-400"
        iconBg="bg-red-50 dark:bg-red-900/30"
      />
    </div>
  )
}