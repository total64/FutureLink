import { useState } from 'react'
import { Link } from 'react-router-dom'
import BrandPanel from '../components/BrandPanel'
import { api } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [token, setToken] = useState('')
  const [checked, setChecked] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setPending(true)
    setError('')
    setToken('')
    try {
      const result = await api('/auth/forgot', { method: 'POST', body: { email } })
      setToken(result.resetToken || '')
      setChecked(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper lg:flex">
      <BrandPanel />
      <main className="flex min-w-0 flex-1 items-center justify-center px-5 py-10">
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <div className="mb-8 text-sm">
            <Link to="/login" className="text-ink/60">Back to sign in</Link>
          </div>
          <p className="text-xs tracking-[0.16em] text-ink/50">RESET PASSWORD</p>
          <h1 className="mt-2 font-display text-4xl">Forgot your password?</h1>
          <p className="mt-2 text-ink/70">Enter the email on your account. If it matches, you can choose a new password.</p>
          <label className="mt-8 block">
            <span className="label">Email address</span>
            <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
          {checked && !token && <p className="mt-4 text-sm text-ink/70">No account uses that email.</p>}
          {token && (
            <p className="mt-4 text-sm">
              This account can be reset now.{' '}
              <Link className="font-medium text-brand" to={`/reset-password?token=${encodeURIComponent(token)}`}>Set a new password</Link>
            </p>
          )}
          <button disabled={pending} className="mt-6 w-full rounded-xl bg-brand px-4 py-3 text-white">{pending ? 'Checking…' : 'Continue'}</button>
        </form>
      </main>
    </div>
  )
}
