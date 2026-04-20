// src/components/scraper/ScraperPreview.tsx
import { useState } from 'react'
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Building2,
  Calendar,
  MapPin,
  Briefcase,
  Trash2,
} from 'lucide-react'
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { NewLead } from '@/types'

interface ScraperPreviewProps {
  passed: NewLead[]
  filteredOut: { companyName: string; reason: string }[]
  onDiscard: () => void
  onNewSearch: () => void
}

export function ScraperPreview({
  passed,
  filteredOut,
  onDiscard,
  onNewSearch,
}: ScraperPreviewProps) {
  const [showFilteredOut, setShowFilteredOut] = useState(false)

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              📊 Scraping Results
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Found <span className="font-bold text-blue-600 dark:text-blue-400">{passed.length}</span> valid jobs matching your criteria
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onNewSearch}
            leftIcon={<RefreshCw className="w-3 h-3" />}
            className="text-xs"
          >
            New Search
          </Button>
        </div>
      </CardHeader>

      <CardBody className="flex flex-col gap-5">
        {/* ── Summary Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{passed.length}</p>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-500">Valid Jobs</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-red-700 dark:text-red-400">{filteredOut.length}</p>
              <p className="text-xs font-semibold text-red-600 dark:text-red-500">Filtered Out</p>
            </div>
          </div>
        </div>

        {/* ── Results Table ─────────────────────────────────────────── */}
        {passed.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              Job Listings
            </h4>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Company</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Job Title</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Published</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">City</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Contact</th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {passed.map((lead, i) => (
                    <tr key={i} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{lead.companyName}</p>
                        {lead.extractedContactName && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-medium">
                            👤 {lead.extractedContactName}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-3 h-3 shrink-0 text-slate-400" />
                          <span className="truncate text-xs">{lead.jobTitle}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
                          <Calendar className="w-3 h-3" />
                          {new Date(lead.datePosted).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {lead.city}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="space-y-1">
                          {lead.extractedEmails && lead.extractedEmails.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {lead.extractedEmails.slice(0, 2).map((email, idx) => (
                                <a
                                  key={idx}
                                  href={`mailto:${email}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-xs font-medium hover:underline border border-blue-200 dark:border-blue-800"
                                  title={email}
                                >
                                  <Mail className="w-2.5 h-2.5" />
                                  <span className="truncate max-w-[110px]">{email}</span>
                                </a>
                              ))}
                              {lead.extractedEmails.length > 2 && (
                                <span className="text-xs text-slate-400 font-medium">+{lead.extractedEmails.length - 2}</span>
                              )}
                            </div>
                          )}
                          {lead.extractedPhones && lead.extractedPhones.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {lead.extractedPhones.slice(0, 2).map((phone, idx) => (
                                <a
                                  key={idx}
                                  href={`tel:${phone.replace(/\s/g, '')}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md text-xs font-medium hover:underline border border-emerald-200 dark:border-emerald-800"
                                >
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>{phone}</span>
                                </a>
                              ))}
                              {lead.extractedPhones.length > 2 && (
                                <span className="text-xs text-slate-400 font-medium">+{lead.extractedPhones.length - 2}</span>
                              )}
                            </div>
                          )}
                          {(!lead.extractedEmails?.length && !lead.extractedPhones?.length) && (
                            <span className="text-xs text-slate-400 italic">No contact info</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <a
                          href={lead.jobAdUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Filtered Out Section ──────────────────────────────────── */}
        {filteredOut.length > 0 && (
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowFilteredOut(!showFilteredOut)}
              className="w-full flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-semibold text-red-700 dark:text-red-400"
            >
              <div className="flex items-center gap-2">
                {showFilteredOut ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                🚫 Filtered Out ({filteredOut.length}) — Why removed?
              </div>
            </button>
            {showFilteredOut && (
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOut.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900 text-sm"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{item.companyName}</span>
                    <span className="text-red-600 dark:text-red-400 text-xs ml-4 shrink-0">{item.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardBody>

      <CardFooter className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button
          variant="ghost"
          onClick={onDiscard}
          size="sm"
          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          className="text-slate-500 hover:text-red-600"
        >
          Clear Results
        </Button>
        <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
          💡 Click email/phone to contact
        </div>
      </CardFooter>
    </Card>
  )
}