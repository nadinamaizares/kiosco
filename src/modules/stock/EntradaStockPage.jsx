import { useState } from 'react'
import Scanner from '../../shared/Scanner'
import { getProductoPorCodigo, upsertProducto, registrarEntrada } from './stock.service'
import { useToast, ToastContainer } from '../../shared/useToast.jsx'

const KEYWORD_CATEGORIA = [
  { keys: ['gaseosa','cola','pepsi','sprite','fanta','agua','jugo','te frio','limonada','soda','cerveza','vino','fernet','vodka','gin','ron','energizante','monster','red bull','powerade','gatorade'], cat: 'bebidas' },
  { keys: ['alfajor','chocolate','galletita','cookie','chips','papa frita','mani','garrapin','caramelo','chicle','chupete','gomita','pochoclo','turron','snack','golosina','bombom'], cat: 'snacks' },
  { keys: ['leche','yogur','manteca','queso','crema','ricota','dulce de leche','postrecito','flan','danone','sancor','la serenisima'], cat: 'lacteos' },
  { keys: ['marlboro','philip morris','kent','camel','winston','lucky strike','cigarril','tabaco','narguile'], cat: 'cigarrillos' },
  { keys: ['shampoo','jabon','desodorante','dentifrico','pasta dental','papel higienico','cepillo diente','afeit','crema hidratante','panal'], cat: 'higiene' },
  { keys: ['detergente','lavandina','limpiador','esponja','escoba','trapo','cloro','ala','magistral'], cat: 'limpieza' },
  { keys: ['arroz','fideos','pasta','harina','azucar','sal ','vinagre','legumbre','lenteja','garbanz','pure','polenta','galletita crackers'], cat: 'almacen' },
]

function adivinarCategoria(texto) {
  const t = (texto || '').toLowerCase()
  for (const { keys, cat } of KEYWORD_CATEGORIA) {
    if (keys.some(k => t.includes(k))) return cat
  }
  return ''
}

async function buscarEnOpenFoodFacts(codigo) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${codigo}.json`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1 || !data.product) return null
    const p = data.product
    const nombre = p.product_name_es || p.product_name_en || p.product_name || p.abbreviated_product_name || ''
    if (!nombre) return null
    const texto = `${nombre} ${p.categories || ''} ${p.labels || ''}`
    return {
      nombre,
      marca:          p.brands?.split(',')[0]?.trim() || '',
      especificacion: p.quantity ? `${p.quantity}` : (p.generic_name_es || p.generic_name || '').slice(0, 120),
      categoria:      adivinarCategoria(texto),
    }
  } catch {
    return null
  }
}

async function buscarEnUPCitemdb(codigo) {
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${codigo}`)
    if (!res.ok) return null
    const data = await res.json()
    const item = data?.items?.[0]
    if (!item) return null
    const texto = `${item.title || ''} ${item.description || ''} ${item.category || ''}`
    return {
      nombre:         item.title || '',
      marca:          item.brand || '',
      especificacion: item.description?.slice(0, 120) || '',
      categoria:      adivinarCategoria(texto),
    }
  } catch {
    return null
  }
}

async function buscarEnOpenProductsFacts(codigo) {
  try {
    const res = await fetch(`https://world.openproductsfacts.org/api/v0/product/${codigo}.json`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1 || !data.product) return null
    const p = data.product
    const nombre = p.product_name_es || p.product_name_en || p.product_name || ''
    if (!nombre) return null
    const texto = `${nombre} ${p.categories || ''}`
    return {
      nombre,
      marca:          p.brands?.split(',')[0]?.trim() || '',
      especificacion: (p.quantity || p.generic_name_es || p.generic_name || '').slice(0, 120),
      categoria:      adivinarCategoria(texto),
    }
  } catch {
    return null
  }
}

async function buscarProductoExterno(codigo) {
  const [r1, r2, r3] = await Promise.all([
    buscarEnOpenFoodFacts(codigo),
    buscarEnOpenProductsFacts(codigo),
    buscarEnUPCitemdb(codigo),
  ])
  const ganador = [r1, r2, r3].find(r => r?.nombre)
  if (!ganador) return null
  const fuente = ganador === r1 ? 'Open Food Facts'
               : ganador === r2 ? 'Open Products Facts'
               : 'UPCitemdb'
  return { ...ganador, fuente }
}

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

const EMPTY = {
  id: null, codigo_barras: '', nombre: '', marca: '',
  categoria: '', especificacion: '', precio_costo: '',
  precio_venta: '', stock_minimo: 5, proveedor: ''
}

export default function EntradaStockPage() {
  const toast = useToast()
  const [step,       setStep]      = useState('inicio')
  const [form,       setForm]      = useState(EMPTY)
  const [cantidad,   setCantidad]  = useState(1)
  const [autofields, setAuto]      = useState([])
  const [saving,     setSaving]    = useState(false)
  const [lookingUp,  setLookingUp] = useState(false)

  function campo(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    if (key === 'precio_costo' && value) {
      setForm(f => ({ ...f, [key]: value, precio_venta: Math.round(value * 1.55) }))
    }
  }

  async function onScanned(codigo) {
    setStep('form')
    setForm({ ...EMPTY, codigo_barras: codigo })
    setAuto([])
    setLookingUp(true)

    try {
      const prod = await getProductoPorCodigo(codigo)
      if (prod) {
        setForm({ ...prod })
        setAuto(['nombre', 'marca', 'categoria', 'especificacion', 'precio_costo', 'precio_venta'])
        setLookingUp(false)
        return
      }

      const ext = await buscarProductoExterno(codigo)
      if (ext) {
        const { fuente, ...datos } = ext
        setForm(f => ({ ...f, ...datos }))
        const campos = ['nombre', 'marca', 'especificacion']
        if (datos.categoria) campos.push('categoria')
        setAuto(campos)
        toast.info(`Datos de ${fuente} — revisá y completá precios`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLookingUp(false)
    }
  }

  function manualEntry() {
    setForm(EMPTY)
    setAuto([])
    setStep('form')
  }

  async function guardar(e) {
    e.preventDefault()
    if (!form.nombre) return toast.error('El nombre del producto es obligatorio')
    if (cantidad < 1) return toast.error('La cantidad debe ser mayor a 0')

    setSaving(true)
    try {
      const producto = await upsertProducto({
        ...(form.id ? { id: form.id } : {}),
        codigo_barras: form.codigo_barras || null,
        nombre: form.nombre,
        marca: form.marca || null,
        categoria: form.categoria || null,
        especificacion: form.especificacion || null,
        precio_costo: form.precio_costo ? Number(form.precio_costo) : null,
        precio_venta: form.precio_venta ? Number(form.precio_venta) : null,
        stock_minimo: Number(form.stock_minimo) || 5,
        proveedor: form.proveedor || null,
      })

      await registrarEntrada({
        producto_id: producto.id,
        cantidad: Number(cantidad),
        precio_unitario: Number(form.precio_costo) || null,
        notas: null
      })

      toast.success(`Entrada de ${cantidad} unidad${cantidad > 1 ? 'es' : ''} registrada`)
      setForm(EMPTY)
      setCantidad(1)
      setAuto([])
      setStep('inicio')
    } catch (err) {
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const isAuto = (k) => autofields.includes(k)

  return (
    <div className="page">
      <ToastContainer toasts={toast.toasts} />

      <div className="page-header mt-4">
        <h1>Entrada de stock</h1>
        {step !== 'inicio' && (
          <button className="btn btn-ghost btn-sm" onClick={() => setStep('inicio')}>
            ← Volver
          </button>
        )}
      </div>

      {step === 'inicio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="card" style={{ textAlign:'left', cursor:'pointer', borderColor:'var(--accent)' }}
            onClick={() => setStep('scanner')}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Escanear código de barras</div>
            <p className="mt-1">Usá la cámara para identificar el producto automáticamente</p>
          </button>
          <button className="card" style={{ textAlign:'left', cursor:'pointer' }}
            onClick={manualEntry}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>✏️</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Ingresar manualmente</div>
            <p className="mt-1">Completá los datos del producto sin escáner</p>
          </button>
        </div>
      )}

      {step === 'scanner' && (
        <div>
          <p className="text-muted mb-3">Apuntá la cámara al código de barras del producto</p>
          <Scanner onDetected={onScanned} onClose={() => setStep('inicio')} />
        </div>
      )}

      {step === 'form' && (
        <form onSubmit={guardar}>
          {form.codigo_barras && (
            <div style={{
              padding: '8px 12px',
              background: 'var(--bg2)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'monospace',
              fontSize: 13,
              color: 'var(--text2)',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap'
            }}>
              📊 Código: {form.codigo_barras}
              {lookingUp && (
                <span className="badge" style={{ background: 'var(--accent)', color: '#fff', marginLeft: 6 }}>
                  Buscando producto...
                </span>
              )}
              {!lookingUp && autofields.length > 0 && (
                <span className="badge badge-green" style={{ marginLeft: 6 }}>Autocompletado</span>
              )}
              {!lookingUp && autofields.length === 0 && form.codigo_barras && (
                <span className="badge" style={{ background: 'var(--amber)', color: '#fff', marginLeft: 6 }}>
                  No encontrado — completá manualmente
                </span>
              )}
            </div>
          )}

          <div className="form-section">
            <div className="form-section-title">Datos del producto</div>

            <div className="input-group mb-3">
              <label className="input-label">
                Nombre del producto *
                {isAuto('nombre') && <span className="badge badge-green" style={{ marginLeft: 8 }}>Auto</span>}
              </label>
              <input className={`input ${isAuto('nombre') ? 'input-autofill' : ''}`}
                placeholder="Ej: Coca-Cola 500ml"
                value={form.nombre}
                onChange={e => campo('nombre', e.target.value)}
                required />
            </div>

            <div className="form-grid-2 mb-3">
              <div className="input-group">
                <label className="input-label">
                  Marca
                  {isAuto('marca') && <span className="badge badge-green" style={{ marginLeft: 6 }}>Auto</span>}
                </label>
                <input className={`input ${isAuto('marca') ? 'input-autofill' : ''}`}
                  placeholder="Marca"
                  value={form.marca}
                  onChange={e => campo('marca', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">
                  Categoría
                  {isAuto('categoria') && <span className="badge badge-green" style={{ marginLeft: 6 }}>Auto</span>}
                </label>
                <select className={`select ${isAuto('categoria') ? 'input-autofill' : ''}`}
                  value={form.categoria}
                  onChange={e => campo('categoria', e.target.value)}>
                  <option value="">Seleccionar</option>
                  {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div className="input-group mb-3">
              <label className="input-label">
                Especificación / contenido
                {isAuto('especificacion') && <span className="badge badge-green" style={{ marginLeft: 8 }}>Auto</span>}
              </label>
              <input className={`input ${isAuto('especificacion') ? 'input-autofill' : ''}`}
                placeholder="Ej: 500ml, sin azúcar"
                value={form.especificacion}
                onChange={e => campo('especificacion', e.target.value)} />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Precios y stock</div>

            <div className="form-grid-2 mb-3">
              <div className="input-group">
                <label className="input-label">
                  Precio costo ($)
                  {isAuto('precio_costo') && <span className="badge badge-green" style={{ marginLeft: 4 }}>Auto</span>}
                </label>
                <input type="number" className={`input ${isAuto('precio_costo') ? 'input-autofill' : ''}`}
                  placeholder="0"
                  value={form.precio_costo}
                  onChange={e => campo('precio_costo', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">
                  Precio venta ($)
                  {isAuto('precio_venta') && <span className="badge badge-green" style={{ marginLeft: 4 }}>Auto</span>}
                </label>
                <input type="number" className={`input ${isAuto('precio_venta') ? 'input-autofill' : ''}`}
                  placeholder="0"
                  value={form.precio_venta}
                  onChange={e => campo('precio_venta', e.target.value)} />
              </div>
            </div>

            <div className="form-grid-2 mb-3">
              <div className="input-group">
                <label className="input-label">Cantidad a ingresar *</label>
                <input type="number" className="input" min="1"
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                  required />
              </div>
              <div className="input-group">
                <label className="input-label">Stock mínimo</label>
                <input type="number" className="input" min="0"
                  value={form.stock_minimo}
                  onChange={e => campo('stock_minimo', e.target.value)} />
              </div>
            </div>

            <div className="input-group mb-3">
              <label className="input-label">Proveedor</label>
              <input className="input"
                placeholder="Nombre del proveedor"
                value={form.proveedor}
                onChange={e => campo('proveedor', e.target.value)} />
            </div>
          </div>

          <button type="submit" className="btn btn-success btn-full btn-lg" disabled={saving}>
            {saving ? 'Guardando...' : `✓ Registrar entrada de ${cantidad} unidad${cantidad > 1 ? 'es' : ''}`}
          </button>

          <button type="button" className="btn btn-ghost btn-full mt-2"
            onClick={() => setStep('inicio')}>
            Cancelar
          </button>
        </form>
      )}
    </div>
  )
}
