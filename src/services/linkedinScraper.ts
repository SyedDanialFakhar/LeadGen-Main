// src/services/linkedinScraper.ts
// Uses LinkedIn public guest API — no auth required
// IMPORTANT: Must rate limit with delays between requests

import type { RawLinkedInJob } from '@/types'

const GUEST_SEARCH_URL =
  'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search'
const GUEST_DETAIL_URL =
  'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting'

// 1.5 second delay between requests to avoid rate limiting
function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms))
}

function buildSearchUrl(query: string, location: string, start: number): string {
  const params = new URLSearchParams({
    keywords: query,
    location: `${location}, Australia`,
    f_TPR: 'r2592000', // past 30 days
    start: String(start),
  })
  return `${GUEST_SEARCH_URL}?${params.toString()}`
}

function parseJobId(jobUrl: string): string | null {
  const match = jobUrl.match(/\/view\/(\d+)/)
  return match ? match[1] : null
}

function parsePostedDate(postedText: string): string {
  const now = new Date()

  if (postedText.includes('hour') || postedText.includes('minute')) {
    return now.toISOString().split('T')[0]
  }
  if (postedText.includes('day')) {
    const match = postedText.match(/(\d+)/)
    const days = match ? parseInt(match[1]) : 1
    now.setDate(now.getDate() - days)
    return now.toISOString().split('T')[0]
  }
  if (postedText.includes('week')) {
    const match = postedText.match(/(\d+)/)
    const weeks = match ? parseInt(match[1]) : 1
    now.setDate(now.getDate() - weeks * 7)
    return now.toISOString().split('T')[0]
  }
  if (postedText.includes('month')) {
    const match = postedText.match(/(\d+)/)
    const months = match ? parseInt(match[1]) : 1
    now.setMonth(now.getMonth() - months)
    return now.toISOString().split('T')[0]
  }

  return now.toISOString().split('T')[0]
}

export async function searchLinkedInJobs(
  query: string,
  location: string,
  maxResults = 50,
  onProgress?: (fetched: number) => void
): Promise<RawLinkedInJob[]> {
  const jobs: RawLinkedInJob[] = []
  let start = 0

  while (jobs.length < maxResults) {
    const url = buildSearchUrl(query, location, start)

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })

      if (!response.ok) break

      const html = await response.text()

      // Parse job cards from HTML
      const jobMatches = html.matchAll(
        /data-entity-urn="urn:li:jobPosting:(\d+)"/g
      )
      const jobIds = [...jobMatches].map((m) => m[1])

      if (jobIds.length === 0) break

      for (const jobId of jobIds) {
        if (jobs.length >= maxResults) break

        await delay(1500)
        const detail = await getJobDetails(jobId)
        if (detail) {
          jobs.push(detail)
          onProgress?.(jobs.length)
        }
      }

      start += 25
      await delay(1500)
    } catch {
      break
    }
  }

  return jobs
}

export async function getJobDetails(
  jobId: string
): Promise<RawLinkedInJob | null> {
  try {
    const response = await fetch(`${GUEST_DETAIL_URL}/${jobId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) return null

    const html = await response.text()

    // Extract fields from HTML
    const titleMatch = html.match(
      /<h1[^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([^<]+)<\/h1>/
    )
    const companyMatch = html.match(
      /class="[^"]*topcard__org-name-link[^"]*"[^>]*>([^<]+)<\/a>/
    )
    const locationMatch = html.match(
      /class="[^"]*topcard__flavor--bullet[^"]*"[^>]*>([^<]+)<\/span>/
    )
    const postedMatch = html.match(
      /class="[^"]*posted-time-ago__text[^"]*"[^>]*>([^<]+)<\/span>/
    )
    const applicantMatch = html.match(/(\d+)\s+applicant/)
    const hirerNameMatch = html.match(
      /class="[^"]*hirer-card__hirer-information[^"]*"[\s\S]*?<span[^>]*>([^<]+)<\/span>/
    )
    const descMatch = html.match(
      /<div[^>]*class="[^"]*description__text[^"]*"[^>]*>([\s\S]*?)<\/div>/
    )
    const promotedMatch = html.match(/promoted/i)

    const postedText = postedMatch?.[1]?.trim() ?? ''

    return {
      jobId,
      jobTitle: titleMatch?.[1]?.trim() ?? 'Unknown',
      companyName: companyMatch?.[1]?.trim() ?? 'Unknown',
      companyLinkedInUrl: '',
      location: locationMatch?.[1]?.trim() ?? '',
      postedAt: parsePostedDate(postedText),
      hirerName: hirerNameMatch?.[1]?.trim() ?? null,
      hirerTitle: null,
      hirerLinkedInUrl: null,
      applicantCount: applicantMatch ? parseInt(applicantMatch[1]) : null,
      jobDescription: descMatch?.[1]?.replace(/<[^>]+>/g, ' ').trim() ?? '',
      isPromoted: !!promotedMatch,
      jobAdUrl: `https://www.linkedin.com/jobs/view/${jobId}`,
    }
  } catch {
    return null
  }
}