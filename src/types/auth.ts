export interface AuthUser {
    id: string
    email: string
    createdAt: string
  }
  
  export interface AuthState {
    user: AuthUser | null
    isLoading: boolean
    isAuthenticated: boolean
  }
  
  export interface LoginCredentials {
    email: string
    password: string
  }