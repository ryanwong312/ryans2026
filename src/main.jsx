import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { createClient } from '@base44/sdk'

// --- Initialize the real Base44 client ---
// Use environment variables (set in Render)
const appId = import.meta.env.VITE_BASE44_APP_ID
const apiKey = import.meta.env.VITE_BASE44_API_KEY

if (appId && apiKey) {
  const client = createClient({
    appId: appId,
    headers: {
      api_key: apiKey,
    }
  })
  // Overwrite the dummy db with the real client
  globalThis.__B44_DB__ = client
  console.log('✅ Base44 client initialized')
} else {
  console.warn('⚠️ Base44 credentials missing – data will not persist')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)