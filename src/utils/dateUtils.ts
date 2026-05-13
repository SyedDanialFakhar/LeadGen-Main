import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return '—'
    return format(date, 'dd MMM yyyy')
  } catch {
    return '—'
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return '—'
    return format(date, 'dd MMM yyyy, h:mm a')
  } catch {
    return '—'
  }
}

export function timeAgo(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return '—'
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return '—'
  }
}

export function getDaysAgo(dateString: string): number {
  try {
    const date = parseISO(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  } catch {
    return 0
  }
}

export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function isToday(dateString: string): boolean {
  try {
    const date = parseISO(dateString)
    const today = new Date()
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    )
  } catch {
    return false
  }
}