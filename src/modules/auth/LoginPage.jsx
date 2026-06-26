import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../shared/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="login-page">
      <div className="login-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="32" height="32">
          <path d="M3 9l1-5h16l1 5"/>
          <path d="M3 9a2 2 0 004 0 2 2 0 004 0 2 2 0 004 0 2 2 0 004 0"/>
          <path d="M5 9v11a1 1 0 001 1h12a1 1 0 001-1V9"/>
          <line x1="9" y1="14" x2="15" y2="14"/>
        </svg>
      </div>

      <div className="login-card">
        <h2 className="text-center mb-4">Kiosko</h2>
        <p className="text-center text-muted mb-4" style={{ fontSize: 13 }}>
          Sistema de gestión para kioscos
        </p>

        <form onSubmit={handleLogin}>
          <div className="input-group mb-3">
            <label className="input-label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="usuario@kiosko.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group mb-4">
            <label className="input-label">Contraseña</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 12px',
              background: 'var(--red-dim)',
              color: 'var(--red)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              marginBottom: 16
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-4">
          ¿Olvidaste la contraseña? Contactá al administrador.
        </p>
      </div>
    </div>
  )
}
