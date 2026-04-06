// src/components/scraper/JobTable.tsx
import { 
    ExternalLink, 
    Mail, 
    Phone, 
    Building2, 
    Calendar, 
    MapPin, 
    Briefcase,
    ChevronLeft,
    ChevronRight
  } from 'lucide-react'
  import { Button } from '@/components/ui/Button'
  import type { JobResult } from '@/types'
  
  interface JobTableProps {
    jobs: JobResult[]
    currentPage: number
    totalJobs: number
    itemsPerPage: number
    onPageChange: (page: number) => void
  }
  
  export function JobTable({ 
    jobs, 
    currentPage, 
    totalJobs, 
    itemsPerPage, 
    onPageChange 
  }: JobTableProps) {
    const totalPages = Math.ceil(totalJobs / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = Math.min(startIndex + itemsPerPage, totalJobs)
    const currentJobs = jobs.slice(startIndex, endIndex)
  
    if (jobs.length === 0) {
      return (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
            No Jobs Found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Try searching for a different job title
          </p>
        </div>
      )
    }
  
    const openJobLink = (url: string) => {
      if (url && url !== '#' && url !== '') {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    }
  
    return (
      <div className="space-y-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Showing {startIndex + 1}-{endIndex} of {totalJobs} jobs
        </div>
  
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Job Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Posted</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Contact Info</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">Job Link</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {currentJobs.map((job, idx) => (
                <tr key={job.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {job.companyName}
                      </span>
                    </div>
                    {job.contactName && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 ml-6">
                        Contact: {job.contactName}
                      </p>
                    )}
                   </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 line-clamp-2">
                        {job.jobTitle}
                      </span>
                    </div>
                   </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {job.datePosted}
                    </div>
                   </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {job.city}
                    </div>
                   </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {job.emails.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.emails.slice(0, 2).map((email, idx) => (
                            <a
                              key={idx}
                              href={`mailto:${email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs hover:underline"
                              title={email}
                            >
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[120px]">{email}</span>
                            </a>
                          ))}
                          {job.emails.length > 2 && (
                            <span className="text-xs text-slate-400">+{job.emails.length - 2}</span>
                          )}
                        </div>
                      )}
                      {job.phones.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {job.phones.slice(0, 2).map((phone, idx) => (
                            <a
                              key={idx}
                              href={`tel:${phone.replace(/\s/g, '')}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded text-xs hover:underline"
                            >
                              <Phone className="w-3 h-3 shrink-0" />
                              <span>{phone}</span>
                            </a>
                          ))}
                          {job.phones.length > 2 && (
                            <span className="text-xs text-slate-400">+{job.phones.length - 2}</span>
                          )}
                        </div>
                      )}
                      {job.emails.length === 0 && job.phones.length === 0 && (
                        <span className="text-xs text-slate-400">— No contact info —</span>
                      )}
                    </div>
                   </td>
                  <td className="px-4 py-3 text-center">
                    {job.jobAdUrl && job.jobAdUrl !== '#' && job.jobAdUrl !== '' ? (
                      <button
                        onClick={() => openJobLink(job.jobAdUrl)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors cursor-pointer"
                        title="View job ad"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="text-xs">View Job</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">No link</span>
                    )}
                   </td>
                 </tr>
              ))}
            </tbody>
          </table>
        </div>
  
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    )
  }