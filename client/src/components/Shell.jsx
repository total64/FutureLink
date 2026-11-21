import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../auth'

const seekerLinks = [
  ['/dashboard', 'Overview'],
  ['/discover?type=INTERNSHIP', 'Internships'],
  ['/discover?type=EVENT', 'Events'],
  ['/profile', 'Build my profile'],
  ['/saved', 'Saved'],
  ['/applications', 'Applications'],
  ['/portfolio', 'Portfolio'],
]

const adminLinks = [
  ['/admin', 'Overview'],
  ['/admin/organizations', 'Accounts'],
  ['/admin/activity', 'Activity'],
  ['/admin/content', 'Restricted content'],
]

const providerLinks = [
  ['/org', 'Overview'],
  ['/org/opportunities', 'Opportunities'],
  ['/org/applications', 'Applications'],
  ['/org/talent', 'Talent discovery'],
  ['/org/publish', 'Create opportunity'],
]

function linkActive(to, location) {
  const [path, query] = to.split('?')
  if (path !== '/admin' && location.pathname.startsWith(`${path}/`)) return true
  if (location.pathname !== path) return false
  if (!query) return path !== '/discover'
  return location.search.includes(query)
}

export default function Shell({ children, crumb }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const links = user?.role === 'PROVIDER' ? providerLinks : user?.role === 'ADMIN' ? adminLinks : seekerLinks
  const eyebrow = user?.role === 'PROVIDER' ? 'Organizer workspace' : user?.role === 'ADMIN' ? 'Admin' : 'Your next chapter'

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[250px_1fr]">
      <aside className={`${open ? 'block' : 'hidden'} border-r border-line bg-white lg:block`}>
        <div className="flex min-h-screen flex-col px-4 py-6">
          <div className="px-2">
            <p className="text-sm font-semibold tracking-[0.16em]">FUTURE LINK</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-ink/45">{eyebrow}</p>
          </div>
          <p className="mb-2 mt-8 px-3 text-[11px] font-semibold tracking-[0.16em] text-ink/40">WORKSPACE</p>
          <nav className="space-y-1">
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={() =>
                  `block rounded-xl px-3 py-2.5 text-sm ${linkActive(to, location) ? 'bg-mint font-medium text-brand-dark' : 'text-ink/75 hover:bg-paper'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl bg-mint p-4 text-sm">
            <p className="font-medium">A little guidance?</p>
            <p className="mt-1 text-ink/65">Discovery is always free for students.</p>
            {user ? (
              <button
                className="mt-4 font-medium text-brand-dark"
                onClick={async () => {
                  await logout()
                  navigate('/')
                }}
              >
                Sign out
              </button>
            ) : (
              <button className="mt-4 font-medium text-brand-dark" onClick={() => navigate('/login')}>
                Sign in
              </button>
            )}
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-line px-2 py-1 text-sm lg:hidden" onClick={() => setOpen((value) => !value)}>
              Menu
            </button>
            <p className="text-sm text-ink/55">Future Link / <span className="text-ink">{crumb}</span></p>
          </div>
          {user && <span className="text-sm font-medium">{user.firstName}</span>}
        </header>
        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
