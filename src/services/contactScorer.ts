/**
 * CONTACT SCORER
 * ══════════════════════════════════════════════════════════════════════════════
 * Scores Apollo search candidates using FREE metadata BEFORE spending credits.
 *
 * Apollo returns `has_email` and `has_direct_phone` on every search result
 * for FREE. This scorer uses those + title relevance + company match to
 * rank candidates so we only enrich the best one.
 *
 * SCORING (0–100 points):
 *   has_email = true          +40   Apollo has an email — enrichment likely to succeed
 *   has_direct_phone = "Yes"  +15   Direct dial available
 *   has_direct_phone = "Maybe"+7
 *   Title relevance           0–22  HR > TA > GM > Owner hierarchy
 *   Company name match        0–15  Ensures we got the right company
 *   Data freshness            0–8   Refreshed recently = more reliable
 */

import type { ApolloPersonSearchResult } from './apolloApi'

export interface ScoredCandidate {
  person: ApolloPersonSearchResult
  score: number
  breakdown: {
    hasEmail: number
    hasPhone: number
    titleRelevance: number
    companyMatch: number
    freshness: number
  }
}

// Title relevance for recruitment agency targeting (hiring decision makers)
const TITLE_SCORE_MAP: Array<{ pattern: RegExp; score: number }> = [
  // Highest — dedicated HR leadership
  { pattern: /head of (hr|human resources|people|talent|recruitment)/i,     score: 22 },
  { pattern: /director.*(hr|human resources|people|talent)/i,               score: 22 },
  { pattern: /chief people|chro|chief hr/i,                                 score: 22 },
  { pattern: /vp.*(hr|human resources|people|talent)/i,                     score: 22 },
  // High — HR managers (most common target)
  { pattern: /hr manager|human resources manager/i,                         score: 20 },
  { pattern: /people (and culture|&\s*culture|&c) manager/i,                score: 20 },
  { pattern: /talent acquisition manager|recruitment manager/i,             score: 20 },
  { pattern: /people operations manager/i,                                  score: 18 },
  // Good — specific TA/HR roles
  { pattern: /talent acquisition|senior recruiter|recruitment lead/i,       score: 16 },
  { pattern: /hr (generalist|business partner|coordinator)/i,               score: 15 },
  { pattern: /people (partner|lead|specialist)/i,                           score: 15 },
  { pattern: /recruiter/i,                                                   score: 14 },
  // Acceptable — office/operations
  { pattern: /office manager/i,                                              score: 12 },
  { pattern: /general manager/i,                                             score: 11 },
  { pattern: /operations (manager|director)/i,                              score: 10 },
  { pattern: /managing director/i,                                           score: 10 },
  // Fallback — founders/owners (small companies)
  { pattern: /owner|founder|co-founder|proprietor/i,                        score: 9  },
  { pattern: /ceo|chief executive/i,                                        score: 8  },
  // Generic
  { pattern: /director/i,                                                    score: 7  },
  { pattern: /manager/i,                                                     score: 5  },
]

function scoreTitleRelevance(title: string): number {
  for (const { pattern, score } of TITLE_SCORE_MAP) {
    if (pattern.test(title)) return score
  }
  return 0
}

function scoreCompanyMatch(orgName: string | null, targetName: string): number {
  if (!orgName) return 0
  const org = orgName.toLowerCase()
  const target = targetName.toLowerCase()

  if (org === target) return 15
  if (org.includes(target) || target.includes(org)) return 12

  const targetWords = target.split(/\s+/).filter(w => w.length > 3)
  const matches = targetWords.filter(w => org.includes(w)).length
  if (matches >= 2) return 10
  if (matches === 1) return 5

  return 0
}

function scoreFreshness(lastRefreshedAt: string | null): number {
  if (!lastRefreshedAt) return 0
  try {
    const monthsOld =
      (Date.now() - new Date(lastRefreshedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (monthsOld <= 2)  return 8
    if (monthsOld <= 6)  return 5
    if (monthsOld <= 12) return 2
    return 0
  } catch {
    return 0
  }
}

export function scoreCandidates(
  people: ApolloPersonSearchResult[],
  companyName: string,
): ScoredCandidate[] {
  return people
    .map(person => {
      const hasEmail      = person.hasEmail ? 40 : 0
      const hasPhone      = person.hasDirectPhone === 'Yes' ? 15 : person.hasDirectPhone === 'Maybe' ? 7 : 0
      const titleRelevance = scoreTitleRelevance(person.title)
      const companyMatch  = scoreCompanyMatch(person.orgName, companyName)
      const freshness     = scoreFreshness(person.lastRefreshedAt)

      return {
        person,
        score: hasEmail + hasPhone + titleRelevance + companyMatch + freshness,
        breakdown: { hasEmail, hasPhone, titleRelevance, companyMatch, freshness },
      }
    })
    .sort((a, b) => b.score - a.score)
}

/**
 * Returns the best candidate worth enriching.
 * minScore=20 means: "at least has a relevant title and company match"
 * If best candidate has has_email=false AND title score is low, skip enriching.
 */
export function pickBestCandidate(
  candidates: ScoredCandidate[],
  minScore = 15,
): ScoredCandidate | null {
  if (!candidates.length) return null

  const best = candidates[0]
  if (best.score < minScore) {
    console.log(`[Scorer] Best score ${best.score} < min ${minScore} — skipping enrichment to save credits`)
    return null
  }

  console.log(
    `[Scorer] Selected: "${best.person.firstName} ${best.person.lastName}" — "${best.person.title}" | score=${best.score}`,
    best.breakdown,
  )
  return best
}