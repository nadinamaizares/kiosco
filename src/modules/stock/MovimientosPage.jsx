import { useEffect, useState } from 'react'
import { getMovimientos } from './stock.service'

const TIPO_CONFIG = {
  entrada:    { label: 'Entrada', icon: '📥', cls: 'mov-entrada' },
  salida:     { label: 'Salida',  icon: '📤', cls: 'mov-salida'  },
  salida_kit: { label: 'Venta múltiple', icon: '🛒', cls: 'mov-kit' },
}

const PERIODOS = [
  { key: 'hoy',    label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes',    label: 'Mes' },
  { key: 'anio',   label: 'Año' },
  { key: 'todo',   label: 'Todo' },
]

function getRango(key) {
  const ahora = new Date()
  const hasta = new Date(ahora)
  hasta.setHours(23, 59, 59, 999)

  if (key === 'todo') return { desde: null, hasta: null }

  const desde = new Date(ahora)
  if (key === 'hoy') {
    desde.setHours(0, 0, 0, 0)
  } else if (key === 'semana') {
    desde.setDate(ahora.getDate() - 6)
    desde.setHours(0, 0, 0, 0)
  } else if (key === 'mes') {
    desde.setDate(1)
    desde.setHours(0, 0, 0, 0)
  } else if (key === 'anio') {
    desde.setMonth(0, 1)
    desde.setHours(0, 0, 0, 0)
  }
  return { desde: desde.toISOString(), hasta: hasta.toISOString() }
}

function formatFecha(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function fmt(n) {
  return Number(n || 0).toLocaleString('es-AR')
}

export default function MovimientosPage() {
  const [movs,    setMovs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')
  const [tipoFiltro, setTipoFiltro] = useState('')   // '' | 'entrada' | 'salida' | 'salida_kit'
  const [busqueda,   setBusqueda]   = useState('')

  useEffect(() => { load() }, [periodo])

  async function load() {
    setLoading(true)
    try {
      const { desde, hasta } = getRango(periodo)
      const data = await getMovimientos({ desde, hasta })
      setMovs(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtrados = movs.filter(m => {
    if (tipoFiltro && m.tipo !== tipoFiltro) return false
    if (busqueda && !m.productos?.nombre?.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  // Balance: solo movimientos de salida del período completo (sin filtro de tipo/producto)
  const ventas   = movs.filter(m => m.tipo === 'salida' || m.tipo === 'salida_kit')
  const entradas = movs.filter(m => m.tipo === 'entrada')

  const totalVentas  = ventas.reduce((acc, m) => acc + Math.abs(m.cantidad) * (m.precio_unitario || 0), 0)
  const totalCosto   = entradas.reduce((acc, m) => acc + Math.abs(m.cantidad) * (m.precio_unitario || 0), 0)
  const ganancia     = totalVentas - totalCosto

  return (
    <div className="page">
      <div className="page-header mt-4">
        <h1>Historial</h1>
        <span className="badge badge-gray">{filtrados.length}</span>
      </div>

      {/* Filtro período */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto' }}>
        {PERIODOS.map(p => (
          <button
            key={p.key}
            className={`btn btn-sm ${periodo === p.key ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setPeriodo(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Balance */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-label">Ventas</div>
            <div className="stat-value" style={{ fontSize: 16, color: 'var(--accent)' }}>${fmt(totalVentas)}</div>
            <div className="text-xs text-muted">{ventas.length} ops.</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Compras</div>
            <div className="stat-value" style={{ fontSize: 16 }}>${fmt(totalCosto)}</div>
            <div className="text-xs text-muted">{entradas.length} ops.</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Ganancia</div>
            <div className="stat-value" style={{ fontSize: 16, color: ganancia >= 0 ? 'var(--green)' : 'var(--red)' }}>
              ${fmt(ganancia)}
            </div>
            <div className="text-xs text-muted">estimada</div>
          </div>
        </div>
      )}

      {/* Filtros tipo + búsqueda */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {[['', 'Todos'], ['entrada', '📥 Entradas'], ['salida', '📤 Ventas'], ['salida_kit', '🛒 V. múltiple']].map(([v, l]) => (
          <button
            key={v}
            className={`btn btn-sm ${tipoFiltro === v ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTipoFiltro(v)}
          >
            {l}
          </button>
        ))}
      </div>

      <input
        className="input mb-3"
        placeholder="Buscar por producto..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
      />

      {/* Lista */}
      {loading ? (
        <div className="text-center text-muted" style={{ padding: 40 }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="empty"><p>No hay movimientos para este período</p></div>
      ) : (
        <div className="card">
          {filtrados.map(m => {
            const cfg = TIPO_CONFIG[m.tipo] || TIPO_CONFIG.salida
            const esEntrada = m.tipo === 'entrada'
            const qty = Math.abs(m.cantidad)
            const subtotal = qty * (m.precio_unitario || 0)
            return (
              <div key={m.id} className="mov-item">
                <div className={`mov-icon ${cfg.cls}`}>{cfg.icon}</div>
                <div className="mov-info">
                  <div className="mov-name">{m.productos?.nombre || '—'}</div>
                  <div className="mov-date">
                    {cfg.label} · {formatFecha(m.created_at)}
                  </div>
                  {subtotal > 0 && (
                    <div style={{ fontSize: 12, color: esEntrada ? 'var(--text3)' : 'var(--accent)', marginTop: 2 }}>
                      {qty} × ${fmt(m.precio_unitario)} = ${fmt(subtotal)}
                    </div>
                  )}
                </div>
                <div className={`mov-qty ${esEntrada ? 'text-green' : 'text-red'}`}>
                  {esEntrada ? '+' : '−'}{qty}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
