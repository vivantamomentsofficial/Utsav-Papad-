import { FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isAdmin, signIn, signOut } from '../services/auth'
import { Button, Input } from '../components/ui'
import { Helmet } from 'react-helmet-async'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const { data, error: signInError } = await signIn(email, password)
    if (signInError) {
      setError(signInError.message.includes('Invalid login credentials') ? 'Email or password is incorrect.' : signInError.message)
      return
    }
    if (!data.user || !(await isAdmin(data.user.id))) {
      await signOut()
      const authenticatedEmail = data.user?.email ?? email
      setError(`Authenticated as ${authenticatedEmail}, but this exact Auth user is not in public.admin_users. Run the admin-user SQL in Supabase, then sign in again.`)
      return
    }
    navigate((location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/admin', { replace: true })
  }
  return <><Helmet><meta name="robots" content="noindex,nofollow" /></Helmet><main className="login-page"><section className="login-card"><img src="/logo.jpeg" alt="Utsav Papad Machine" className="login-logo" /><p className="eyebrow">SECURE ADMIN PANEL</p><h1>Welcome back</h1><p className="muted">Sign in to manage your company website.</p><form onSubmit={submit}><Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /><Input label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />{error && <p className="error">{error}</p>}<Button type="submit">Sign in</Button></form><Link className="forgot" to="/admin/forgot-password">Forgot password?</Link></section></main></>
}
