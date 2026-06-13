import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import './portal/portal.css'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { AuthProvider } from './portal/lib/AuthContext'
import PortalLayout from './portal/components/PortalLayout'
import Login from './portal/pages/Login'
import Dashboard from './portal/pages/Dashboard'
import CandidateDetail from './portal/pages/CandidateDetail'
import MyResults from './portal/pages/MyResults'
import Admin from './portal/pages/Admin'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public launch landing — untouched */}
          <Route path="/" element={<App />} />

          {/* Portal */}
          <Route path="/portal/login" element={<Login />} />

          <Route path="/portal" element={<PortalLayout roles={['panel', 'admin']} />}>
            <Route index element={<Dashboard />} />
            <Route path="candidate/:slug" element={<CandidateDetail />} />
          </Route>

          <Route path="/portal/admin" element={<PortalLayout roles={['admin']} />}>
            <Route index element={<Admin />} />
          </Route>

          <Route path="/portal/me" element={<PortalLayout roles={['candidate']} />}>
            <Route index element={<MyResults />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    <ToastContainer position="bottom-right" theme="dark" />
  </StrictMode>,
)
