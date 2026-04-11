import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import './modal.css'

export default function LoginModal({ isOpen, onClose, onSwitchToRegister }) {
  const { login } = useAuth()
  const [usernameEmail, setUsernameEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setUsernameEmail('')
      setPassword('')
      setError('')
      setLoading(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(usernameEmail, password)
    setLoading(false)
    if (result.success) {
      onClose()
    } else {
      setError(result.error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Zamknij">✕</button>
        <h2 className="modal-title">Zaloguj się</h2>
        <form onSubmit={handleSubmit} className="modal-form">
          <label className="modal-label">
            Login lub e-mail
            <input
              className="modal-input"
              type="text"
              value={usernameEmail}
              onChange={e => setUsernameEmail(e.target.value)}
              required
              autoFocus
              autoComplete="username"
            />
          </label>
          <label className="modal-label">
            Hasło
            <input
              className="modal-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error && <p className="modal-error">{error}</p>}
          <button className="modal-btn" type="submit" disabled={loading}>
            {loading ? 'Logowanie…' : 'Zaloguj'}
          </button>
        </form>
        <p className="modal-switch">
          Nie masz konta?{' '}
          <button className="modal-link" onClick={onSwitchToRegister}>
            Zarejestruj się
          </button>
        </p>
      </div>
    </div>
  )
}
