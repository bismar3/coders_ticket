import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import '@fontsource-variable/unbounded'
import '@fontsource-variable/manrope'
import '@fontsource-variable/jetbrains-mono'
import 'lenis/dist/lenis.css'
import './styles/index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { MascotProvider } from './context/MascotContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MascotProvider>
          <App />
        </MascotProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
