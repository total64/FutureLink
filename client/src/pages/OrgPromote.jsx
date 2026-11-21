import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Shell from '../components/Shell'
import { api } from '../lib/api'

export default function OrgPromote() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['org-campaigns'], queryFn: () => api('/org/campaigns') })
  const analytics = useQuery({
    queryKey: ['org-analytics'],
    queryFn: () => api('/org/analytics'),
    retry: false,
  })
  const [form, setForm] = useState({ title: '', message: '', audience: '' })
  const create = useMutation({
    mutationFn: () => api('/org/campaigns', { method: 'POST', body: form }),
    onSuccess: () => {
      setForm({ title: '', message: '', audience: '' })
      client.invalidateQueries({ queryKey: ['org-campaigns'] })
      client.invalidateQueries({ queryKey: ['org-analytics'] })
    },
  })
  const org = query.data?.organization
  const plan = org?.subscription?.plan
  const premium = plan === 'PREMIUM' && org?.subscription?.active
  const paid = ['BASIC', 'PREMIUM'].includes(plan) && org?.subscription?.active

  return (
    <Shell crumb="Promote">
      <h1 className="font-display text-4xl">Promote</h1>
      <p className="mt-2 max-w-2xl text-ink/70">Basic includes one campaign and event promotion. Premium adds audience targeting, featured listings, and a breakdown of who applied.</p>
      {!paid && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Campaigns are locked on the Free plan. <Link to="/org/plans" className="font-medium">View plans</Link>
        </p>
      )}
      <form
        className="mt-6 max-w-xl rounded-3xl border border-line bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault()
          create.mutate()
        }}
      >
        <label className="block"><span className="label">Campaign title</span><input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label className="mt-3 block"><span className="label">Message</span><textarea className="field min-h-24" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>
        {premium && (
          <label className="mt-3 block"><span className="label">Audience</span><input className="field" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="Computer science students in Addis Ababa" /></label>
        )}
        {create.error && <p className="mt-3 text-sm text-red-700">{create.error.message}</p>}
        <button className="mt-4 rounded-xl bg-brand px-4 py-2 text-white disabled:opacity-40" disabled={!paid || create.isPending}>Start campaign</button>
      </form>
      <ul className="mt-6 space-y-3">
        {(query.data?.items || []).map((item) => (
          <li key={item.id} className="rounded-2xl border border-line bg-white p-4">
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-ink/60">{item.kind} · {item.status}</p>
            <p className="mt-2 text-sm">{item.message}</p>
            {item.audience && <p className="mt-1 text-sm text-ink/60">Audience: {item.audience}</p>}
          </li>
        ))}
      </ul>
      {analytics.data && (
        <section className="mt-8">
          <h2 className="font-display text-2xl">{analytics.data.plan === 'PREMIUM' ? 'Detailed analytics' : 'Basic analytics'}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {Object.entries(analytics.data.totals).map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-line bg-white p-4">
                <p className="text-sm capitalize text-ink/60">{label}</p>
                <p className="mt-2 font-display text-3xl">{value}</p>
              </article>
            ))}
          </div>
          {analytics.data.audience && (
            <ul className="mt-4 space-y-2 text-sm">
              {Object.entries(analytics.data.audience).map(([field, count]) => (
                <li key={field} className="rounded-xl bg-white px-4 py-2">{field}: {count} applicant{count === 1 ? '' : 's'}</li>
              ))}
            </ul>
          )}
        </section>
      )}
    </Shell>
  )
}
