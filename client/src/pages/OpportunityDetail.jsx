import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Shell from '../components/Shell'
import SpotMap from '../components/SpotMap'
import { useAuth } from '../auth'
import { api } from '../lib/api'
import { PAY_LABEL, TYPE_BADGE, WORK_LABEL, formatDate } from '../lib/format'

export default function OpportunityDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => api(`/opportunities/${id}`),
  })
  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: () => api('/profile'),
    enabled: user?.role === 'SEEKER',
  })

  const [answers, setAnswers] = useState({})
  const [confirming, setConfirming] = useState(false)
  const [formError, setFormError] = useState('')
  const save = useMutation({
    mutationFn: () => api('/saved', { method: 'POST', body: { opportunityId: id } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['opportunity', id] }),
  })
  const apply = useMutation({
    mutationFn: () => api(`/opportunities/${id}/apply`, { method: 'POST', body: { answers } }),
    onSuccess: () => {
      setConfirming(false)
      client.invalidateQueries({ queryKey: ['opportunity', id] })
      client.invalidateQueries({ queryKey: ['saved'] })
    },
  })

  const item = query.data
  if (query.isLoading) return <Shell crumb="Opportunity details"><p>Loading…</p></Shell>
  if (query.error) return <Shell crumb="Opportunity details"><p className="text-red-700">{query.error.message}</p></Shell>

  const lines = (value) => String(value || '').split('\n').filter(Boolean)
  const event = item.type === 'EVENT'
  const portfolioSkills = profile.data?.skills || []
  const gaps = !event && portfolioSkills.length
    ? (item.requiredSkills || []).filter((skill) => !portfolioSkills.some((known) => known.toLowerCase() === skill.toLowerCase()))
    : []
  const attendance = { ONSITE: 'In person', REMOTE: 'Online', HYBRID: 'In person and online' }

  return (
    <Shell crumb={event ? 'Event' : 'Internship'}>
      <Link to="/discover" className="text-sm text-ink/60">← Back to discover</Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        <article className="rounded-3xl border border-line bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="rounded-full bg-paper px-2.5 py-1 text-xs">{TYPE_BADGE[item.type]}</span>
              <h1 className="mt-3 font-display text-4xl">{item.title}</h1>
              <p className="mt-2 text-ink/70">
                {item.organization?.name} {item.organization?.verified && <span className="text-emerald-800">· Verified organization</span>}
              </p>
              <p className="mt-2 text-sm text-ink/60">
                {item.location} · {event ? attendance[item.workMode] : WORK_LABEL[item.workMode]} {item.duration ? `· ${item.duration}` : ''} · {event ? (item.compensation === 'PAID' ? 'Paid ticket' : 'Free entry') : PAY_LABEL[item.compensation]}
              </p>
              {item.workMode !== 'REMOTE' && item.latitude != null && item.longitude != null && (
                <SpotMap latitude={item.latitude} longitude={item.longitude} label={item.location} />
              )}
              {event && item.startsAt && <p className="mt-2 text-sm">Starts {formatDate(item.startsAt)}</p>}
            </div>
            <button
              className="rounded-xl border border-line px-3 py-2 text-sm"
              onClick={() => {
                if (!user) return navigate('/login')
                save.mutate()
              }}
            >
              {item.saved ? 'Saved' : 'Save'}
            </button>
          </div>
          <h2 className="mt-8 font-display text-2xl">{event ? 'About this event' : 'The role'}</h2>
          <p className="mt-3 leading-7 text-ink/80">{item.description}</p>
          {lines(item.responsibilities).length > 0 && (
            <>
              <h3 className="mt-6 font-medium">{event ? 'What to expect' : 'What you’ll work on'}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink/80">
                {lines(item.responsibilities).map((line) => <li key={line}>{line}</li>)}
              </ul>
            </>
          )}
          <h3 className="mt-6 font-medium">{event ? 'Who should attend' : 'Who can apply'}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink/80">
            {lines(item.eligibility).map((line) => <li key={line}>{line}</li>)}
          </ul>
          <ApplicationForm
            item={item}
            user={user}
            answers={answers}
            setAnswers={setAnswers}
            confirming={confirming}
            setConfirming={setConfirming}
            formError={formError}
            setFormError={setFormError}
            apply={apply}
            navigate={navigate}
          />
        </article>

        <aside className="space-y-4">
          <section className="rounded-3xl bg-mint p-5">
            <p className="text-sm text-ink/70">{item.related ? 'A portfolio match' : 'Portfolio match'}</p>
            <p className="font-display text-5xl">{item.related ? item.matchScore : '—'}</p>
            <p className="text-sm">{item.related ? 'Recommended for you' : item.related === false ? 'Not related to your portfolio' : 'Sign in and build a portfolio to see your match.'}</p>
            {item.explanation && <p className="mt-3 text-sm text-ink/80">{item.explanation}</p>}
            {gaps.length > 0 && (
              <p className="mt-3 text-sm text-ink/80">Your portfolio does not yet show {gaps.join(', ')}. Add a project only if you have done that work.</p>
            )}
            {item.eligibilityChecks?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium">Eligibility is a separate check</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {item.eligibilityChecks.map((check) => (
                    <li key={check.label}>
                      {check.state === 'met' ? '✓' : check.state === 'unknown' ? '?' : '–'} {check.label}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-ink/60">A matching does not guarantee eligibility or selection.</p>
              </div>
            )}
          </section>
          <section className="rounded-3xl border border-line bg-white p-5">
            <p className="text-sm text-ink/60">{event ? 'Registration closes' : 'Applications close'}</p>
            <p className="mt-1 font-display text-2xl">{formatDate(item.closesAt)}</p>
            <p className="text-xs text-ink/50">Addis Ababa time</p>
            <p className="mt-3 text-sm text-ink/70">{event ? 'Register on this page. The form is not sent to another website.' : 'Apply on this page. The form is not sent to another website.'}</p>
          </section>
        </aside>
      </div>
    </Shell>
  )
}

function ApplicationForm({ item, user, answers, setAnswers, confirming, setConfirming, formError, setFormError, apply, navigate }) {
  const fields = item.applicationForm || []
  const submitted = ['APPLIED', 'ACCEPTED', 'REJECTED', 'INTERVIEWING'].includes(item.trackingStatus)
  if (submitted) {
    return (
      <section className="mt-8 rounded-2xl bg-mint p-4">
        <h3 className="font-medium">{item.type === 'EVENT' ? 'Registration confirmed' : 'Application confirmed'}</h3>
        <p className="mt-1 text-sm text-ink/70">
          {item.trackingStatus === 'ACCEPTED' && 'The organization accepted your application.'}
          {item.trackingStatus === 'REJECTED' && 'The organization did not accept your application.'}
          {item.trackingStatus !== 'ACCEPTED' && item.trackingStatus !== 'REJECTED' && 'The organization has your answers and will accept or reject them here.'}
        </p>
      </section>
    )
  }
  function ready() {
    const missing = fields.find((field) => field.required && !String(answers[field.id] || '').trim())
    if (missing) {
      setFormError(`Answer “${missing.label}”.`)
      return false
    }
    setFormError('')
    return true
  }
  return (
    <section className="mt-8">
      <h3 className="font-display text-2xl">{item.type === 'EVENT' ? 'Registration' : 'Application'}</h3>
      <p className="mt-1 text-sm text-ink/60">Fill the organization’s form, then confirm. Nothing leaves Future Link.</p>
      {!confirming && (
        <div className="mt-4 space-y-4">
          {fields.map((field) => (
            <label key={field.id} className="block">
              <span className="label">{field.label}{field.required ? '' : ' (optional)'}</span>
              {field.type === 'long' && (
                <textarea className="field min-h-24" value={answers[field.id] || ''} onChange={(event) => setAnswers({ ...answers, [field.id]: event.target.value })} />
              )}
              {field.type === 'short' && (
                <input className="field" value={answers[field.id] || ''} onChange={(event) => setAnswers({ ...answers, [field.id]: event.target.value })} />
              )}
              {field.type === 'choice' && (
                <select className="field" value={answers[field.id] || ''} onChange={(event) => setAnswers({ ...answers, [field.id]: event.target.value })}>
                  <option value="">Choose one</option>
                  {(field.options || []).map((option) => <option key={option}>{option}</option>)}
                </select>
              )}
            </label>
          ))}
          {formError && <p className="text-sm text-red-700">{formError}</p>}
          <button
            className="rounded-xl bg-brand px-4 py-3 text-white"
            onClick={() => {
              if (!user) return navigate('/login')
              if (user.role !== 'SEEKER') return setFormError(item.type === 'EVENT' ? 'Sign in as a student to register.' : 'Sign in as a student to apply.')
              if (ready()) setConfirming(true)
            }}
          >
            {item.type === 'EVENT' ? 'Review registration' : 'Review application'}
          </button>
        </div>
      )}
      {confirming && (
        <div className="mt-4 rounded-2xl border border-line p-4">
          <p className="text-sm font-medium">Confirm these answers</p>
          <ul className="mt-3 space-y-2 text-sm">
            {fields.map((field) => (
              <li key={field.id}>
                <span className="text-ink/60">{field.label}</span>
                <p>{answers[field.id] || '—'}</p>
              </li>
            ))}
          </ul>
          {apply.error && <p className="mt-3 text-sm text-red-700">{apply.error.message}</p>}
          <div className="mt-4 flex gap-2">
            <button className="rounded-xl border border-line px-4 py-2" onClick={() => setConfirming(false)}>Back</button>
            <button className="rounded-xl bg-brand px-4 py-3 text-white" disabled={apply.isPending} onClick={() => apply.mutate()}>
              {apply.isPending ? 'Sending…' : (item.type === 'EVENT' ? 'Confirm registration' : 'Confirm application')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
