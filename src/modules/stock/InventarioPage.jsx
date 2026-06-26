import { useEffect, useState } from 'react'
import { getProductos, upsertProducto } from './stock.service'
import { useToast, ToastContainer } from '../../shared/useToast.jsx'

const CATEGORIAS = [
  { value: 'bebidas',     label: 'Bebidas' },
  { value: 'snacks',      label: 'Snacks y golosinas' },
  { value: 'lacteos',     label: 'Lácteos' },
  { value: 'almacen',     label: 'Almacén' },
  { value: 'cigarrillos', label: 'Cigarrillos y tabaco' },
  { value: 'higiene',     label: 'Higiene personal' },
  { value: 'limpieza',    label: 'Limpieza' },
  { value: 'otro',        label: 'Otro' },
]

const CAT_LABEL = {
  bebidas:     'Bebidas',
  snacks:      'Snacks',
  lacteos:     'Lácteos',
  almacen:     'Almacén',
  cigarrillos: 'Cigarrillos',
  higiene:     'Higiene',
  limpieza:    'Limpieza',
  otro:        'Otro',
}

export default function InventarioPage() {
  const toast = useToast()
  const [productos, setProductos] = useState([])
  const [search,    setSearch]    = useState('')
  const [categoria, setCategoria] = useState('')
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState(null)
  const [editing,   setEditing]   = useState(false)
  const [editForm,  setEditForm]  = useState({})
  const [saving,    setSaving]    = useState(false)

  useEffect(() => { load() }, [search, categoria])

  async function load() {
    setLoading(true)
    try {
      const data = await getProductos({ search, categoria })
      setProductos(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function stockClass(p) {
    if (p.stock_actual === 0) return 'stock-low'
    if (p.stock_actual <= p.stock_minimo) return 'stock-warn'
    return 'stock-ok'
  }

  function abrirModal(p) {
    setSelected(p)
    setEditing(false)
  }

  function abrirEdicion() {
    setEditForm({ ...selected })
    setEditing(true)
  }

  function campo(key, value) {
    if (key === 'precio_costo' && value) {
      setEditForm(f => ({ ...f, precio_costo: value, precio_venta: Math.round(value * 1.55) }))
    } else {
      setEditForm(f => ({ ...f, [key]: value }))
    }
  }

  async function guardarEdicion() {
    if (!editForm.nombre) return toast.error('El nombre es obligatorio')
    setSaving(true)
    try {
      const actualizado = await upsertProducto({
        id:             editForm.id,
        codigo_barras:  editForm.codigo_barras  || null,
        nombre:         editForm.nombre,
        marca:          editForm.marca          || null,
        categoria:      editForm.categoria      || null,
        especificacion: editForm.especificacion || null,
        precio_costo:   editForm.precio_costo   ? Number(editForm.precio_costo) : null,
        precio_venta:   editForm.precio_venta   ? Number(editForm.precio_venta)  : null,
        stock_minimo:   Number(editForm.stock_minimo) || 5,
        proveedor:      editForm.proveedor      || null,
      })
      toast.success('Producto actualizado')
      setSelected(actualizado)
      setEditing(false)
      await load()
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function cerrarModal() {
    setSelected(null)
    setEditing(false)
    setEditForm({})
  }

  return (
    <div className="page">
      <ToastContainer toasts={toast.toasts} />

      <div className="page-header mt-4">
        <h1>Inventario</h1>
        <span className="badge badge-gray">{productos.length} productos</span>
      </div>

      <input
        className="input mb-3"
        placeholder="Buscar por nombre..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <select
        className="select mb-4"
        value={categoria}
        onChange={e => setCategoria(e.target.value)}
      >
        <option value="">Todas las categorías</option>
        {CATEGORIAS.map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>

      {loading ? (
        <div className="text-center text-muted" style={{ padding: 40 }}>Cargando...</div>
      ) : productos.length === 0 ? (
        <div className="empty"><p>No se encontraron productos</p></div>
      ) : (
        <div className="card">
          {productos.map(p => (
            <div key={p.id} className="product-item" onClick={() => abrirModal(p)} style={{ cursor: 'pointer' }}>
              <div className="product-icon">📦</div>
              <div className="product-info">
                <div className="product-name">{p.nombre}</div>
                <div className="product-meta">
                  {p.marca && `${p.marca} · `}
                  {CAT_LABEL[p.categoria] || p.categoria}
                </div>
              </div>
              <div className="product-stock">
                <div className={`stock-count ${stockClass(p)}`}>{p.stock_actual}</div>
                <div className="text-xs text-muted">unid.</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <div className="modal-backdrop" onClick={cerrarModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">{selected.nombre}</div>

            {!editing ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <div className="stat-card">
                    <div className="stat-label">Stock actual</div>
                    <div className={`stat-value ${stockClass(selected)}`}>{selected.stock_actual}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Stock mínimo</div>
                    <div className="stat-value">{selected.stock_minimo}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">PC (costo)</div>
                    <div className="stat-value" style={{ fontSize: 17 }}>
                      {selected.precio_costo ? `$${Number(selected.precio_costo).toLocaleString('es-AR')}` : '—'}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">PV (venta)</div>
                    <div className="stat-value" style={{ fontSize: 17, color: 'var(--accent)' }}>
                      {selected.precio_venta ? `$${Number(selected.precio_venta).toLocaleString('es-AR')}` : '—'}
                    </div>
                  </div>
                </div>

                <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse', marginBottom: 16 }}>
                  {[
                    ['Marca',          selected.marca],
                    ['Categoría',      CAT_LABEL[selected.categoria] || selected.categoria],
                    ['Especificación', selected.especificacion],
                    ['Proveedor',      selected.proveedor],
                    ['Cód. barras',    selected.codigo_barras],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '9px 0', color: 'var(--text3)', width: '45%' }}>{k}</td>
                      <td style={{ padding: '9px 0', textAlign: 'right' }}>{v}</td>
                    </tr>
                  ))}
                </table>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary btn-full" onClick={abrirEdicion}>✏️ Editar</button>
                  <button className="btn btn-ghost btn-full" onClick={cerrarModal}>Cerrar</button>
                </div>
              </>
            ) : (
              <>
                <div className="input-group mb-3">
                  <label className="input-label">Nombre *</label>
                  <input className="input" value={editForm.nombre || ''} onChange={e => campo('nombre', e.target.value)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div className="input-group">
                    <label className="input-label">Marca</label>
                    <input className="input" value={editForm.marca || ''} onChange={e => campo('marca', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Categoría</label>
                    <select className="select" value={editForm.categoria || ''} onChange={e => campo('categoria', e.target.value)}>
                      <option value="">—</option>
                      {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="input-group mb-3">
                  <label className="input-label">Especificación</label>
                  <input className="input" value={editForm.especificacion || ''} onChange={e => campo('especificacion', e.target.value)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div className="input-group">
                    <label className="input-label">Precio costo ($)</label>
                    <input type="number" className="input" value={editForm.precio_costo || ''} onChange={e => campo('precio_costo', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Precio venta ($)</label>
                    <input type="number" className="input" value={editForm.precio_venta || ''} onChange={e => campo('precio_venta', e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <div className="input-group">
                    <label className="input-label">Stock mínimo</label>
                    <input type="number" className="input" value={editForm.stock_minimo || 5} onChange={e => campo('stock_minimo', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Proveedor</label>
                    <input className="input" value={editForm.proveedor || ''} onChange={e => campo('proveedor', e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-success btn-full" onClick={guardarEdicion} disabled={saving}>
                    {saving ? 'Guardando...' : '✓ Guardar'}
                  </button>
                  <button className="btn btn-ghost btn-full" onClick={() => setEditing(false)}>Cancelar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
