import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { crearCliente, actualizarCliente, getClienteById } from './clientes.service'
import { useToast, ToastContainer } from '../../shared/useToast.jsx'

const EMPTY = { nombre: '', apellido: '', dni: '', celular: '' }

export default function ClienteFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(id)

  useEffect(() => {
    if (!isEdit) return
    getClienteById(id)
      .then(c => setForm({
        nombre:   c.nombre   || '',
        apellido: c.apellido || '',
        dni:      c.dni      || '',
        celular:  c.celular  || ''
      }))
      .catch(() => toast.error('Error al cargar cliente'))
  }, [id, isEdit])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function guardar() {
    if (!form.nombre.trim())   return toast.error('El nombre es obligatorio')
    if (!form.apellido.trim()) return toast.error('El apellido es obligatorio')
    if (!form.celular.trim())  return toast.error('El celular es obligatorio')
    setSaving(true)
    try {
      const payload = {
        nombre:   form.nombre.trim(),
        apellido: form.apellido.trim(),
        dni:      form.dni.trim() || null,
        celular:  form.celular.trim()
      }
      if (isEdit) {
        await actualizarCliente(id, payload)
        toast.success('Cliente actualizado')
        navigate(`/clientes/${id}`, { replace: true })
      } else {
        const c = await crearCliente(payload)
        toast.success('Cliente creado')
        navigate(`/clientes/${c.id}`, { replace: true })
      }
    } catch (err) {
      toast.error('Error: ' + err.message)
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <ToastContainer toasts={toast.toasts} />

      <div className="page-header mt-4">
        <h1>{isEdit ? 'Editar cliente' : 'Nuevo cliente'}</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Volver</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        <div className="form-grid-2">
          <div className="input-group">
            <label className="input-label">Nombre *</label>
            <input
              className="input"
              placeholder="Juan"
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              autoFocus={!isEdit}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Apellido *</label>
            <input
              className="input"
              placeholder="Pérez"
              value={form.apellido}
              onChange={e => set('apellido', e.target.value)}
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Celular *</label>
          <input
            className="input"
            type="tel"
            placeholder="11 1234-5678"
            value={form.celular}
            onChange={e => set('celular', e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">DNI (opcional)</label>
          <input
            className="input"
            type="text"
            placeholder="12345678"
            value={form.dni}
            onChange={e => set('dni', e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={guardar}
          disabled={saving}
        >
          {saving ? 'Guardando...' : isEdit ? '✓ Guardar cambios' : '✓ Crear cliente'}
        </button>
      </div>
    </div>
  )
}
