import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './components/AuthContext.tsx'
import { PresenceProvider } from './components/PresenceContext.tsx'
import { CivDataProvider } from './components/CivContext.tsx'

import { GoogleOAuthProvider } from '@react-oauth/google'

// Use the real Google Client ID directly to avoid Vercel environment variable issues
const GOOGLE_CLIENT_ID = "403799038562-p202o225j2vf0k72fbjbmeqgrntmr6su.apps.googleusercontent.com";
console.log("Manuale Civ v0.1.0-beta - Social Betting Refined");

import { HelmetProvider } from 'react-helmet-async'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <AuthProvider>
            <PresenceProvider>
              <CivDataProvider>
                <App />
              </CivDataProvider>
            </PresenceProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
