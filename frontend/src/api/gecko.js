// Narazie api jest w frontendzie dla testów, nie jest zaimplementowane w backendzie

const BASE = 'https://api.geckoterminal.com/api/v2'
const HEADERS = { Accept: 'application/json;version=20230302' }

/**
 * @returns {Promise<Array<{id, name, symbol, price, priceChange24h, imageUrl}>>}
 */
export async function getTrendingTokens(limit = 12) {
  const res = await fetch(
    `${BASE}/networks/trending_pools?include=base_token&page=1`,
    { headers: HEADERS }
  )
  if (!res.ok) throw new Error(`GeckoTerminal error: ${res.status}`)
  const json = await res.json()

  // Build lookup map: token id → token attributes
  const tokenMap = {}
  for (const item of json.included ?? []) {
    if (item.type === 'token') tokenMap[item.id] = item.attributes
  }

  return json.data.slice(0, limit).map(pool => {
    const tokenId = pool.relationships?.base_token?.data?.id
    const token = tokenMap[tokenId] ?? {}
    return {
      id: pool.id,
      name: token.name || pool.attributes.name,
      symbol: token.symbol || '',
      price: parseFloat(pool.attributes.base_token_price_usd) || 0,
      priceChange24h: parseFloat(pool.attributes.price_change_percentage?.h24) || 0,
      imageUrl: token.image_url || null,
    }
  })
}

/**
 * @returns {{ name, symbol, price, priceChange24h, imageUrl, tokenAddress }}
 */
export async function getPoolDetails(network, poolAddress) {
  const res = await fetch(
    `${BASE}/networks/${network}/pools/${poolAddress}?include=base_token`,
    { headers: HEADERS }
  )
  if (!res.ok) throw new Error(`GeckoTerminal error: ${res.status}`)
  const json = await res.json()

  const pool = json.data
  const tokenMap = {}
  for (const item of json.included ?? []) {
    if (item.type === 'token') tokenMap[item.id] = item.attributes
  }

  const tokenId = pool.relationships?.base_token?.data?.id
  const token = tokenMap[tokenId] ?? {}
  const tokenAddress = tokenId ? tokenId.replace(`${network}_`, '') : null

  return {
    name: token.name || pool.attributes.name,
    symbol: token.symbol || '',
    price: parseFloat(pool.attributes.base_token_price_usd) || 0,
    priceChange24h: parseFloat(pool.attributes.price_change_percentage?.h24) || 0,
    imageUrl: token.image_url || null,
    tokenAddress,
  }
}

/**
 * @returns {Promise<Array<{time, open, high, low, close}>>}  sorted ascending
 */
export async function getOHLCV(network, poolAddress, timeframe = 'day', aggregate = 1, limit = 100) {
  const res = await fetch(
    `${BASE}/networks/${network}/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}&currency=usd&token=base`,
    { headers: HEADERS }
  )
  if (!res.ok) throw new Error(`GeckoTerminal error: ${res.status}`)
  const json = await res.json()

  const list = json.data?.attributes?.ohlcv_list ?? []
  // GeckoTerminal returns newest-first; lightweight-charts needs oldest-first
  return list
    .slice()
    .reverse()
    .map(([time, open, high, low, close]) => ({
      time: Math.floor(time),
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
    }))
}

/**
 * @returns {Promise<Array<{poolAddress, dexName, price, volume24h}>>}
 */
export async function getTokenPools(network, tokenAddress, limit = 10) {
  const res = await fetch(
    `${BASE}/networks/${network}/tokens/${tokenAddress}/pools?page=1`,
    { headers: HEADERS }
  )
  if (!res.ok) throw new Error(`GeckoTerminal error: ${res.status}`)
  const json = await res.json()

  return (json.data ?? []).slice(0, limit).map(pool => ({
    poolAddress: pool.attributes.address,
    dexName: pool.attributes.dex_id || pool.relationships?.dex?.data?.id || '—',
    price: parseFloat(pool.attributes.base_token_price_usd) || 0,
    volume24h: parseFloat(pool.attributes.volume_usd?.h24) || 0,
  }))
}

/**
 * @returns {Promise<Array<{poolAddress, network, networkName, name, symbol, price, priceChange24h, imageUrl}>>}
 */
export async function searchPools(query, limit = 8) {
  const res = await fetch(
    `${BASE}/search/pools?query=${encodeURIComponent(query)}&include=base_token`,
    { headers: HEADERS }
  )
  if (!res.ok) throw new Error(`GeckoTerminal error: ${res.status}`)
  const json = await res.json()

  // Same structure as trending_pools: data[] + included[]
  const tokenMap = {}
  for (const item of json.included ?? []) {
    if (item.type === 'token') tokenMap[item.id] = item.attributes
  }

  return (json.data ?? []).slice(0, limit).map(pool => {
    const tokenId = pool.relationships?.base_token?.data?.id
    const token = tokenMap[tokenId] ?? {}

    // network = part of id before first underscore (e.g. "eth_0xabc" → "eth")
    const underscoreIdx = (pool.id ?? '').indexOf('_')
    const network = underscoreIdx >= 0 ? pool.id.slice(0, underscoreIdx) : ''
    const poolAddress = underscoreIdx >= 0 ? pool.id.slice(underscoreIdx + 1) : pool.id

    return {
      poolAddress,
      network,
      networkName: network.toUpperCase(),
      name: token.name || pool.attributes.name,
      symbol: token.symbol || '',
      price: parseFloat(pool.attributes.base_token_price_usd) || 0,
      priceChange24h: parseFloat(pool.attributes.price_change_percentage?.h24) || 0,
      imageUrl: token.image_url || null,
    }
  })
}
