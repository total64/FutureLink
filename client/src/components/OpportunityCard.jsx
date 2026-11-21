import { Link } from 'react-router-dom'
import { PAY_LABEL, TYPE_BADGE, WORK_LABEL, formatDate } from '../lib/format'

export default function OpportunityCard({ item }) {
  return (
    <Link to={`/opportunities/${item.id}`} className="block rounded-2xl border border-line bg-white p-4 shadow-card transition hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-paper px-2.5 py-1 text-xs text-ink/70">{TYPE_BADGE[item.type] || item.type}</span>
        {item.matchScore != null && (
          <span className="rounded-full bg-match px-2.5 py-1 text-xs font-medium text-ink">{item.matchScore}% match</span>
        )}
      </div>
      <h3 className="mt-3 font-display text-xl leading-tight">{item.title}</h3>
      <p className="mt-1 text-sm text-ink/70">
        {item.organization?.name}
        {item.organization?.verified ? ' · Verified' : ''}
      </p>
      <p className="mt-3 text-sm text-ink/70">
        {item.location} · {WORK_LABEL[item.workMode]}
        {item.duration ? ` · ${item.duration}` : ''}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink/70">
        <span className="rounded-full border border-line px-2 py-1">{PAY_LABEL[item.compensation]}</span>
        <span className="rounded-full border border-line px-2 py-1">Closes {formatDate(item.closesAt)}</span>
      </div>
      {item.explanation && <p className="mt-3 text-sm text-ink/70">{item.explanation}</p>}
    </Link>
  )
}
