import './tokencard.css'

function formatPrice(price) {
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (price >= 1) return '$' + price.toFixed(4)
  if (price >= 0.0001) return '$' + price.toFixed(6)
  return '$' + price.toExponential(2)
}

export default function TokenCard({ name, symbol, price, priceChange24h, imageUrl }) {
  const isUp = priceChange24h >= 0
  const changeClass = isUp ? 'token-card__change--up' : 'token-card__change--down'
  const arrow = isUp ? '▲' : '▼'
  const changeAbs = Math.abs(priceChange24h).toFixed(2)

  return (
    <div className="token-card">
      {imageUrl ? (
        <img
          className="token-card__icon"
          src={imageUrl}
          alt={symbol}
          onError={e => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextSibling.style.display = 'flex'
          }}
        />
      ) : null}
      <div
        className="token-card__icon-fallback"
        style={{ display: imageUrl ? 'none' : 'flex' }}
      >
        {(symbol || name || '?')[0].toUpperCase()}
      </div>

      <div className="token-card__info">
        <div className="token-card__name">{name}</div>
        {symbol && <div className="token-card__symbol">{symbol}</div>}
      </div>

      <div className="token-card__right">
        <div className="token-card__price">{formatPrice(price)}</div>
        <div className={`token-card__change ${changeClass}`}>
          <span>{arrow}</span>
          <span>{changeAbs}%</span>
        </div>
      </div>
    </div>
  )
}
