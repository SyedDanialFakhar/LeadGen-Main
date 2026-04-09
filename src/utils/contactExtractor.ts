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
  const agencyKeywords = [
    'recruitment', 'recruiter', 'talent', 'staffing', 'consulting',
    'headhunt', 'executive search', 'people solutions', 'workforce',
    'placement', 'resourcing', 'manpower', 'hays', 'randstad', 
    'robert half', 'michael page', 'kelly services', 'adecco',
    'chandler macleod', 'hudson', 'talent international', 'peoplebank',
    'roc consulting', 'arrow executive', 'roc', 'gough', 'pagegroup'
  ];
  
  const searchText = `${companyName} ${advertiserName || ''}`.toLowerCase();
  return agencyKeywords.some(keyword => searchText.includes(keyword));
}

/**
 * Check if job description contains unwanted phrases
 */
export function hasUnwantedPhrases(description: string): boolean {
  const unwantedPhrases = [
    'no recruitment agencies',
    'no unsolicited resumes',
    'we have covered this one',
    'agencies do not contact',
    'no agencies',
    'do not contact us if you are a recruitment',
    'unsolicited applications from recruitment',
    'agency fee will not be accepted',
    'recruitment agencies need not apply',
    'no agency contact',
    'agency approaches will not be accepted',
    'please do not contact'
  ];
  
  const lowerDesc = description.toLowerCase();
  return unwantedPhrases.some(phrase => lowerDesc.includes(phrase));
}

/**
 * Check if job is from private advertiser
 */
// src/utils/contactExtractor.ts

/**
 * Check if job is from private advertiser - ONLY filter if it's ACTUALLY private
 * Many jobs have isPrivate = false but the function still filters them
 */
export function isPrivateAdvertiser(advertiserName?: string, isPrivate?: boolean): boolean {
  // First check the explicit isPrivate flag from the advertiser object
  if (isPrivate === true) return true
  
  // If no advertiser name, not private
  if (!advertiserName) return false
  
  // Only filter if it's EXACTLY "Private Advertiser" (not contains)
  // This prevents filtering normal companies that have "private" in their description
  const exactPrivateNames = ['Private Advertiser', 'Confidential']
  return exactPrivateNames.includes(advertiserName)
}

/**
 * Check if job is old enough (minimum days)
 * Returns true if job is OLDER than minDays
 */
export function isJobOldEnough(datePosted: string, minDays: number = 7): boolean {
  if (!datePosted) return false;
  
  try {
    const postedDate = new Date(datePosted);
    const today = new Date();
    // Reset time to midnight for accurate day comparison
    today.setHours(0, 0, 0, 0);
    postedDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - postedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Return true if job is at least minDays old
    return diffDays >= minDays;
  } catch (e) {
    console.error('Error parsing date:', datePosted, e);
    return false;
  }
}