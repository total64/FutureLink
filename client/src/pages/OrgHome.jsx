import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import Shell from '../components/Shell'
import PortfolioView from '../components/PortfolioView'
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
  const org = data.organization
  const sub = org.subscription
  const internships = data.opportunities.filter((item) => item.type === 'INTERNSHIP')
  const events = data.opportunities.filter((item) => item.type === 'EVENT')
  const stats = [
    ['Live internships', internships.filter((item) => item.status === 'PUBLISHED').length],
    ['Live events', events.filter((item) => item.status === 'PUBLISHED').length],
    ['Applications', data.stats.totalApplications],
    ['Views', data.stats.views],
  ]
  return (
    <Shell crumb="Overview">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-emerald-800">
            {org.verificationStatus === 'APPROVED' ? 'Approved organization' : `Account ${org.verificationStatus.toLowerCase()}`}
            {sub?.active ? ` · ${sub.plan} plan` : ''}
          </p>
          <h1 className="mt-2 font-display text-4xl">{org.name}</h1>
          <p className="mt-2 text-ink/70">Internships and events for this organization. Other categories will be added later.</p>
        </div>
        <Link to="/org/publish" className="rounded-xl bg-brand px-4 py-3 text-white">Create opportunity</Link>
      </div>
      {!org.profileSubmitted && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Finish the organization profile and submit it. An admin approves the account before you can choose a plan. <Link to="/org/profile" className="font-medium">Open profile</Link>
        </p>
      )}
      {org.profileSubmitted && org.verificationStatus === 'PENDING' && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">Waiting for an admin to approve this organization.</p>
      )}
      {org.verificationStatus === 'REJECTED' && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          The account was rejected{org.reviewReason ? `: ${org.reviewReason}` : ''}. Update the profile and submit it again.
        </p>
      )}
      {org.verificationStatus === 'APPROVED' && !sub?.active && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          The account is approved. Choose Free, Basic, or Premium before publishing. <Link to="/org/plans" className="font-medium">View plans</Link>
        </p>
      )}
      {sub?.renewSoon && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          This plan ends {formatDate(sub.endsAt)}. <Link to="/org/plans" className="font-medium">Renew or upgrade</Link>
        </p>
      )}
      {sub?.status === 'EXPIRED' && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">The subscription has expired. Renew it to publish again.</p>
      )}
      {org.restrictedPosts > 0 && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Community-restricted posts: {org.restrictedPosts} of 3. Only tech-related listings can be published.
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
          <h2 className="font-medium">Internships and events</h2>
          <Link to="/org/opportunities?type=INTERNSHIP" className="text-sm">View internships</Link>
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
                  {org.verificationStatus === 'APPROVED' && sub?.active && item.status === 'DRAFT' && (
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
  const [params] = useSearchParams()
  const type = params.get('type') === 'EVENT' ? 'EVENT' : 'INTERNSHIP'
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['org-dashboard'], queryFn: () => api('/org/dashboard') })
  const publish = useMutation({
    mutationFn: (id) => api(`/org/opportunities/${id}/publish`, { method: 'POST' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['org-dashboard'] }),
  })
  const org = query.data?.organization
  const canPublish = org?.verificationStatus === 'APPROVED' && org?.subscription?.active
  const items = (query.data?.opportunities || []).filter((item) => item.type === type)
  return (
    <Shell crumb={type === 'EVENT' ? 'Events' : 'Internships'}>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-4xl">{type === 'EVENT' ? 'Events' : 'Internships'}</h1>
        <Link to={`/org/publish?type=${type}`} className="rounded-xl bg-brand px-4 py-2 text-white">Create {type === 'EVENT' ? 'event' : 'internship'}</Link>
      </div>
      {publish.error && <p className="mt-4 text-sm text-red-700">{publish.error.message}</p>}
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-ink/60">{item.category} · {statusLabel(item.listingStatus)} · Closes {formatDate(item.closesAt)} · {item.viewCount} views</p>
            </div>
            {canPublish && item.status === 'DRAFT' && (
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
        {!query.isLoading && items.length === 0 && <li className="text-ink/60">No {type === 'EVENT' ? 'events' : 'internships'} yet.</li>}
      </ul>
    </Shell>
  )
}

export function OrgApplications() {
  const client = useQueryClient()
  const [openId, setOpenId] = useState(null)
  const query = useQuery({ queryKey: ['org-applications'], queryFn: () => api('/org/applications') })
  const portfolio = useQuery({
    queryKey: ['org-application', openId],
    queryFn: () => api(`/org/applications/${openId}`),
    enabled: Boolean(openId),
  })
  const review = useMutation({
    mutationFn: ({ id, status }) => api(`/org/applications/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['org-applications'] })
      client.invalidateQueries({ queryKey: ['org-application', openId] })
    },
  })
  return (
    <Shell crumb="Applications">
      <h1 className="font-display text-4xl">Applications</h1>
      <p className="mt-2 text-ink/70">Open the applicant’s portfolio, then accept them if it fits or reject them if it does not.</p>
      {review.error && <p className="mt-4 text-sm text-red-700">{review.error.message}</p>}
      <ul className="mt-6 space-y-3">
        {(query.data?.items || []).map((item) => (
          <li key={item.id} className="rounded-2xl border border-line bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{item.applicant.firstName} {item.applicant.lastName}</p>
                <p className="text-sm text-ink/60">{item.applicant.email}</p>
                <p className="text-sm text-ink/60">{item.opportunity.title} · Applied {formatDate(item.createdAt)}</p>
                {item.gaps?.length > 0 && <p className="mt-1 text-sm text-ink/60">Portfolio does not yet show: {item.gaps.join(', ')}.</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-xl border border-line px-4 py-2 text-sm" onClick={() => setOpenId(openId === item.id ? null : item.id)}>
                  {openId === item.id ? 'Hide portfolio' : 'View portfolio'}
                </button>
                {item.status === 'PENDING' ? (
                  <>
                    <button className="rounded-xl bg-brand px-4 py-2 text-sm text-white" disabled={review.isPending} onClick={() => review.mutate({ id: item.id, status: 'ACCEPTED' })}>Accept</button>
                    <button className="rounded-xl border border-line px-4 py-2 text-sm" disabled={review.isPending} onClick={() => review.mutate({ id: item.id, status: 'REJECTED' })}>Reject</button>
                  </>
                ) : (
                  <p className={`self-center text-sm font-medium ${item.status === 'ACCEPTED' ? 'text-brand-dark' : 'text-ink/60'}`}>{decisionLabel(item.status)}</p>
                )}
              </div>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {(item.form || []).map((field) => (
                <li key={field.id}><span className="text-ink/50">{field.label}: </span>{item.answers?.[field.id] || '—'}</li>
              ))}
            </ul>
            {openId === item.id && (
              <div className="mt-4">
                {portfolio.isLoading && <p className="text-sm">Loading portfolio…</p>}
                {portfolio.error && <p className="text-sm text-red-700">{portfolio.error.message}</p>}
                {portfolio.data && !portfolio.data.portfolio && <p className="text-sm text-ink/60">This applicant has not built a portfolio yet.</p>}
                {portfolio.data?.portfolio && (
                  <PortfolioView
                    profile={portfolio.data.portfolio}
                    name={`${portfolio.data.applicant.firstName} ${portfolio.data.applicant.lastName}`}
                    email={portfolio.data.applicant.email}
                  />
                )}
              </div>
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
