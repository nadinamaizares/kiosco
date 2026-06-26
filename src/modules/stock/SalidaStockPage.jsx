import { useState } from 'react'
import Scanner from '../../shared/Scanner'
import {
  getProductoPorCodigo, getProductos,
  registrarSalida, registrarSalidaKit
} from './stock.service'
import { useToast, ToastContainer } from '../../shared/useToast.jsx'

export default function SalidaStockPage() {
  const toast = useToast()
  const [step,      setStep]     = useState('inicio')
  const [modo,      setModo]     = useState(null)   // 'simple' | 'carrito'
  const [producto,  setProducto] = useState(null)
  const [cantidad,  setCantidad] = useState(1)
  const [carrito,   setCarrito]  = useState([])
  const [busqueda,  setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando,  setBuscando]  = useState(false)
  const [saving,    setSaving]    = useState(false)

  function reset() {
    setStep('inicio'); setModo(null); setProducto(null)
    setCantidad(1); setCarrito([]); setBusqueda(''); setResultados([])
  }

  async function onScanned(codigo) {
    try {
      const prod = await getProductoPorCodigo(codigo)
      if (!prod) {
        toast.error('Producto no encontrado. Buscalo manualmente.')
        setStep('buscar')
        return
      }
      setProducto(prod)
      setStep('confirmar')
    } catch {
      toast.error('Error al buscar el producto')
    }
  }

  function agregarAlCarrito(prod) {
    setCarrito(prev => {
      const exists = prev.find(i => i.producto_id === prod.id)
      if (exists) return prev.map(i => i.producto_id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      return [...prev, { producto_id: prod.id, nombre: prod.nombre, cantidad: 1, precio_unitario: prod.precio_venta, stock_actual: prod.stock_actual }]
    })
    setBusqueda('')
    setResultados([])
  }

  function setCarritoCantidad(producto_id, val) {
    if (val < 1) {
      setCarrito(prev => prev.filter(i => i.producto_id !== producto_id))
    } else {
      setCarrito(prev => prev.map(i => i.producto_id === producto_id ? { ...i, cantidad: val } : i))
    }
  }

  async function buscar(q) {
    setBusqueda(q)
    if (q.length < 2) { setResultados([]); return }
    setBuscando(true)
    try {
      const data = await getProductos({ search: q })
      setResultados(data.slice(0, 8))
    } catch {}
    setBuscando(false)
  }

  async function confirmar() {
    setSaving(true)
    try {
      if (modo === 'carrito') {
        if (carrito.length === 0) { toast.error('El carrito está vacío'); return }
        await registrarSalidaKit(carrito, 'Venta múltiple')
        toast.success(`Venta de ${carrito.length} producto${carrito.length > 1 ? 's' : ''} registrada`)
      } else {
        await registrarSalida({
          producto_id: producto.id,
          cantidad,
          precio_unitario: producto.precio_venta,
          tipo: 'salida'
        })
        toast.success(`Venta de ${cantidad} unidad${cantidad > 1 ? 'es' : ''} registrada`)
      }
      reset()
    } catch (err) {
      toast.error('Error al registrar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const totalCarrito = carrito.reduce((acc, i) => acc + (i.precio_unitario ? i.precio_unitario * i.cantidad : 0), 0)

  return (
    <div className="page">
      <ToastContainer toasts={toast.toasts} />

      <div className="page-header mt-4">
        <h1>Venta</h1>
        {step !== 'inicio' && (
          <button className="btn btn-ghost btn-sm" onClick={reset}>← Volver</button>
        )}
      </div>

      {/* ── Inicio ── */}
      {step === 'inicio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="card" style={{ textAlign:'left', cursor:'pointer', borderColor:'var(--accent)' }}
            onClick={() => { setModo('simple'); setStep('scanner') }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Escanear y vender</div>
            <p className="mt-1">Escaneá el código del producto para registrar la salida</p>
          </button>
          <button className="card" style={{ textAlign:'left', cursor:'pointer' }}
            onClick={() => { setModo('simple'); setStep('buscar') }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🔍</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Buscar por nombre</div>
            <p className="mt-1">Sin escáner, buscá el producto manualmente</p>
          </button>
          <button className="card" style={{ textAlign:'left', cursor:'pointer' }}
            onClick={() => { setModo('carrito'); setStep('carrito') }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🛒</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Venta múltiple</div>
            <p className="mt-1">Registrá varios productos en una sola operación</p>
          </button>
        </div>
      )}

      {/* ── Scanner ── */}
      {step === 'scanner' && (
        <div>
          <p className="text-muted mb-3">Apuntá la cámara al código de barras del producto</p>
          <Scanner onDetected={onScanned} onClose={() => setStep('buscar')} />
          <button className="btn btn-ghost btn-sm btn-full mt-2" onClick={() => setStep('buscar')}>
            Buscar por nombre
          </button>
        </div>
      )}

      {/* ── Búsqueda simple ── */}
      {step === 'buscar' && (
        <div>
          <input
            className="input mb-3"
            placeholder="Nombre del producto..."
            value={busqueda}
            onChange={e => buscar(e.target.value)}
            autoFocus
          />
          {buscando && <p className="text-muted text-center">Buscando...</p>}
          {resultados.length > 0 && (
            <div className="card">
              {resultados.map(p => (
                <div key={p.id} className="product-item" style={{ cursor: 'pointer' }}
                  onClick={() => { setProducto(p); setStep('confirmar') }}>
                  <div className="product-icon">📦</div>
                  <div className="product-info">
                    <div className="product-name">{p.nombre}</div>
                    <div className="product-meta">{p.marca}</div>
                  </div>
                  <div className="product-stock">
                    <div className={`stock-count ${p.stock_actual === 0 ? 'stock-low' : p.stock_actual <= p.stock_minimo ? 'stock-warn' : 'stock-ok'}`}>
                      {p.stock_actual}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Carrito ── */}
      {step === 'carrito' && (
        <div>
          <input
            className="input mb-3"
            placeholder="Buscar producto para agregar..."
            value={busqueda}
            onChange={e => buscar(e.target.value)}
            autoFocus
          />

          {buscando && <p className="text-muted text-center">Buscando...</p>}

          {resultados.length > 0 && (
            <div className="card mb-3">
              {resultados
                .filter(r => !carrito.find(i => i.producto_id === r.id))
                .map(p => (
                  <div key={p.id} className="product-item" style={{ cursor: 'pointer' }}
                    onClick={() => agregarAlCarrito(p)}>
                    <div className="product-icon">📦</div>
                    <div className="product-info">
                      <div className="product-name">{p.nombre}</div>
                      <div className="product-meta">{p.marca} · stock: {p.stock_actual}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm">+ Agregar</button>
                  </div>
                ))}
            </div>
          )}

          {carrito.length > 0 ? (
            <>
              <div className="form-section-title">Carrito ({carrito.length})</div>
              <div className="card mb-3">
                {carrito.map(i => (
                  <div key={i.producto_id} className="product-item">
                    <div className="product-info">
                      <div className="product-name">{i.nombre}</div>
                      {i.precio_unitario && (
                        <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 2 }}>
                          ${Number(i.precio_unitario).toLocaleString('es-AR')} c/u
                        </div>
                      )}
                    </div>
                    <div className="kit-item-qty">
                      <button className="qty-btn" onClick={() => setCarritoCantidad(i.producto_id, i.cantidad - 1)}>−</button>
                      <span className="qty-val">{i.cantidad}</span>
                      <button className="qty-btn" onClick={() => setCarritoCantidad(i.producto_id, i.cantidad + 1)}>+</button>
                    </div>
                  </div>
                ))}
                {totalCarrito > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--accent)' }}>${totalCarrito.toLocaleString('es-AR')}</span>
                  </div>
                )}
              </div>
              <button className="btn btn-danger btn-full btn-lg" onClick={confirmar} disabled={saving}>
                {saving ? 'Guardando...' : '✓ Confirmar venta'}
              </button>
            </>
          ) : (
            <div className="empty">
              <p>Buscá productos para agregar al carrito</p>
            </div>
          )}
        </div>
      )}

      {/* ── Confirmar venta simple ── */}
      {step === 'confirmar' && producto && (
        <div>
          <h3 className="mb-3">Confirmar venta</h3>

          <div className="card mb-3">
            <div className="product-item">
              <div className="product-icon">📦</div>
              <div className="product-info">
                <div className="product-name">{producto.nombre}</div>
                <div className="product-meta">{producto.marca}</div>
                {producto.precio_venta && (
                  <div style={{ fontSize: 13, marginTop: 4, color: 'var(--accent)' }}>
                    PV: <strong>${Number(producto.precio_venta).toLocaleString('es-AR')}</strong>
                  </div>
                )}
              </div>
              <div style={{ fontWeight: 700, color: 'var(--red)', marginTop: 2 }}>−{cantidad}</div>
            </div>

            {producto.precio_venta && (
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
                <span>Total</span>
                <span style={{ color: 'var(--accent)' }}>
                  ${(Number(producto.precio_venta) * cantidad).toLocaleString('es-AR')}
                </span>
              </div>
            )}
          </div>

          <div className="input-group mb-4">
            <label className="input-label">Cantidad</label>
            <input type="number" className="input" min="1"
              value={cantidad}
              onChange={e => setCantidad(Number(e.target.value))} />
          </div>

          {producto.stock_actual < cantidad && (
            <div style={{ padding: '10px 12px', background: 'var(--red-dim)', color: 'var(--red)', borderRadius: 'var(--radius-md)', fontSize: 13, marginBottom: 14 }}>
              ⚠️ Stock insuficiente: solo hay {producto.stock_actual} unidades
            </div>
          )}

          <button className="btn btn-danger btn-full btn-lg" onClick={confirmar} disabled={saving}>
            {saving ? 'Guardando...' : '✓ Confirmar venta'}
          </button>
          <button className="btn btn-ghost btn-full mt-2" onClick={reset}>Cancelar</button>
        </div>
      )}
    </div>
  )
}
