import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import AuthProvider from './context/AuthProvider.jsx'

import '@fontsource-variable/manrope'
import '@fontsource-variable/cormorant-garamond/wght-italic.css'
import '@fontsource-variable/source-serif-4/standard.css'
import '@fontsource-variable/source-serif-4/standard-italic.css'
import './i18n/index.js'
import './index.css'

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
