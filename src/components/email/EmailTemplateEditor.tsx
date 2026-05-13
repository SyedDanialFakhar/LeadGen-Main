// src/components/email/EmailTemplateEditor.tsx
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'
import type { EmailTemplate } from '@/types'

interface EmailTemplateEditorProps {
  template: EmailTemplate
  onChange: (template: EmailTemplate) => void
}

const VARIABLES = [
  '[ContactFirstName]',
  '[CompanyName]',
  '[JobTitle]',
  '[City]',
  '[ContactRole]',
]

export function EmailTemplateEditor({
  template,
  onChange,
}: EmailTemplateEditorProps) {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900 dark:text-white">
          Email Template
        </h3>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {/* Variables hint */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 self-center">
            Variables:
          </span>
          {VARIABLES.map((v) => (
            <span
              key={v}
              className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded font-mono"
            >
              {v}
            </span>
          ))}
        </div>

        {/* Subject */}
        <Input
          label="Subject Line"
          value={template.subject}
          onChange={(e) => onChange({ ...template, subject: e.target.value })}
          placeholder="Quick question re your [JobTitle] search..."
        />

        {/* Body */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
            Email Body (HTML supported)
          </label>
          <textarea
            value={template.bodyHtml}
            onChange={(e) =>
              onChange({ ...template, bodyHtml: e.target.value })
            }
            rows={10}
            className={cn(
              'w-full rounded-lg border text-sm px-3 py-2 resize-y font-mono',
              'bg-white dark:bg-slate-800',
              'text-slate-900 dark:text-slate-100',
              'border-slate-300 dark:border-slate-600',
              'placeholder:text-slate-400 dark:placeholder:text-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              'dark:focus:ring-blue-400'
            )}
          />
        </div>
      </CardBody>
    </Card>
  )
}