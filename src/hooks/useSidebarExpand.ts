import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

/** Tempo antes de recolher ao sair com o mouse (modo livre). */
const CLOSE_DELAY_MS = 1600

export function useSidebarExpand(sidebarFixed: boolean) {
  const [hoverExpanded, setHoverExpanded] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const expanded = sidebarFixed || hoverExpanded

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const collapse = useCallback(() => {
    clearCloseTimer()
    setHoverExpanded(false)
  }, [clearCloseTimer])

  const expand = useCallback(() => {
    clearCloseTimer()
    setHoverExpanded(true)
  }, [clearCloseTimer])

  useEffect(() => {
    if (sidebarFixed) {
      clearCloseTimer()
      setHoverExpanded(false)
    }
  }, [sidebarFixed, clearCloseTimer])

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer])

  useEffect(() => {
    if (!hoverExpanded || sidebarFixed) return

    function handlePointerDown(e: PointerEvent) {
      const el = sidebarRef.current
      if (!el || el.contains(e.target as Node)) return
      collapse()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [hoverExpanded, sidebarFixed, collapse])

  const onSidebarPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (sidebarFixed || hoverExpanded) return
      if (e.button !== 0) return
      expand()
    },
    [sidebarFixed, hoverExpanded, expand],
  )

  const onMouseEnter = useCallback(() => {
    clearCloseTimer()
  }, [clearCloseTimer])

  const onMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      if (sidebarFixed || !hoverExpanded) return
      const related = e.relatedTarget as Node | null
      if (related && sidebarRef.current?.contains(related)) return

      clearCloseTimer()
      closeTimer.current = setTimeout(() => {
        collapse()
        closeTimer.current = null
      }, CLOSE_DELAY_MS)
    },
    [sidebarFixed, hoverExpanded, clearCloseTimer, collapse],
  )

  return { expanded, sidebarRef, onSidebarPointerDown, onMouseEnter, onMouseLeave }
}
