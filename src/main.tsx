// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Apply theme immediately before React renders
const savedTheme = localStorage.getItem('leadflow-theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const theme = savedTheme ?? (prefersDark ? 'dark' : 'light')
document.documentElement.classList.add(theme)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)