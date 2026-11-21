import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import BrandPanel from '../components/BrandPanel'
import PasswordField from '../components/PasswordField'
import { api } from '../lib/api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setPending(true)
    try {
      await api('/auth/reset', { method: 'POST', body: { token, password } })
      navigate('/login')
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
          <p className="text-xs tracking-[0.16em] text-ink/50">NEW PASSWORD</p>
          <h1 className="mt-2 font-display text-4xl">Choose a new password.</h1>
          {!token && <p className="mt-4 text-sm text-red-700">This reset link is missing. Start again from forgot password.</p>}
          <div className="mt-8">
            <PasswordField label="New password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" hint="Use 8 or more characters, including letters and numbers." />
          </div>
          <div className="mt-4">
            <PasswordField label="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
          <button disabled={pending || !token} className="mt-6 w-full rounded-xl bg-brand px-4 py-3 text-white">{pending ? 'Saving…' : 'Save password'}</button>
        </form>
      </main>
    </div>
  )
}
