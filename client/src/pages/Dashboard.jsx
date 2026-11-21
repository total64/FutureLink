import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Shell from '../components/Shell'
import { useAuth } from '../auth'
import { api } from '../lib/api'
import { PAY_LABEL, WORK_LABEL, formatDate } from '../lib/format'

export default function Dashboard() {
  const { user } = useAuth()
  const recommendations = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => api('/opportunities/recommendations'),
  })
  const saved = useQuery({ queryKey: ['saved'], queryFn: () => api('/saved') })
  const items = recommendations.data?.items || []
  const internships = items.filter((item) => item.type === 'INTERNSHIP').length
  const events = items.filter((item) => item.type !== 'INTERNSHIP' && item.type !== 'SCHOLARSHIP').length
  const savedCount = saved.data?.items?.length || 0

  return (
    <Shell crumb="Overview">
      <p className="text-xs font-semibold tracking-[0.16em] text-brand">YOUR PERSONAL LAUNCHPAD</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Good to see you, {user?.firstName}.</h1>
      <p className="mt-2 text-ink/65">A new day. A few more doors to open.</p>

      <section className="mt-6 rounded-3xl bg-mint p-6 md:p-8">
        <p className="text-xs font-semibold tracking-[0.14em] text-brand">MADE FOR YOUR NEXT MOVE</p>
        <h2 className="mt-2 max-w-lg font-display text-3xl font-semibold">Big ambitions. Right opportunities.</h2>
        <p className="mt-2 max-w-xl text-ink/70">Discover internships and tech events that grow with you. A match is interest, not confirmed eligibility.</p>
        <Link to="/discover" className="mt-5 inline-flex rounded-full bg-brand px-5 py-2.5 font-medium text-white">See my matches</Link>
      </section>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          [internships || '—', 'Internship matches', 'Based on your profile'],
          [events || '—', 'Events for you', 'Learn. Connect. Build.'],
          [saved.isLoading ? '—' : savedCount, 'Saved opportunities', 'Ready when you are'],
        ].map(([value, label, copy]) => (
          <article key={label} className="rounded-2xl border border-line bg-white p-4">
            <p className="font-display text-3xl font-semibold">{value}</p>
            <p className="mt-1 font-medium">{label}</p>
            <p className="text-sm text-ink/55">{copy}</p>
          </article>
        ))}
      </div>

      <div className="mt-8 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">Recommended for you</h2>
          <p className="text-sm text-ink/60">Matched to your skills, interests and career goals.</p>
        </div>
        <Link to="/discover" className="text-sm font-medium text-brand">View all</Link>
      </div>
      {recommendations.isLoading && <p className="mt-4 text-sm text-ink/60">Loading recommendations…</p>}
      {recommendations.error && <p className="mt-4 text-sm text-red-700">{recommendations.error.message}</p>}
      <ul className="mt-4 space-y-3">
        {items.slice(0, 5).map((item) => (
          <li key={item.id}>
            <Link to={`/opportunities/${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.12em] text-brand">{item.type}</p>
                <p className="mt-1 font-semibold">{item.title}</p>
                <p className="text-sm text-ink/60">{item.organization?.name} · {item.location} · {WORK_LABEL[item.workMode]} · {PAY_LABEL[item.compensation]} · Closes {formatDate(item.closesAt)}</p>
                {item.explanation && <p className="mt-1 text-sm text-ink/70">{item.explanation}</p>}
              </div>
              {item.matchScore != null && (
                <span className="rounded-full bg-match px-3 py-1 text-sm font-medium text-brand-dark">{item.matchScore}% match</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  )
}
