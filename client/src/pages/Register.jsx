import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import BrandPanel from '../components/BrandPanel'
import { useAuth } from '../auth'
import { homeFor } from '../lib/roles'

export default function Register() {
  const { user, ready, register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [accountType, setAccountType] = useState(params.get('as') === 'provider' ? 'provider' : 'seeker')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    organizationName: '',
    acceptedTerms: false,
  })
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function update(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      const user = await register({ ...form, accountType })
      navigate(homeFor(user.role))
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  if (ready && user) return <Navigate to={homeFor(user.role)} replace />

  return (
    <div className="min-h-screen bg-paper lg:flex">
      <BrandPanel />
      <main className="flex min-w-0 flex-1 items-center justify-center px-5 py-10">
        <form onSubmit={onSubmit} className="w-full max-w-xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-2 text-sm">
            <Link to="/" className="text-ink/60">Back to welcome</Link>
            <p>Already a member? <Link to="/login" className="font-medium">Sign in</Link></p>
          </div>
          <p className="text-xs tracking-[0.16em] text-ink/50">START YOUR NEXT CHAPTER</p>
          <h1 className="mt-2 font-display text-4xl">There’s more ahead of you.</h1>
          <p className="mt-2 text-ink/70">Create your account and make your next move count.</p>

          <p className="mb-2 mt-8 text-sm">Sign up as</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['seeker', 'Student', 'Looking for internships, events and scholarships'],
              ['provider', 'Organization', 'Publishing opportunities for students'],
            ].map(([id, title, copy]) => (
              <button
                type="button"
                key={id}
                onClick={() => setAccountType(id)}
                className={`rounded-2xl border p-4 text-left ${accountType === id ? 'border-brand bg-mint' : 'border-line bg-white'}`}
              >
                <span className="block font-medium">{title}</span>
                <span className="mt-1 block text-sm text-ink/60">{copy}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="label">First name</span><input className="field" name="firstName" value={form.firstName} onChange={update} required /></label>
            <label className="block"><span className="label">Last name</span><input className="field" name="lastName" value={form.lastName} onChange={update} required /></label>
          </div>
          {accountType === 'provider' && (
            <label className="mt-4 block"><span className="label">Organization name</span><input className="field" name="organizationName" value={form.organizationName} onChange={update} required /></label>
          )}
          <label className="mt-4 block"><span className="label">Email address</span><input className="field" type="email" name="email" value={form.email} onChange={update} required /></label>
          <label className="mt-4 block">
            <span className="label">Password</span>
            <input className="field" type="password" name="password" value={form.password} onChange={update} required />
            <span className="mt-1 block text-xs text-ink/50">Use 8 or more characters, including letters and numbers.</span>
          </label>
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input type="checkbox" name="acceptedTerms" checked={form.acceptedTerms} onChange={update} className="mt-1" />
            <span>I agree to the Terms of Service and Privacy Policy.</span>
          </label>
          {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
          <button disabled={pending} className="mt-6 w-full rounded-xl bg-brand px-4 py-3 text-white">
            {pending ? 'Creating account…' : 'Create free account'}
          </button>
          <p className="mt-3 text-center text-xs text-ink/50">
            Your portfolio is private by default. You choose who sees it.
            {accountType === 'provider' && ' Organization accounts require verification before publishing.'}
          </p>
        </form>
      </main>
    </div>
  )
}
