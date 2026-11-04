import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { updatePassword } from '../services/auth'
import { Button, Input } from '../components/ui'

export function ResetPassword() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  async function submit(event: FormEvent) {
    event.preventDefault()
    const { error: updateError } = await updatePassword(password)
    if (updateError) setError(updateError.message)
    else navigate('/admin/login', { replace: true })
  }
  return <><Helmet><meta name="robots" content="noindex,nofollow" /></Helmet><main className="login-page"><section className="login-card"><h1>Choose a new password</h1><form onSubmit={submit}><Input label="New password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />{error && <p className="error">{error}</p>}<Button type="submit">Update password</Button></form><Link className="forgot" to="/admin/login">Back to sign in</Link></section></main></>
}
