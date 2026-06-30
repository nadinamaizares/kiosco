import { buildWhatsAppUrl } from '../modules/clientes/clientes.service'

/* ── Config check ──────────────────────────────────── */

function whatsappConfigurado() {
  return !!(
    import.meta.env.VITE_ULTRAMSG_INSTANCE &&
    import.meta.env.VITE_ULTRAMSG_TOKEN
  )
}

/* ── WhatsApp via UltraMsg ─────────────────────────── */

async function enviarWhatsApp(celular, mensaje) {
  const instanceId = import.meta.env.VITE_ULTRAMSG_INSTANCE
  const token      = import.meta.env.VITE_ULTRAMSG_TOKEN

  const num = celular.replace(/\D/g, '')
  let phone
  if (num.startsWith('54'))     phone = num
  else if (num.startsWith('0')) phone = '54' + num.slice(1)
  else                          phone = '549' + num

  const res = await fetch(
    `https://api.ultramsg.com/${instanceId}/messages/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, to: phone, body: mensaje })
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/* ── Envío ─────────────────────────────────────────── */

/**
 * Envía WhatsApp al cliente.
 * Si UltraMsg está configurado → envía en background.
 * Si no → abre el link de wa.me como fallback.
 * Retorna { whatsapp: 'ok'|'error'|'sin_numero'|'manual' }
 */
export async function notificar({ cliente, mensaje }) {
  if (!cliente.celular) return { whatsapp: 'sin_numero' }

  try {
    if (whatsappConfigurado()) {
      await enviarWhatsApp(cliente.celular, mensaje)
      return { whatsapp: 'ok' }
    } else {
      window.open(buildWhatsAppUrl(cliente.celular, mensaje), '_blank')
      return { whatsapp: 'manual' }
    }
  } catch (err) {
    console.error('WhatsApp error:', err)
    return { whatsapp: 'error' }
  }
}

export function resumenNotificacion({ whatsapp }) {
  if (whatsapp === 'ok')    return 'WhatsApp ✓'
  if (whatsapp === 'error') return 'WhatsApp ✗'
  return null
}
