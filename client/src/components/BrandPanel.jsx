const points = [
  ['01', 'Discover your next move', 'Internships and events, in one place.'],
  ['02', 'Turn experience into a story', 'Build a professional portfolio you confirm yourself.'],
  ['03', 'Connect on your terms', 'Verified organizations. Your permission.'],
]

export default function BrandPanel() {
  return (
    <aside className="relative hidden min-h-screen flex-col justify-between bg-brand px-10 py-12 text-white lg:flex lg:w-[46%]">
      <div>
        <p className="text-sm font-semibold tracking-[0.22em]">FUTURE LINK</p>
        <p className="mt-16 text-xs tracking-[0.18em] text-white/70">A WORLD OF OPPORTUNITY</p>
        <h1 className="mt-4 max-w-md font-display text-5xl font-semibold leading-[1.05]">Potential meets possibility.</h1>
        <p className="mt-5 max-w-sm text-white/85">
          For the learners, the builders and the next generation of changemakers.
        </p>
        <ol className="mt-12 space-y-6">
          {points.map(([index, title, copy]) => (
            <li key={index} className="flex gap-4">
              <span className="text-sm text-white/70">{index}</span>
              <span>
                <span className="block font-medium">{title}</span>
                <span className="mt-1 block text-sm text-white/75">{copy}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="rounded-2xl bg-[#0f8f62] px-5 py-4">
        <p className="font-medium">Big ambitions. Zero fees.</p>
        <p className="mt-1 text-sm text-white/80">Discovery and applications stay free for students.</p>
      </div>
    </aside>
  )
}
