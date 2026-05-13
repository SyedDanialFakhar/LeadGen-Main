export function isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }
  
  export function isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
  
  export function isValidLinkedInUrl(url: string): boolean {
    return url.includes('linkedin.com/')
  }
  
  export function isValidSeekUrl(url: string): boolean {
    return url.includes('seek.com.au/')
  }
  
  export function isValidPhone(phone: string): boolean {
    // Australian mobile: starts with 04, 614, +614
    const cleaned = phone.replace(/[\s\-()]/g, '')
    return /^(\+?61|0)4\d{8}$/.test(cleaned)
  }
  
  export function formatPhone(phone: string): string {
    const cleaned = phone.replace(/[\s\-()]/g, '')
    if (cleaned.startsWith('+614')) {
      return cleaned.replace('+614', '04')
    }
    if (cleaned.startsWith('614')) {
      return cleaned.replace('614', '04')
    }
    return cleaned
  }