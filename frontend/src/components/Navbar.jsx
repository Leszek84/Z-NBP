import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import LoginModal from './modals/LoginModal.jsx'
import RegisterModal from './modals/RegisterModal.jsx'
import './navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [search, setSearch] = useState('')

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

        <div className="navbar-search">
          <svg className="navbar-search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <input
            className="navbar-search-input"
            type="text"
            placeholder="Szukaj tokena…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <a className="navbar-nav-link" href="/">Home</a>

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
