// src/components/scraper/DebugData.tsx
import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Bug, Copy, Check } from 'lucide-react'
import type { JobResult } from '@/types'

interface DebugDataProps {
  jobs: JobResult[]
}

export function DebugData({ jobs }: DebugDataProps) {
  const [showDebug, setShowDebug] = useState(false)
  const [copied, setCopied] = useState(false)
  
  if (jobs.length === 0) return null
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(jobs[0], null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/30 dark:bg-yellow-900/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Debug Info - Raw Data Structure
            </h3>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyToClipboard}
              className="text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Raw Data
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs"
            >
              {showDebug ? 'Hide' : 'Show'} Debug Info
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          This shows the raw data structure of the first job. Use this to help debug field mapping issues.
        </p>
      </CardHeader>
      
      {showDebug && (
        <CardBody>
          <div className="space-y-4">
            {/* Summary of fields */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-100 dark:bg-slate-800 rounded p-2">
                <span className="text-slate-500 dark:text-slate-400">Company:</span>
                <span className="ml-2 font-mono text-slate-700 dark:text-slate-300">
                  {jobs[0]?.companyName || 'N/A'}
                </span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded p-2">
                <span className="text-slate-500 dark:text-slate-400">Title:</span>
                <span className="ml-2 font-mono text-slate-700 dark:text-slate-300 truncate block">
                  {jobs[0]?.jobTitle || 'N/A'}
                </span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded p-2">
                <span className="text-slate-500 dark:text-slate-400">Date:</span>
                <span className="ml-2 font-mono text-slate-700 dark:text-slate-300">
                  {jobs[0]?.datePosted || 'N/A'}
                </span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded p-2">
                <span className="text-slate-500 dark:text-slate-400">Location:</span>
                <span className="ml-2 font-mono text-slate-700 dark:text-slate-300">
                  {jobs[0]?.city || 'N/A'}
                </span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded p-2">
                <span className="text-slate-500 dark:text-slate-400">Emails Found:</span>
                <span className="ml-2 font-mono text-slate-700 dark:text-slate-300">
                  {jobs[0]?.emails?.length || 0}
                </span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded p-2">
                <span className="text-slate-500 dark:text-slate-400">Phones Found:</span>
                <span className="ml-2 font-mono text-slate-700 dark:text-slate-300">
                  {jobs[0]?.phones?.length || 0}
                </span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded p-2">
                <span className="text-slate-500 dark:text-slate-400">Has URL:</span>
                <span className="ml-2 font-mono text-slate-700 dark:text-slate-300">
                  {jobs[0]?.jobAdUrl && jobs[0]?.jobAdUrl !== '#' ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded p-2">
                <span className="text-slate-500 dark:text-slate-400">Contact Name:</span>
                <span className="ml-2 font-mono text-slate-700 dark:text-slate-300">
                  {jobs[0]?.contactName || 'No'}
                </span>
              </div>
            </div>
            
            {/* Full JSON data */}
            <details className="mt-4">
              <summary className="text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
                View Full Raw JSON Data (First Job)
              </summary>
              <pre className="mt-2 text-xs overflow-auto max-h-96 p-4 bg-slate-900 text-slate-100 rounded-lg font-mono">
                {JSON.stringify(jobs[0], null, 2)}
              </pre>
            </details>
            
            {/* Tips based on data */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-2">
                💡 Debug Tips:
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
                <li>Check if company names and job titles look correct</li>
                <li>Verify that dates are being parsed correctly</li>
                <li>Check if locations show actual cities or just "Australia"</li>
                <li>Emails and phones are extracted from job descriptions</li>
                <li>If data looks wrong, check the raw JSON above to see what Apify actually returned</li>
              </ul>
            </div>
          </div>
        </CardBody>
      )}
    </Card>
  )
}