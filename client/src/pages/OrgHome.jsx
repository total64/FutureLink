import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Shell from '../components/Shell'
import { api } from '../lib/api'
import { decisionLabel, formatDate, statusLabel } from '../lib/format'

export function OrgOverview() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['org-dashboard'], queryFn: () => api('/org/dashboard') })
  const publish = useMutation({
    mutationFn: (id) => api(`/org/opportunities/${id}/publish`, { method: 'POST' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['org-dashboard'] }),
  })
  const data = query.data
  if (query.isLoading) return <Shell crumb="Overview"><p>Loading…</p></Shell>
  if (query.error) return <Shell crumb="Overview"><p className="text-red-700">{query.error.message}</p></Shell>
  const stats = [
    ['Active opportunities', data.stats.activeOpportunities],
    ['Total applications', data.stats.totalApplications],
    ['Opportunity views', data.stats.views],
    ['Drafts', data.stats.drafts],
  ]
  return (
    <Shell crumb="Overview">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-emerald-800">
            {data.organization.verificationStatus === 'APPROVED' ? 'Verified organization' : `Verification: ${data.organization.verificationStatus.toLowerCase()}`}
          </p>
          <h1 className="mt-2 font-display text-4xl">Make room for your next great hire.</h1>
          <p className="mt-2 text-ink/70">Here’s what’s happening across your opportunities at {data.organization.name}.</p>
        </div>
        <Link to="/org/publish" className="rounded-xl bg-brand px-4 py-3 text-white">Create opportunity</Link>
      </div>
      {data.organization.restrictedPosts > 0 && data.organization.owner?.status !== 'banned' && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Community-restricted posts: {data.organization.restrictedPosts} of 3. Only tech-related listings can be published. A third restricted post bans the account.
        </p>
      )}
      {data.organization.verificationStatus !== 'APPROVED' && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Public publishing stays locked until an admin verifies {data.organization.name}. You can still save drafts.
        </p>
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-sm text-ink/60">{label}</p>
            <p className="mt-2 font-display text-3xl">{value}</p>
          </article>
        ))}
      </div>
      <section className="mt-6 overflow-x-auto rounded-3xl border border-line bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-medium">Your opportunities</h2>
          <Link to="/org/opportunities" className="text-sm">View all</Link>
        </div>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-ink/50">
            <tr><th className="px-4 py-2 font-medium">Opportunity</th><th className="px-4 py-2 font-medium">Category</th><th className="px-4 py-2 font-medium">Deadline</th><th className="px-4 py-2 font-medium">Applications</th><th className="px-4 py-2 font-medium">Views</th><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2 font-medium"></th></tr>
          </thead>
          <tbody>
            {data.opportunities.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{item.title}</td>
                <td className="px-4 py-3">{item.category}</td>
                <td className="px-4 py-3">{formatDate(item.closesAt)}</td>
                <td className="px-4 py-3">{item.applyClicks}</td>
                <td className="px-4 py-3">{item.viewCount}</td>
                <td className="px-4 py-3">{statusLabel(item.listingStatus)}</td>
                <td className="px-4 py-3">
                  {data.organization.verificationStatus === 'APPROVED' && item.status === 'DRAFT' && (
                    <button className="rounded-xl bg-brand px-3 py-1.5 text-white" disabled={publish.isPending} onClick={() => publish.mutate(item.id)}>Publish</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Shell>
  )
}

export function OrgOpportunities() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['org-dashboard'], queryFn: () => api('/org/dashboard') })
  const publish = useMutation({
    mutationFn: (id) => api(`/org/opportunities/${id}/publish`, { method: 'POST' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['org-dashboard'] }),
  })
  const verified = query.data?.organization?.verificationStatus === 'APPROVED'
  return (
    <Shell crumb="Opportunities">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Opportunities</h1>
        <Link to="/org/publish" className="rounded-xl bg-brand px-4 py-2 text-white">Create opportunity</Link>
      </div>
      {publish.error && <p className="mt-4 text-sm text-red-700">{publish.error.message}</p>}
      <ul className="mt-6 space-y-3">
        {(query.data?.opportunities || []).map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-ink/60">{item.category} · {statusLabel(item.listingStatus)} · Closes {formatDate(item.closesAt)} · {item.viewCount} views</p>
            </div>
            {verified && item.status === 'DRAFT' && (
              <button
                className="rounded-xl bg-brand px-4 py-2 text-sm text-white"
                disabled={publish.isPending}
                onClick={() => publish.mutate(item.id)}
              >
                Publish
              </button>
            )}
          </li>
        ))}
      </ul>
    </Shell>
  )
}

export function OrgApplications() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['org-applications'], queryFn: () => api('/org/applications') })
  const review = useMutation({
    mutationFn: ({ id, status }) => api(`/org/applications/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['org-applications'] }),
  })
  return (
    <Shell crumb="Applications">
      <h1 className="font-display text-4xl">Applications</h1>
      <p className="mt-2 text-ink/70">Accept or reject each applicant. They see that decision on their applications page.</p>
      {review.error && <p className="mt-4 text-sm text-red-700">{review.error.message}</p>}
      <ul className="mt-6 space-y-3">
        {(query.data?.items || []).map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
            <div>
              <p className="font-medium">{item.applicant.firstName} {item.applicant.lastName}</p>
              <p className="text-sm text-ink/60">{item.applicant.email}</p>
              <p className="text-sm text-ink/60">{item.opportunity.title} · Applied {formatDate(item.createdAt)}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {(item.form || []).map((field) => (
                  <li key={field.id}><span className="text-ink/50">{field.label}: </span>{item.answers?.[field.id] || '—'}</li>
                ))}
              </ul>
            </div>
            {item.status === 'PENDING' ? (
              <div className="flex gap-2">
                <button className="rounded-xl bg-brand px-4 py-2 text-sm text-white" disabled={review.isPending} onClick={() => review.mutate({ id: item.id, status: 'ACCEPTED' })}>Accept</button>
                <button className="rounded-xl border border-line px-4 py-2 text-sm" disabled={review.isPending} onClick={() => review.mutate({ id: item.id, status: 'REJECTED' })}>Reject</button>
              </div>
            ) : (
              <p className={`text-sm font-medium ${item.status === 'ACCEPTED' ? 'text-brand-dark' : 'text-ink/60'}`}>{decisionLabel(item.status)}</p>
            )}
          </li>
        ))}
        {!query.isLoading && (query.data?.items || []).length === 0 && <li className="text-ink/60">No applications yet.</li>}
      </ul>
    </Shell>
  )
}

export function OrgTalent() {
  const query = useQuery({ queryKey: ['org-talent'], queryFn: () => api('/org/talent') })
  return (
    <Shell crumb="Talent discovery">
      <h1 className="font-display text-4xl">Talent discovery</h1>
      <p className="mt-2 max-w-2xl text-ink/70">Only seekers who turn on talent discovery appear here. You see a limited summary, never a private portfolio.</p>
      {query.data?.locked && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm">Verification is required before you can view opted-in profiles.</p>}
      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {(query.data?.items || []).map((person) => (
          <li key={person.id} className="rounded-2xl border border-line bg-white p-4">
            <p className="font-medium">{person.name}</p>
            <p className="text-sm text-ink/60">{person.educationLevel} · {person.fieldOfStudy} · {person.university}</p>
            <p className="mt-2 text-sm">{person.skills.join(', ')}</p>
          </li>
        ))}
      </ul>
      {query.data && !query.data.locked && query.data.items.length === 0 && <p className="mt-6 text-ink/60">No seekers have opted in yet.</p>}
    </Shell>
  )
}
