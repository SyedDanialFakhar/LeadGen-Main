// src/utils/locationUtils.ts
export function isCityMatch(location: string | undefined, selectedCity: string | null): boolean {
    if (!selectedCity) return true
    if (!location) return false
    
    const normalizedLocation = location.toLowerCase()
    const normalizedCity = selectedCity.toLowerCase()
    
    // Check for exact match
    if (normalizedLocation === normalizedCity) return true
    
    // Check if location contains the city (e.g., "Arndell Park, Sydney NSW" contains "sydney")
    if (normalizedLocation.includes(normalizedCity)) return true
    
    // Check for Sydney special cases (deals with "Sydney NSW", "Sydney CBD", etc.)
    if (normalizedCity === 'sydney') {
      const sydneyPatterns = ['sydney', 'sydney nsw', 'sydney cbd', 'sydney city']
      return sydneyPatterns.some(pattern => normalizedLocation.includes(pattern))
    }
    
    // Check for Melbourne special cases
    if (normalizedCity === 'melbourne') {
      const melbournePatterns = ['melbourne', 'melbourne vic', 'melbourne cbd', 'melbourne city']
      return melbournePatterns.some(pattern => normalizedLocation.includes(pattern))
    }
    
    // Check for Brisbane special cases
    if (normalizedCity === 'brisbane') {
      const brisbanePatterns = ['brisbane', 'brisbane qld', 'brisbane cbd', 'brisbane city']
      return brisbanePatterns.some(pattern => normalizedLocation.includes(pattern))
    }
    
    // Check for Perth special cases
    if (normalizedCity === 'perth') {
      const perthPatterns = ['perth', 'perth wa', 'perth cbd', 'perth city']
      return perthPatterns.some(pattern => normalizedLocation.includes(pattern))
    }
    
    // Check for Adelaide special cases
    if (normalizedCity === 'adelaide') {
      const adelaidePatterns = ['adelaide', 'adelaide sa', 'adelaide cbd', 'adelaide city']
      return adelaidePatterns.some(pattern => normalizedLocation.includes(pattern))
    }
    
    return false
  }
  
  // Extract primary city from location string (useful for display)
  export function extractPrimaryCity(location: string): string {
    const lowerLocation = location.toLowerCase()
    
    if (lowerLocation.includes('sydney')) return 'Sydney'
    if (lowerLocation.includes('melbourne')) return 'Melbourne'
    if (lowerLocation.includes('brisbane')) return 'Brisbane'
    if (lowerLocation.includes('perth')) return 'Perth'
    if (lowerLocation.includes('adelaide')) return 'Adelaide'
    if (lowerLocation.includes('canberra')) return 'Canberra'
    if (lowerLocation.includes('hobart')) return 'Hobart'
    if (lowerLocation.includes('darwin')) return 'Darwin'
    if (lowerLocation.includes('gold coast')) return 'Gold Coast'
    if (lowerLocation.includes('newcastle')) return 'Newcastle'
    if (lowerLocation.includes('wollongong')) return 'Wollongong'
    
    return location.split(',')[0].trim()
  }