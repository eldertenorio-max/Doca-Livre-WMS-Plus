/** APIs de configuração do portal (Super Usuário) no Pro. */

import { getProApiBase, loadHubSession } from './portalApi'

export type SistemaId = 'light' | 'plus' | 'pro'

export type SistemaPermissao = {
  pode_acessar: boolean
  /** null = todas as telas; [] = nenhuma; lista = ids liberados */
  modulos: string[] | null
}

export type PortalUsuarioRow = {
  usuario: string
  email?: string
  ativo?: boolean
  nivel?: string
  superior?: string
  is_superuser?: boolean
}

export type PortalConfigOverview = {
  ok: true
  actor: string
  usuarios: PortalUsuarioRow[]
  niveis: { id: string; label: string; ordem: number }[]
  matriz: Record<string, Record<SistemaId, SistemaPermissao>>
  sistemas: SistemaId[]
  modulos: Record<SistemaId, { id: string; label: string }[]>
}

async function authFetch<T extends { ok?: boolean; erro?: string }>(
  path: string,
  init?: RequestInit,
): Promise<T | { ok: false; erro: string }> {
  const hub = loadHubSession()
  if (!hub?.hubToken) return { ok: false, erro: 'Sessão do portal expirada. Faça login de novo.' }
  try {
    const res = await fetch(`${getProApiBase()}${path.replace(/^\//, '')}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hub.hubToken}`,
        ...(init?.headers || {}),
      },
      body: init?.body,
    })
    const data = (await res.json().catch(() => ({}))) as T
    if (!res.ok || !data.ok) {
      return { ok: false, erro: (data as { erro?: string }).erro || 'Falha na configuração do portal.' }
    }
    return data
  } catch {
    return { ok: false, erro: 'Falha de conexão com o portal.' }
  }
}

export async function fetchPortalMe(): Promise<
  | { ok: true; usuario: string; is_superuser: boolean; permissoes: Record<SistemaId, SistemaPermissao> | null }
  | { ok: false; erro: string }
> {
  return authFetch('api/portal/me', { method: 'POST', body: '{}' })
}

export async function fetchPortalConfigOverview(): Promise<PortalConfigOverview | { ok: false; erro: string }> {
  return authFetch('api/portal/config/overview', { method: 'POST', body: '{}' })
}

export async function savePortalPermissoes(
  usuario: string,
  permissoes: Record<SistemaId, SistemaPermissao>,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  return authFetch('api/portal/config/permissoes', {
    method: 'POST',
    body: JSON.stringify({ usuario, permissoes }),
  })
}

export async function savePortalHierarquia(input: {
  usuario: string
  nivel?: string
  superior?: string
}): Promise<{ ok: true } | { ok: false; erro: string }> {
  return authFetch('api/portal/config/hierarquia', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** Super usuários conhecidos (fallback se API antiga não devolver is_superuser). */
export function isLocalSuperUser(usuario: string): boolean {
  const u = (usuario || '').trim().toLowerCase()
  if (!u) return false
  const locals = ['diego', 'elder', 'diego.isidoro', 'elder.tenorio']
  if (locals.includes(u)) return true
  const local = u.split('@')[0]
  return locals.includes(local) || locals.some((s) => u.startsWith(`${s}.`) || u.startsWith(`${s}@`))
}
