// src/components/dashboard/ApiStatusCard.tsx
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, Settings } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'

const API_KEYS = [
  { key: 'apify_token',    label: 'Apify',        sublabel: 'Seek Scraper' },
  { key: 'hunter_api_key', label: 'Hunter.io',    sublabel: 'Email Finder' },
  { key: 'apollo_api_key', label: 'Apollo.io',    sublabel: 'Enrichment' },
  { key: 'resend_api_key', label: 'Resend',       sublabel: 'Email Sending' },
  { key: 'sender_email',   label: 'Sender Email', sublabel: 'Charlie' },
]

function isKeyConfigured(value: string | undefined): boolean {
  return !!value && !value.includes('YOUR_') && value !== ''
}

export function ApiStatusCard() {
  const { settings } = useSettings()
  const navigate = useNavigate()

  const connectedCount = API_KEYS.filter(({ key }) => isKeyConfigured(settings[key])).length
  const total = API_KEYS.length
  const allConnected = connectedCount === total
  const healthPct = Math.round((connectedCount / total) * 100)

  const healthBarColor =
    connectedCount === total ? 'bg-emerald-500' :
    connectedCount >= 3 ? 'bg-amber-400' : 'bg-red-400'

  const healthTextColor =
    connectedCount === total ? 'text-emerald-600 dark:text-emerald-400' :
    connectedCount >= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-base tracking-tight">
            API Status
          </h3>
          <p className={`text-xs font-medium mt-0.5 ${healthTextColor}`}>
            {connectedCount}/{total} services connected
          </p>
        </div>
        {!allConnected && (
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Settings className="w-3.5 h-3.5" />
            Configure
          </button>
        )}
      </div>

      {/* Health bar */}
      <div className="px-5 pt-3.5 pb-1">
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${healthBarColor}`}
            style={{ width: `${healthPct}%` }}
          />
        </div>
      </div>

      {/* Key list */}
      <div className="px-5 py-3 flex flex-col gap-2.5">
        {API_KEYS.map(({ key, label, sublabel }) => {
          const connected = isKeyConfigured(settings[key])
          return (
            <div key={key} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${connected ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  {connected
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    : <XCircle className="w-3.5 h-3.5 text-red-400" />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-none">{label}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{sublabel}</p>
                </div>
              </div>
              <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${connected ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'}`}>
                {connected ? 'Connected' : 'Not set'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Bottom banner */}
      {!allConnected ? (
        <div className="mx-5 mb-4 mt-1 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40">
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
            Some features are disabled until all APIs are connected.
          </p>
        </div>
      ) : (
        <div className="mx-5 mb-4 mt-1 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40">
          <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
            ✓ All systems operational — ready to run.
          </p>
        </div>
      )}
    </div>
  )
}