import { useEffect, useRef } from 'react'
import { createChart, CandlestickSeries } from 'lightweight-charts'
import './chart.css'

const CHART_OPTS = {
  autoSize: true,          // fills container width automatically
  layout: {
    background: { color: 'transparent' },
    textColor: '#9ca3af',
  },
  grid: {
    vertLines: { color: 'rgba(255,255,255,0.05)' },
    horzLines: { color: 'rgba(255,255,255,0.05)' },
  },
  crosshair: {
    vertLine: { color: 'rgba(255,255,255,0.2)' },
    horzLine: { color: 'rgba(255,255,255,0.2)' },
  },
  timeScale: {
    borderColor: 'rgba(255,255,255,0.1)',
    timeVisible: true,
  },
  rightPriceScale: {
    borderColor: 'rgba(255,255,255,0.1)',
  },
  handleScroll: true,
  handleScale: true,
}

const CANDLE_OPTS = {
  upColor: '#4ade80',
  downColor: '#f87171',
  borderUpColor: '#4ade80',
  borderDownColor: '#f87171',
  wickUpColor: '#4ade80',
  wickDownColor: '#f87171',
}

export default function Chart({ data, loading }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, CHART_OPTS)
    const series = chart.addSeries(CandlestickSeries, CANDLE_OPTS)

    chartRef.current = chart
    seriesRef.current = series

    return () => chart.remove()
  }, [])

  useEffect(() => {
    if (!seriesRef.current || !data || data.length === 0) return
    seriesRef.current.setData(data)
    chartRef.current.timeScale().fitContent()
  }, [data])

  return (
    <div className="chart-wrap">
      {loading && <div className="chart-loading"><span className="chart-spinner" /></div>}
      <div ref={containerRef} className="chart-container" />
    </div>
  )
}
