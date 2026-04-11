// Narazie api jest w frontendzie dla testów, nie jest zaimplementowane w backendzie

const BASE = 'https://api.geckoterminal.com/api/v2'

/**
 * @returns {Promise<Array<{id, name, symbol, price, priceChange24h, imageUrl}>>}
 */
export async function getTrendingTokens(limit = 12) {
  const res = await fetch(
    `${BASE}/networks/trending_pools?include=base_token&page=1`,
    { headers: { Accept: 'application/json;version=20230302' } }
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
