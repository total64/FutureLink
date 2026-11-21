import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Shell from '../components/Shell'
import { api } from '../lib/api'
import { decisionLabel, formatDate } from '../lib/format'

const statuses = ['SAVED', 'APPLIED', 'INTERVIEWING', 'ACCEPTED', 'REJECTED']

export default function Saved({ mode = 'saved' }) {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['saved'], queryFn: () => api('/saved') })
  const update = useMutation({
    mutationFn: ({ id, trackingStatus }) => api(`/saved/${id}`, { method: 'PATCH', body: { trackingStatus } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['saved'] }),
  })
  const remove = useMutation({
    mutationFn: (id) => api(`/saved/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['saved'] }),
  })

  const items = (query.data?.items || []).filter((item) => (
    mode === 'applications' ? item.trackingStatus !== 'SAVED' : true
  ))

  return (
    <Shell crumb={mode === 'applications' ? 'My applications' : 'Saved opportunities'}>
      <h1 className="font-display text-4xl">{mode === 'applications' ? 'Applications you’ve started' : 'Saved opportunities'}</h1>
      <p className="mt-2 text-ink/70">
        {mode === 'applications'
          ? 'The organization accepts or rejects your application. That decision appears here.'
          : 'Keep interesting listings close, then mark where each one stands.'}
      </p>
      {query.isLoading && <p className="mt-6">Loading…</p>}
      {!query.isLoading && items.length === 0 && (
        <div className="mt-6 rounded-3xl border border-dashed border-line bg-white p-8">
          Nothing here yet. <Link to="/discover" className="underline">Discover opportunities</Link>
        </div>
      )}
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
            <div>
              <Link to={`/opportunities/${item.opportunity.id}`} className="font-medium">{item.opportunity.title}</Link>
              <p className="text-sm text-ink/60">{item.opportunity.organization?.name} · Closes {formatDate(item.opportunity.closesAt)}</p>
              {item.reminder && (
                <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm ${item.reminder.level === 'passed' ? 'bg-paper text-ink/70' : item.reminder.level === 'upcoming' ? 'bg-paper text-ink/70' : 'bg-amber-50 text-amber-950'}`}>
                  {item.reminder.label}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {mode === 'applications' ? (
                <span className={`rounded-full px-3 py-1 text-sm ${item.decision === 'ACCEPTED' ? 'bg-mint text-brand-dark' : item.decision === 'REJECTED' ? 'bg-paper text-ink/70' : 'bg-white text-ink/70'}`}>
                  {decisionLabel(item.decision || item.trackingStatus)}
                </span>
              ) : (
                <select
                  className="rounded-xl border border-line px-3 py-2 text-sm"
                  value={item.decision === 'ACCEPTED' || item.decision === 'REJECTED' ? item.decision : item.trackingStatus}
                  disabled={item.decision === 'ACCEPTED' || item.decision === 'REJECTED'}
                  onChange={(event) => update.mutate({ id: item.id, trackingStatus: event.target.value })}
                >
                  {statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              )}
              <button className="text-sm text-ink/60" onClick={() => remove.mutate(item.id)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </Shell>
  )
}
