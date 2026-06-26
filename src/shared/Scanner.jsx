import { useEffect, useRef, useState } from 'react'

export default function Scanner({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const [error, setError]   = useState(null)
  const [ready, setReady]   = useState(false)
  const streamRef = useRef(null)
  const quaggaRef = useRef(null)
  const detected  = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }, audio: false
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream

        const Quagga = (await import('@ericblade/quagga2')).default
        quaggaRef.current = Quagga

        Quagga.init({
          inputStream: {
            name: 'Live',
            type: 'LiveStream',
            target: videoRef.current,
            constraints: { facingMode: 'environment' }
          },
          decoder: {
            readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader', 'code_128_reader']
          },
          locate: true
        }, (err) => {
          if (err) { setError('No se pudo iniciar el escáner'); return }
          if (!cancelled) { Quagga.start(); setReady(true) }
        })

        Quagga.onDetected((result) => {
          if (detected.current) return
          const code = result?.codeResult?.code
          if (code) {
            detected.current = true
            stop()
            onDetected(code)
          }
        })
      } catch {
        setError('No se pudo acceder a la cámara. Verificá los permisos.')
      }
    }

    function stop() {
      try { quaggaRef.current?.stop() } catch {}
      streamRef.current?.getTracks().forEach(t => t.stop())
    }

    start()
    return () => { cancelled = true; stop() }
  }, [onDetected])

  return (
    <div>
      {error ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--red)' }}>
          <p>{error}</p>
          <button className="btn btn-ghost btn-sm mt-3" onClick={onClose}>Cerrar</button>
        </div>
      ) : (
        <div className="scanner-wrap">
          <video ref={videoRef} autoPlay muted playsInline style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          <div className="scanner-frame">
            <div className="scan-box">
              <div className="scan-line" />
            </div>
          </div>
          {!ready && (
            <div className="scan-hint">Iniciando cámara...</div>
          )}
          {ready && (
            <div className="scan-hint">Apuntá al código de barras</div>
          )}
        </div>
      )}
      <button className="btn btn-ghost btn-sm btn-full mt-3" onClick={onClose}>
        Cancelar
      </button>
    </div>
  )
}
