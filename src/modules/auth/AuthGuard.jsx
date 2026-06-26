import { Navigate } from 'react-router-dom'
import { useAuth } from '../../shared/AuthContext'

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
      Cargando...
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  return children
}
