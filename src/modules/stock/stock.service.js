import { supabase } from '../../shared/supabase'

/* ── Productos ──────────────────────────────────────── */

export async function getProductos({ search = '', categoria = '' } = {}) {
  let q = supabase.from('productos').select('*').order('nombre')
  if (search)    q = q.ilike('nombre', `%${search}%`)
  if (categoria) q = q.eq('categoria', categoria)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getProductoPorCodigo(codigo) {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('codigo_barras', codigo)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertProducto(producto) {
  const { data, error } = await supabase
    .from('productos')
    .upsert(producto, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStock(id, delta) {
  const { data, error } = await supabase.rpc('actualizar_stock', {
    p_producto_id: id,
    p_delta: delta
  })
  if (error) throw error
  return data
}

/* ── Movimientos ────────────────────────────────────── */

export async function getMovimientos({ limit = 300, desde = null, hasta = null } = {}) {
  let q = supabase
    .from('movimientos')
    .select(`*, productos ( nombre, marca, categoria )`)
    .order('created_at', { ascending: false })
  if (desde) q = q.gte('created_at', desde)
  if (hasta) q = q.lte('created_at', hasta)
  q = q.limit(limit)
  const { data, error } = await q
  if (error) throw error
  return data
}


async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}

export async function registrarEntrada({ producto_id, cantidad, precio_unitario, notas }) {
  const { error: movError } = await supabase.from('movimientos').insert({
    tipo: 'entrada',
    producto_id,
    cantidad,
    precio_unitario,
    notas
  })
  if (movError) throw movError

  const { error: stockError } = await supabase.rpc('actualizar_stock', {
    p_producto_id: producto_id,
    p_delta: cantidad
  })
  if (stockError) throw stockError
}

export async function registrarSalida({ producto_id, cantidad, precio_unitario, notas, tipo = 'salida' }) {
  const usuario_id = await getUserId()
  const { error: movError } = await supabase.from('movimientos').insert({
    tipo,
    producto_id,
    cantidad: -Math.abs(cantidad),
    precio_unitario,
    usuario_id,
    notas
  })
  if (movError) throw movError

  const { error: stockError } = await supabase.rpc('actualizar_stock', {
    p_producto_id: producto_id,
    p_delta: -Math.abs(cantidad)
  })
  if (stockError) throw stockError
}

export async function registrarSalidaKit(items, notas = '') {
  const usuario_id = await getUserId()
  const movimientos = items.map(it => ({
    tipo: 'salida_kit',
    producto_id: it.producto_id,
    cantidad: -Math.abs(it.cantidad),
    precio_unitario: it.precio_unitario,
    usuario_id,
    notas
  }))

  const { error } = await supabase.from('movimientos').insert(movimientos)
  if (error) throw error

  for (const it of items) {
    const { error: stockError } = await supabase.rpc('actualizar_stock', {
      p_producto_id: it.producto_id,
      p_delta: -Math.abs(it.cantidad)
    })
    if (stockError) throw stockError
  }
}

/* ── Stats para el dashboard ────────────────────────── */

export async function getStatsStock() {
  const { data, error } = await supabase.from('productos').select('stock_actual, stock_minimo')
  if (error) throw error
  const total    = data.length
  const bajoMin  = data.filter(p => p.stock_actual <= p.stock_minimo).length
  const sinStock = data.filter(p => p.stock_actual === 0).length
  return { total, bajoMin, sinStock }
}

/* ── Kits ───────────────────────────────────────────── */

export async function getKits() {
  const { data, error } = await supabase
    .from('kits')
    .select(`*, kit_items (cantidad, productos ( id, nombre, precio_venta, stock_actual ))`)
  if (error) throw error
  return data
}
