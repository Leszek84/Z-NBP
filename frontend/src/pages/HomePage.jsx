import { useEffect, useState } from 'react'
import { getTrendingTokens } from '../api/gecko.js'
import TokenCard from '../components/TokenCard.jsx'
import './homepage.css'

export default function HomePage() {
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getTrendingTokens(12)
      .then(setTokens)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="home-page">
      <h2 className="home-page__title">Trending tokens</h2>

      {loading && (
        <div className="home-page__grid">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="token-card-skeleton" />
          ))}
        </div>
      )}

      {error && (
        <div className="home-page__error">
          <strong>Nie udało się załadować danych</strong>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="home-page__grid">
          {tokens.map(token => (
            <TokenCard key={token.id} {...token} />
          ))}
        </div>
      )}
    </main>
  )
}
