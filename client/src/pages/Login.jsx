import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import BrandPanel from '../components/BrandPanel'
import PasswordField from '../components/PasswordField'
import { useAuth } from '../auth'
import { homeFor } from '../lib/roles'

export default function Login() {
  const { user, ready, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      const user = await login(form)
      navigate(homeFor(user))
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  if (ready && user) return <Navigate to={homeFor(user)} replace />

  return (
    <div className="min-h-screen bg-paper lg:flex">
      <BrandPanel />
      <main className="flex min-w-0 flex-1 items-center justify-center px-5 py-10">
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-2 text-sm">
            <Link to="/" className="text-ink/60">Back to welcome</Link>
            <p>New here? <Link to="/register" className="font-medium">Create an account</Link></p>
          </div>
          <p className="text-xs tracking-[0.16em] text-ink/50">WELCOME BACK</p>
          <h1 className="mt-2 font-display text-4xl">Pick up where you left off.</h1>
          <label className="mt-8 block"><span className="label">Email address</span><input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <div className="mt-4">
            <PasswordField label="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <p className="mt-3 text-right text-sm"><Link to="/forgot-password" className="font-medium text-brand">Forgot password?</Link></p>
          {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
          <button disabled={pending} className="mt-6 w-full rounded-xl bg-brand px-4 py-3 text-white">{pending ? 'Signing in…' : 'Sign in'}</button>
          <p className="mt-6 text-sm text-ink/60">
            Seeker: hana.testaye@example.com
            <br />
            Organizer: nova@eventlink.test
            <br />
            Admin: admin@eventlink.test
            <br />
            Password: EventLink1
          </p>
        </form>
      </main>
    </div>
  )
}
