import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { homeFor } from '../lib/roles'
import Assistant from '../components/Assistant'

const roles = [
  {
    title: 'Opportunity seeker',
    copy: 'Find internships and events, and a profile that explains why you match.',
    to: '/register?as=seeker',
  },
  {
    title: 'Organization',
    copy: 'Publish opportunities, see applications, and reach students who choose to be discovered.',
    to: '/register?as=provider',
  },
]

export default function Welcome() {
  const { user, ready } = useAuth()
  if (!ready) return <p className="p-8">Loading…</p>
  if (user) return <Navigate to={homeFor(user)} replace />

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div>
          <p className="text-sm font-semibold tracking-[0.18em]">FUTURE LINK</p>
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink/45">Your next chapter</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/login" className="text-ink/70">Sign in</Link>
          <Link to="/register" className="rounded-full bg-brand px-4 py-2 font-medium text-white">Create account</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16">
        <section className="grid items-center gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-brand">WELCOME TO FUTURE LINK</p>
            <h1 className="mt-3 max-w-xl font-display text-5xl font-semibold leading-tight">Big ambitions. Right opportunities.</h1>
            <p className="mt-4 max-w-lg text-lg text-ink/70">
              A place for opportunity seekers and organizations to find each other. Open the door, choose your role, and we will take you to the right dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register?as=seeker" className="rounded-full bg-brand px-5 py-3 font-medium text-white">Join as an opportunity seeker</Link>
              <Link to="/register?as=provider" className="rounded-full border border-brand px-5 py-3 font-medium text-brand">Join as an organization</Link>
              <Link to="/discover" className="rounded-full px-5 py-3 text-ink/70">Browse first</Link>
            </div>
          </div>
          <div className="rounded-3xl bg-mint p-6">
            <p className="text-xs font-semibold tracking-[0.14em] text-brand">MADE FOR YOUR NEXT MOVE</p>
            <p className="mt-3 font-display text-3xl font-semibold">Discover internships and tech events that grow with you.</p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[['Internships', 'Open roles'], ['Events', 'Hackathons'], ['Matches', 'For your profile']].map(([title, copy]) => (
                <article key={title} className="rounded-2xl bg-white p-3">
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-xs text-ink/60">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4">
          <h2 className="font-display text-2xl font-semibold">Create an account with your role</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {roles.map((role) => (
              <Link key={role.title} to={role.to} className="rounded-3xl border border-line bg-white p-6 shadow-card">
                <p className="text-xs font-semibold tracking-[0.14em] text-brand">SIGN UP</p>
                <h3 className="mt-2 font-display text-2xl font-semibold">{role.title}</h3>
                <p className="mt-2 text-ink/70">{role.copy}</p>
                <p className="mt-4 text-sm font-medium text-brand">Continue →</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Assistant />
    </div>
  )
}
