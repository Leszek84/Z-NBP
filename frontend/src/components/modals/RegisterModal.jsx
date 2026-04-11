import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import './modal.css'

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin }) {
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setUsername('')
      setEmail('')
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
    const result = await register(username, email, password)
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
        <h2 className="modal-title">Zarejestruj się</h2>
        <form onSubmit={handleSubmit} className="modal-form">
          <label className="modal-label">
            Nazwa użytkownika
            <input
              className="modal-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
            />
          </label>
          <label className="modal-label">
            E-mail
            <input
              className="modal-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
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
              autoComplete="new-password"
            />
          </label>
          {error && <p className="modal-error">{error}</p>}
          <button className="modal-btn" type="submit" disabled={loading}>
            {loading ? 'Rejestracja…' : 'Zarejestruj'}
          </button>
        </form>
        <p className="modal-switch">
          Masz już konto?{' '}
          <button className="modal-link" onClick={onSwitchToLogin}>
            Zaloguj się
          </button>
        </p>
      </div>
    </div>
  )
}
