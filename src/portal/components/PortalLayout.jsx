import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom'
import { LogOut, LayoutDashboard, Shield, FileText } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { Brand, Loader } from './ui'

export default function PortalLayout({ roles }) {
  const { account, loading, logout } = useAuth()
  const navigate = useNavigate()

  if (loading) return <div className="portal-root"><Loader label="Authenticating" /></div>
  if (!account) return <Navigate to="/portal/login" replace />
  if (roles && !roles.includes(account.role)) {
    // candidate trying to reach panel area → send to own page, and vice-versa
    return <Navigate to={account.role === 'candidate' ? '/portal/me' : '/portal'} replace />
  }

  const isStaff = account.role === 'admin' || account.role === 'panel'

  const doLogout = async () => { await logout(); navigate('/portal/login') }

  return (
    <div className="portal-root">
      <nav className="portal-nav">
        <Brand />
        <div className="portal-navlinks">
          {isStaff && (
            <NavLink to="/portal" end className={({ isActive }) => `portal-navlink ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />Dashboard
            </NavLink>
          )}
          {account.role === 'candidate' && (
            <NavLink to="/portal/me" className={({ isActive }) => `portal-navlink ${isActive ? 'active' : ''}`}>
              <FileText size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />My Feedback
            </NavLink>
          )}
          {account.role === 'admin' && (
            <NavLink to="/portal/admin" className={({ isActive }) => `portal-navlink ${isActive ? 'active' : ''}`}>
              <Shield size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />Admin
            </NavLink>
          )}
          <div style={{ width: 1, height: 20, background: 'var(--color-border-green)', margin: '0 0.5rem' }} />
          <span className="tag" title={account.email}>{account.displayName || account.email}</span>
          <button className="portal-navlink" onClick={doLogout} title="Sign out" style={{ color: 'var(--color-cream-muted)' }}>
            <LogOut size={14} />
          </button>
        </div>
      </nav>
      <main className="portal-main">
        <Outlet />
      </main>
    </div>
  )
}
