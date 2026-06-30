import { supabase } from '../../shared/supabase'

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}

/* ── Clientes ──────────────────────────────────────── */

export async function getClientes({ search = '' } = {}) {
  let q = supabase.from('clientes').select('*').order('apellido')
  if (search) q = q.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,dni.ilike.%${search}%`)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getClienteById(id) {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function crearCliente(cliente) {
  const user_id = await getUserId()
  const { data, error } = await supabase
    .from('clientes')
    .insert({ ...cliente, user_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function actualizarCliente(id, cliente) {
  const { data, error } = await supabase
    .from('clientes')
    .update(cliente)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function eliminarCliente(id) {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw error
}

/* ── Fiados ────────────────────────────────────────── */

export async function getFiadosCliente(cliente_id) {
  const { data, error } = await supabase
    .from('fiados')
    .select('*, fiado_items(*)')
    .eq('cliente_id', cliente_id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getDeudaTotal(cliente_id) {
  const { data, error } = await supabase
    .from('fiados')
    .select('total, pagado')
    .eq('cliente_id', cliente_id)
    .neq('estado', 'pagado')
  if (error) throw error
  return data.reduce((acc, f) => acc + (Number(f.total) - Number(f.pagado)), 0)
}

export async function registrarFiado({ cliente_id, items, notas = '' }) {
  const user_id = await getUserId()
  const total = items.reduce((acc, i) => acc + Number(i.subtotal), 0)

  const { data: fiado, error: fiadoError } = await supabase
    .from('fiados')
    .insert({ cliente_id, total, notas, user_id })
    .select()
    .single()
  if (fiadoError) throw fiadoError

  const fiadoItems = items.map(i => ({
    fiado_id: fiado.id,
    producto_nombre: i.producto_nombre,
    producto_id: i.producto_id || null,
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario,
    subtotal: i.subtotal
  }))
  const { error: itemsError } = await supabase.from('fiado_items').insert(fiadoItems)
  if (itemsError) throw itemsError

  return fiado
}

export async function registrarPago(fiado_id, monto) {
  const { data: fiado, error: getError } = await supabase
    .from('fiados')
    .select('total, pagado')
    .eq('id', fiado_id)
    .single()
  if (getError) throw getError

  const nuevoPagado = Math.min(Number(fiado.pagado) + monto, Number(fiado.total))
  const estado = nuevoPagado >= Number(fiado.total) ? 'pagado'
    : nuevoPagado > 0 ? 'pagado_parcial'
    : 'pendiente'

  const { error } = await supabase
    .from('fiados')
    .update({ pagado: nuevoPagado, estado })
    .eq('id', fiado_id)
  if (error) throw error
}

/* Aplica un pago del cliente distribuyendo del fiado más antiguo al más nuevo */
export async function registrarPagoCliente(cliente_id, montoTotal) {
  const { data: fiados, error } = await supabase
    .from('fiados')
    .select('id, total, pagado')
    .eq('cliente_id', cliente_id)
    .neq('estado', 'pagado')
    .order('created_at', { ascending: true })
  if (error) throw error

  let restante = montoTotal
  for (const f of fiados) {
    if (restante <= 0) break
    const pendiente = Number(f.total) - Number(f.pagado)
    const pago = Math.min(pendiente, restante)
    restante -= pago
    const nuevoPagado = Number(f.pagado) + pago
    const estado = nuevoPagado >= Number(f.total) ? 'pagado'
      : nuevoPagado > 0 ? 'pagado_parcial'
      : 'pendiente'
    const { error: err } = await supabase
      .from('fiados')
      .update({ pagado: nuevoPagado, estado })
      .eq('id', f.id)
    if (err) throw err
  }
}

/* ── Mensajes / Notificaciones ─────────────────────── */

export function buildWhatsAppUrl(celular, mensaje) {
  const num = celular.replace(/\D/g, '')
  let phone
  if (num.startsWith('54'))      phone = num
  else if (num.startsWith('0'))  phone = '54' + num.slice(1)
  else                           phone = '549' + num
  return `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`
}

export function buildMensajeCompra(cliente, items, total) {
  const fecha = new Date().toLocaleDateString('es-AR')
  const lista = items
    .map(i => `  • ${i.producto_nombre} x${i.cantidad}  $${Number(i.subtotal).toLocaleString('es-AR')}`)
    .join('\n')
  return `Hola ${cliente.nombre}! 👋\n\nRegistramos tu compra a fiado del ${fecha}:\n\n${lista}\n\n*Total: $${Number(total).toLocaleString('es-AR')}*\n\nCualquier consulta estamos a disposición. 🏪`
}

export function buildMensajeRecordatorio(cliente, deuda, fiados) {
  const fmt = n => Number(n || 0).toLocaleString('es-AR')
  const pendientes = fiados.filter(f => f.estado !== 'pagado')

  // Todos los productos de todos los fiados pendientes, en orden cronológico
  const items = pendientes
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .flatMap(f => f.fiado_items || [])

  const totalComprado = pendientes.reduce((acc, f) => acc + Number(f.total), 0)
  const totalPagado   = pendientes.reduce((acc, f) => acc + Number(f.pagado), 0)

  const lineas = [
    `Hola ${cliente.nombre}! 👋`,
    '',
    'Te recordamos que tenés una deuda pendiente en el kiosco.',
    '',
  ]

  if (items.length > 0) {
    lineas.push('📦 *Lo que llevaste:*')
    items.forEach(i => {
      const sub = Number(i.subtotal) > 0 ? `  $${fmt(i.subtotal)}` : ''
      lineas.push(`  • ${i.producto_nombre} × ${i.cantidad}${sub}`)
    })
    lineas.push('')
  }

  if (totalComprado > 0) lineas.push(`💰 Total compras:   $${fmt(totalComprado)}`)
  if (totalPagado   > 0) lineas.push(`✅ Ya pagaste:      $${fmt(totalPagado)}`)
  lineas.push(`⚠️ *Resta pagar:   $${fmt(deuda)}*`)
  lineas.push('')
  lineas.push('Pasá cuando puedas. ¡Gracias! 🙏')

  return lineas.join('\n')
}
