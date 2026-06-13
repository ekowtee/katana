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
      <nav className="portal-nav px-3 py-2.5 sm:px-6 md:px-8 gap-2 sm:gap-6">
        <Brand />
        <div className="portal-navlinks gap-1 sm:gap-2">
          {isStaff && (
            <NavLink to="/portal" end className={({ isActive }) => `portal-navlink flex items-center justify-center ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={14} className="md:mr-1.5" />
              <span className="hidden md:inline">Dashboard</span>
            </NavLink>
          )}
          {account.role === 'candidate' && (
            <NavLink to="/portal/me" className={({ isActive }) => `portal-navlink flex items-center justify-center ${isActive ? 'active' : ''}`}>
              <FileText size={14} className="md:mr-1.5" />
              <span className="hidden md:inline">My Feedback</span>
            </NavLink>
          )}
          {account.role === 'admin' && (
            <NavLink to="/portal/admin" className={({ isActive }) => `portal-navlink flex items-center justify-center ${isActive ? 'active' : ''}`}>
              <Shield size={14} className="md:mr-1.5" />
              <span className="hidden md:inline">Admin</span>
            </NavLink>
          )}
          <div className="hidden sm:block" style={{ width: 1, height: 20, background: 'var(--color-border-green)', margin: '0 0.25rem' }} />
          <span className="tag hidden sm:inline-block max-w-[120px] truncate" title={account.email}>
            {account.displayName || account.email}
          </span>
          <button className="portal-navlink flex items-center justify-center" onClick={doLogout} title="Sign out" style={{ color: 'var(--color-cream-muted)' }}>
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
