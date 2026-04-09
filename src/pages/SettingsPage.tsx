// src/pages/SettingsPage.tsx
import { useState } from 'react'
import { CheckCircle, XCircle, Eye, EyeOff, Save, AlertCircle } from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { useSettings } from '@/hooks/useSettings'
import { CITIES, JOB_ROLES } from '@/utils/constants'

interface ApiKeyFieldProps {
  label: string
  settingKey: string
  value: string
  onSave: (key: string, value: string) => void
  isSaving: boolean
  isSavingKey?: string
  placeholder?: string
}

function ApiKeyField({
  label,
  settingKey,
  value: initialValue,
  onSave,
  isSaving,
  isSavingKey,
  placeholder,
}: ApiKeyFieldProps) {
  const [value, setValue] = useState(initialValue)
  const [showKey, setShowKey] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  
  const isConfigured =
    !!initialValue && !initialValue.includes('YOUR_') && initialValue !== ''
  const isThisSaving = isSaving && isSavingKey === settingKey

  const handleSave = async () => {
    if (!value.trim()) {
      setLocalError('Please enter a value')
      setTimeout(() => setLocalError(null), 3000)
      return
    }
    setLocalError(null)
    onSave(settingKey, value)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          {isConfigured ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600 dark:text-green-400">
                Configured
              </span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-500">Not configured</span>
            </>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showKey ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder ?? `Enter your ${label}`}
            className={`
              w-full rounded-lg border text-sm px-3 py-2 pr-10
              bg-white dark:bg-slate-800
              text-slate-900 dark:text-slate-100
              border-slate-300 dark:border-slate-600
              focus:outline-none focus:ring-2 focus:ring-blue-500
              dark:focus:ring-blue-400
              ${localError ? 'border-red-500 dark:border-red-500' : ''}
            `}
          />
          <button
            type="button"
            onClick={() => setShowKey((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {showKey ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleSave}
          isLoading={isThisSaving}
          leftIcon={<Save className="w-4 h-4" />}
          disabled={!value || value === initialValue || isThisSaving}
        >
          Save
        </Button>
      </div>
      {localError && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {localError}
        </p>
      )}
    </div>
  )
}

export function SettingsPage() {
  const { settings, isLoading, isError, error, saveSetting, isSaving } = useSettings()
  const [savingKey, setSavingKey] = useState<string | undefined>(undefined)

  const handleSaveSetting = async (key: string, value: string) => {
    setSavingKey(key)
    await saveSetting(key, value)
    setTimeout(() => setSavingKey(undefined), 500)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopNav title="Settings" subtitle="Configure API keys and defaults" />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopNav title="Settings" subtitle="Configure API keys and defaults" />
        <div className="flex-1 p-6">
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Failed to Load Settings
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {error?.message || 'Please check your connection and try again'}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopNav title="Settings" subtitle="Configure API keys and defaults" />

      <div className="flex-1 p-6 flex flex-col gap-6 max-w-3xl">
        <PageHeader
          title="Settings"
          description="All API keys are stored securely in your Supabase database"
        />

        {/* API Keys */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              API Keys
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Keys are stored in your Supabase database, never in code
            </p>
          </CardHeader>
          <CardBody className="flex flex-col gap-5">
            <ApiKeyField
              label="Apify Token"
              settingKey="apify_token"
              value={settings?.apify_token ?? ''}
              onSave={handleSaveSetting}
              isSaving={isSaving}
              isSavingKey={savingKey}
              placeholder="apify_api_..."
            />
            <ApiKeyField
              label="Hunter.io API Key"
              settingKey="hunter_api_key"
              value={settings?.hunter_api_key ?? ''}
              onSave={handleSaveSetting}
              isSaving={isSaving}
              isSavingKey={savingKey}
              placeholder="hunter_..."
            />
            <ApiKeyField
              label="Apollo.io API Key"
              settingKey="apollo_api_key"
              value={settings?.apollo_api_key ?? ''}
              onSave={handleSaveSetting}
              isSaving={isSaving}
              isSavingKey={savingKey}
              placeholder="apollo_..."
            />
            <ApiKeyField
              label="Resend API Key"
              settingKey="resend_api_key"
              value={settings?.resend_api_key ?? ''}
              onSave={handleSaveSetting}
              isSaving={isSaving}
              isSavingKey={savingKey}
              placeholder="re_..."
            />
          </CardBody>
        </Card>

        {/* Sender Config */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Email Sender Configuration
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Follow-up emails are sent from this address
            </p>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <ApiKeyField
              label="Sender Email (Charlie's email)"
              settingKey="sender_email"
              value={settings?.sender_email ?? ''}
              onSave={handleSaveSetting}
              isSaving={isSaving}
              isSavingKey={savingKey}
              placeholder="charlie@yourcompany.com.au"
            />
            <ApiKeyField
              label="Sender Name"
              settingKey="sender_name"
              value={settings?.sender_name ?? ''}
              onSave={handleSaveSetting}
              isSaving={isSaving}
              isSavingKey={savingKey}
              placeholder="Charlie"
            />
          </CardBody>
        </Card>

        {/* Default Scraper Settings */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Default Scraper Settings
            </h3>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Default Minimum Ad Age (days)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={90}
                  defaultValue={settings?.default_min_age_days ?? '14'}
                  className="
                    w-32 rounded-lg border text-sm px-3 py-2
                    bg-white dark:bg-slate-800
                    text-slate-900 dark:text-slate-100
                    border-slate-300 dark:border-slate-600
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                  "
                  onBlur={(e) => handleSaveSetting('default_min_age_days', e.target.value)}
                />
                <span className="text-sm text-slate-500 dark:text-slate-400 self-center">
                  days (default: 14)
                </span>
              </div>
            </div>

            <Select
              label="Default Job Role"
              value={settings?.default_role ?? JOB_ROLES[0]}
              onChange={(e) => handleSaveSetting('default_role', e.target.value)}
              options={JOB_ROLES.map((r) => ({ value: r, label: r }))}
            />

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                Default Cities
              </label>
              <div className="flex gap-3">
                {CITIES.map((city) => (
                  <label
                    key={city}
                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-slate-300"
                    />
                    {city}
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Note: City preferences will be implemented in a future update
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Info card */}
        <Card>
          <CardBody>
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Free Tier Limits
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div>• Apify: $5/month credits</div>
                <div>• Hunter.io: 25 searches/month</div>
                <div>• Apollo.io: 10,000 credits, 5 phones/month</div>
                <div>• Resend: 3,000 emails/month, 100/day</div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}