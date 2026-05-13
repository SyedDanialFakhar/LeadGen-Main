import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility to merge tailwind classes safely
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}