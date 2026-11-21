import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import Shell from '../components/Shell'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'

export function AdminDashboard() {
  const query = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => api('/admin/dashboard') })
  const data = query.data
  const cards = data ? [
    ['Seekers', data.seekers],
    ['Organizations', data.organizations],
    ['Pending verification', data.pending],
    ['Published listings', data.listings],
    ['Restricted content', data.restricted],
    ['Banned accounts', data.banned],
    ['Payments to confirm', data.pendingPayments],
  ] : []
  return (
    <Shell crumb="Admin">
      <p className="text-xs tracking-[0.16em] text-ink/50">ADMIN DASHBOARD</p>
      <h1 className="mt-2 font-display text-4xl">Platform overview</h1>
      <p className="mt-2 max-w-2xl text-ink/70">Approve organization accounts, then confirm paid subscriptions. Internships and events go live within the plan the organization chose.</p>
      {query.isLoading && <p className="mt-6">Loading…</p>}
      {query.error && <p className="mt-6 text-sm text-red-700">{query.error.message}</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-sm text-ink/60">{label}</p>
            <p className="mt-2 font-display text-3xl">{value}</p>
          </article>
        ))}
      </div>
    </Shell>
  )
}

export function AdminOrganizations() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-orgs'], queryFn: () => api('/admin/organizations') })
  const review = useMutation({
    mutationFn: ({ id, status }) => api(`/admin/organizations/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['admin-orgs'] })
      client.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
  })
  return (
    <Shell crumb="Accounts">
      <h1 className="font-display text-4xl">Organization accounts</h1>
      <p className="mt-2 max-w-2xl text-ink/70">Approve or reject the account. This does not review each opportunity.</p>
      <ul className="mt-6 space-y-3">
        {(query.data?.items || []).map((org) => (
          <li key={org.id} className="rounded-2xl border border-line bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{org.name}</p>
                <p className="text-sm text-ink/60">{org.owner.firstName} {org.owner.lastName} · {org.owner.email}</p>
                <p className="mt-1 text-sm">
                  Account {org.verificationStatus.toLowerCase()}
                  {org.owner.status === 'banned' ? ' · account banned' : ''}
                  {org.location ? ` · ${org.location}` : ''}
                </p>
                <Link to={`/admin/activity/${org.id}`} className="mt-2 inline-block text-sm text-brand-dark">View activity</Link>
              </div>
              {org.verificationStatus === 'PENDING' && (
                <div className="flex gap-2">
                  <button className="rounded-xl bg-brand px-3 py-2 text-sm text-white" onClick={() => review.mutate({ id: org.id, status: 'APPROVED' })}>Approve</button>
                  <button className="rounded-xl border border-line px-3 py-2 text-sm" onClick={() => review.mutate({ id: org.id, status: 'REJECTED' })}>Reject</button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Shell>
  )
}

export function AdminActivity() {
  const query = useQuery({ queryKey: ['admin-orgs'], queryFn: () => api('/admin/organizations') })
  return (
    <Shell crumb="Activity">
      <h1 className="font-display text-4xl">Organization activity</h1>
      <p className="mt-2 max-w-2xl text-ink/70">Read-only. Open an organization to see its listings and applications. You do not edit or approve each listing here.</p>
      <ul className="mt-6 space-y-3">
        {(query.data?.items || []).map((org) => (
          <li key={org.id}>
            <Link to={`/admin/activity/${org.id}`} className="block rounded-2xl border border-line bg-white p-4">
              <p className="font-medium">{org.name}</p>
              <p className="text-sm text-ink/60">
                {org._count?.opportunities || 0} listings · {org.restrictedPosts || 0} restricted posts · portfolio {org.portfolioStatus?.toLowerCase()}
                {org.owner.status === 'banned' ? ' · banned' : ''}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  )
}

export function AdminActivityDetail() {
  const { id } = useParams()
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-activity', id], queryFn: () => api(`/admin/organizations/${id}/activity`) })
  const portfolio = useMutation({
    mutationFn: (status) => api(`/admin/organizations/${id}/portfolio`, { method: 'PATCH', body: { status } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-activity', id] }),
  })
  const banContent = useMutation({
    mutationFn: (listingId) => api(`/admin/opportunities/${listingId}/ban`, { method: 'POST' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-activity', id] }),
  })
  const banAccount = useMutation({
    mutationFn: () => api(`/admin/organizations/${id}/ban`, { method: 'POST' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-activity', id] }),
  })
  const data = query.data
  const org = data?.organization
  return (
    <Shell crumb="Activity">
      <Link to="/admin/activity" className="text-sm text-ink/60">Back to activity</Link>
      {query.isLoading && <p className="mt-6">Loading…</p>}
      {org && (
        <>
          <h1 className="mt-3 font-display text-4xl">{org.name}</h1>
          <p className="mt-2 text-sm text-ink/60">{org.owner.firstName} {org.owner.lastName} · {org.owner.email}</p>
          <p className="mt-2 max-w-2xl text-ink/70">Read only. Account {org.verificationStatus.toLowerCase()}. Portfolio {org.portfolioStatus.toLowerCase()}. Restricted posts {org.restrictedPosts}.</p>
          {org.description && <p className="mt-3 max-w-2xl rounded-2xl bg-white p-4 text-sm">{org.description}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-xl bg-brand px-3 py-2 text-sm text-white" onClick={() => portfolio.mutate('APPROVED')}>Approve portfolio</button>
            <button className="rounded-xl border border-line px-3 py-2 text-sm" onClick={() => portfolio.mutate('DECLINED')}>Decline portfolio</button>
            {org.owner.status !== 'banned' && (
              <button className="rounded-xl border border-line px-3 py-2 text-sm text-red-700" onClick={() => banAccount.mutate()}>Ban account</button>
            )}
          </div>
          <ul className="mt-6 space-y-3">
            {data.listings.map((item) => (
              <li key={item.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-ink/60">
                      {item.type} · {item.status.toLowerCase()} · {item.contentClass === 'RESTRICTED' ? 'community restricted' : 'tech'} · {item.applications} applications · {item.viewCount} views · closes {formatDate(item.closesAt)}
                    </p>
                  </div>
                  {item.status !== 'REMOVED' && item.contentClass === 'RESTRICTED' && (
                    <button className="rounded-xl border border-line px-3 py-2 text-sm" disabled={banContent.isPending} onClick={() => banContent.mutate(item.id)}>Ban content</button>
                  )}
                </div>
              </li>
            ))}
            {data.listings.length === 0 && <li className="text-ink/60">No listings yet.</li>}
          </ul>
        </>
      )}
    </Shell>
  )
}

export function AdminContent() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-content'], queryFn: () => api('/admin/content') })
  const ban = useMutation({
    mutationFn: (id) => api(`/admin/opportunities/${id}/ban`, { method: 'POST' }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['admin-content'] })
      client.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
  })
  return (
    <Shell crumb="Restricted content">
      <h1 className="font-display text-4xl">Community-restricted content</h1>
      <p className="mt-2 max-w-2xl text-ink/70">These listings are not tech-related, so they are not public. Ban the content. If an organization keeps posting them, ban the account from its activity page. Three restricted posts ban the account automatically.</p>
      <ul className="mt-6 space-y-3">
        {(query.data?.items || []).map((item) => (
          <li key={item.id} className="rounded-2xl border border-line bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-ink/60">{item.organization.name} · {item.organization.restrictedPosts} restricted posts</p>
                <p className="mt-2 max-w-2xl text-sm text-ink/80">{item.description}</p>
              </div>
              <button className="rounded-xl bg-brand px-3 py-2 text-sm text-white" disabled={ban.isPending} onClick={() => ban.mutate(item.id)}>Ban content</button>
            </div>
          </li>
        ))}
        {!query.isLoading && (query.data?.items || []).length === 0 && <li className="text-ink/60">No restricted listings are waiting.</li>}
      </ul>
    </Shell>
  )
}

export function AdminPayments() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-payments'], queryFn: () => api('/admin/payments') })
  const review = useMutation({
    mutationFn: ({ id, status }) => api(`/admin/payments/${id}/review`, { method: 'POST', body: { status } }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['admin-payments'] })
      client.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
  })
  return (
    <Shell crumb="Payments">
      <h1 className="font-display text-4xl">Subscription payments</h1>
      <p className="mt-2 max-w-2xl text-ink/70">Confirm a bank transfer or Telebirr reference to activate Basic or Premium. Reject it if the payment does not match.</p>
      {review.error && <p className="mt-4 text-sm text-red-700">{review.error.message}</p>}
      <ul className="mt-6 space-y-3">
        {(query.data?.items || []).map((item) => (
          <li key={item.id} className="rounded-2xl border border-line bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.org.name}</p>
                <p className="text-sm text-ink/60">{item.plan} · {item.billingPeriod.toLowerCase()} · {item.amount} {item.currency}</p>
                <p className="text-sm text-ink/60">{item.method} · {item.payerName} · {item.reference}</p>
                <p className="mt-1 text-sm">Payment {item.status.toLowerCase()} · submitted {formatDate(item.createdAt)}</p>
              </div>
              {item.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button className="rounded-xl bg-brand px-3 py-2 text-sm text-white" disabled={review.isPending} onClick={() => review.mutate({ id: item.id, status: 'VERIFIED' })}>Confirm payment</button>
                  <button className="rounded-xl border border-line px-3 py-2 text-sm" disabled={review.isPending} onClick={() => review.mutate({ id: item.id, status: 'REJECTED' })}>Reject</button>
                </div>
              )}
            </div>
          </li>
        ))}
        {!query.isLoading && (query.data?.items || []).length === 0 && <li className="text-ink/60">No subscription payments yet.</li>}
      </ul>
    </Shell>
  )
}
