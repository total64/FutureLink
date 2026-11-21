import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Shell from '../components/Shell'
import PortfolioView from '../components/PortfolioView'
import { useAuth } from '../auth'
import { api } from '../lib/api'

export default function Portfolio() {
  const { user } = useAuth()
  const query = useQuery({ queryKey: ['profile'], queryFn: () => api('/profile') })
  const profile = query.data
  const ready = Boolean(profile?.bio)

  return (
    <Shell crumb="Portfolio">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">My portfolio</h1>
          <p className="mt-2 max-w-2xl text-ink/70">
            {profile?.published && profile.slug
              ? `Published at /portfolio/${profile.slug}. You can update it whenever your work changes.`
              : 'This is private until you approve and publish it.'}
          </p>
        </div>
        <Link to="/profile" className="rounded-xl border border-line bg-white px-4 py-2 text-sm">Edit portfolio</Link>
      </div>
      {query.isLoading && <p className="mt-6">Loading…</p>}
      {!query.isLoading && !ready && (
        <div className="mt-6 rounded-3xl border border-dashed border-line bg-white p-8">
          <p>You have not generated a portfolio yet.</p>
          <Link to="/profile" className="mt-3 inline-flex rounded-xl bg-brand px-4 py-2 text-white">Build my portfolio with AI</Link>
        </div>
      )}
      {ready && (
        <div className="mt-6">
          <PortfolioView profile={profile} name={`${user?.firstName || ''} ${user?.lastName || ''}`.trim()} email={user?.email} />
        </div>
      )}
    </Shell>
  )
}
