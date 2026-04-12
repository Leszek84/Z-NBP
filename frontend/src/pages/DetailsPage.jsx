import { useEffect, useState } from 'react'
import { getTrendingTokens } from '../api/gecko.js'
import { createChart } from 'lightweight-charts';
import TokenCard from '../components/TokenCard.jsx'
import './homepage.css'

export default function DetailsPage() {
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getTrendingTokens(12)
      .then(setTokens)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

    const chartOptions = { layout: { textColor: 'black', background: { type: 'solid', color: 'white' } } };
    const chart = createChart(document.getElementById('chart_container'), chartOptions);
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
    wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    });
    //TODO: dataset ściągany z api
    candlestickSeries.setData([
        { time: '2018-12-22', open: 75.16, high: 82.84, low: 36.16, close: 45.72 },
        { time: '2018-12-23', open: 45.12, high: 53.90, low: 45.12, close: 48.09 },
        { time: '2018-12-24', open: 60.71, high: 60.71, low: 53.39, close: 59.29 },
        { time: '2018-12-25', open: 68.26, high: 68.26, low: 59.04, close: 60.50 },
        { time: '2018-12-26', open: 67.71, high: 105.85, low: 66.67, close: 91.04 },
        { time: '2018-12-27', open: 91.04, high: 121.40, low: 82.70, close: 111.40 },
        { time: '2018-12-28', open: 111.51, high: 142.83, low: 103.34, close: 131.25 },
        { time: '2018-12-29', open: 131.33, high: 151.17, low: 77.68, close: 96.43 },
        { time: '2018-12-30', open: 106.33, high: 110.20, low: 90.39, close: 98.10 },
        { time: '2018-12-31', open: 109.87, high: 114.69, low: 85.66, close: 111.26 },
    ]);
    
    //TODO: apka ma wyświetlać dane jak w figmie
  return (
    <main className="home-page">
      <h2 className="home-page__title">Trending tokens</h2>

    {!loading && !error && (
        <div className="home-page__grid">
            {tokens.map(token => (
            <TokenCard key={token.id} {...token} />
            ))}
        </div>
    )}
    {!loading && !error && (
        <div className="chart_conteiner">
        </div>
    )}
    </main>
  )
}
