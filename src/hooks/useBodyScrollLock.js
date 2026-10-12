// src/hooks/useBodyScrollLock.js
import { useEffect } from 'react'

/**
 * Freeze background scroll while a modal/sheet is open.
 *
 * Uses three layers because no single technique works everywhere:
 *
 *   1. `position: fixed` on body  — desktop + Android
 *   2. `overflow: hidden` on html — iOS rubber-band prevention
 *   3. (In the overlay component) touch-action: none on the backdrop
 *      — the actual iOS fix for touches that start on the backdrop
 *
 * The counter handles nested locks: a sheet opening a second sheet
 * does not re-lock, and the second sheet closing does not prematurely
 * unlock while the first is still open.
 */

let lockCount = 0

const saved = {
  scrollY: 0,
  htmlOverflow: '',
  htmlOverscroll: '',
  bodyPosition: '',
  bodyTop: '',
  bodyLeft: '',
  bodyRight: '',
  bodyWidth: '',
  bodyOverflow: '',
  bodyPaddingRight: ''
}

export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return

    lockCount += 1

    if (lockCount === 1) {
      // Snapshot current state so we can restore exactly.
      saved.scrollY = window.scrollY || window.pageYOffset || 0
      saved.htmlOverflow = document.documentElement.style.overflow
      saved.htmlOverscroll = document.documentElement.style.overscrollBehavior
      saved.bodyPosition = document.body.style.position
      saved.bodyTop = document.body.style.top
      saved.bodyLeft = document.body.style.left
      saved.bodyRight = document.body.style.right
      saved.bodyWidth = document.body.style.width
      saved.bodyOverflow = document.body.style.overflow
      saved.bodyPaddingRight = document.body.style.paddingRight

      // Compensate for scrollbar disappearing (desktop only — iOS uses
      // overlay scrollbars so this is a no-op there).
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`
      }

      // Layer 1: freeze body at the current scroll offset.
      document.body.style.position = 'fixed'
      document.body.style.top = `-${saved.scrollY}px`
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'

      // Layer 2: lock html so iOS can't rubber-band.
      document.documentElement.style.overflow = 'hidden'
      document.documentElement.style.overscrollBehavior = 'none'
    }

    return () => {
      lockCount -= 1

      if (lockCount === 0) {
        document.documentElement.style.overflow = saved.htmlOverflow
        document.documentElement.style.overscrollBehavior = saved.htmlOverscroll

        document.body.style.position = saved.bodyPosition
        document.body.style.top = saved.bodyTop
        document.body.style.left = saved.bodyLeft
        document.body.style.right = saved.bodyRight
        document.body.style.width = saved.bodyWidth
        document.body.style.overflow = saved.bodyOverflow
        document.body.style.paddingRight = saved.bodyPaddingRight

        window.scrollTo(0, saved.scrollY)
      }
    }
  }, [active])
}