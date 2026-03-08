import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './components/AuthContext.tsx'
import { CivDataProvider } from './components/CivContext.tsx'

import { GoogleOAuthProvider } from '@react-oauth/google'

// Use the real Google Client ID directly to avoid Vercel environment variable issues
const GOOGLE_CLIENT_ID = "403799038562-p202o225j2vf0k72fbjbmeqgrntmr6su.apps.googleusercontent.com";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <CivDataProvider>
          <App />
        </CivDataProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
