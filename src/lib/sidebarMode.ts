export type SidebarMode = 'fixed' | 'free'

export const SIDEBAR_MODE_KEY = 'ultrafrio-sidebar-mode'

export function getStoredSidebarMode(): SidebarMode {
  try {
    const stored = localStorage.getItem(SIDEBAR_MODE_KEY)
    if (stored === 'free') return 'free'
    return 'fixed'
  } catch {
    return 'fixed'
  }
}

export function storeSidebarMode(mode: SidebarMode) {
  try {
    localStorage.setItem(SIDEBAR_MODE_KEY, mode)
  } catch {
    /* ignore */
  }
}
