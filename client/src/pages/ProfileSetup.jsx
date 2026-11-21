import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Shell from '../components/Shell'
import { api } from '../lib/api'

const steps = ['Account', 'Background & skills', 'Projects', 'Review']

const empty = {
  university: '',
  fieldOfStudy: '',
  educationLevel: 'Undergraduate',
  skills: [],
  interests: [],
  careerGoals: '',
  bio: '',
  locations: ['Addis Ababa'],
  workModes: ['HYBRID'],
  projects: [],
  visibility: 'private',
}

export default function ProfileSetup() {
  const navigate = useNavigate()
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['profile'], queryFn: () => api('/profile') })
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(empty)
  const [skill, setSkill] = useState('')
  const [interest, setInterest] = useState('')
  const [freeText, setFreeText] = useState('')
  const [suggestion, setSuggestion] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (query.data) {
      setForm({
        ...empty,
        ...query.data,
        projects: Array.isArray(query.data.projects) ? query.data.projects : [],
      })
    }
  }, [query.data])

  function addChip(key, value, clear) {
    const next = value.trim()
    if (!next || form[key].includes(next) || form[key].length >= 12) return
    setForm((current) => ({ ...current, [key]: [...current[key], next] }))
    clear('')
  }

  async function suggest() {
    setError('')
    try {
      const result = await api('/profile/structure', { method: 'POST', body: { text: freeText } })
      setSuggestion(result)
    } catch (err) {
      setError(err.message)
    }
  }

  function acceptSuggestion() {
    if (!suggestion) return
    setForm((current) => ({
      ...current,
      skills: [...new Set([...current.skills, ...suggestion.skills])].slice(0, 12),
      interests: [...new Set([...current.interests, ...suggestion.interests])].slice(0, 12),
      university: current.university || suggestion.university,
      educationLevel: suggestion.educationLevel || current.educationLevel,
      careerGoals: suggestion.careerGoals || current.careerGoals,
    }))
    setSuggestion(null)
  }

  async function save(goPortfolio) {
    setSaving(true)
    setError('')
    try {
      await api('/profile', { method: 'PUT', body: form })
      await client.invalidateQueries({ queryKey: ['profile'] })
      if (goPortfolio) navigate('/portfolio')
      else setStep((value) => Math.min(3, value + 1))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell crumb="Profile setup">
      <h1 className="font-display text-4xl">Your next chapter starts with you.</h1>
      <p className="mt-2 max-w-2xl text-ink/70">Tell us what you’re learning, what you’re good at and where you want to go. Suggestions are never saved until you confirm them.</p>
      <ol className="mt-6 flex flex-wrap gap-3 text-sm">
        {steps.map((label, index) => (
          <li key={label} className={`rounded-full px-3 py-1 ${step === index ? 'bg-brand text-white' : 'bg-white text-ink/60'}`}>{index + 1}. {label}</li>
        ))}
      </ol>

      {step === 1 && (
        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="rounded-3xl border border-line bg-white p-6">
            <h2 className="font-display text-2xl">Background & skills</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="label">University</span><input className="field" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} /></label>
              <label className="block"><span className="label">Education level</span>
                <select className="field" value={form.educationLevel} onChange={(e) => setForm({ ...form, educationLevel: e.target.value })}>
                  {['Undergraduate', 'Graduate', 'Diploma', 'High school'].map((level) => <option key={level}>{level}</option>)}
                </select>
              </label>
              <label className="block sm:col-span-2"><span className="label">Field of study</span><input className="field" value={form.fieldOfStudy} onChange={(e) => setForm({ ...form, fieldOfStudy: e.target.value })} /></label>
            </div>
            <ChipEditor label="Skills" items={form.skills} value={skill} setValue={setSkill} onAdd={() => addChip('skills', skill, setSkill)} onRemove={(item) => setForm({ ...form, skills: form.skills.filter((skillName) => skillName !== item) })} />
            <ChipEditor label="Interests" items={form.interests} value={interest} setValue={setInterest} onAdd={() => addChip('interests', interest, setInterest)} onRemove={(item) => setForm({ ...form, interests: form.interests.filter((name) => name !== item) })} />
            <label className="mt-4 block"><span className="label">What are you working toward?</span>
              <textarea className="field min-h-28" value={form.careerGoals} onChange={(e) => setForm({ ...form, careerGoals: e.target.value })} />
            </label>
            <label className="mt-4 block"><span className="label">Or paste a short bio and let Future Link suggest fields</span>
              <textarea className="field min-h-24" value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="I’m an undergraduate at Addis Ababa University studying Computer Science. I use Figma and care about social impact." />
            </label>
            <button type="button" className="mt-3 rounded-xl border border-brand px-4 py-2 text-sm" onClick={suggest}>Suggest from this text</button>
            {suggestion && (
              <div className="mt-4 rounded-2xl bg-mint p-4 text-sm">
                <p className="font-medium">Review this suggestion</p>
                <p className="mt-1">Skills: {suggestion.skills.join(', ') || 'none found'}</p>
                <p>Interests: {suggestion.interests.join(', ') || 'none found'}</p>
                <p className="mt-1 text-ink/60">{suggestion.note}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" className="rounded-lg bg-brand px-3 py-1.5 text-white" onClick={acceptSuggestion}>Accept</button>
                  <button type="button" className="rounded-lg border border-line px-3 py-1.5" onClick={() => setSuggestion(null)}>Reject</button>
                </div>
              </div>
            )}
          </div>
          <aside className="rounded-3xl bg-brand p-5 text-white">
            <h3 className="font-display text-2xl">A profile with purpose.</h3>
            <p className="mt-3 text-sm text-white/75">Your background becomes more than a form. Future Link turns confirmed details into a story you can review and edit.</p>
          </aside>
        </section>
      )}

      {step === 2 && (
        <section className="mt-6 rounded-3xl border border-line bg-white p-6">
          <h2 className="font-display text-2xl">Projects</h2>
          {form.projects.map((project, index) => (
            <div key={`${project.title}-${index}`} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input className="field" value={project.title} onChange={(e) => {
                const projects = [...form.projects]
                projects[index] = { ...project, title: e.target.value }
                setForm({ ...form, projects })
              }} />
              <input className="field" value={project.summary || ''} placeholder="Short summary" onChange={(e) => {
                const projects = [...form.projects]
                projects[index] = { ...project, summary: e.target.value }
                setForm({ ...form, projects })
              }} />
            </div>
          ))}
          <button type="button" className="mt-4 text-sm underline" onClick={() => setForm({ ...form, projects: [...form.projects, { title: '', summary: '', tech: [] }] })}>
            Add a project
          </button>
        </section>
      )}

      {step === 3 && (
        <section className="mt-6 rounded-3xl border border-line bg-white p-6">
          <h2 className="font-display text-2xl">Review</h2>
          <p className="mt-3 text-ink/80">{form.fieldOfStudy} · {form.educationLevel} · {form.university}</p>
          <p className="mt-2 text-sm">Skills: {form.skills.join(', ') || 'None yet'}</p>
          <p className="mt-1 text-sm">Interests: {form.interests.join(', ') || 'None yet'}</p>
          <p className="mt-3 text-sm leading-6">{form.careerGoals}</p>
          <label className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-paper p-4">
            <span>
              <span className="block font-medium">Appear in talent discovery</span>
              <span className="text-sm text-ink/60">Off by default. Verified organizations can see a limited summary only if you turn this on.</span>
            </span>
            <input type="checkbox" checked={form.visibility === 'discoverable'} onChange={(e) => setForm({ ...form, visibility: e.target.checked ? 'discoverable' : 'private' })} />
          </label>
        </section>
      )}

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex gap-3">
        {step > 1 && <button className="rounded-xl border border-line bg-white px-4 py-2" onClick={() => setStep((value) => value - 1)}>Back</button>}
        {step < 3 && <button className="rounded-xl bg-brand px-4 py-2 text-white" disabled={saving} onClick={() => save(false)}>{saving ? 'Saving…' : 'Save and continue'}</button>}
        {step === 3 && <button className="rounded-xl bg-brand px-4 py-2 text-white" disabled={saving} onClick={() => save(true)}>{saving ? 'Saving…' : 'Save portfolio'}</button>}
      </div>
    </Shell>
  )
}

function ChipEditor({ label, items, value, setValue, onAdd, onRemove }) {
  return (
    <div className="mt-4">
      <span className="label">{label}</span>
      <div className="flex gap-2">
        <input className="field" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd() } }} />
        <button type="button" className="rounded-xl border border-line px-3" onClick={onAdd}>Add</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <button type="button" key={item} className="rounded-full bg-paper px-3 py-1 text-sm" onClick={() => onRemove(item)}>{item} ×</button>
        ))}
      </div>
    </div>
  )
}
