import { useRef, useEffect, useCallback } from 'react'

interface SignatureCanvasProps {
  onSignatureChange: (dataUrl: string | null) => void
}

export default function SignatureCanvas({ onSignatureChange }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })

  const getPos = useCallback((e: MouseEvent | Touch) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }, [])

  const startDraw = useCallback((pos: { x: number; y: number }) => {
    isDrawingRef.current = true
    lastPosRef.current = pos
  }, [])

  const draw = useCallback((pos: { x: number; y: number }) => {
    if (!isDrawingRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#58a6ff'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPosRef.current = pos
  }, [])

  const endDraw = useCallback(() => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false
      const canvas = canvasRef.current
      if (canvas) {
        onSignatureChange(canvas.toDataURL())
      }
    }
  }, [onSignatureChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      startDraw(getPos(e.touches[0]))
    }
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      draw(getPos(e.touches[0]))
    }
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      endDraw()
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  }, [getPos, startDraw, draw, endDraw])

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    onSignatureChange(null)
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={500}
        height={200}
        style={{
          border: '1px solid var(--border)',
          borderRadius: '8px',
          width: '100%',
          cursor: 'crosshair',
          background: 'var(--bg-secondary)',
        }}
        onMouseDown={(e) => startDraw(getPos(e.nativeEvent))}
        onMouseMove={(e) => draw(getPos(e.nativeEvent))}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
      />
      <button
        type="button"
        className="button-secondary"
        style={{ marginTop: '8px', fontSize: '12px' }}
        onClick={clearSignature}
      >
        Limpiar firma
      </button>
    </div>
  )
}
