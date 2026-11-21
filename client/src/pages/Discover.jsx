import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Shell from '../components/Shell'
import OpportunityCard from '../components/OpportunityCard'
import { useAuth } from '../auth'
import { api } from '../lib/api'
import { TYPE_LABEL } from '../lib/format'

const tabs = [{ id: '', label: 'All opportunities' }, ...Object.entries(TYPE_LABEL).map(([id, label]) => ({ id, label }))]

export default function Discover() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [type, setType] = useState(searchParams.get('type') || (user ? 'FOR_YOU' : ''))
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState('')
  const [location, setLocation] = useState('')
  const [workMode, setWorkMode] = useState('')
  const [deadline, setDeadline] = useState('any')
  const [audience, setAudience] = useState('')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    const fromUrl = searchParams.get('type')
    if (fromUrl) {
      setType(fromUrl)
      return
    }
    if (user) {
      setType('FOR_YOU')
      setSort('match')
    }
  }, [user?.id, searchParams])

  const params = useMemo(() => {
    const search = new URLSearchParams()
    if (q) search.set('q', q)
    if (type && type !== 'FOR_YOU') search.set('type', type)
    if (location) search.set('location', location)
    if (workMode) search.set('workMode', workMode)
    if (deadline !== 'any') search.set('deadline', deadline)
    if (audience) search.set('audience', audience)
    search.set('sort', sort)
    search.set('limit', '24')
    return search.toString()
  }, [q, type, location, workMode, deadline, audience, sort])

  const list = useQuery({
    queryKey: ['opportunities', params],
    queryFn: () => api(`/opportunities?${params}`),
    enabled: type !== 'FOR_YOU',
  })
  const recommended = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => api('/opportunities/recommendations'),
    enabled: type === 'FOR_YOU' && Boolean(user),
  })

  const items = type === 'FOR_YOU' ? recommended.data?.items || [] : list.data?.items || []
  const loading = type === 'FOR_YOU' ? recommended.isLoading : list.isLoading
  const error = type === 'FOR_YOU' ? recommended.error : list.error

  return (
    <Shell crumb="Discover">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">A little ambition goes a long way.</h1>
          <p className="mt-2 text-ink/70">
            Find the opportunity that moves you forward{user ? `, ${user.firstName}` : ''}.
          </p>
        </div>
      </div>

      <section className="mt-6 grid gap-4 rounded-3xl bg-brand p-5 text-white md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-xs tracking-[0.16em] text-white/60">YOUR NEXT MOVE</p>
          <h2 className="mt-2 font-display text-3xl">Your skills. New possibilities.</h2>
          <p className="mt-2 text-sm text-white/75">
            {loading ? 'Looking through open listings.' : `${items.length} open ${type === 'FOR_YOU' ? 'recommendations' : 'listings'} in this view.`}
            A match is interest, not confirmed eligibility.
          </p>
        </div>
        {!user && (
          <Link to="/register" className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-ink">Create a free account</Link>
        )}
      </section>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {user && (
          <button onClick={() => { setType('FOR_YOU'); setSort('match') }} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${type === 'FOR_YOU' ? 'bg-brand text-white' : 'bg-white'}`}>
            For you
          </button>
        )}
        {tabs.map((tab) => (
          <button key={tab.label} onClick={() => setType(tab.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${type === tab.id ? 'bg-brand text-white' : 'bg-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          setQ(draft)
          if (type === 'FOR_YOU') setType('')
        }}
      >
        <input className="field" placeholder="Search by role, organization, skill or keyword" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className="rounded-xl bg-brand px-5 text-white">Search</button>
      </form>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-2xl border border-line bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium">Filters</p>
            <button className="text-sm text-ink/60" onClick={() => { setLocation(''); setWorkMode(''); setDeadline('any'); setAudience('') }}>Reset</button>
          </div>
          <label className="label">Location</label>
          <input className="field" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ethiopia" />
          <p className="label mt-4">Work arrangement</p>
          {['', 'REMOTE', 'ONSITE', 'HYBRID'].map((mode) => (
            <label key={mode || 'any'} className="mt-1 flex items-center gap-2 text-sm">
              <input type="radio" checked={workMode === mode} onChange={() => setWorkMode(mode)} />
              {mode === '' ? 'Any' : mode === 'ONSITE' ? 'On-site' : mode[0] + mode.slice(1).toLowerCase()}
            </label>
          ))}
          <label className="label mt-4">Deadline</label>
          <select className="field" value={deadline} onChange={(e) => setDeadline(e.target.value)}>
            <option value="any">Any time</option>
            <option value="week">Next 7 days</option>
            <option value="month">Next 30 days</option>
          </select>
          <label className="label mt-4">Eligibility</label>
          <select className="field" value={audience} onChange={(e) => setAudience(e.target.value)}>
            <option value="">All levels</option>
            <option value="Undergraduate">Undergraduate</option>
            <option value="Graduate">Graduate</option>
            <option value="Any">Any</option>
          </select>
        </aside>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-ink/60">{loading ? 'Loading…' : `${items.length} shown`}</p>
            <select className="rounded-xl border border-line bg-white px-3 py-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="match">Best match</option>
              <option value="newest">Newest</option>
              <option value="closing">Closing soon</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-700">{error.message}</p>}
          {!loading && items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-ink/70">
              Nothing matches these filters. Widen the search, or build your profile so recommendations have more to work with.
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => <OpportunityCard key={item.id} item={item} />)}
          </div>
        </section>
      </div>
    </Shell>
  )
}
