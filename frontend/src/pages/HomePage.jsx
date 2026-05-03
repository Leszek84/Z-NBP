import { useEffect, useState, useRef } from 'react'
import { getTrendingTokens, getPoolDetails } from '../api/gecko.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useFavorites } from '../hooks/useFavorites.js'
import TokenCard from '../components/TokenCard.jsx'
import './homepage.css'

/** Parsuje "network:poolAddress" → { network, poolAddress } */
function parseFavId(favId) {
  const idx = favId.indexOf(':')
  return { network: favId.slice(0, idx), poolAddress: favId.slice(idx + 1) }
}

export default function HomePage() {
  const { user } = useAuth()
  const { favorites } = useFavorites()

  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [favTokens, setFavTokens] = useState([])
  const [favLoading, setFavLoading] = useState(false)

  // Trending tokens
  useEffect(() => {
    getTrendingTokens(12)
      .then(setTokens)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Ulubione — pobierz szczegóły tylko gdy zalogowany i lista niepusta
  const favKey = favorites.join(',')
  const prevFavKey = useRef(null)

  useEffect(() => {
    if (!user || favorites.length === 0) {
      setFavTokens([])
      return
    }
    if (favKey === prevFavKey.current) return
    prevFavKey.current = favKey

    setFavLoading(true)
    Promise.allSettled(
      favorites.map(favId => {
        const { network, poolAddress } = parseFavId(favId)
        return getPoolDetails(network, poolAddress)
          .then(data => ({ ...data, id: `${network}_${poolAddress}` }))
      })
    ).then(results => {
      setFavTokens(
        results
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value)
      )
      setFavLoading(false)
    })
  }, [user, favKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const showFavSection = user && (favLoading || favTokens.length > 0 || favorites.length > 0)

  return (
    <main className="home-page">

      {/* ── Ulubione ── */}
      {showFavSection && (
        <section className="home-page__section">
          <h2 className="home-page__title">
            <span className="home-page__title-star">★</span> Ulubione
          </h2>

          {favLoading ? (
            <div className="home-page__grid">
              {Array.from({ length: Math.min(favorites.length, 6) }, (_, i) => (
                <div key={i} className="token-card-skeleton" />
              ))}
            </div>
          ) : favTokens.length > 0 ? (
            <div className="home-page__grid">
              {favTokens.map(token => (
                <TokenCard key={token.id} {...token} />
              ))}
            </div>
          ) : (
            <p className="home-page__fav-empty">Nie udało się załadować ulubionych.</p>
          )}
        </section>
      )}

      {/* ── Trending ── */}
      <section className="home-page__section">
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
      </section>

    </main>
  )
}
