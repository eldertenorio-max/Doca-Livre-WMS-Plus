import { useCallback, useEffect, useRef, useState } from 'react'
import { useIsMobile } from './useIsMobile'

/** Aguarda o mouse parar sobre a barra antes de abrir. */
const OPEN_DELAY_MS = 320
/** Tolerância ao sair sem querer antes de recolher. */
const CLOSE_DELAY_MS = 550

export function useSidebarExpand(sidebarFixed: boolean) {
  const mobile = useIsMobile()
  const [hoverExpanded, setHoverExpanded] = useState(false)
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const expanded = sidebarFixed || mobile || hoverExpanded

  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current)
    if (closeTimer.current) clearTimeout(closeTimer.current)
    openTimer.current = null
    closeTimer.current = null
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  useEffect(() => {
    if (sidebarFixed || mobile) {
      clearTimers()
      setHoverExpanded(false)
    }
  }, [sidebarFixed, mobile, clearTimers])

  const onMouseEnter = useCallback(() => {
    if (sidebarFixed || mobile) return
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    if (hoverExpanded || openTimer.current) return
    openTimer.current = setTimeout(() => {
      setHoverExpanded(true)
      openTimer.current = null
    }, OPEN_DELAY_MS)
  }, [sidebarFixed, mobile, hoverExpanded])

  const onMouseLeave = useCallback(() => {
    if (sidebarFixed || mobile) return
    if (openTimer.current) {
      clearTimeout(openTimer.current)
      openTimer.current = null
    }
    if (closeTimer.current) return
    closeTimer.current = setTimeout(() => {
      setHoverExpanded(false)
      closeTimer.current = null
    }, CLOSE_DELAY_MS)
  }, [sidebarFixed, mobile])

  return { expanded, onMouseEnter, onMouseLeave }
}
