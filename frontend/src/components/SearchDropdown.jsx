import { useNavigate } from 'react-router-dom'
import './searchdropdown.css'

function formatPrice(price) {
  if (!price) return '—'
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (price >= 1) return '$' + price.toFixed(4)
  if (price >= 0.0001) return '$' + price.toFixed(6)
  return '$' + price.toExponential(2)
}

/** Wraps every occurrence of `query` inside `text` with <mark> */
function Highlight({ text, query }) {
  if (!query || !text) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part
  )
}

export default function SearchDropdown({ results, loading, query, activeIndex, onSelect }) {
  const navigate = useNavigate()
  if (!query || query.length < 2) return null

  return (
    <div className="search-dropdown" role="listbox">
      {loading && (
        <div className="search-dropdown__status">
          <span className="search-dropdown__spinner" />
          Szukam…
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="search-dropdown__status search-dropdown__empty">
          Brak wyników dla „{query}"
        </div>
      )}

      {!loading && results.length > 0 && (
        <ul className="search-dropdown__list">
          {results.map((result, i) => (
            <li
              key={`${result.network}-${result.poolAddress}`}
              className={`search-dropdown__item${activeIndex === i ? ' search-dropdown__item--active' : ''}`}
              role="option"
              aria-selected={activeIndex === i}
              onMouseDown={e => {
                e.preventDefault()
                onSelect(result)
                navigate(`/token/${result.network}/${result.poolAddress}`)
              }}
            >
              <div className="search-dropdown__icon-wrap">
                {result.imageUrl ? (
                  <img
                    className="search-dropdown__icon"
                    src={result.imageUrl}
                    alt={result.symbol}
                    onError={e => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextSibling.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div
                  className="search-dropdown__icon-fallback"
                  style={{ display: result.imageUrl ? 'none' : 'flex' }}
                >
                  {(result.symbol || result.name || '?')[0].toUpperCase()}
                </div>
              </div>

              <div className="search-dropdown__info">
                <span className="search-dropdown__name">
                  <Highlight text={result.name} query={query} />
                </span>
                <span className="search-dropdown__meta">
                  {result.symbol && (
                    <span className="search-dropdown__symbol">
                      <Highlight text={result.symbol} query={query} />
                    </span>
                  )}
                  {result.networkName && (
                    <span className="search-dropdown__network">{result.networkName}</span>
                  )}
                </span>
              </div>

              <div className="search-dropdown__right">
                <span className="search-dropdown__price">{formatPrice(result.price)}</span>
                {result.priceChange24h != null && (
                  <span className={`search-dropdown__change ${result.priceChange24h < 0 ? 'search-dropdown__change--down' : 'search-dropdown__change--up'}`}>
                    {result.priceChange24h < 0 ? '▼' : '▲'} {Math.abs(result.priceChange24h).toFixed(2)}%
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
