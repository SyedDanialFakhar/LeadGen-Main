// src/components/email/EmailQueue.tsx
import { Mail, Send } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import type { EmailQueueItem, EmailStats } from '@/types'
import { formatDateTime } from '@/utils/dateUtils'

interface EmailQueueProps {
  queue: EmailQueueItem[]
  stats: EmailStats | undefined
  isLoading: boolean
  isSending: boolean
  onSendAll: () => void
  sendProgress: { sent: number; total: number }
}

export function EmailQueue({
  queue,
  stats,
  isLoading,
  isSending,
  onSendAll,
  sendProgress,
}: EmailQueueProps) {
  const isAtLimit = stats ? stats.remaining <= 0 : false

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Email Queue
            </h3>
            {stats && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {stats.queued} queued · {stats.sent} sent · {stats.failed} failed
              </p>
            )}
          </div>
          <Button
            onClick={onSendAll}
            isLoading={isSending}
            disabled={isAtLimit || queue.filter((q) => q.status === 'queued').length === 0}
            leftIcon={<Send className="w-4 h-4" />}
            size="sm"
          >
            Send All Queued
          </Button>
        </div>

        {/* Daily quota bar */}
        {stats && (
          <div className="mt-3">
            <ProgressBar
              value={stats.sentToday}
              max={stats.dailyLimit}
              label={`Daily quota: ${stats.sentToday}/${stats.dailyLimit} sent today`}
              color={stats.remaining < 20 ? 'red' : 'blue'}
            />
          </div>
        )}

        {/* Send progress */}
        {isSending && sendProgress.total > 0 && (
          <div className="mt-2">
            <ProgressBar
              value={sendProgress.sent}
              max={sendProgress.total}
              label="Sending..."
              color="green"
            />
          </div>
        )}
      </CardHeader>
      <CardBody className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : queue.length === 0 ? (
          <EmptyState
            icon={<Mail className="w-10 h-10" />}
            title="Queue is empty"
            description="Mark leads as follow-up required to add them here"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  {['To', 'Subject', 'Status', 'Date'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {queue.map((item) => (
                  <tr
                    key={item.id}
                    className="bg-white dark:bg-slate-800"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700 dark:text-slate-300">
                        {item.toName}
                      </p>
                      <p className="text-xs text-slate-400">{item.toEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                      {item.subject}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          item.status === 'sent'
                            ? 'success'
                            : item.status === 'failed'
                            ? 'danger'
                            : item.status === 'skipped'
                            ? 'muted'
                            : 'warning'
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                      {item.sentAt
                        ? formatDateTime(item.sentAt)
                        : formatDateTime(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  )
}