import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { searchPools } from '../api/gecko.js'
import LoginModal from './modals/LoginModal.jsx'
import RegisterModal from './modals/RegisterModal.jsx'
import SearchDropdown from './SearchDropdown.jsx'
import './navbar.css'

/** Sort results so exact/prefix symbol matches float to the top */
function sortByRelevance(results, query) {
  const q = query.toUpperCase()
  return [...results].sort((a, b) => {
    const scoreOf = r => {
      const sym = (r.symbol || '').toUpperCase()
      const name = (r.name || '').toUpperCase()
      if (sym === q) return 0
      if (sym.startsWith(q)) return 1
      if (name.startsWith(q)) return 2
      return 3
    }
    return scoreOf(a) - scoreOf(b)
  })
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)

  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const searchWrapRef = useRef(null)
  const inputRef = useRef(null)

  // Debounced search
  useEffect(() => {
    if (search.length < 2) {
      setResults([])
      setDropdownOpen(false)
      setActiveIndex(-1)
      return
    }

    setDropdownOpen(true)
    setSearching(true)
    setActiveIndex(-1)

    const timer = setTimeout(() => {
      searchPools(search)
        .then(data => {
          setResults(sortByRelevance(data, search))
          setSearching(false)
        })
        .catch(() => { setResults([]); setSearching(false) })
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setDropdownOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleKeyDown(e) {
    if (!dropdownOpen) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && results[activeIndex]) {
        handleSelect(results[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setDropdownOpen(false)
      setActiveIndex(-1)
      e.target.blur()
    }
  }

  function handleSelect(result) {
    // Fill input with selected token symbol and close dropdown
    setSearch(result.symbol || result.name)
    setDropdownOpen(false)
    setActiveIndex(-1)
    inputRef.current?.blur()
  }

  function openLogin() {
    setRegisterOpen(false)
    setLoginOpen(true)
  }

  function openRegister() {
    setLoginOpen(false)
    setRegisterOpen(true)
  }

  return (
    <>
      <nav className="navbar">
        <span className="navbar-brand">DexTracker</span>

        <div className="navbar-search-wrap" ref={searchWrapRef}>
          <div className="navbar-search">
            <svg className="navbar-search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <input
              ref={inputRef}
              className="navbar-search-input"
              type="text"
              placeholder="Szukaj tokena lub symbolu…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => search.length >= 2 && setDropdownOpen(true)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={dropdownOpen}
            />
            {search && (
              <button
                className="navbar-search-clear"
                onMouseDown={e => {
                  e.preventDefault()
                  setSearch('')
                  setDropdownOpen(false)
                  setActiveIndex(-1)
                  inputRef.current?.focus()
                }}
                aria-label="Wyczyść"
              >✕</button>
            )}
          </div>

          {dropdownOpen && (
            <SearchDropdown
              results={results}
              loading={searching}
              query={search}
              activeIndex={activeIndex}
              onSelect={handleSelect}
            />
          )}
        </div>

        <Link className="navbar-nav-link" to="/">Home</Link>

        <div className="navbar-actions">
          {user ? (
            <>
              <span className="navbar-user">{user.username}</span>
              <button className="navbar-btn navbar-btn--ghost" onClick={logout}>
                Wyloguj
              </button>
            </>
          ) : (
            <>
              <button className="navbar-btn navbar-btn--ghost" onClick={openLogin}>
                Zaloguj
              </button>
              <button className="navbar-btn navbar-btn--primary" onClick={openRegister}>
                Zarejestruj
              </button>
            </>
          )}
        </div>
      </nav>

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToRegister={openRegister}
      />
      <RegisterModal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSwitchToLogin={openLogin}
      />
    </>
  )
}
