const frames = {
  modern: { wrap: 'bg-paper', hero: 'bg-brand text-white', card: 'border border-line bg-white', chip: 'bg-white/15 text-white' },
  minimal: { wrap: 'bg-white', hero: 'border border-line bg-white text-ink', card: 'border border-line bg-white', chip: 'bg-paper text-ink' },
  professional: { wrap: 'bg-paper', hero: 'bg-ink text-white', card: 'border border-line bg-white', chip: 'bg-white/10 text-white' },
  creative: { wrap: 'bg-mint', hero: 'bg-white text-ink shadow-card', card: 'bg-white', chip: 'bg-mint text-ink' },
}

export default function PortfolioView({ profile, name, email }) {
  const frame = frames[profile.template] || frames.modern
  const projects = (profile.projects || []).filter((item) => item.title)
  const experiences = profile.experiences || []
  const certifications = profile.certifications || []

  return (
    <div className={`rounded-3xl p-4 md:p-6 ${frame.wrap}`}>
      <section className={`rounded-3xl p-6 md:p-8 ${frame.hero}`}>
        <div className="flex flex-wrap items-center gap-4">
          {profile.photoUrl && <img src={profile.photoUrl} alt="" className="h-20 w-20 rounded-full object-cover" />}
          <div>
            <p className="text-xs tracking-[0.16em] opacity-60">ABOUT ME</p>
            <h2 className="mt-2 font-display text-3xl">{name}</h2>
            <p className="mt-2 text-sm opacity-70">{[profile.educationLevel, profile.fieldOfStudy, profile.university].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <p className="mt-5 max-w-2xl leading-7 opacity-90">{profile.bio}</p>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className={`rounded-3xl p-5 ${frame.card}`}>
          <h3 className="font-medium">Education</h3>
          <p className="mt-2 text-sm leading-6">{[profile.educationLevel, profile.fieldOfStudy, profile.university].filter(Boolean).join(' · ') || 'Not added.'}</p>
          {(profile.locations || []).length > 0 && <p className="mt-2 text-sm text-ink/60">{profile.locations.join(', ')}</p>}
          <h3 className="mt-5 font-medium">Technical skills</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(profile.skills || []).map((skill) => <span key={skill} className="rounded-full bg-paper px-3 py-1 text-sm">{skill}</span>)}
            {(profile.skills || []).length === 0 && <p className="text-sm text-ink/60">Not added.</p>}
          </div>
          <h3 className="mt-5 font-medium">Career interests</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(profile.interests || []).map((item) => <span key={item} className="rounded-full bg-mint px-3 py-1 text-sm">{item}</span>)}
          </div>
          {profile.careerGoals && <p className="mt-3 text-sm leading-6">{profile.careerGoals}</p>}
        </section>
        <section className={`rounded-3xl p-5 ${frame.card}`}>
          <h3 className="font-medium">Projects</h3>
          <ul className="mt-3 space-y-4">
            {projects.map((project) => (
              <li key={project.title}>
                <p className="font-medium">{project.title}</p>
                <p className="text-sm text-ink/70">{project.summary}</p>
                {project.url && <a className="text-sm text-brand underline" href={project.url} target="_blank" rel="noreferrer">Project link</a>}
              </li>
            ))}
            {projects.length === 0 && <li className="text-sm text-ink/60">Not added.</li>}
          </ul>
        </section>
        <section className={`rounded-3xl p-5 ${frame.card}`}>
          <h3 className="font-medium">Work experience</h3>
          <ul className="mt-3 space-y-4">
            {experiences.map((item) => (
              <li key={`${item.role}-${item.organization}`}>
                <p className="font-medium">{[item.role, item.organization].filter(Boolean).join(' · ')}</p>
                <p className="text-sm text-ink/70">{item.summary}</p>
              </li>
            ))}
            {experiences.length === 0 && <li className="text-sm text-ink/60">Not added. Nothing is invented here.</li>}
          </ul>
        </section>
        <section className={`rounded-3xl p-5 ${frame.card}`}>
          <h3 className="font-medium">Certifications</h3>
          <ul className="mt-3 space-y-3">
            {certifications.map((item) => (
              <li key={item.title}>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-ink/70">{item.summary}</p>
              </li>
            ))}
            {certifications.length === 0 && <li className="text-sm text-ink/60">Not added.</li>}
          </ul>
          <h3 className="mt-5 font-medium">Contact</h3>
          <p className="mt-2 text-sm">{email}</p>
          {profile.phone && <p className="text-sm">{profile.phone}</p>}
          {profile.portfolioUrl && <a className="mt-2 inline-flex text-sm text-brand underline" href={profile.portfolioUrl} target="_blank" rel="noreferrer">Other portfolio link</a>}
        </section>
      </div>
    </div>
  )
}
