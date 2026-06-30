import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getClienteById, getFiadosCliente, getDeudaTotal,
  registrarPagoCliente, buildMensajeRecordatorio
} from './clientes.service'
import { notificar } from '../../shared/notificaciones.service'
import { useToast, ToastContainer } from '../../shared/useToast.jsx'

function fmt(n) { return Number(n || 0).toLocaleString('es-AR') }

function formatFecha(iso) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

export default function ClienteDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [cliente,       setCliente]       = useState(null)
  const [fiados,        setFiados]        = useState([])
  const [deuda,         setDeuda]         = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [montoPago,     setMontoPago]     = useState('')
  const [guardando,     setGuardando]     = useState(false)
  const [verHistorial,  setVerHistorial]  = useState(false)
  const [enviando,      setEnviando]      = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [c, f, d] = await Promise.all([
        getClienteById(id),
        getFiadosCliente(id),
        getDeudaTotal(id)
      ])
      setCliente(c)
      setFiados(f)
      setDeuda(d)
    } catch (err) {
      toast.error('Error al cargar: ' + err.message)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  /* Pago */
  async function confirmarPago() {
    const monto = parseFloat(montoPago)
    if (!monto || monto <= 0) return toast.error('Ingresá un monto válido')
    if (monto > deuda)        return toast.error(`La deuda es $${fmt(deuda)}`)
    setGuardando(true)
    try {
      await registrarPagoCliente(id, monto)
      toast.success(`✓ Pago de $${fmt(monto)} registrado`)
      setMontoPago('')
      await cargar()
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
    setGuardando(false)
  }

  /* Recordatorio */
  async function enviarRecordatorio() {
    if (deuda <= 0) return toast.info('Este cliente no tiene deuda pendiente')
    setEnviando(true)
    try {
      const msg = buildMensajeRecordatorio(cliente, deuda, fiados)
      const r = await notificar({ cliente, mensaje: msg })
      if (r.whatsapp === 'sin_numero' && r.email === 'sin_email') {
        toast.error('El cliente no tiene celular ni email')
      } else {
        toast.success('Recordatorio enviado')
      }
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
    setEnviando(false)
  }

  if (loading) {
    return <div className="page"><p className="text-muted text-center mt-4">Cargando...</p></div>
  }
  if (!cliente) {
    return <div className="page"><p className="text-muted text-center mt-4">Cliente no encontrado</p></div>
  }

  const pendientes = fiados.filter(f => f.estado !== 'pagado')
  const pagados    = fiados.filter(f => f.estado === 'pagado')

  /* Todos los items pendientes, ordenados de más viejo a más nuevo */
  const itemsPendientes = pendientes
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  return (
    <div className="page">
      <ToastContainer toasts={toast.toasts} />

      {/* ── Header ── */}
      <div className="page-header mt-4">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/clientes')}>
          ← Clientes
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {deuda > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={enviarRecordatorio}
              disabled={enviando}
              title="Enviar recordatorio"
            >
              {enviando ? '...' : '🔔'}
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/clientes/${id}/editar`)}>
            Editar
          </button>
        </div>
      </div>

      {/* ── Ficha del cliente ── */}
      <div className="card mb-3">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
            background: 'var(--accent-dim)', border: '2px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
          }}>👤</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>
              {cliente.nombre} {cliente.apellido}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {cliente.dni     && <span>DNI {cliente.dni}</span>}
              {cliente.celular && <span>📱 {cliente.celular}</span>}
              {cliente.mail    && <span>✉️ {cliente.mail}</span>}
            </div>
          </div>
        </div>

        {/* Total deuda */}
        <div style={{
          marginTop: 14, padding: '14px 16px',
          background: deuda > 0 ? 'var(--red-dim)' : 'var(--green-dim)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: deuda > 0 ? 'var(--red)' : 'var(--green)' }}>
            {deuda > 0 ? 'Total que debe' : '✓ Sin deuda'}
          </span>
          {deuda > 0 && (
            <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--red)' }}>
              ${fmt(deuda)}
            </span>
          )}
        </div>
      </div>

      {/* ── Registrar pago ── */}
      {deuda > 0 && (
        <div className="card mb-3">
          <div className="form-section-title" style={{ marginBottom: 10 }}>
            💵 Registrar pago en efectivo
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              type="number"
              placeholder={`Máx $${fmt(deuda)}`}
              value={montoPago}
              onChange={e => setMontoPago(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmarPago()}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-success"
              onClick={confirmarPago}
              disabled={guardando || !montoPago}
              style={{ flexShrink: 0 }}
            >
              {guardando ? '...' : 'Registrar'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, fontSize: 12 }}
              onClick={() => setMontoPago(String(deuda))}
            >
              Paga todo (${fmt(deuda)})
            </button>
            {[10000, 20000, 50000].map(v => v <= deuda && (
              <button
                key={v}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 12 }}
                onClick={() => setMontoPago(String(v))}
              >
                ${fmt(v)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Botón nuevo fiado ── */}
      <button
        className="btn btn-primary btn-full mb-4"
        onClick={() => navigate(`/clientes/${id}/fiado`)}
      >
        + Agregar fiado
      </button>

      {/* ── Libreta: items pendientes ── */}
      {itemsPendientes.length === 0 ? (
        <div className="empty"><p>No hay fiados pendientes</p></div>
      ) : (
        <>
          <div className="form-section-title">
            Libreta — {pendientes.length} compra{pendientes.length !== 1 ? 's' : ''} pendiente{pendientes.length !== 1 ? 's' : ''}
          </div>

          {itemsPendientes.map(f => {
            const pendiente = Number(f.total) - Number(f.pagado)
            return (
              <div key={f.id} className="card mb-2">
                {/* Cabecera del grupo */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>
                    📅 {formatFecha(f.created_at)}
                    {f.notas && <span style={{ marginLeft: 6, fontWeight: 400 }}>· {f.notas}</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {f.estado === 'pagado_parcial' && (
                      <span className="badge badge-amber" style={{ display: 'block', marginBottom: 2 }}>
                        Pagó ${fmt(f.pagado)}
                      </span>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>
                      Resta: ${fmt(pendiente)}
                    </span>
                  </div>
                </div>

                {/* Items */}
                {f.fiado_items?.length > 0 ? (
                  f.fiado_items.map(item => (
                    <div key={item.id} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0', fontSize: 13,
                      borderTop: '1px solid var(--border)'
                    }}>
                      <span style={{ color: 'var(--text)' }}>
                        {item.producto_nombre}
                        <span style={{ color: 'var(--text3)', marginLeft: 4 }}>× {item.cantidad}</span>
                      </span>
                      <span style={{ color: 'var(--accent)', fontWeight: 500, flexShrink: 0, marginLeft: 8 }}>
                        ${fmt(item.subtotal)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                    Sin detalle de productos
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* ── Historial de pagados ── */}
      {pagados.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setVerHistorial(v => !v)}
            style={{ width: '100%', marginBottom: 8, fontSize: 12 }}
          >
            {verHistorial ? '▲ Ocultar historial' : `▼ Ver historial pagado (${pagados.length})`}
          </button>

          {verHistorial && pagados.map(f => (
            <div key={f.id} className="card mb-2" style={{ opacity: 0.65 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  📅 {formatFecha(f.created_at)}
                </div>
                <span className="badge badge-green">Pagado ${fmt(f.total)}</span>
              </div>
              {f.fiado_items?.map(item => (
                <div key={item.id} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '5px 0', fontSize: 12,
                  borderTop: '1px solid var(--border)',
                  textDecoration: 'line-through', color: 'var(--text3)'
                }}>
                  <span>{item.producto_nombre} × {item.cantidad}</span>
                  <span>${fmt(item.subtotal)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
