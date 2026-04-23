const BASE = '/api/market'

async function apiFetch(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

/**
 * @returns {Promise<Array<{id, name, symbol, price, priceChange24h, imageUrl}>>}
 */
export function getTrendingTokens(limit = 12) {
  return apiFetch(`${BASE}/trending/?limit=${limit}`)
}

/**
 * @returns {Promise<Array<{poolAddress, network, networkName, name, symbol, price, priceChange24h, imageUrl}>>}
 */
export function searchPools(query, limit = 8) {
  return apiFetch(`${BASE}/search/?query=${encodeURIComponent(query)}&limit=${limit}`)
}

/**
 * @returns {Promise<{name, symbol, price, priceChange24h, imageUrl, tokenAddress}>}
 */
export function getPoolDetails(network, poolAddress) {
  return apiFetch(`${BASE}/pools/${network}/${poolAddress}/`)
}

/**
 * @returns {Promise<Array<{time, open, high, low, close}>>}
 */
export function getOHLCV(network, poolAddress, timeframe = 'day', aggregate = 1, limit = 100) {
  return apiFetch(`${BASE}/pools/${network}/${poolAddress}/ohlcv/${timeframe}/?aggregate=${aggregate}&limit=${limit}`)
}

/**
 * @returns {Promise<Array<{poolAddress, dexName, price, volume24h}>>}
 */
export function getTokenPools(network, tokenAddress, limit = 10) {
  return apiFetch(`${BASE}/tokens/${network}/${tokenAddress}/pools/?limit=${limit}`)
}
