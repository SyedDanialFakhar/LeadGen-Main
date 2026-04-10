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