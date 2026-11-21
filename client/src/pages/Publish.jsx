import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Shell from '../components/Shell'
import LocationPicker from '../components/LocationPicker'
import SpotMap from '../components/SpotMap'
import { api } from '../lib/api'
import { ORGANIZER_TYPES, PAY_LABEL, WORK_LABEL } from '../lib/format'

const TEMPLATES = {
  INTERNSHIP: [
    { id: 'why', label: 'Why are you applying?', type: 'long', required: true, options: '' },
    { id: 'skills', label: 'Which skills will you bring?', type: 'short', required: true, options: '' },
    { id: 'start', label: 'When can you start?', type: 'short', required: true, options: '' },
    { id: 'link', label: 'Portfolio or GitHub link', type: 'short', required: false, options: '' },
  ],
  EVENT: [
    { id: 'why', label: 'Why do you want to attend?', type: 'long', required: true, options: '' },
    { id: 'mode', label: 'How will you attend?', type: 'choice', required: true, options: 'In person, Online' },
    { id: 'school', label: 'University or organization', type: 'short', required: false, options: '' },
  ],
}

function questionsFor(type) {
  return TEMPLATES[type].map((item) => ({ ...item }))
}

const initial = {
  title: '',
  type: 'INTERNSHIP',
  category: 'Internships & Jobs',
  location: '',
  latitude: null,
  longitude: null,
  workMode: 'HYBRID',
  compensation: 'PAID',
  closesAt: '',
  startsAt: '',
  duration: '',
  description: '',
  responsibilities: '',
  eligibility: '',
  audience: 'Undergraduate',
  requiredSkills: '',
}

function blankQuestion() {
  return { id: Math.random().toString(36).slice(2, 10), label: '', type: 'short', required: true, options: '' }
}

function PlaceField({ form, setForm, placed, setPlaced, error, label }) {
  const remote = form.workMode === 'REMOTE'
  const [matches, setMatches] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchNote, setSearchNote] = useState('')

  function placePin(lat, lng, name) {
    setPlaced(true)
    setMatches([])
    setForm((current) => ({
      ...current,
      latitude: lat,
      longitude: lng,
      location: name || current.location,
    }))
  }

  async function pick(lat, lng) {
    let existing = ''
    setForm((current) => {
      existing = current.location
      return { ...current, latitude: lat, longitude: lng }
    })
    setPlaced(true)
    setMatches([])
    if (existing.trim()) {
      setSearchNote('Pin moved. The place name stays what you wrote.')
      return
    }
    try {
      const result = await api(`/opportunities/nearest?lat=${lat}&lng=${lng}`)
      if (result.name) {
        setForm((current) => (current.location.trim() ? current : { ...current, location: result.name }))
        setSearchNote('Named from the map. Edit it if you want a more specific place.')
      }
    } catch {
      setSearchNote('Pin dropped. Name this place so students can read it.')
    }
  }

  async function findPlace() {
    const query = form.location.trim()
    if (query.length < 2) {
      setSearchNote('Type the venue or neighborhood first.')
      return
    }
    setSearching(true)
    setSearchNote('')
    setMatches([])
    try {
      const result = await api(`/opportunities/geocode?q=${encodeURIComponent(query)}`)
      const places = result.places || []
      if (places.length === 0) {
        setSearchNote('No place matched that name. Click the map to drop a pin.')
      } else if (places.length === 1) {
        placePin(places[0].lat, places[0].lng, places[0].name)
        setSearchNote('Pinned at this place. Drag the pin if the building is next door.')
      } else {
        setMatches(places)
        setSearchNote('Choose the matching place.')
      }
    } catch (err) {
      setSearchNote(err.message)
    } finally {
      setSearching(false)
    }
  }

  if (remote) {
    return <p className="rounded-2xl bg-paper px-4 py-3 text-sm text-ink/70">Online listings are not pinned. Students will not see them on the map.</p>
  }

  return (
    <div>
      <p className="label">{label}</p>
      <p className="mb-2 text-sm text-ink/60">Type the venue or neighborhood, then find it on the map. Students see this exact pin.</p>
      <label className="block">
        <span className="label">Place name</span>
        <span className="flex gap-2">
          <input className="field" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Bole Atlas, Addis Ababa" />
          <button type="button" className="shrink-0 rounded-xl border border-line px-3 text-sm" disabled={searching} onClick={findPlace}>{searching ? 'Finding…' : 'Find on map'}</button>
        </span>
      </label>
      {matches.length > 0 && (
        <div className="mt-2 grid gap-2">
          {matches.map((place) => (
            <button
              type="button"
              key={`${place.lat},${place.lng}`}
              className="rounded-xl border border-line px-3 py-2 text-left text-sm"
              onClick={() => {
                placePin(place.lat, place.lng, place.name)
                setSearchNote('Pinned at this place. Drag the pin if the building is next door.')
              }}
            >
              {place.name}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3">
        <LocationPicker latitude={placed ? form.latitude : null} longitude={placed ? form.longitude : null} onPick={pick} />
      </div>
      {placed && <p className="mt-2 text-sm text-ink/60">Students will see this exact point on the map.</p>}
      {searchNote && <p className="mt-1 text-sm text-ink/70">{searchNote}</p>}
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  )
}

export default function Publish() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const starting = params.get('type') === 'EVENT' ? 'EVENT' : 'INTERNSHIP'
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    ...initial,
    type: starting,
    category: ORGANIZER_TYPES[starting],
    compensation: starting === 'EVENT' ? 'FREE' : 'PAID',
    workMode: starting === 'EVENT' ? 'ONSITE' : 'HYBRID',
  })
  const [questions, setQuestions] = useState(questionsFor(starting))
  const [featured, setFeatured] = useState(false)
  const [promoted, setPromoted] = useState(false)
  const [error, setError] = useState('')
  const [errorField, setErrorField] = useState('')
  const [pending, setPending] = useState(false)
  const [org, setOrg] = useState(null)
  const [placed, setPlaced] = useState(false)
  const verified = org?.verificationStatus === 'APPROVED'
  const subscribed = Boolean(org?.subscription?.active)
  const canFeature = org?.subscription?.limits?.featured
  const canPromote = (org?.subscription?.limits?.promotedEvents || 0) > 0

  useEffect(() => {
    api('/org/me').then(setOrg).catch(() => {})
  }, [step])

  const event = form.type === 'EVENT'

  function formError() {
    if (form.title.trim().length < 3) return ['title', event ? 'Enter an event title.' : 'Enter an internship title.']
    if (form.description.trim().length < 20) return ['description', event ? 'Describe the event in a few sentences.' : 'Describe the internship in a few sentences.']
    if (event && !form.startsAt) return ['startsAt', 'Enter when the event starts.']
    if (!form.closesAt) return ['closesAt', event ? 'Enter when registration closes.' : 'Enter an application deadline and time.']
    if (form.workMode !== 'REMOTE' && !placed) return ['location', 'Click the map where this is held.']
    if (form.workMode !== 'REMOTE' && form.location.trim().length < 2) return ['location', 'Name the place shown on the map.']
    if (questions.length === 0) return ['form', 'Add at least one application question.']
    if (questions.some((question) => question.label.trim().length < 2)) return ['form', 'Give every application question a label.']
    if (questions.some((question) => question.type === 'choice' && question.options.split(',').map((item) => item.trim()).filter(Boolean).length < 2)) {
      return ['form', 'Add at least two choices, separated by commas.']
    }
    return ['', '']
  }

  function set(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'type' ? {
        category: ORGANIZER_TYPES[value],
        compensation: value === 'EVENT' ? 'FREE' : 'PAID',
        workMode: value === 'EVENT' ? 'ONSITE' : 'HYBRID',
        duration: '',
        startsAt: '',
        responsibilities: '',
        requiredSkills: '',
      } : {}),
    }))
    if (name === 'type') {
      setQuestions(questionsFor(value))
      setPromoted(false)
    }
  }

  async function publish(isPublic) {
    setPending(true)
    setError('')
    try {
      await api('/org/opportunities', {
        method: 'POST',
        body: {
          ...form,
          eligibility: form.eligibility.trim() || (form.type === 'EVENT' ? 'Open to anyone who registers.' : 'Open to interested applicants.'),
          responsibilities: form.type === 'EVENT' ? '' : form.responsibilities,
          requiredSkills: form.type === 'EVENT' ? [] : form.requiredSkills.split(',').map((item) => item.trim()).filter(Boolean),
          location: form.workMode === 'REMOTE' ? (form.location.trim() || 'Remote') : form.location.trim(),
          latitude: form.workMode === 'REMOTE' ? null : form.latitude,
          longitude: form.workMode === 'REMOTE' ? null : form.longitude,
          startsAt: form.type === 'EVENT' ? form.startsAt : '',
          featured,
          promoted: form.type === 'EVENT' && promoted,
          applicationForm: questions.map((question) => ({
            id: question.id,
            label: question.label.trim(),
            type: question.type,
            required: question.required,
            options: question.type === 'choice' ? question.options.split(',').map((item) => item.trim()).filter(Boolean) : [],
          })),
          publish: isPublic,
        },
      })
      navigate('/org')
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Shell crumb="Create opportunity">
      <h1 className="font-display text-4xl">{event ? 'Host an event.' : 'Open an internship.'}</h1>
      <p className="mt-2 text-ink/70">{event ? 'Set the venue, schedule, and registration form. Guests register on Future Link.' : 'Describe the role, the pay, and the application form. Students apply on Future Link.'}</p>
      <ol className="mt-5 flex flex-wrap gap-2 text-sm">
        {[event ? 'Event details' : 'Internship details', 'Review listing', 'Publish'].map((label, index) => (
          <li key={label} className={`rounded-full px-3 py-1 ${step === index ? 'bg-brand text-white' : 'bg-white'}`}>{index + 1}. {label}</li>
        ))}
      </ol>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="rounded-3xl border border-line bg-white p-6">
          {step === 0 && (
            <div className="grid gap-4">
              <label className="block"><span className="label">{event ? 'Event title' : 'Internship title'}</span><input className="field" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder={event ? 'Campus Tech Night' : 'Frontend Developer Intern'} />{errorField === 'title' && <span className="mt-1 block text-sm text-red-700">{error}</span>}</label>
              <label className="block"><span className="label">Category</span>
                <select className="field" value={form.type} onChange={(e) => set('type', e.target.value)}>
                  {Object.entries(ORGANIZER_TYPES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
              <PlaceField
                form={form}
                setForm={setForm}
                placed={placed}
                setPlaced={setPlaced}
                error={errorField === 'location' ? error : ''}
                label={event ? 'Venue' : 'Where it is held'}
              />
              {event ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block"><span className="label">Attendance</span>
                      <select className="field" value={form.workMode} onChange={(e) => set('workMode', e.target.value)}>
                        <option value="ONSITE">In person</option>
                        <option value="REMOTE">Online</option>
                        <option value="HYBRID">In person and online</option>
                      </select>
                    </label>
                    <label className="block"><span className="label">Event starts (Addis Ababa)</span><input className="field" type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />{errorField === 'startsAt' && <span className="mt-1 block text-sm text-red-700">{error}</span>}</label>
                    <label className="block"><span className="label">Registration closes (Addis Ababa)</span><input className="field" type="datetime-local" value={form.closesAt} onChange={(e) => set('closesAt', e.target.value)} />{errorField === 'closesAt' && <span className="mt-1 block text-sm text-red-700">{error}</span>}</label>
                    <label className="block"><span className="label">Entry</span>
                      <select className="field" value={form.compensation} onChange={(e) => set('compensation', e.target.value)}>
                        <option value="FREE">Free</option>
                        <option value="PAID">Paid ticket</option>
                      </select>
                    </label>
                    <label className="block"><span className="label">Length</span><input className="field" value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="2 hours" /></label>
                  </div>
                  <label className="block"><span className="label">About the event</span><textarea className="field min-h-28" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What happens, who is speaking, and what guests leave with." />{errorField === 'description' && <span className="mt-1 block text-sm text-red-700">{error}</span>}</label>
                  <label className="block"><span className="label">Who should attend (optional)</span><textarea className="field min-h-24" value={form.eligibility} onChange={(e) => set('eligibility', e.target.value)} placeholder="Students, early-career developers, or anyone curious about the topic." /></label>
                </>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block"><span className="label">Work arrangement</span>
                      <select className="field" value={form.workMode} onChange={(e) => set('workMode', e.target.value)}>
                        <option value="HYBRID">Hybrid</option>
                        <option value="REMOTE">Remote</option>
                        <option value="ONSITE">On-site</option>
                      </select>
                    </label>
                    <label className="block"><span className="label">Application deadline (Addis Ababa)</span><input className="field" type="datetime-local" value={form.closesAt} onChange={(e) => set('closesAt', e.target.value)} />{errorField === 'closesAt' && <span className="mt-1 block text-sm text-red-700">{error}</span>}</label>
                    <label className="block"><span className="label">Pay</span>
                      <select className="field" value={form.compensation} onChange={(e) => set('compensation', e.target.value)}>
                        <option value="PAID">Paid</option>
                        <option value="UNPAID">Unpaid</option>
                        <option value="FUNDED">Fully funded</option>
                      </select>
                    </label>
                  </div>
                  <label className="block"><span className="label">Duration</span><input className="field" value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="3 months" /></label>
                  <label className="block"><span className="label">The role</span><textarea className="field min-h-28" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What the intern will learn and who they will work with." />{errorField === 'description' && <span className="mt-1 block text-sm text-red-700">{error}</span>}</label>
                  <label className="block"><span className="label">What the intern will do (optional)</span><textarea className="field min-h-24" value={form.responsibilities} onChange={(e) => set('responsibilities', e.target.value)} placeholder="One task per line." /></label>
                  <label className="block"><span className="label">Who can apply (optional)</span><textarea className="field min-h-24" value={form.eligibility} onChange={(e) => set('eligibility', e.target.value)} placeholder="Year of study, field, or skills you expect." /></label>
                  <label className="block"><span className="label">Skills, comma separated</span><input className="field" value={form.requiredSkills} onChange={(e) => set('requiredSkills', e.target.value)} placeholder="JavaScript, React" /></label>
                </>
              )}
              <div>
                <p className="label">{form.type === 'EVENT' ? 'Event registration form' : 'Internship application form'}</p>
                <p className="mb-3 text-sm text-ink/60">These questions start from the {form.type === 'EVENT' ? 'event' : 'internship'} template. Edit them before you publish. Students answer on Future Link.</p>
                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <div key={question.id} className="rounded-2xl border border-line p-3">
                      <input className="field" value={question.label} placeholder="Question" onChange={(event) => {
                        const next = questions.slice()
                        next[index] = { ...question, label: event.target.value }
                        setQuestions(next)
                      }} />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <select className="field max-w-xs" value={question.type} onChange={(event) => {
                          const next = questions.slice()
                          next[index] = { ...question, type: event.target.value }
                          setQuestions(next)
                        }}>
                          <option value="short">Short answer</option>
                          <option value="long">Paragraph</option>
                          <option value="choice">Multiple choice</option>
                        </select>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={question.required} onChange={(event) => {
                            const next = questions.slice()
                            next[index] = { ...question, required: event.target.checked }
                            setQuestions(next)
                          }} />
                          Required
                        </label>
                        {questions.length > 1 && (
                          <button type="button" className="text-sm text-ink/60" onClick={() => setQuestions(questions.filter((item) => item.id !== question.id))}>Remove</button>
                        )}
                      </div>
                      {question.type === 'choice' && (
                        <input className="field mt-2" value={question.options} placeholder="Option one, Option two" onChange={(event) => {
                          const next = questions.slice()
                          next[index] = { ...question, options: event.target.value }
                          setQuestions(next)
                        }} />
                      )}
                    </div>
                  ))}
                </div>
                {errorField === 'form' && <p className="mt-2 text-sm text-red-700">{error}</p>}
                <button type="button" className="mt-3 text-sm font-medium text-brand-dark" onClick={() => setQuestions([...questions, blankQuestion()])}>
                  Add question
                </button>
                {canFeature && (
                  <label className="mt-4 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />
                    Feature this listing (Premium)
                  </label>
                )}
                {form.type === 'EVENT' && canPromote && (
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={promoted} onChange={(event) => setPromoted(event.target.checked)} />
                    Promote this event
                  </label>
                )}
              </div>
            </div>
          )}
          {step === 1 && (
            <div>
              <h2 className="font-display text-2xl">{form.title || (event ? 'Untitled event' : 'Untitled internship')}</h2>
              <p className="mt-2 text-sm text-ink/60">
                {event ? 'Event' : 'Internship'} · {form.location} · {event ? { ONSITE: 'In person', REMOTE: 'Online', HYBRID: 'In person and online' }[form.workMode] : WORK_LABEL[form.workMode]} · {event ? (form.compensation === 'PAID' ? 'Paid ticket' : 'Free') : PAY_LABEL[form.compensation]}
                {form.duration ? ` · ${form.duration}` : ''}
              </p>
              {event && form.startsAt && <p className="mt-2 text-sm">Starts {form.startsAt.replace('T', ' ')}</p>}
              <p className="mt-4 leading-7">{form.description}</p>
              {form.responsibilities && <p className="mt-4 whitespace-pre-line text-sm">{form.responsibilities}</p>}
              <p className="mt-4 text-sm">{form.eligibility}</p>
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="font-display text-2xl">Ready to publish?</h2>
              {verified && subscribed ? (
                <p className="mt-3 text-ink/70">
                  {org.name} is on the {org.subscription.plan} plan.
                  {' '}Live internships {org.subscription.usage.internships}/{org.subscription.limits.internships}.
                  {' '}Live events {org.subscription.usage.events}/{org.subscription.limits.events}.
                </p>
              ) : (
                <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">
                  {!verified
                    ? 'Publish stays locked until an admin approves the organization. You can save a draft.'
                    : 'Choose a subscription before publishing. You can still save a draft.'}
                </p>
              )}
            </div>
          )}
          {error && !errorField && <p className="mt-4 text-sm text-red-700">{error}</p>}
          <div className="mt-6 flex gap-3">
            {step > 0 && <button className="rounded-xl border border-line px-4 py-2" onClick={() => setStep((value) => value - 1)}>Back</button>}
            {step < 2 && (
              <button
                className="rounded-xl bg-brand px-4 py-2 text-white"
                onClick={() => {
                  if (step === 0) {
                    const [field, message] = formError()
                    if (message) {
                      setErrorField(field)
                      setError(message)
                      return
                    }
                  }
                  setError('')
                  setErrorField('')
                  setStep((value) => value + 1)
                }}
              >
                Continue
              </button>
            )}
            {step === 2 && (
              <>
                <button className="rounded-xl border border-line px-4 py-2" disabled={pending} onClick={() => publish(false)}>Save draft</button>
                <button className="rounded-xl bg-brand px-4 py-2 text-white disabled:opacity-40" disabled={pending || !verified || !subscribed} onClick={() => publish(true)}>{pending ? 'Saving…' : 'Publish'}</button>
              </>
            )}
          </div>
        </section>
        <aside className="h-fit rounded-3xl border border-line bg-white p-4">
          <p className="text-xs tracking-[0.14em] text-ink/40">LIVE PREVIEW</p>
          <p className="mt-3 text-xs">{ORGANIZER_TYPES[form.type]}</p>
          <h3 className="mt-1 font-display text-2xl">{form.title || (event ? 'Event title' : 'Internship title')}</h3>
          <p className="mt-2 text-sm text-ink/60">{form.location || 'Place not set'} · {event ? { ONSITE: 'In person', REMOTE: 'Online', HYBRID: 'In person and online' }[form.workMode] : WORK_LABEL[form.workMode]}</p>
          {form.workMode !== 'REMOTE' && placed && form.latitude != null && (
            <SpotMap latitude={form.latitude} longitude={form.longitude} label={form.location} />
          )}
          <p className="mt-2 text-sm">{event ? (form.compensation === 'PAID' ? 'Paid ticket' : 'Free entry') : PAY_LABEL[form.compensation]}{form.duration ? ` · ${form.duration}` : ''}</p>
        </aside>
      </div>
    </Shell>
  )
}
