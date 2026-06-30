import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMovimientos, getProductos } from './stock.service'

const PERIODOS = [
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes',    label: 'Este mes' },
  { key: '7dias',  label: 'Últimos 7 días' },
  { key: '30dias', label: 'Últimos 30 días' },
  { key: 'custom', label: 'Personalizado' },
]

function getRango(key, desdeCustom, hastaCustom) {
  const ahora = new Date()
  const hasta = new Date(ahora)
  hasta.setHours(23, 59, 59, 999)
  const desde = new Date(ahora)

  if (key === 'custom') {
    const d = desdeCustom ? new Date(desdeCustom + 'T00:00:00') : null
    const h = hastaCustom ? new Date(hastaCustom + 'T23:59:59') : null
    const label = desdeCustom && hastaCustom
      ? `${new Date(desdeCustom).toLocaleDateString('es-AR')} al ${new Date(hastaCustom).toLocaleDateString('es-AR')}`
      : 'personalizado'
    return { desde: d?.toISOString() || null, hasta: h?.toISOString() || null, label }
  }
  if (key === 'semana') {
    const dia = ahora.getDay()
    desde.setDate(ahora.getDate() - (dia === 0 ? 6 : dia - 1))
    desde.setHours(0, 0, 0, 0)
    const ini = desde.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    const fin = ahora.toLocaleDateString('es-AR',  { day: '2-digit', month: '2-digit' })
    return { desde: desde.toISOString(), hasta: hasta.toISOString(), label: `${ini} al ${fin}` }
  }
  if (key === 'mes') {
    desde.setDate(1)
    desde.setHours(0, 0, 0, 0)
    return {
      desde: desde.toISOString(), hasta: hasta.toISOString(),
      label: ahora.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    }
  }
  const dias = key === '7dias' ? 6 : 29
  desde.setDate(ahora.getDate() - dias)
  desde.setHours(0, 0, 0, 0)
  return {
    desde: desde.toISOString(), hasta: hasta.toISOString(),
    label: `últimos ${dias + 1} días`
  }
}

function agruparVentas(movs) {
  const mapa = {}
  movs
    .filter(m => m.tipo === 'salida' || m.tipo === 'salida_kit')
    .forEach(m => {
      const nombre = m.productos?.nombre || '(sin nombre)'
      if (!mapa[nombre]) mapa[nombre] = { nombre, cantidad: 0, total: 0 }
      mapa[nombre].cantidad += Math.abs(m.cantidad)
      mapa[nombre].total   += Math.abs(m.cantidad) * (m.precio_unitario || 0)
    })
  return Object.values(mapa).sort((a, b) => b.cantidad - a.cantidad)
}

function buildTexto({ rango, periodoLabel, productosVendidos, totalVentas, totalCosto, stockBajo }) {
  const ganancia = totalVentas - totalCosto
  const fmt = n => Number(n || 0).toLocaleString('es-AR')
  const lines = [
    `📊 RESUMEN ${periodoLabel.toUpperCase()} — KIOSCO`,
    `📅 ${rango.label}`,
    '',
    `💰 Ventas: $${fmt(totalVentas)}`,
    totalCosto > 0 ? `📥 Compras: $${fmt(totalCosto)}` : null,
    totalCosto > 0 ? `📈 Ganancia estimada: $${fmt(ganancia)}` : null,
    '',
  ].filter(l => l !== null)

  if (productosVendidos.length > 0) {
    lines.push('📦 PRODUCTOS VENDIDOS:')
    productosVendidos.slice(0, 20).forEach((p, i) => {
      lines.push(`  ${i + 1}. ${p.nombre} × ${p.cantidad}  $${fmt(p.total)}`)
    })
    if (productosVendidos.length > 20) {
      lines.push(`  ... y ${productosVendidos.length - 20} más`)
    }
    lines.push('')
  } else {
    lines.push('Sin ventas registradas en este período.')
    lines.push('')
  }

  if (stockBajo.length > 0) {
    lines.push(`⚠️ STOCK BAJO (${stockBajo.length}):`)
    stockBajo.forEach(p => {
      if (p.stock_actual === 0) lines.push(`  ❌ ${p.nombre} — SIN STOCK`)
      else lines.push(`  ⚠️ ${p.nombre} — ${p.stock_actual} uds (mín: ${p.stock_minimo})`)
    })
  }

  return lines.join('\n')
}

function fmt(n) { return Number(n || 0).toLocaleString('es-AR') }

export default function ResumenPage() {
  const navigate = useNavigate()
  const [periodo,     setPeriodo]     = useState('semana')
  const [desdeCustom, setDesdeCustom] = useState('')
  const [hastaCustom, setHastaCustom] = useState(new Date().toISOString().split('T')[0])
  const [loading,     setLoading]     = useState(false)
  const [resultado,   setResultado]   = useState(null)
  const [copiado,     setCopiado]     = useState(false)

  async function generar() {
    setLoading(true)
    setResultado(null)
    try {
      const rango = getRango(periodo, desdeCustom, hastaCustom)
      const [movs, productos] = await Promise.all([
        getMovimientos({ desde: rango.desde, hasta: rango.hasta, limit: 2000 }),
        getProductos()
      ])

      const ventasMov   = movs.filter(m => m.tipo === 'salida' || m.tipo === 'salida_kit')
      const entradasMov = movs.filter(m => m.tipo === 'entrada')
      const totalVentas = ventasMov.reduce((a, m) => a + Math.abs(m.cantidad) * (m.precio_unitario || 0), 0)
      const totalCosto  = entradasMov.reduce((a, m) => a + Math.abs(m.cantidad) * (m.precio_unitario || 0), 0)
      const productosVendidos = agruparVentas(movs)
      const stockBajo   = productos.filter(p => p.stock_actual <= p.stock_minimo)
      const periodoLabel = PERIODOS.find(p => p.key === periodo)?.label || ''

      const texto = buildTexto({ rango, periodoLabel, productosVendidos, totalVentas, totalCosto, stockBajo })

      setResultado({
        rango, texto, totalVentas, totalCosto, stockBajo,
        productosVendidos,
        nVentas:   ventasMov.length,
        nEntradas: entradasMov.length,
        ganancia:  totalVentas - totalCosto,
      })
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  async function copiar() {
    if (!resultado) return
    await navigator.clipboard.writeText(resultado.texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function compartirWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(resultado.texto)}`, '_blank')
  }


  return (
    <div className="page">
      <div className="page-header mt-4">
        <h1>Resumen</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Volver</button>
      </div>

      {/* Selector de período */}
      <div className="form-section-title">Período</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {PERIODOS.map(p => (
          <button
            key={p.key}
            className={`btn btn-sm ${periodo === p.key ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setPeriodo(p.key); setResultado(null) }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {periodo === 'custom' && (
        <div className="form-grid-2 mb-3">
          <div className="input-group">
            <label className="input-label">Desde</label>
            <input
              className="input"
              type="date"
              value={desdeCustom}
              onChange={e => { setDesdeCustom(e.target.value); setResultado(null) }}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Hasta</label>
            <input
              className="input"
              type="date"
              value={hastaCustom}
              onChange={e => { setHastaCustom(e.target.value); setResultado(null) }}
            />
          </div>
        </div>
      )}

      <button
        className="btn btn-primary btn-full mb-4"
        onClick={generar}
        disabled={loading || (periodo === 'custom' && !desdeCustom)}
      >
        {loading ? 'Generando...' : '📊 Generar resumen'}
      </button>

      {resultado && (
        <>
          {/* Cards de resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-label">Ventas</div>
              <div className="stat-value" style={{ fontSize: 18, color: 'var(--accent)' }}>
                ${fmt(resultado.totalVentas)}
              </div>
              <div className="stat-sub">{resultado.nVentas} operaciones</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Compras</div>
              <div className="stat-value" style={{ fontSize: 18 }}>
                ${fmt(resultado.totalCosto)}
              </div>
              <div className="stat-sub">{resultado.nEntradas} entradas</div>
            </div>
            <div className="stat-card" style={{
              borderColor: resultado.ganancia >= 0 ? 'var(--green)' : 'var(--red)'
            }}>
              <div className="stat-label">Ganancia est.</div>
              <div className="stat-value" style={{
                fontSize: 18,
                color: resultado.ganancia >= 0 ? 'var(--green)' : 'var(--red)'
              }}>
                ${fmt(resultado.ganancia)}
              </div>
            </div>
            <div className="stat-card" style={{
              borderColor: resultado.stockBajo.length > 0 ? 'var(--amber)' : 'var(--border)'
            }}>
              <div className="stat-label">Stock bajo</div>
              <div className="stat-value" style={{
                fontSize: 18,
                color: resultado.stockBajo.length > 0 ? 'var(--amber)' : 'var(--green)'
              }}>
                {resultado.stockBajo.length}
              </div>
              <div className="stat-sub">productos</div>
            </div>
          </div>

          {/* Top productos */}
          {resultado.productosVendidos.length > 0 && (
            <>
              <div className="form-section-title">
                Productos vendidos ({resultado.productosVendidos.length})
              </div>
              <div className="card mb-3">
                {resultado.productosVendidos.slice(0, 10).map((p, i) => (
                  <div
                    key={p.nombre}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 0',
                      borderBottom: i < Math.min(resultado.productosVendidos.length, 10) - 1
                        ? '1px solid var(--border)' : 'none'
                    }}
                  >
                    <div style={{
                      width: 22, textAlign: 'center',
                      fontSize: 12, color: 'var(--text3)', fontWeight: 700
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 500, color: 'var(--text)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {p.nombre}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                        ${fmt(p.total)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>× {p.cantidad} uds</div>
                    </div>
                  </div>
                ))}
                {resultado.productosVendidos.length > 10 && (
                  <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', paddingTop: 10 }}>
                    ... y {resultado.productosVendidos.length - 10} productos más en el resumen
                  </div>
                )}
              </div>
            </>
          )}

          {resultado.productosVendidos.length === 0 && (
            <div className="card mb-3 text-center" style={{ padding: 20 }}>
              <p>Sin ventas en este período</p>
            </div>
          )}

          {/* Stock bajo */}
          {resultado.stockBajo.length > 0 && (
            <>
              <div className="form-section-title">
                ⚠️ Stock bajo ({resultado.stockBajo.length})
              </div>
              <div className="card mb-3">
                {resultado.stockBajo.map(p => (
                  <div key={p.id} className="product-item">
                    <div className="product-icon">📦</div>
                    <div className="product-info">
                      <div className="product-name">{p.nombre}</div>
                      <div className="product-meta">mín: {p.stock_minimo}</div>
                    </div>
                    <div className={`stock-count ${p.stock_actual === 0 ? 'stock-low' : 'stock-warn'}`}>
                      {p.stock_actual}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Compartir */}
          <div className="form-section-title">Compartir resumen</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <button className="btn btn-success btn-full" onClick={compartirWhatsApp}>
              💬 Compartir por WhatsApp
            </button>
            <button className="btn btn-ghost btn-full" onClick={copiar}>
              {copiado ? '✓ ¡Texto copiado!' : '📋 Copiar texto'}
            </button>
          </div>

          {/* Preview del texto */}
          <div className="form-section-title">Vista previa del mensaje</div>
          <div className="card" style={{ marginBottom: 24 }}>
            <pre style={{
              fontFamily: 'monospace', fontSize: 12, color: 'var(--text2)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7
            }}>
              {resultado.texto}
            </pre>
          </div>
        </>
      )}
    </div>
  )
}
