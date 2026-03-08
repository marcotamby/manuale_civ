import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './components/AuthContext.tsx'
import { CivDataProvider } from './components/CivContext.tsx'

import { GoogleOAuthProvider } from '@react-oauth/google'

// Add your real Client ID in a .env file at the root of the project:
// VITE_GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

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
