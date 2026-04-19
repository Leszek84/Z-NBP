import './marketselector.css'

function formatPrice(price) {
  if (!price) return '—'
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (price >= 1) return '$' + price.toFixed(4)
  if (price >= 0.0001) return '$' + price.toFixed(6)
  return '$' + price.toExponential(2)
}

function formatVolume(vol) {
  if (!vol) return '—'
  if (vol >= 1_000_000) return '$' + (vol / 1_000_000).toFixed(1) + 'M'
  if (vol >= 1_000) return '$' + (vol / 1_000).toFixed(1) + 'K'
  return '$' + vol.toFixed(0)
}

export default function MarketSelector({ pools, loading, activePool, onSelect }) {
  return (
    <div className="market-selector">
      <h3 className="market-selector__title">Markets</h3>

      {loading && (
        <div className="market-selector__loading">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="market-selector__skeleton" />
          ))}
        </div>
      )}

      {!loading && pools.length === 0 && (
        <p className="market-selector__empty">Brak danych</p>
      )}

      {!loading && pools.map(pool => (
        <button
          key={pool.poolAddress}
          className={`market-selector__item${pool.poolAddress === activePool ? ' market-selector__item--active' : ''}`}
          onClick={() => onSelect(pool)}
        >
          <span className="market-selector__dex">{pool.dexName}</span>
          <div className="market-selector__stats">
            <span className="market-selector__price">{formatPrice(pool.price)}</span>
            <span className="market-selector__vol">Vol {formatVolume(pool.volume24h)}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
