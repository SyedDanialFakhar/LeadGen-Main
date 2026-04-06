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
  Briefcase
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
              📊 Scraping Results
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Found {passed.length} valid jobs that match your criteria
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onNewSearch}
              leftIcon={<RefreshCw className="w-3 h-3" />}
            >
              New Search
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {passed.length}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500">
                Valid Jobs Found
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                {filteredOut.length}
              </p>
              <p className="text-xs text-red-600 dark:text-red-500">
                Filtered Out
              </p>
            </div>
          </div>
        </div>

        {/* Results Table */}
        {passed.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Job Listings
            </h4>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Company</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Job Title</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Published</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">City</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Contact Info</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {passed.map((lead, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-800 dark:text-slate-200">
                          {lead.companyName}
                        </p>
                        {lead.extractedContactName && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                            👤 {lead.extractedContactName}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400 max-w-[200px]">
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3 shrink-0 text-slate-400" />
                          <span className="truncate">{lead.jobTitle}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
                          <Calendar className="w-3 h-3" />
                          {new Date(lead.datePosted).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <MapPin className="w-3 h-3" />
                          {lead.city}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="space-y-1">
                          {lead.extractedEmails && lead.extractedEmails.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {lead.extractedEmails.slice(0, 2).map((email, idx) => (
                                <a
                                  key={idx}
                                  href={`mailto:${email}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs hover:underline"
                                  title={email}
                                >
                                  <Mail className="w-3 h-3" />
                                  <span className="truncate max-w-[120px]">{email}</span>
                                </a>
                              ))}
                              {lead.extractedEmails.length > 2 && (
                                <span className="text-xs text-slate-400">+{lead.extractedEmails.length - 2}</span>
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
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded text-xs hover:underline"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{phone}</span>
                                </a>
                              ))}
                              {lead.extractedPhones.length > 2 && (
                                <span className="text-xs text-slate-400">+{lead.extractedPhones.length - 2}</span>
                              )}
                            </div>
                          )}
                          {(!lead.extractedEmails?.length && !lead.extractedPhones?.length) && (
                            <span className="text-xs text-slate-400">— No contact info —</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <a
                          href={lead.jobAdUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="View original job ad"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span className="text-xs">View</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {passed.length > 50 && (
              <p className="text-xs text-slate-400 text-center py-2">
                Showing all {passed.length} results
              </p>
            )}
          </div>
        )}

        {/* Filtered Out Section */}
        {filteredOut.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
            <button
              onClick={() => setShowFilteredOut(!showFilteredOut)}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              {showFilteredOut ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              🚫 Filtered Out ({filteredOut.length}) - Why were they removed?
            </button>
            {showFilteredOut && (
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {filteredOut.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.companyName}
                    </span>
                    <span className="text-red-600 dark:text-red-400 text-xs">
                      {item.reason}
                    </span>
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
        >
          Clear Results
        </Button>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          💡 Tip: Click on any email or phone to copy/contact
        </div>
      </CardFooter>
    </Card>
  )
}