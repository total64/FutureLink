import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import PortfolioView from '../components/PortfolioView'
import { api } from '../lib/api'

export default function PublicPortfolio() {
  const { slug } = useParams()
  const query = useQuery({
    queryKey: ['public-portfolio', slug],
    queryFn: () => api(`/portfolios/${slug}`),
  })

  return (
    <main className="min-h-screen bg-paper px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="text-sm font-semibold tracking-[0.16em] text-brand">FUTURE LINK</Link>
        {query.isLoading && <p className="mt-8">Loading…</p>}
        {query.error && <p className="mt-8 text-red-700">{query.error.message}</p>}
        {query.data && (
          <div className="mt-6">
            <PortfolioView profile={query.data} name={query.data.name} email={query.data.email} />
          </div>
        )}
      </div>
    </main>
  )
}
