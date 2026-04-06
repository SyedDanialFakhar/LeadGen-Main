// src/components/dashboard/ApiStatusCard.tsx
import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { useSettings } from '@/hooks/useSettings'

const apiKeys = [
  { key: 'apify_token', label: 'Apify (Seek Scraper)' },
  { key: 'hunter_api_key', label: 'Hunter.io (Email Finder)' },
  { key: 'apollo_api_key', label: 'Apollo.io (Enrichment)' },
  { key: 'resend_api_key', label: 'Resend (Email Sending)' },
  { key: 'sender_email', label: 'Sender Email (Charlie)' },
]

export function ApiStatusCard() {
  const { settings } = useSettings()
  const navigate = useNavigate()

  const allConfigured = apiKeys.every(
    (k) => settings[k.key] && settings[k.key] !== `YOUR_${k.key.toUpperCase()}_HERE`
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            API Status
          </h3>
          {!allConfigured && (
            <button
              onClick={() => navigate('/settings')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Configure →
            </button>
          )}
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        {apiKeys.map(({ key, label }) => {
          const isConfigured =
            !!settings[key] &&
            !settings[key]?.includes('YOUR_') &&
            settings[key] !== ''

          return (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {label}
              </span>
              <div className="flex items-center gap-1.5">
                {isConfigured ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Connected
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-500 dark:text-red-400">
                      Not set
                    </span>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </CardBody>
    </Card>
  )
}