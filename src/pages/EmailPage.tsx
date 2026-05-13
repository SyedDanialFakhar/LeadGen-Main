// src/pages/EmailPage.tsx
import { TopNav } from '@/components/layout/TopNav'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmailTemplateEditor } from '@/components/email/EmailTemplateEditor'
import { EmailQueue } from '@/components/email/EmailQueue'
import { useEmail } from '@/hooks/useEmail'

export function EmailPage() {
  const {
    queue,
    stats,
    isLoading,
    isSending,
    sendProgress,
    template,
    setTemplate,
    sendAll,
  } = useEmail()

  return (
    <div className="flex flex-col min-h-screen">
      <TopNav
        title="Emails"
        subtitle={`${stats?.queued ?? 0} emails queued · ${stats?.remaining ?? 100} sends remaining today`}
      />

      <div className="flex-1 p-6 flex flex-col gap-6">
        <PageHeader
          title="Email Management"
          description="Manage follow-up email templates and send queue"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template editor */}
          <EmailTemplateEditor
            template={template}
            onChange={setTemplate}
          />

          {/* Queue */}
          <EmailQueue
            queue={queue}
            stats={stats}
            isLoading={isLoading}
            isSending={isSending}
            onSendAll={sendAll}
            sendProgress={sendProgress}
          />
        </div>
      </div>
    </div>
  )
}