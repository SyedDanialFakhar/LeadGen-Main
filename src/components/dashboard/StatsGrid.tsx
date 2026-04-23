// src/components/dashboard/StatsGrid.tsx
import {
  Users,
  UserPlus,
  Sparkles,
  Bell,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import type { LeadStats } from '@/types'

interface StatsGridProps {
  stats: LeadStats | undefined
  isLoading: boolean
  onCardClick?: (filter: string) => void
}

export function StatsGrid({ stats, isLoading, onCardClick }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard
        title="Total Leads"
        value={stats?.total ?? 0}
        icon={<Users className="w-5 h-5" />}
        color="blue"
        isLoading={isLoading}
        onClick={() => onCardClick?.('all')}
      />
      <StatCard
        title="New Today"
        value={stats?.newToday ?? 0}
        icon={<UserPlus className="w-5 h-5" />}
        color="green"
        isLoading={isLoading}
        onClick={() => onCardClick?.('new')}
      />
      <StatCard
        title="Awaiting Enrichment"
        value={stats?.awaitingEnrichment ?? 0}
        icon={<Sparkles className="w-5 h-5" />}
        color="yellow"
        isLoading={isLoading}
        onClick={() => onCardClick?.('enrichment')}
      />
      <StatCard
        title="Follow-Up Needed"
        value={stats?.followUpNeeded ?? 0}
        icon={<Bell className="w-5 h-5" />}
        color="orange"
        isLoading={isLoading}
        onClick={() => onCardClick?.('followup')}
      />
      {/* 
        Converted = leads that replied with meeting interest / booked a call
        These have status = 'converted' in the database
      */}
      <StatCard
        title="Converted"
        value={stats?.converted ?? 0}
        icon={<TrendingUp className="w-5 h-5" />}
        color="green"
        isLoading={isLoading}
        onClick={() => onCardClick?.('converted')}
      />
      {/* 
        Closed = leads whose sequence ended without conversion —
        either we stopped outreach or client declined/didn't respond
        These have status = 'closed' in the database (renamed from 'called')
      */}
      <StatCard
        title="Closed"
        value={stats?.closed ?? 0}
        icon={<XCircle className="w-5 h-5" />}
        color="slate"
        isLoading={isLoading}
        onClick={() => onCardClick?.('closed')}
      />
    </div>
  )
}