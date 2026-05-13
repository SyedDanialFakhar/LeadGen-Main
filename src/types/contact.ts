export interface HunterEmailResult {
    email: string
    score: number
    domain: string
    firstName: string
    lastName: string
    position: string
    linkedin: string | null
    sources: HunterSource[]
  }
  
  export interface HunterSource {
    domain: string
    uri: string
    extractedOn: string
  }
  
  export interface HunterVerifyResult {
    email: string
    score: number
    regexp: boolean
    gibberish: boolean
    disposable: boolean
    webmail: boolean
    mxRecords: boolean
    smtpServer: boolean
    smtpCheck: boolean
    acceptAll: boolean
    block: boolean
    status: 'valid' | 'invalid' | 'accept_all' | 'webmail' | 'disposable' | 'unknown'
  }
  
  export interface ApolloContact {
    id: string
    firstName: string
    lastName: string
    name: string
    title: string
    email: string | null
    phone: string | null
    linkedinUrl: string | null
    organization: ApolloOrganization | null
  }
  
  export interface ApolloOrganization {
    id: string
    name: string
    websiteUrl: string | null
    linkedinUrl: string | null
    estimatedNumEmployees: number | null
  }
  
  export interface ApolloEnrichedContact extends ApolloContact {
    emailStatus: string | null
    city: string | null
    country: string | null
  }
  
  export interface EnrichmentResult {
    contactName: string | null
    contactJobTitle: string | null
    contactEmail: string | null
    contactPhone: string | null
    contactLinkedinUrl: string | null
    source: 'hunter' | 'apollo' | 'manual' | null
    confidence: number | null
  }