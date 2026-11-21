import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Shell from '../components/Shell'
import { api } from '../lib/api'

export default function Portfolio() {
  const query = useQuery({ queryKey: ['profile'], queryFn: () => api('/profile') })
  const profile = query.data
  if (query.isLoading) return <Shell crumb="My portfolio"><p>Loading…</p></Shell>
  if (!profile || profile.completeness === 0) {
    return (
      <Shell crumb="My portfolio">
        <h1 className="font-display text-4xl">A portfolio that opens doors.</h1>
        <p className="mt-3 max-w-xl text-ink/70">Your portfolio is empty and private. Build it from facts you confirm.</p>
        <Link to="/profile" className="mt-6 inline-block rounded-xl bg-brand px-4 py-3 text-white">Build my profile</Link>
      </Shell>
    )
  }
  const projects = Array.isArray(profile.projects) ? profile.projects : []
  return (
    <Shell crumb="My portfolio">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">A portfolio that opens doors.</h1>
          <p className="mt-2 text-ink/70">Your experience, shaped into a professional story. Always yours to edit.</p>
        </div>
        <Link to="/profile" className="rounded-xl border border-line bg-white px-4 py-2 text-sm">Edit profile</Link>
      </div>
      <section className="mt-6 rounded-3xl bg-brand p-6 text-white">
        <p className="text-xs tracking-[0.16em] text-white/50">YOUR STORY</p>
        <h2 className="mt-3 max-w-xl font-display text-4xl">{profile.careerGoals ? 'Curious by nature.' : 'Your story is ready to grow.'}</h2>
        <p className="mt-3 max-w-2xl text-white/80">{profile.bio || profile.aiSummary}</p>
        <p className="mt-4 text-sm text-white/60">{[profile.educationLevel, profile.fieldOfStudy, profile.university].filter(Boolean).join(' · ')}</p>
      </section>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-line bg-white p-5">
          <h3 className="font-medium">My toolkit</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.skills.map((skill) => <span key={skill} className="rounded-full bg-paper px-3 py-1 text-sm">{skill}</span>)}
          </div>
          <h3 className="mt-5 font-medium">Interests</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.interests.map((item) => <span key={item} className="rounded-full bg-mint px-3 py-1 text-sm">{item}</span>)}
          </div>
        </section>
        <section className="rounded-3xl border border-line bg-white p-5">
          <h3 className="font-medium">Selected projects</h3>
          <ul className="mt-3 space-y-3">
            {projects.filter((project) => project.title).map((project) => (
              <li key={project.title}>
                <p className="font-medium">{project.title}</p>
                <p className="text-sm text-ink/70">{project.summary}</p>
              </li>
            ))}
            {projects.filter((project) => project.title).length === 0 && <li className="text-sm text-ink/60">No projects yet.</li>}
          </ul>
          <p className="mt-5 text-sm text-ink/60">
            Visibility: {profile.visibility === 'discoverable' ? 'discoverable by verified organizations' : 'private'}. Completeness {profile.completeness}%.
          </p>
        </section>
      </div>
    </Shell>
  )
}
