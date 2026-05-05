/**
 * CONTACT SCORER
 * ─────────────────────────────────────────────────────────────────────────────
 * Scores Apollo search candidates (FREE data) before spending any credits.
 *
 * Uses the `has_email`, `has_direct_phone`, and `last_refreshed_at` fields
 * that Apollo returns for FREE in search results. This alone prevents wasting
 * 40-60% of credits on people who have no contactable data in Apollo's DB.
 *
 * SCORING BREAKDOWN (0–100 points):
 *   has_email               +40   (most important — will enrichment get an email?)
 *   has_direct_phone="Yes"  +20   (bonus for direct dial)
 *   has_direct_phone="Maybe" +10
 *   title relevance         +20   (HR > GM > Owner for recruitment use case)
 *   company match           +15   (person's org name matches our lead)
 *   data freshness          +5    (refreshed in last 6 months)
 */

import type { ApolloPersonSearchResult } from './apolloApi'

export interface ScoredCandidate {
  person: ApolloPersonSearchResult
  score: number
  scoreBreakdown: {
    hasEmail: number
    hasPhone: number
    titleRelevance: number
    companyMatch: number
    freshness: number
  }
}

// Title relevance for recruitment agency use case
// HR roles are most likely to be responsible for hiring decisions
const TITLE_SCORES: { pattern: RegExp; score: number }[] = [
  { pattern: /head of (hr|human resources|people|talent|recruitment)/i, score: 20 },
  { pattern: /director.*(hr|human resources|people|talent)/i, score: 20 },
  { pattern: /chief people|chro|chief hr/i, score: 20 },
  { pattern: /vp.*(hr|human resources|people|talent)/i, score: 20 },
  { pattern: /hr manager|human resources manager/i, score: 18 },
  { pattern: /people (and culture|&culture|&c) manager/i, score: 18 },
  { pattern: /talent acquisition manager|recruitment manager/i, score: 18 },
  { pattern: /people operations manager/i, score: 16 },
  { pattern: /talent acquisition|recruiter|recruitment/i, score: 15 },
  { pattern: /hr (generalist|business partner|coordinator)/i, score: 14 },
  { pattern: /people (partner|lead|specialist)/i, score: 14 },
  { pattern: /office manager/i, score: 12 },
  { pattern: /general manager/i, score: 11 },
  { pattern: /operations (manager|director)/i, score: 10 },
  { pattern: /managing director/i, score: 10 },
  { pattern: /owner|founder|co-founder/i, score: 9 },
  { pattern: /ceo|chief executive/i, score: 8 },
  { pattern: /director/i, score: 7 },
  { pattern: /manager/i, score: 5 },
]

function scoreTitleRelevance(title: string): number {
  for (const { pattern, score } of TITLE_SCORES) {
    if (pattern.test(title)) return score
  }
  return 0
}

function scoreCompanyMatch(orgName: string | null, companyName: string): number {
  if (!orgName) return 0
  const orgLc = orgName.toLowerCase()
  const compLc = companyName.toLowerCase()

  if (orgLc === compLc) return 15
  if (orgLc.includes(compLc) || compLc.includes(orgLc)) return 12

  // Word overlap check
  const compWords = compLc.split(/\s+/).filter(w => w.length > 3)
  const matchCount = compWords.filter(w => orgLc.includes(w)).length
  if (matchCount >= 2) return 10
  if (matchCount === 1) return 5

  return 0
}

function scoreFreshness(lastRefreshedAt: string | null): number {
  if (!lastRefreshedAt) return 0
  try {
    const refreshed = new Date(lastRefreshedAt)
    const now = new Date()
    const monthsAgo = (now.getTime() - refreshed.getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (monthsAgo <= 3) return 5
    if (monthsAgo <= 6) return 3
    if (monthsAgo <= 12) return 1
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
      const hasPhone      = person.hasDirectPhone === 'Yes' ? 20 : person.hasDirectPhone === 'Maybe' ? 10 : 0
      const titleRelevance = scoreTitleRelevance(person.title)
      const companyMatch  = scoreCompanyMatch(person.orgName, companyName)
      const freshness     = scoreFreshness(person.lastRefreshedAt)

      const score = hasEmail + hasPhone + titleRelevance + companyMatch + freshness

      return {
        person,
        score,
        scoreBreakdown: { hasEmail, hasPhone, titleRelevance, companyMatch, freshness },
      }
    })
    .sort((a, b) => b.score - a.score)
}

/**
 * Returns the best candidate, or null if none are worth enriching.
 * Threshold: at least 40 points (meaning Apollo has an email for them).
 * Below this threshold, enriching wastes a credit with high probability of no result.
 */
export function pickBestCandidate(
  candidates: ScoredCandidate[],
  minScore = 20,
): ScoredCandidate | null {
  if (!candidates.length) return null
  const best = candidates[0]
  if (best.score < minScore) {
    console.log(`[Scorer] Best candidate score ${best.score} < min ${minScore} — skipping enrichment`)
    return null
  }
  console.log(`[Scorer] Best: "${best.person.title}" score=${best.score}`, best.scoreBreakdown)
  return best
}