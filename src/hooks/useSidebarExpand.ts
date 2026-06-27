import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { SidebarMode } from '../lib/sidebarMode'

/** Tempo antes de recolher ao sair com o mouse (modo recolhido). */
const CLOSE_DELAY_MS = 1600

export function useSidebarExpand(sidebarMode: SidebarMode) {
  const [hoverExpanded, setHoverExpanded] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pinnedOpen = sidebarMode === 'open' || sidebarMode === 'fullscreen'
  const expanded = pinnedOpen || hoverExpanded

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
    if (pinnedOpen) {
      clearCloseTimer()
      setHoverExpanded(false)
    }
  }, [pinnedOpen, clearCloseTimer])

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer])

  useEffect(() => {
    if (!hoverExpanded || pinnedOpen) return

    function handlePointerDown(e: PointerEvent) {
      const el = sidebarRef.current
      if (!el || el.contains(e.target as Node)) return
      collapse()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [hoverExpanded, pinnedOpen, collapse])

  const onSidebarPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (pinnedOpen || hoverExpanded) return
      if (e.button !== 0) return
      if ((e.target as HTMLElement).closest('.sidebar-layout-control')) return
      expand()
    },
    [pinnedOpen, hoverExpanded, expand],
  )

  const onMouseEnter = useCallback(() => {
    clearCloseTimer()
  }, [clearCloseTimer])

  const onMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      if (pinnedOpen || !hoverExpanded) return
      const related = e.relatedTarget as Node | null
      if (related && sidebarRef.current?.contains(related)) return

      clearCloseTimer()
      closeTimer.current = setTimeout(() => {
        collapse()
        closeTimer.current = null
      }, CLOSE_DELAY_MS)
    },
    [pinnedOpen, hoverExpanded, clearCloseTimer, collapse],
  )

  return { expanded, sidebarRef, onSidebarPointerDown, onMouseEnter, onMouseLeave }
}
