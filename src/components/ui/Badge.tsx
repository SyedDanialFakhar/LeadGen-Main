// src/components/ui/Badge.tsx
import { cn } from '@/utils/cn'
import type { LeadStatus, EnrichmentStatus, Platform, MatchAssessment } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  variant?:
    | 'default'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'purple'
    | 'muted'
  className?: string
}

const variants = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
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

// Lead status specific badge - UPDATED for new email statuses
const statusConfig: Record<LeadStatus, { label: string; variant: BadgeProps['variant']; extra?: string }> = {
  // New email statuses
  'Not Sent': { label: '📧 Not Sent', variant: 'default' },
  'Email 1': { label: '📧 Email 1 Sent', variant: 'info' },
  'Email 2': { label: '📧 Email 2 Sent', variant: 'purple' },
  'Email 3': { label: '📧 Email 3 Sent', variant: 'success' },
  // Keep old statuses for backward compatibility (in case any exist)
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
  // Fallback for any unknown status
  if (!config) {
    return (
      <Badge variant="default" className={className}>
        {String(status)}
      </Badge>
    )
  }
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

// Match Assessment Badge - NEW
interface MatchAssessmentBadgeProps {
  assessment: MatchAssessment | null
  className?: string
}

export function MatchAssessmentBadge({ assessment, className }: MatchAssessmentBadgeProps) {
  if (!assessment) {
    return (
      <Badge variant="default" className={className}>
        Not Set
      </Badge>
    )
  }
  
  const assessmentConfig: Record<MatchAssessment, { label: string; variant: BadgeProps['variant'] }> = {
    High: { label: '🔥 High', variant: 'success' },
    Medium: { label: '📊 Medium', variant: 'warning' },
    Low: { label: '⚠️ Low', variant: 'danger' },
  }
  
  const config = assessmentConfig[assessment]
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}