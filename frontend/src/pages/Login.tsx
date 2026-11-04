import { FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isAdmin, signIn, signOut } from '../services/auth'
import { Button, Input } from '../components/ui'
import { Helmet } from 'react-helmet-async'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signInError } = await signIn(email, password)
      if (signInError) {
        setError('Email or password is incorrect.')
        return
      }
      if (!data.user || !(await isAdmin(data.user.id))) {
        await signOut()
        setError('This account does not have admin access.')
        return
      }
      navigate((location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/admin', {
        replace: true,
      })
    } catch {
      setError('Email or password is incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Admin Login | Utsav Food Technology</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <main className="login-page">
        <section className="login-card">
          <img
            src="/logo.jpeg"
            alt="Utsav Food Technology"
            className="login-logo"
            width="120"
            height="120"
          />
          <p className="eyebrow">SECURE ADMIN PANEL</p>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to manage your company website.</p>
          <form onSubmit={submit}>
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            {error && <p className="error">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <Link className="forgot" to="/admin/forgot-password">
            Forgot password?
          </Link>
        </section>
      </main>
    </>
  )
}
