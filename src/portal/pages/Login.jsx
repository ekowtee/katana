import { useState, useEffect } from 'react'
import { useSearchParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { Brand, Loader } from '../components/ui'

export default function Login() {
  const { account, loading } = useAuth()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(params.get('error') === 'invalid' ? 'That link was invalid or has expired. Request a new one below.' : '')

  useEffect(() => { if (params.get('error') === 'invalid') setError('That link was invalid or has expired. Request a new one below.') }, [params])

  if (loading) return <Loader label="Checking session" />
  if (account) return <Navigate to={account.role === 'candidate' ? '/portal/me' : '/portal'} replace />

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true); setError('')
    try {
      await api.requestLink(email.trim())
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="portal-root center-screen" style={{ padding: '1.5rem' }}>
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="card" style={{ width: '100%', maxWidth: 440 }}
      >
        <div className="card-pad card-hairline">
          <Brand />
        </div>
        <div className="card-pad">
          {!sent ? (
            <>
              <p className="portal-eyebrow">Secure Access</p>
              <h1 className="portal-h1" style={{ fontSize: '2rem' }}>
                Panel <span className="accent">sign-in</span>
              </h1>
              <p className="portal-lede" style={{ marginBottom: '1.5rem' }}>
                Enter your registered email and we’ll send a one-time secure link. No password required.
              </p>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--color-gold-muted)' }} />
                    <input
                      type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com" style={{ paddingLeft: 36 }} autoFocus
                    />
                  </div>
                </div>
                {error && <p style={{ color: 'var(--color-error)', fontSize: 12 }}>{error}</p>}
                <button type="submit" disabled={busy} className="btn-gold" style={{ width: '100%' }}>
                  {busy ? 'Sending…' : 'Send secure link'} {!busy && <ArrowRight size={15} />}
                </button>
              </form>
            </>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <CheckCircle2 size={40} style={{ color: 'var(--color-success)' }} />
              <h1 className="portal-h1" style={{ fontSize: '1.8rem', marginTop: '1rem' }}>Check your inbox</h1>
              <p className="portal-lede">
                If <strong style={{ color: 'var(--color-cream)' }}>{email}</strong> is registered, a secure sign-in link is on its way.
                It expires in 30 minutes.
              </p>
              <button className="btn-ghost btn-sm" style={{ marginTop: '1.25rem' }} onClick={() => { setSent(false); setEmail('') }}>
                Use a different email
              </button>
            </motion.div>
          )}
        </div>
        <div className="card-pad" style={{ borderTop: '1px solid var(--color-border-green)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={13} style={{ color: 'var(--color-gold-muted)' }} />
          <span style={{ fontSize: 10, letterSpacing: '0.04em', color: 'var(--color-cream-muted)' }}>
            Access is restricted to the selection panel & invited candidates.
          </span>
        </div>
      </motion.div>
    </div>
  )
}
