import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProductos } from '../stock/stock.service'
import {
  registrarFiado, getClienteById,
  buildMensajeCompra
} from './clientes.service'
import { notificar, resumenNotificacion } from '../../shared/notificaciones.service'
import { useToast, ToastContainer } from '../../shared/useToast.jsx'

export default function NuevoFiadoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [cliente, setCliente] = useState(null)
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmado, setConfirmado] = useState(null) // { total, notif }
  const [showManual, setShowManual] = useState(false)
  const [manual, setManual] = useState({ nombre: '', precio: '', cantidad: '1' })

  useEffect(() => {
    getClienteById(id)
      .then(setCliente)
      .catch(() => toast.error('Error al cargar cliente'))
  }, [id])

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

  function agregarProducto(prod) {
    setCarrito(prev => {
      const existe = prev.find(i => i.producto_id === prod.id)
      if (existe) {
        return prev.map(i => i.producto_id === prod.id
          ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
          : i
        )
      }
      return [...prev, {
        producto_id:     prod.id,
        producto_nombre: [prod.nombre, prod.marca].filter(Boolean).join(' '),
        cantidad:        1,
        precio_unitario: Number(prod.precio_venta) || 0,
        subtotal:        Number(prod.precio_venta) || 0
      }]
    })
    setBusqueda('')
    setResultados([])
  }

  function agregarManual() {
    if (!manual.nombre.trim()) return toast.error('Ingresá el nombre del producto')
    const precio = parseFloat(manual.precio) || 0
    const cant   = Math.max(1, parseInt(manual.cantidad) || 1)
    setCarrito(prev => [...prev, {
      producto_id:     null,
      producto_nombre: manual.nombre.trim(),
      cantidad:        cant,
      precio_unitario: precio,
      subtotal:        precio * cant
    }])
    setManual({ nombre: '', precio: '', cantidad: '1' })
    setShowManual(false)
  }

  function setCantidad(idx, val) {
    if (val < 1) { eliminar(idx); return }
    setCarrito(prev => prev.map((i, n) => n === idx
      ? { ...i, cantidad: val, subtotal: val * i.precio_unitario }
      : i
    ))
  }

  function eliminar(idx) {
    setCarrito(prev => prev.filter((_, n) => n !== idx))
  }

  const total = carrito.reduce((acc, i) => acc + i.subtotal, 0)

  async function confirmar() {
    if (carrito.length === 0) return toast.error('El carrito está vacío')
    setSaving(true)
    try {
      await registrarFiado({ cliente_id: id, items: carrito, notas })
      const mensaje = buildMensajeCompra(cliente, carrito, total)
      const notif = await notificar({ cliente, mensaje })
      setConfirmado({ total, notif })
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
    setSaving(false)
  }

  /* ── Pantalla de éxito ── */
  if (confirmado) {
    const resumen = resumenNotificacion(confirmado.notif)
    return (
      <div className="page">
        <div style={{ textAlign: 'center', padding: '40px 0 24px' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
          <h2>¡Fiado registrado!</h2>
          <p className="mt-2">
            Total:{' '}
            <strong style={{ color: 'var(--accent)' }}>
              ${Number(confirmado.total).toLocaleString('es-AR')}
            </strong>
          </p>
          {resumen && (
            <div style={{
              marginTop: 16, padding: '10px 16px',
              background: 'var(--green-dim)', borderRadius: 'var(--radius-md)',
              fontSize: 13, color: 'var(--green)'
            }}>
              Notificación enviada: {resumen}
            </div>
          )}
          {confirmado.notif?.whatsapp === 'error' && (
            <div style={{
              marginTop: 8, padding: '10px 16px',
              background: 'var(--red-dim)', borderRadius: 'var(--radius-md)',
              fontSize: 13, color: 'var(--red)'
            }}>
              WhatsApp falló. Revisá la configuración de UltraMsg.
            </div>
          )}
        </div>

        <button
          className="btn btn-ghost btn-full mt-4"
          onClick={() => navigate(`/clientes/${id}`)}
        >
          Ver ficha del cliente
        </button>
      </div>
    )
  }

  /* ── Formulario ── */
  return (
    <div className="page">
      <ToastContainer toasts={toast.toasts} />

      <div className="page-header mt-4">
        <h1>Nuevo fiado</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/clientes/${id}`)}>
          ← Volver
        </button>
      </div>

      {cliente && (
        <div style={{
          padding: '10px 14px', background: 'var(--surface2)',
          borderRadius: 'var(--radius-md)', marginBottom: 14, fontSize: 13
        }}>
          Para:{' '}
          <strong style={{ color: 'var(--text)' }}>
            {cliente.nombre} {cliente.apellido}
          </strong>
        </div>
      )}

      {/* Buscar en inventario */}
      <div className="form-section-title">Agregar productos</div>
      <input
        className="input mb-2"
        placeholder="Buscar en inventario..."
        value={busqueda}
        onChange={e => buscar(e.target.value)}
      />

      {buscando && <p className="text-muted text-center">Buscando...</p>}

      {resultados.length > 0 && (
        <div className="card mb-3">
          {resultados
            .filter(r => !carrito.find(i => i.producto_id === r.id))
            .map(p => (
              <div
                key={p.id}
                className="product-item"
                style={{ cursor: 'pointer' }}
                onClick={() => agregarProducto(p)}
              >
                <div className="product-icon">📦</div>
                <div className="product-info">
                  <div className="product-name">{p.nombre}</div>
                  <div className="product-meta">
                    {p.marca} · ${Number(p.precio_venta || 0).toLocaleString('es-AR')}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm">+ Agregar</button>
              </div>
            ))}
        </div>
      )}

      {/* Item manual */}
      <button
        className="btn btn-outline btn-sm mb-3"
        onClick={() => setShowManual(!showManual)}
      >
        {showManual ? '✕ Cancelar' : '+ Producto manual (no está en stock)'}
      </button>

      {showManual && (
        <div className="card mb-3">
          <div className="input-group mb-3">
            <label className="input-label">Nombre del producto</label>
            <input
              className="input"
              placeholder="Ej: Medias, golosina, etc."
              value={manual.nombre}
              onChange={e => setManual(m => ({ ...m, nombre: e.target.value }))}
              autoFocus
            />
          </div>
          <div className="form-grid-2">
            <div className="input-group">
              <label className="input-label">Precio ($)</label>
              <input
                className="input"
                type="number"
                min="0"
                placeholder="0"
                value={manual.precio}
                onChange={e => setManual(m => ({ ...m, precio: e.target.value }))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Cantidad</label>
              <input
                className="input"
                type="number"
                min="1"
                value={manual.cantidad}
                onChange={e => setManual(m => ({ ...m, cantidad: e.target.value }))}
              />
            </div>
          </div>
          <button className="btn btn-ghost btn-full btn-sm mt-3" onClick={agregarManual}>
            + Agregar al fiado
          </button>
        </div>
      )}

      {/* Carrito */}
      {carrito.length > 0 ? (
        <>
          <div className="form-section-title">Productos fiados ({carrito.length})</div>
          <div className="card mb-3">
            {carrito.map((item, idx) => (
              <div key={idx} className="product-item">
                <div className="product-info">
                  <div className="product-name">{item.producto_nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 2 }}>
                    ${Number(item.precio_unitario).toLocaleString('es-AR')} c/u
                    {item.cantidad > 1 && (
                      <span style={{ color: 'var(--text3)', marginLeft: 6 }}>
                        = ${Number(item.subtotal).toLocaleString('es-AR')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="kit-item-qty">
                  <button className="qty-btn" onClick={() => setCantidad(idx, item.cantidad - 1)}>−</button>
                  <span className="qty-val">{item.cantidad}</span>
                  <button className="qty-btn" onClick={() => setCantidad(idx, item.cantidad + 1)}>+</button>
                </div>
              </div>
            ))}

            <div style={{
              borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12,
              display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 17
            }}>
              <span>Total</span>
              <span style={{ color: 'var(--accent)' }}>
                ${Number(total).toLocaleString('es-AR')}
              </span>
            </div>
          </div>

          <div className="input-group mb-4">
            <label className="input-label">Notas (opcional)</label>
            <input
              className="input"
              placeholder="Ej: Pagará el viernes"
              value={notas}
              onChange={e => setNotas(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={confirmar}
            disabled={saving}
          >
            {saving ? 'Registrando y enviando...' : '✓ Registrar fiado'}
          </button>
        </>
      ) : (
        !showManual && (
          <div className="empty">
            <p>Buscá o agregá productos al fiado</p>
          </div>
        )
      )}
    </div>
  )
}
