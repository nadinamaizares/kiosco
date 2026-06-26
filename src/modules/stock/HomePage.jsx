import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStatsStock, getProductos } from './stock.service'

export default function HomePage() {
  const navigate = useNavigate()
  const [stats,   setStats]   = useState({ total: 0, bajoMin: 0, sinStock: 0 })
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [s, productos] = await Promise.all([
          getStatsStock(),
          getProductos()
        ])
        setStats(s)
        setAlertas(productos.filter(p => p.stock_actual <= p.stock_minimo).slice(0, 5))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="page">
      <div className="page-header mt-4">
        <div>
          <h1>Inicio</h1>
          <p className="mt-1">{saludo} 👋</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total productos</div>
          <div className="stat-value">{loading ? '—' : stats.total}</div>
          <div className="stat-sub">en catálogo</div>
        </div>
        <div className="stat-card" style={{ borderColor: stats.bajoMin > 0 ? 'var(--amber)' : 'var(--border)' }}>
          <div className="stat-label">Stock bajo</div>
          <div className="stat-value" style={{ color: stats.bajoMin > 0 ? 'var(--amber)' : 'var(--text)' }}>
            {loading ? '—' : stats.bajoMin}
          </div>
          <div className="stat-sub">bajo mínimo</div>
        </div>
        <div className="stat-card" style={{ borderColor: stats.sinStock > 0 ? 'var(--red)' : 'var(--border)' }}>
          <div className="stat-label">Sin stock</div>
          <div className="stat-value" style={{ color: stats.sinStock > 0 ? 'var(--red)' : 'var(--text)' }}>
            {loading ? '—' : stats.sinStock}
          </div>
          <div className="stat-sub">sin unidades</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Acceso rápido</div>
          <button
            className="btn btn-primary btn-sm mt-2"
            style={{ width: '100%' }}
            onClick={() => navigate('/salida')}
          >
            Vender
          </button>
        </div>
      </div>

      {/* Acciones rápidas */}
      <h3 className="mb-3">Acciones rápidas</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        <button className="card" style={{ textAlign:'left', cursor:'pointer', border:'1px solid var(--border)' }}
          onClick={() => navigate('/salida')}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>🛒</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Venta</div>
          <div className="text-muted text-sm">Escaneá o buscá</div>
        </button>
        <button className="card" style={{ textAlign:'left', cursor:'pointer', border:'1px solid var(--border)' }}
          onClick={() => navigate('/entrada')}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>📥</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Entrada de stock</div>
          <div className="text-muted text-sm">Agregar mercadería</div>
        </button>
      </div>

      {/* Alertas de stock */}
      {alertas.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h3>⚠️ Alertas de stock</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/inventario')}>
              Ver todo
            </button>
          </div>
          <div className="card">
            {alertas.map(p => (
              <div key={p.id} className="product-item">
                <div className="product-icon">📦</div>
                <div className="product-info">
                  <div className="product-name">{p.nombre}</div>
                  <div className="product-meta">{p.marca} · mín {p.stock_minimo}</div>
                </div>
                <div className="product-stock">
                  <div className={`stock-count ${p.stock_actual === 0 ? 'stock-low' : 'stock-warn'}`}>
                    {p.stock_actual}
                  </div>
                  <div className="text-xs text-muted">unid.</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && alertas.length === 0 && (
        <div className="card text-center" style={{ padding: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 600 }}>Todo en orden</div>
          <p className="mt-1">No hay productos bajo el stock mínimo</p>
        </div>
      )}
    </div>
  )
}
