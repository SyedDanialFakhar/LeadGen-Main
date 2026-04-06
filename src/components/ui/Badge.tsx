// src/components/ui/Badge.tsx
import { cn } from '@/utils/cn'
import type { LeadStatus, EnrichmentStatus } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  variant?:
    | 'default'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'muted'
  className?: string
}

const variants = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  muted: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

// Lead status specific badge
const statusConfig: Record<LeadStatus, { label: string; variant: BadgeProps['variant']; extra?: string }> = {
  new: { label: 'New', variant: 'default' },
  assessed: { label: 'Assessed', variant: 'info' },
  called: { label: 'Called', variant: 'warning' },
  converted: { label: 'Converted', variant: 'success', extra: 'font-semibold' },
  closed: { label: 'Closed', variant: 'muted' },
  deleted: { label: 'Deleted', variant: 'danger', extra: 'line-through opacity-60' },
}

interface LeadStatusBadgeProps {
  status: LeadStatus
  className?: string
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge
      variant={config.variant}
      className={cn(config.extra, className)}
    >
      {config.label}
    </Badge>
  )
}

// Enrichment status badge
const enrichmentConfig: Record<EnrichmentStatus, { label: string; variant: BadgeProps['variant'] }> = {
  pending: { label: 'Pending', variant: 'warning' },
  enriched: { label: 'Enriched', variant: 'success' },
  not_found: { label: 'Not Found', variant: 'muted' },
  failed: { label: 'Failed', variant: 'danger' },
}

interface EnrichmentBadgeProps {
  status: EnrichmentStatus
  className?: string
}

export function EnrichmentBadge({ status, className }: EnrichmentBadgeProps) {
  const config = enrichmentConfig[status]
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}

// Platform badge
interface PlatformBadgeProps {
  platform: 'seek' | 'linkedin'
  className?: string
}

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  return (
    <Badge
      variant={platform === 'seek' ? 'info' : 'success'}
      className={className}
    >
      {platform === 'seek' ? 'Seek' : 'LinkedIn'}
    </Badge>
  )
}