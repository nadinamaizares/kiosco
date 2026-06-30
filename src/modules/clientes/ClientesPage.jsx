import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getClientes, getDeudaTotal, getFiadosCliente,
  buildMensajeRecordatorio
} from './clientes.service'
import { notificar } from '../../shared/notificaciones.service'
import { useToast, ToastContainer } from '../../shared/useToast.jsx'

export default function ClientesPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [clientes, setClientes] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [deudas, setDeudas] = useState({})
  const [enviando, setEnviando] = useState(null)

  const cargar = useCallback(async (q = '') => {
    setLoading(true)
    try {
      const data = await getClientes({ search: q })
      setClientes(data)
      const map = {}
      await Promise.all(data.map(async c => {
        map[c.id] = await getDeudaTotal(c.id)
      }))
      setDeudas(map)
    } catch (err) {
      toast.error('Error al cargar clientes: ' + err.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function buscar(q) {
    setBusqueda(q)
    await cargar(q)
  }

  async function enviarRecordatorio(e, cliente) {
    e.stopPropagation()
    setEnviando(cliente.id)
    try {
      const deuda = deudas[cliente.id] || 0
      if (deuda <= 0) {
        toast.info(`${cliente.nombre} no tiene deuda pendiente`)
        setEnviando(null)
        return
      }
      const fiados = await getFiadosCliente(cliente.id)
      const msg = buildMensajeRecordatorio(cliente, deuda, fiados)
      const r = await notificar({ cliente, mensaje: msg })
      if (r.whatsapp === 'sin_numero' && r.email === 'sin_email') {
        toast.error('El cliente no tiene celular ni email')
      } else if (r.whatsapp === 'error' || r.email === 'error') {
        toast.error('Recordatorio enviado con errores — revisá la configuración')
      } else {
        toast.success('Recordatorio enviado')
      }
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
    setEnviando(null)
  }

  return (
    <div className="page">
      <ToastContainer toasts={toast.toasts} />

      <div className="page-header mt-4">
        <h1>Clientes</h1>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/clientes/nuevo')}>
          + Nuevo
        </button>
      </div>

      <input
        className="input mb-3"
        placeholder="Buscar por nombre, apellido o DNI..."
        value={busqueda}
        onChange={e => buscar(e.target.value)}
      />

      {loading ? (
        <p className="text-muted text-center">Cargando...</p>
      ) : clientes.length === 0 ? (
        <div className="empty">
          <p>{busqueda ? 'Sin resultados para la búsqueda' : 'No hay clientes aún. Agregá el primero.'}</p>
        </div>
      ) : (
        <div className="card">
          {clientes.map(c => {
            const deuda = deudas[c.id] || 0
            return (
              <div
                key={c.id}
                className="product-item"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/clientes/${c.id}`)}
              >
                <div className="product-icon" style={{ fontSize: 20 }}>👤</div>

                <div className="product-info">
                  <div className="product-name">{c.apellido}, {c.nombre}</div>
                  <div className="product-meta">
                    {c.celular}
                    {deuda > 0 && (
                      <span style={{ color: 'var(--red)', marginLeft: 8, fontWeight: 600 }}>
                        · Debe ${Number(deuda).toLocaleString('es-AR')}
                      </span>
                    )}
                    {deuda === 0 && (
                      <span className="badge badge-green" style={{ marginLeft: 8 }}>Al día</span>
                    )}
                  </div>
                </div>

                {deuda > 0 && (
                  <button
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 20, padding: '4px 8px', flexShrink: 0,
                      opacity: enviando === c.id ? 0.4 : 1
                    }}
                    onClick={e => enviarRecordatorio(e, c)}
                    disabled={enviando === c.id}
                    title="Enviar recordatorio"
                  >
                    🔔
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
