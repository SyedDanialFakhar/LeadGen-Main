// src/utils/contactExtractor.ts

/**
 * Extract email addresses from text
 */
export function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  return [...new Set(matches)];
}

/**
 * Extract phone numbers from text
 */
export function extractPhones(text: string): string[] {
  const phoneRegexes = [
    /(\+61\s?4\d{2}\s?\d{3}\s?\d{3})/g,
    /(04\d{2}\s?\d{3}\s?\d{3})/g,
    /(\(0[2378]\)\s?\d{4}\s?\d{4})/g,
    /(0[2378]\s?\d{4}\s?\d{4})/g,
    /(1300\s?\d{3}\s?\d{3})/g,
    /(1800\s?\d{3}\s?\d{3})/g,
  ];
  
  const phones: string[] = [];
  for (const regex of phoneRegexes) {
    const matches = text.match(regex) || [];
    phones.push(...matches);
  }
  
  return [...new Set(phones)];
}

/**
 * Extract contact name from text
 */
export function extractContactName(text: string): string | null {
  const patterns = [
    /Contact:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /Contact\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /Please\s+contact\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /Reach out to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /Email\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+at/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Check if job is from recruitment agency
 */
export function isRecruitmentAgency(companyName: string, advertiserName?: string): boolean {
  const searchText = `${companyName} ${advertiserName || ''}`.toLowerCase()
  
  const exactAgencyNames = [
    'hays', 'randstad', 'robert half', 'michael page', 'adecco',
    'kelly services', 'manpower', 'hudson', 'peoplebank',
    'chandler macleod', 'gough recruitment', 'pagegroup',
    'robert walters', 'morgan mckinley', 'talent international',
    'design & build recruitment', 'u&u recruitment', 'frontline recruitment',
    'aspect personnel', 'manpowergroup'
  ]
  
  if (exactAgencyNames.some(name => searchText.includes(name))) {
    return true
  }
  
  const agencyPhrases = [
    'recruitment agency', 'staffing agency', 'employment agency',
    'talent acquisition agency', 'recruitment firm', 'staffing firm'
  ]
  
  if (agencyPhrases.some(phrase => searchText.includes(phrase))) {
    return true
  }
  
  return false
}

/**
 * Check if job description contains unwanted phrases
 */
export function hasUnwantedPhrases(description: string): boolean {
  const lowerDesc = description.toLowerCase()
  
  const strictPhrases = [
    'no recruitment agencies', 'no agencies please', 'agencies do not contact',
    'strictly no agencies', 'no agency calls', 'no agency contact',
    'do not contact us if you are a recruitment',
    'unsolicited applications from recruitment', 'agency fee will not be accepted'
  ]
  
  return strictPhrases.some(phrase => lowerDesc.includes(phrase))
}

/**
 * Detect recruiter-style intros like "Our client..." or "We have partnered..."
 */
export function hasRecruitmentIntro(description: string): boolean {
  const intro = description.toLowerCase().trim().slice(0, 220)
  const recruitmentIntroPatterns = [
    /^our client\b/,
    /^we have partnered\b/,
    /^we've partnered\b/,
    /^we are partnered\b/,
    /^on behalf of (our )?client\b/,
  ]

  return recruitmentIntroPatterns.some((pattern) => pattern.test(intro))
}

/**
 * Basic website/domain signal for recruitment businesses.
 */
export function isRecruitmentWebsite(website: string): boolean {
  const lowerWebsite = website.toLowerCase()
  const recruitmentWebsiteKeywords = [
    'recruit',
    'recruitment',
    'staffing',
    'talent',
    'labourhire',
    'labour-hire',
    'employment-agency',
    'employmentagency',
    'headhunt',
  ]

  return recruitmentWebsiteKeywords.some((keyword) => lowerWebsite.includes(keyword))
}

/**
 * Detect legal/law firms so they can be excluded.
 */
export function isLawFirmRelated(
  companyName: string,
  jobTitle: string,
  description: string,
  website?: string | null
): boolean {
  const combined = `${companyName} ${jobTitle} ${description.slice(0, 400)} ${website || ''}`.toLowerCase()
  const lawRegexes = [
    /\blaw\s?firm\b/,
    /\bsolicitor(s)?\b/,
    /\battorney(s)?\b/,
    /\bbarrister(s)?\b/,
    /\blegal practice\b/,
    /\blitigation\b/,
    /\bconveyancing\b/,
    /\bfamily law\b/,
    /\bcorporate law\b/,
    /\bimmigration law\b/,
  ]

  return lawRegexes.some((pattern) => pattern.test(combined))
}

/**
 * Check if company is a private advertiser
 */
export function isPrivateAdvertiser(advertiserName?: string, isPrivate?: boolean): boolean {
  if (isPrivate === true) return true
  if (!advertiserName) return false
  
  const exactPrivateNames = ['Private Advertiser', 'Confidential']
  return exactPrivateNames.includes(advertiserName)
}

/**
 * Check if job classification contains "Sales"
 */
export function isSalesJob(classification: string): boolean {
  if (!classification) return false
  return classification.toLowerCase().includes('sales')
}