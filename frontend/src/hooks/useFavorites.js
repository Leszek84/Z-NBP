import { useState, useEffect } from 'react'

const STORAGE_KEY = 'dextracker_favorites'

function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveFavorites(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

/**
 * Zarządza listą ulubionych tokenów (zapisanych w localStorage).
 * Identyfikator to string `"network:poolAddress"`.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState(loadFavorites)

  // Synchronizuj między kartami przeglądarki
  useEffect(() => {
    function onStorage(e) {
      if (e.key === STORAGE_KEY) setFavorites(loadFavorites())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function isFavorite(network, poolAddress) {
    return favorites.includes(`${network}:${poolAddress}`)
  }

  function toggleFavorite(network, poolAddress) {
    const id = `${network}:${poolAddress}`
    setFavorites(prev => {
      const next = prev.includes(id)
        ? prev.filter(f => f !== id)
        : [...prev, id]
      saveFavorites(next)
      return next
    })
  }

  return { favorites, isFavorite, toggleFavorite }
}
