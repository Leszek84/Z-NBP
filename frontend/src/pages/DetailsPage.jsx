import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPoolDetails, getOHLCV, getTokenPools } from '../api/gecko.js'
import { useFavorites } from '../hooks/useFavorites.js'
import Chart from '../components/Chart.jsx'
import MarketSelector from '../components/MarketSelector.jsx'
import './detailspage.css'

function formatPrice(price) {
  if (!price) return '—'
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (price >= 1) return '$' + price.toFixed(4)
  if (price >= 0.0001) return '$' + price.toFixed(6)
  return '$' + price.toExponential(2)
}

const TIMEFRAMES = [
  { label: '1D',  value: 'day',    aggregate: 1 },
  { label: '4H',  value: 'hour',   aggregate: 4 },
  { label: '1H',  value: 'hour',   aggregate: 1 },
  { label: '15M', value: 'minute', aggregate: 15 },
  { label: '5M',  value: 'minute', aggregate: 5 },
]

export default function DetailsPage() {
  const { network, poolAddress } = useParams()

  const [token, setToken] = useState(null)
  const [tokenLoading, setTokenLoading] = useState(true)

  const [ohlcv, setOhlcv] = useState([])
  const [ohlcvLoading, setOhlcvLoading] = useState(true)
  const [activeTimeframe, setActiveTimeframe] = useState(TIMEFRAMES[0])

  const [markets, setMarkets] = useState([])
  const [marketsLoading, setMarketsLoading] = useState(false)
  const [activePool, setActivePool] = useState(poolAddress)

  const { isFavorite, toggleFavorite } = useFavorites()
  const fav = isFavorite(network, poolAddress)

  // Load token details + markets
  useEffect(() => {
    setTokenLoading(true)
    setToken(null)
    getPoolDetails(network, poolAddress)
      .then(data => {
        setToken(data)
        setTokenLoading(false)
        if (data.tokenAddress) {
          setMarketsLoading(true)
          return getTokenPools(network, data.tokenAddress)
        }
      })
      .then(pools => { if (pools) { setMarkets(pools); setMarketsLoading(false) } })
      .catch(() => { setTokenLoading(false); setMarketsLoading(false) })
  }, [network, poolAddress])

  // Load OHLCV when pool or timeframe changes
  useEffect(() => {
    setOhlcvLoading(true)
    getOHLCV(network, activePool, activeTimeframe.value, activeTimeframe.aggregate, 200)
      .then(data => { setOhlcv(data); setOhlcvLoading(false) })
      .catch(() => setOhlcvLoading(false))
  }, [network, activePool, activeTimeframe])

  const isUp = (token?.priceChange24h ?? 0) >= 0

  return (
    <main className="details-page">

      {/* Token header */}
      <div className="details-header">
        <div className="details-header__left">
          {token?.imageUrl
            ? <img className="details-header__icon" src={token.imageUrl} alt={token.symbol}
                onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }} />
            : null}
          <div className="details-header__icon-fallback"
            style={{ display: token?.imageUrl ? 'none' : 'flex' }}>
            {tokenLoading ? '?' : (token?.symbol || token?.name || '?')[0].toUpperCase()}
          </div>

          <div className="details-header__names">
            {tokenLoading
              ? <div className="details-header__skel details-header__skel--name" />
              : <>
                  <span className="details-header__name">{token?.name}</span>
                  {token?.symbol && <span className="details-header__symbol">{token.symbol}</span>}
                </>}
          </div>
        </div>

        <div className="details-header__center">
          {tokenLoading
            ? <div className="details-header__skel details-header__skel--price" />
            : <>
                <span className="details-header__price">{formatPrice(token?.price)}</span>
                <span className={`details-header__change ${isUp ? 'up' : 'down'}`}>
                  {isUp ? '▲' : '▼'} {Math.abs(token?.priceChange24h ?? 0).toFixed(2)}%
                </span>
              </>}
        </div>

        <div className="details-header__right">
          <button
            className={`details-header__fav${fav ? ' details-header__fav--active' : ''}`}
            aria-label={fav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
            title={fav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
            onClick={() => toggleFavorite(network, poolAddress)}
          >
            {fav ? '★' : '☆'}
          </button>
        </div>
      </div>

      {/* Chart + markets */}
      <div className="details-body">
        <div className="details-chart-area">
          <div className="details-timeframes">
            {TIMEFRAMES.map(tf => (
              <button key={tf.label}
                className={`details-tf-btn${activeTimeframe.label === tf.label ? ' details-tf-btn--active' : ''}`}
                onClick={() => setActiveTimeframe(tf)}>
                {tf.label}
              </button>
            ))}
          </div>
          <Chart data={ohlcv} loading={ohlcvLoading} />
        </div>

        <div className="details-markets">
          <MarketSelector
            pools={markets}
            loading={marketsLoading}
            activePool={activePool}
            onSelect={pool => setActivePool(pool.poolAddress)}
          />
        </div>
      </div>

      <footer className="details-footer">
        <p>TradingView Lightweight Charts™</p>
        <p>Copyright (c) 2025 TradingView, Inc. https://www.tradingview.com/</p>
      </footer>
    </main>
  )
}
