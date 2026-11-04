import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { resetPassword } from '../services/auth'
import { Button, Input } from '../components/ui'
import { Helmet } from 'react-helmet-async'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    const { error: resetError } = await resetPassword(email, `${window.location.origin}/admin/reset-password`)
    if (resetError) setError(resetError.message)
    else setMessage('Check your email for a password reset link.')
  }
  return <><Helmet><meta name="robots" content="noindex,nofollow" /></Helmet><main className="login-page"><section className="login-card"><img src="/logo.jpeg" alt="Utsav Papad Machine" className="login-logo" /><h1>Reset password</h1><form onSubmit={submit}><Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />{message && <p className="success">{message}</p>}{error && <p className="error">{error}</p>}<Button type="submit">Send reset link</Button></form><Link className="forgot" to="/admin/login">Back to sign in</Link></section></main></>
}
