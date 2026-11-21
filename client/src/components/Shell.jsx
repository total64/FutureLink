import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'
import Assistant from './Assistant'

const seekerLinks = [
  ['/dashboard', 'Overview'],
  ['/discover?type=INTERNSHIP', 'Internships'],
  ['/discover?type=EVENT', 'Events'],
  ['/profile', 'Build my portfolio'],
  ['/portfolio', 'Portfolio'],
  ['/saved', 'Saved'],
  ['/applications', 'Applications'],
]

const adminLinks = [
  ['/admin', 'Overview'],
  ['/admin/organizations', 'Accounts'],
  ['/admin/activity', 'Activity'],
  ['/admin/content', 'Restricted content'],
  ['/admin/payments', 'Payments'],
]

const providerLinks = [
  ['/org', 'Overview'],
  ['/org/profile', 'Profile'],
  ['/org/opportunities?type=INTERNSHIP', 'Internships'],
  ['/org/opportunities?type=EVENT', 'Events'],
  ['/org/applications', 'Applications'],
  ['/org/promote', 'Promote'],
  ['/org/plans', 'Subscription'],
  ['/org/publish', 'Create opportunity'],
]

function linkActive(to, location) {
  const [path, query] = to.split('?')
  if (location.pathname !== path) {
    if (path === '/admin' || path === '/org' || path === '/dashboard') return false
    return location.pathname.startsWith(`${path}/`)
  }
  if (!query) return path !== '/discover'
  return location.search.includes(query)
}

export default function Shell({ children, crumb }) {
  const { user, logout } = useAuth()
  const orgQuery = useQuery({
    queryKey: ['org-me'],
    queryFn: () => api('/org/me'),
    enabled: user?.role === 'PROVIDER',
  })
  const orgReady = orgQuery.data?.profileSubmitted && orgQuery.data?.verificationStatus === 'APPROVED'
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const savedQuery = useQuery({
    queryKey: ['saved'],
    queryFn: () => api('/saved'),
    enabled: user?.role === 'SEEKER',
  })
  const adminQuery = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api('/admin/dashboard'),
    enabled: user?.role === 'ADMIN',
  })
  const reminders = (savedQuery.data?.items || []).filter((item) => item.reminder)
  const alerts = user?.role === 'SEEKER'
    ? reminders.map((item) => ({
        id: item.id,
        title: item.opportunity.title,
        detail: `${item.reminder.label} · ${formatDate(item.opportunity.closesAt)}`,
        to: `/opportunities/${item.opportunity.id}`,
      }))
    : user?.role === 'PROVIDER'
      ? [
          orgQuery.data?.subscription?.renewSoon ? { id: 'renew', title: 'Subscription renewal', detail: 'Your plan ends within 7 days.', to: '/org/plans' } : null,
          orgQuery.data?.subscription?.status === 'EXPIRED' ? { id: 'expired', title: 'Subscription expired', detail: 'Renew to keep publishing.', to: '/org/plans' } : null,
        ].filter(Boolean)
      : user?.role === 'ADMIN'
        ? [
            adminQuery.data?.pending ? { id: 'accounts', title: 'Accounts to review', detail: `${adminQuery.data.pending} waiting for approval.`, to: '/admin/organizations' } : null,
            adminQuery.data?.pendingPayments ? { id: 'payments', title: 'Payments to confirm', detail: `${adminQuery.data.pendingPayments} waiting.`, to: '/admin/payments' } : null,
          ].filter(Boolean)
        : []
  const links = user?.role === 'PROVIDER'
    ? (orgReady ? providerLinks : [['/org/profile', 'Profile']])
    : user?.role === 'ADMIN' ? adminLinks : seekerLinks
  const eyebrow = user?.role === 'PROVIDER' ? 'Organizer workspace' : user?.role === 'ADMIN' ? 'Admin' : 'Your next chapter'

  return (
    <div className="min-h-screen bg-paper lg:grid lg:h-screen lg:grid-cols-[250px_1fr] lg:overflow-hidden">
      {open && <button className="fixed inset-0 z-20 bg-ink/30 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <aside className={`${open ? 'fixed inset-y-0 left-0 z-30 flex w-[250px]' : 'hidden'} border-r border-line bg-white lg:static lg:z-auto lg:flex lg:h-screen lg:w-auto lg:overflow-y-auto`}>
        <div className="flex min-h-full w-full flex-col px-4 py-6">
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
      <div className="flex min-h-screen min-w-0 flex-col lg:h-screen lg:min-h-0 lg:overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-line px-2 py-1 text-sm lg:hidden" onClick={() => setOpen((value) => !value)}>
              Menu
            </button>
            <p className="text-sm text-ink/55">Future Link / <span className="text-ink">{crumb}</span></p>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="relative">
                <button
                  className="relative rounded-xl border border-line px-3 py-1.5 text-sm"
                  onClick={() => setAlertsOpen((value) => !value)}
                >
                  Alerts
                  {alerts.length > 0 && <span className="ml-2 rounded-full bg-brand px-1.5 text-xs text-white">{alerts.length}</span>}
                </button>
                {alertsOpen && (
                  <div className="absolute right-0 z-40 mt-2 w-80 rounded-2xl border border-line bg-white p-3 shadow-card">
                    <p className="px-2 text-sm font-medium">Reminders and notifications</p>
                    {alerts.length === 0 && <p className="px-2 py-3 text-sm text-ink/60">No alerts right now.</p>}
                    <ul className="mt-2 space-y-1">
                      {alerts.map((alert) => (
                        <li key={alert.id}>
                          <button
                            className="w-full rounded-xl px-2 py-2 text-left hover:bg-paper"
                            onClick={() => {
                              setAlertsOpen(false)
                              navigate(alert.to)
                            }}
                          >
                            <span className="block text-sm font-medium">{alert.title}</span>
                            <span className="block text-xs text-ink/60">{alert.detail}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {user && <span className="text-sm font-medium">{user.firstName}</span>}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <Assistant />
    </div>
  )
}
