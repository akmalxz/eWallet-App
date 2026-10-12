// src/components/shared/Sheet.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const DRAG_CLOSE_PX = 120
const DRAG_CLOSE_VELOCITY = 0.6
const KEYBOARD_THRESHOLD_PX = 150

export const Sheet = ({
  title,
  titleId = 'sheet-title',
  saving = false,
  hasUnsavedChanges = false,
  onClose,
  maxWidth = 'md:max-w-md',
  bodyClassName = '',
  dismissible = true,
  children
}) => {
  const containerRef = useRef(null)
  const scrollRef = useRef(null)
  const previouslyFocused = useRef(null)

  const [entered, setEntered] = useState(false)
  const [hasMoreBelow, setHasMoreBelow] = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartYRef = useRef(null)
  const dragStartTimeRef = useRef(null)
  const suppressClickRef = useRef(false)

  // Layer 1 + 2: freeze html and body.
  useBodyScrollLock(true)

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 400)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return
    const check = () => {
      const gap = window.innerHeight - vv.height
      setKeyboardOpen(gap > KEYBOARD_THRESHOLD_PX)
    }
    vv.addEventListener('resize', check)
    vv.addEventListener('scroll', check)
    check()
    return () => {
      vv.removeEventListener('resize', check)
      vv.removeEventListener('scroll', check)
    }
  }, [])

  useEffect(() => {
    previouslyFocused.current = document.activeElement
    const root = containerRef.current
    if (root && !root.contains(document.activeElement)) {
      root.querySelector(FOCUSABLE)?.focus()
    }
    return () => {
      const el = previouslyFocused.current
      if (el && typeof el.focus === 'function') {
        setTimeout(() => el.focus?.(), 0)
      }
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        attemptClose()
        return
      }
      if (e.key !== 'Tab') return
      const root = containerRef.current
      if (!root) return
      const nodes = Array.from(root.querySelectorAll(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null || n === document.activeElement
      )
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, hasUnsavedChanges])

  const attemptClose = () => {
    if (saving) return
    if (hasUnsavedChanges) {
      if (!window.confirm('Discard unsaved changes?')) return
    }
    onClose?.()
  }

  const handleOverlayClick = () => {
    if (suppressClickRef.current) return
    attemptClose()
  }

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight
    setHasMoreBelow(remaining > 8)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const raf = requestAnimationFrame(checkScroll)
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [checkScroll, children])

  const canDrag = dismissible && !saving && !keyboardOpen

  const handleDragStart = (e) => {
    if (!canDrag) return
    if (e.button !== undefined && e.button !== 0) return
    dragStartYRef.current = e.clientY
    dragStartTimeRef.current = Date.now()
    setIsDragging(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
  }

  const handleDragMove = (e) => {
    if (!isDragging || dragStartYRef.current == null) return
    const delta = Math.max(0, e.clientY - dragStartYRef.current)
    setDragY(delta)
  }

  const handleDragEnd = (e) => {
    if (!isDragging) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}

    const elapsed = Math.max(1, Date.now() - (dragStartTimeRef.current || Date.now()))
    const velocity = dragY / elapsed
    const shouldClose = dragY > DRAG_CLOSE_PX || velocity > DRAG_CLOSE_VELOCITY

    setIsDragging(false)
    dragStartYRef.current = null
    dragStartTimeRef.current = null

    suppressClickRef.current = true
    setTimeout(() => {
      suppressClickRef.current = false
    }, 150)

    setDragY(0)
    if (shouldClose) attemptClose()
  }

  const handleDragCancel = (e) => {
    if (!isDragging) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    setIsDragging(false)
    dragStartYRef.current = null
    dragStartTimeRef.current = null
    setDragY(0)
  }

  const enterClass = entered
    ? ''
    : 'animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-300'

  const dragStyle = dragY > 0
    ? {
        transform: `translateY(${dragY}px)`,
        transition: isDragging
          ? 'none'
          : 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)'
      }
    : undefined

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200"
      onClick={handleOverlayClick}
      style={{ touchAction: 'none' }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`relative w-full ${maxWidth} bg-surface rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:max-h-[85vh] ${enterClass}`}
        onClick={(e) => e.stopPropagation()}
        style={dragStyle}
      >
        {dismissible && (
          <div
            className="md:hidden flex justify-center pt-3 pb-2 shrink-0 touch-none select-none"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragCancel}
            style={{ minHeight: 28, cursor: canDrag ? 'grab' : 'default' }}
            aria-hidden="true"
          >
            <div className="w-10 h-1 rounded-full bg-line-strong" />
          </div>
        )}

        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
            <h3 id={titleId} className="text-base font-bold text-fg">
              {title}
            </h3>
            <button
              type="button"
              onClick={attemptClose}
              disabled={saving}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div
          ref={scrollRef}
          className={`flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4 ${bodyClassName}`}
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
          onScroll={checkScroll}
        >
          {children}
        </div>

        {hasMoreBelow && (
          <div
            className="pointer-events-none absolute left-0 right-0 bottom-0 h-10 bg-gradient-to-t from-surface via-surface/85 to-transparent"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}