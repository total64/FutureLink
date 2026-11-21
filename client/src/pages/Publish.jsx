import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../components/Shell'
import { api } from '../lib/api'
import { PAY_LABEL, TYPE_LABEL, WORK_LABEL } from '../lib/format'

const initial = {
  title: '',
  type: 'INTERNSHIP',
  category: 'Internships & Jobs',
  location: 'Addis Ababa, Ethiopia',
  workMode: 'HYBRID',
  compensation: 'PAID',
  closesAt: '',
  duration: '',
  description: '',
  eligibility: '',
  audience: 'Undergraduate',
  requiredSkills: '',
}

function blankQuestion() {
  return { id: Math.random().toString(36).slice(2, 10), label: '', type: 'short', required: true, options: '' }
}

export default function Publish() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(initial)
  const [questions, setQuestions] = useState([
    { id: 'why', label: 'Why are you applying?', type: 'long', required: true, options: '' },
  ])
  const [error, setError] = useState('')
  const [errorField, setErrorField] = useState('')
  const [pending, setPending] = useState(false)
  const [org, setOrg] = useState(null)
  const verified = org?.verificationStatus === 'APPROVED'

  useEffect(() => {
    api('/org/me').then(setOrg).catch(() => {})
  }, [])

  function formError() {
    if (form.title.trim().length < 3) return ['title', 'Enter an opportunity title.']
    if (form.description.trim().length < 20) return ['description', 'Describe the opportunity in a few sentences.']
    if (!form.closesAt) return ['closesAt', 'Enter an application deadline and time.']
    if (questions.length === 0) return ['form', 'Add at least one application question.']
    if (questions.some((question) => question.label.trim().length < 2)) return ['form', 'Give every application question a label.']
    if (questions.some((question) => question.type === 'choice' && question.options.split(',').map((item) => item.trim()).filter(Boolean).length < 2)) {
      return ['form', 'Add at least two choices, separated by commas.']
    }
    return ['', '']
  }

  function set(name, value) {
    setForm((current) => ({ ...current, [name]: value, ...(name === 'type' ? { category: TYPE_LABEL[value] } : {}) }))
  }

  async function publish(isPublic) {
    setPending(true)
    setError('')
    try {
      await api('/org/opportunities', {
        method: 'POST',
        body: {
          ...form,
          eligibility: form.eligibility.trim() || 'Open to interested applicants.',
          requiredSkills: form.requiredSkills.split(',').map((item) => item.trim()).filter(Boolean),
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
      <h1 className="font-display text-4xl">Open a door for someone.</h1>
      <p className="mt-2 text-ink/70">Publish a clear, tech-related opportunity. Community-restricted content is held and can lead to an account ban.</p>
      <ol className="mt-5 flex flex-wrap gap-2 text-sm">
        {['Opportunity details', 'Review listing', 'Publish'].map((label, index) => (
          <li key={label} className={`rounded-full px-3 py-1 ${step === index ? 'bg-brand text-white' : 'bg-white'}`}>{index + 1}. {label}</li>
        ))}
      </ol>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="rounded-3xl border border-line bg-white p-6">
          {step === 0 && (
            <div className="grid gap-4">
              <label className="block"><span className="label">Opportunity title</span><input className="field" value={form.title} onChange={(e) => set('title', e.target.value)} />{errorField === 'title' && <span className="mt-1 block text-sm text-red-700">{error}</span>}</label>
              <label className="block"><span className="label">Primary category</span>
                <select className="field" value={form.type} onChange={(e) => set('type', e.target.value)}>
                  {Object.entries(TYPE_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="label">Location</span><input className="field" value={form.location} onChange={(e) => set('location', e.target.value)} /></label>
                <label className="block"><span className="label">Work arrangement</span>
                  <select className="field" value={form.workMode} onChange={(e) => set('workMode', e.target.value)}>
                    <option value="HYBRID">Hybrid</option>
                    <option value="REMOTE">Remote</option>
                    <option value="ONSITE">On-site</option>
                  </select>
                </label>
                <label className="block"><span className="label">Application deadline and time (Addis Ababa)</span><input className="field" type="datetime-local" value={form.closesAt} onChange={(e) => set('closesAt', e.target.value)} />{errorField === 'closesAt' && <span className="mt-1 block text-sm text-red-700">{error}</span>}</label>
                <label className="block"><span className="label">Compensation / funding</span>
                  <select className="field" value={form.compensation} onChange={(e) => set('compensation', e.target.value)}>
                    {Object.entries(PAY_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </label>
              </div>
              <label className="block"><span className="label">Duration</span><input className="field" value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="3 months" /></label>
              <label className="block"><span className="label">Description</span><textarea className="field min-h-28" value={form.description} onChange={(e) => set('description', e.target.value)} />{errorField === 'description' && <span className="mt-1 block text-sm text-red-700">{error}</span>}</label>
              <label className="block"><span className="label">Eligibility and required skills (optional)</span><textarea className="field min-h-24" value={form.eligibility} onChange={(e) => set('eligibility', e.target.value)} placeholder="Who can apply. Leave blank if the description already covers it." /></label>
              <label className="block"><span className="label">Skills, comma separated</span><input className="field" value={form.requiredSkills} onChange={(e) => set('requiredSkills', e.target.value)} placeholder="Figma, UX research" /></label>
              <label className="block"><span className="label">Audience</span><input className="field" value={form.audience} onChange={(e) => set('audience', e.target.value)} /></label>
              <div>
                <p className="label">Application form</p>
                <p className="mb-3 text-sm text-ink/60">Students answer these questions here. Applications stay on Future Link.</p>
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
              </div>
            </div>
          )}
          {step === 1 && (
            <div>
              <h2 className="font-display text-2xl">{form.title || 'Untitled opportunity'}</h2>
              <p className="mt-2 text-sm text-ink/60">{form.category} · {form.location} · {WORK_LABEL[form.workMode]} · {PAY_LABEL[form.compensation]}</p>
              <p className="mt-4 leading-7">{form.description}</p>
              <p className="mt-4 text-sm">{form.eligibility}</p>
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="font-display text-2xl">Ready to publish?</h2>
              {verified ? (
                <p className="mt-3 text-ink/70">{org.name} is verified. Publish makes this listing visible to students.</p>
              ) : (
                <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">
                  {org ? org.name : 'This organization'} is still waiting for admin verification, so Publish is unavailable. Save it as a draft, then sign in as admin and approve the organization.
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
                <button className="rounded-xl bg-brand px-4 py-2 text-white disabled:opacity-40" disabled={pending || !verified} onClick={() => publish(true)}>{pending ? 'Saving…' : 'Publish'}</button>
              </>
            )}
          </div>
        </section>
        <aside className="h-fit rounded-3xl border border-line bg-white p-4">
          <p className="text-xs tracking-[0.14em] text-ink/40">LIVE PREVIEW</p>
          <p className="mt-3 text-xs">{TYPE_LABEL[form.type]}</p>
          <h3 className="mt-1 font-display text-2xl">{form.title || 'Opportunity title'}</h3>
          <p className="mt-2 text-sm text-ink/60">{form.location} · {WORK_LABEL[form.workMode]}</p>
          <p className="mt-2 text-sm">{PAY_LABEL[form.compensation]}</p>
        </aside>
      </div>
    </Shell>
  )
}
