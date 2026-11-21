import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Shell from '../components/Shell'
import PortfolioView from '../components/PortfolioView'
import { useAuth } from '../auth'
import { api } from '../lib/api'

const empty = {
  firstName: '',
  lastName: '',
  photoUrl: '',
  phone: '',
  university: '',
  fieldOfStudy: '',
  educationLevel: 'Undergraduate',
  location: '',
  skills: [],
  interests: [],
  careerNote: '',
  projects: [{ title: '', note: '', url: '' }],
  experiences: [{ role: '', organization: '', note: '' }],
  certifications: [{ title: '', issuer: '' }],
  portfolioUrl: '',
  github: '',
}

function fromProfile(profile, user) {
  const notes = profile?.sourceNotes && typeof profile.sourceNotes === 'object' ? profile.sourceNotes : {}
  const projects = (notes.projects?.length ? notes.projects : profile?.projects || []).map((item) => ({
    title: item.title || '',
    note: item.note || item.summary || '',
    url: item.url || '',
  }))
  const experiences = (notes.experiences?.length ? notes.experiences : profile?.experiences || []).map((item) => ({
    role: item.role || '',
    organization: item.organization || '',
    note: item.note || '',
  }))
  const certifications = (notes.certifications?.length ? notes.certifications : profile?.certifications || []).map((item) => ({
    title: item.title || '',
    issuer: item.issuer || '',
  }))
  return {
    ...empty,
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    photoUrl: profile?.photoUrl || '',
    phone: profile?.phone || '',
    university: profile?.university || '',
    fieldOfStudy: profile?.fieldOfStudy || '',
    educationLevel: profile?.educationLevel || 'Undergraduate',
    location: profile?.locations?.[0] || '',
    skills: profile?.skills || [],
    interests: profile?.interests || [],
    careerNote: notes.careerNote || '',
    projects: projects.length ? projects : [{ title: '', note: '', url: '' }],
    experiences: experiences.length ? experiences : [{ role: '', organization: '', note: '' }],
    certifications: certifications.length ? certifications : [{ title: '', issuer: '' }],
    portfolioUrl: profile?.portfolioUrl || '',
  }
}

export default function ProfileSetup() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['profile'], queryFn: () => api('/profile') })
  const [form, setForm] = useState(empty)
  const [skill, setSkill] = useState('')
  const [interest, setInterest] = useState('')
  const [cvText, setCvText] = useState('')
  const [githubProjects, setGithubProjects] = useState([])
  const [stage, setStage] = useState('questions')
  const [missing, setMissing] = useState([])
  const [approved, setApproved] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (query.data) setForm(fromProfile(query.data, user))
  }, [query.data, user])

  function addChip(key, value, clear) {
    const next = value.trim()
    if (!next || form[key].includes(next) || form[key].length >= 12) return
    setForm((current) => ({ ...current, [key]: [...current[key], next] }))
    clear('')
  }

  function updateList(key, index, field, value) {
    const items = form[key].map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    setForm({ ...form, [key]: items })
  }

  function applyCv(result) {
    setForm((current) => ({
      ...current,
      university: current.university || result.university || '',
      educationLevel: result.educationLevel || current.educationLevel,
      skills: [...new Set([...current.skills, ...(result.skills || [])])].slice(0, 12),
      interests: [...new Set([...current.interests, ...(result.interests || [])])].slice(0, 12),
    }))
  }

  async function readCv() {
    setError('')
    try {
      applyCv(await api('/profile/structure', { method: 'POST', body: { text: cvText } }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function readCvFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    const pdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!pdf) {
      const reader = new FileReader()
      reader.onload = () => setCvText(String(reader.result || '').slice(0, 8000))
      reader.readAsText(file)
      return
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      let binary = ''
      for (let index = 0; index < bytes.length; index += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
      }
      applyCv(await api('/profile/cv', { method: 'POST', body: { pdf: btoa(binary) } }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function loadGithub() {
    setError('')
    try {
      const result = await api('/profile/github', { method: 'POST', body: { username: form.github } })
      setGithubProjects(result.projects || [])
    } catch (err) {
      setError(err.message)
    }
  }

  function addGithubProject(project) {
    setForm((current) => ({
      ...current,
      projects: [...current.projects.filter((item) => item.title), { title: project.title, note: project.note, url: project.url || '' }],
    }))
  }

  async function generate() {
    setBusy(true)
    setError('')
    try {
      const result = await api('/profile/generate', {
        method: 'POST',
        body: {
          firstName: form.firstName,
          lastName: form.lastName,
          photoUrl: form.photoUrl,
          phone: form.phone,
          university: form.university,
          fieldOfStudy: form.fieldOfStudy,
          educationLevel: form.educationLevel,
          skills: form.skills,
          interests: form.interests,
          careerNote: form.careerNote,
          projects: form.projects.filter((item) => item.title.trim()),
          experiences: form.experiences.filter((item) => item.role.trim() || item.organization.trim()),
          certifications: form.certifications.filter((item) => item.title.trim()),
          portfolioUrl: form.portfolioUrl,
          locations: form.location.trim() ? [form.location.trim()] : [],
        },
      })
      setMissing(result.missing || [])
      setApproved(false)
      await client.invalidateQueries({ queryKey: ['profile'] })
      setStage('review')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function chooseTemplate(template) {
    await api('/profile', { method: 'PUT', body: { template } })
    await client.invalidateQueries({ queryKey: ['profile'] })
  }

  async function publish() {
    setBusy(true)
    setError('')
    try {
      const saved = await api('/profile/publish', { method: 'POST', body: { approved } })
      await client.invalidateQueries({ queryKey: ['profile'] })
      navigate(`/portfolio/${saved.slug}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const profile = query.data

  return (
    <Shell crumb="Build my portfolio">
      <h1 className="font-display text-4xl">Build my portfolio with AI</h1>
      <p className="mt-2 max-w-2xl text-ink/70">Provide what you have actually done. The builder organizes it and improves the wording. It does not invent experience. You approve it before anyone else can see it.</p>

      {stage === 'questions' && (
        <section className="mt-6 space-y-6">
          <div className="rounded-3xl border border-line bg-white p-6">
            <h2 className="font-display text-2xl">Personal information</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="label">First name</span><input className="field" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
              <label className="block"><span className="label">Last name</span><input className="field" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
              <label className="block sm:col-span-2"><span className="label">Profile picture link</span><input className="field" value={form.photoUrl} placeholder="https://..." onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} /></label>
              <label className="block"><span className="label">Phone</span><input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <label className="block"><span className="label">Email</span><input className="field" value={user?.email || ''} disabled /></label>
              <label className="block"><span className="label">University</span><input className="field" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} /></label>
              <label className="block"><span className="label">Education level</span>
                <select className="field" value={form.educationLevel} onChange={(e) => setForm({ ...form, educationLevel: e.target.value })}>
                  {['Undergraduate', 'Graduate', 'Diploma', 'High school'].map((level) => <option key={level}>{level}</option>)}
                </select>
              </label>
              <label className="block"><span className="label">Field of study</span><input className="field" value={form.fieldOfStudy} onChange={(e) => setForm({ ...form, fieldOfStudy: e.target.value })} /></label>
              <label className="block"><span className="label">Where are you based?</span><input className="field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
            </div>
            <ChipEditor label="Technical skills" items={form.skills} value={skill} setValue={setSkill} onAdd={() => addChip('skills', skill, setSkill)} onRemove={(item) => setForm({ ...form, skills: form.skills.filter((name) => name !== item) })} />
            <ChipEditor label="Career interests" items={form.interests} value={interest} setValue={setInterest} onAdd={() => addChip('interests', interest, setInterest)} onRemove={(item) => setForm({ ...form, interests: form.interests.filter((name) => name !== item) })} />
            <label className="mt-4 block"><span className="label">Short note about the work you want</span>
              <textarea className="field min-h-24" value={form.careerNote} onChange={(e) => setForm({ ...form, careerNote: e.target.value })} />
            </label>
          </div>

          <div className="rounded-3xl border border-line bg-white p-6">
            <h2 className="font-display text-2xl">Experience and projects</h2>
            <label className="mt-4 block"><span className="label">Paste CV text</span>
              <textarea className="field min-h-24" value={cvText} onChange={(e) => setCvText(e.target.value)} placeholder="Or paste the text of your CV." />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input type="file" accept="application/pdf,.pdf,.txt,text/plain" onChange={readCvFile} />
              <button type="button" className="rounded-xl border border-brand px-4 py-2 text-sm" onClick={readCv}>Read this CV</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <input className="field max-w-xs" value={form.github} placeholder="GitHub username" onChange={(e) => setForm({ ...form, github: e.target.value })} />
              <button type="button" className="rounded-xl border border-line px-4 py-2 text-sm" onClick={loadGithub}>Read public repositories</button>
            </div>
            {githubProjects.length > 0 && (
              <ul className="mt-3 space-y-2">
                {githubProjects.map((project) => (
                  <li key={project.title} className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-3 py-2 text-sm">
                    <span>{project.title}</span>
                    <button type="button" className="text-brand" onClick={() => addGithubProject(project)}>Add</button>
                  </li>
                ))}
              </ul>
            )}
            <h3 className="mt-5 font-medium">Projects</h3>
            {form.projects.map((project, index) => (
              <div key={index} className="mt-3 grid gap-3 sm:grid-cols-3">
                <input className="field" value={project.title} placeholder="Project name" onChange={(e) => updateList('projects', index, 'title', e.target.value)} />
                <input className="field" value={project.note} placeholder="What it does" onChange={(e) => updateList('projects', index, 'note', e.target.value)} />
                <input className="field" value={project.url || ''} placeholder="Project link" onChange={(e) => updateList('projects', index, 'url', e.target.value)} />
              </div>
            ))}
            <button type="button" className="mt-3 text-sm underline" onClick={() => setForm({ ...form, projects: [...form.projects, { title: '', note: '', url: '' }] })}>Add a project</button>
            <h3 className="mt-5 font-medium">Internships and work</h3>
            {form.experiences.map((item, index) => (
              <div key={index} className="mt-3 grid gap-3 sm:grid-cols-3">
                <input className="field" value={item.role} placeholder="Role" onChange={(e) => updateList('experiences', index, 'role', e.target.value)} />
                <input className="field" value={item.organization} placeholder="Organization" onChange={(e) => updateList('experiences', index, 'organization', e.target.value)} />
                <input className="field" value={item.note} placeholder="What you did" onChange={(e) => updateList('experiences', index, 'note', e.target.value)} />
              </div>
            ))}
            <button type="button" className="mt-3 text-sm underline" onClick={() => setForm({ ...form, experiences: [...form.experiences, { role: '', organization: '', note: '' }] })}>Add experience</button>
            <h3 className="mt-5 font-medium">Certificates</h3>
            {form.certifications.map((item, index) => (
              <div key={index} className="mt-3 grid gap-3 sm:grid-cols-2">
                <input className="field" value={item.title} placeholder="Certificate" onChange={(e) => updateList('certifications', index, 'title', e.target.value)} />
                <input className="field" value={item.issuer} placeholder="Issuer" onChange={(e) => updateList('certifications', index, 'issuer', e.target.value)} />
              </div>
            ))}
            <button type="button" className="mt-3 text-sm underline" onClick={() => setForm({ ...form, certifications: [...form.certifications, { title: '', issuer: '' }] })}>Add a certificate</button>
            <label className="mt-5 block"><span className="label">Another portfolio or GitHub link</span>
              <input className="field" value={form.portfolioUrl} placeholder="https://github.com/your-name" onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })} />
            </label>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button className="rounded-xl bg-brand px-4 py-2 text-white" disabled={busy} onClick={generate}>{busy ? 'Generating…' : 'Generate portfolio'}</button>
        </section>
      )}

      {stage === 'review' && profile && (
        <section className="mt-6 space-y-4">
          {missing.length > 0 && (
            <div className="rounded-3xl bg-amber-50 p-5 text-sm text-amber-950">
              <p className="font-medium">Still missing, if you have it</p>
              <ul className="mt-2 list-disc pl-5">
                {missing.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <button type="button" className="mt-3 underline" onClick={() => setStage('questions')}>Add the missing information</button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {['modern', 'minimal', 'professional', 'creative'].map((template) => (
              <button key={template} type="button" className={`rounded-full px-4 py-2 text-sm capitalize ${profile.template === template ? 'bg-brand text-white' : 'bg-white'}`} onClick={() => chooseTemplate(template)}>{template}</button>
            ))}
          </div>
          <PortfolioView profile={profile} name={`${form.firstName} ${form.lastName}`.trim()} email={user?.email} />
          <label className="flex items-start gap-3 rounded-2xl bg-white p-4 text-sm">
            <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
            <span>I approve this portfolio. Publishing makes my name, story, projects, and contact details visible at a public link.</span>
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="button" className="rounded-xl border border-line bg-white px-4 py-2" onClick={() => setStage('questions')}>Edit answers</button>
            <button type="button" className="rounded-xl bg-brand px-4 py-2 text-white" disabled={!approved || busy} onClick={publish}>{busy ? 'Publishing…' : 'Publish'}</button>
            <Link to="/portfolio" className="rounded-xl border border-line bg-white px-4 py-2">Preview privately</Link>
          </div>
        </section>
      )}
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
        {items.map((item) => <button type="button" key={item} className="rounded-full bg-paper px-3 py-1 text-sm" onClick={() => onRemove(item)}>{item} ×</button>)}
      </div>
    </div>
  )
}
