/** API do portal único hospedado no Plus → autenticação/SSO no Pro. */

const HUB_TOKEN_KEY = 'doca_hub_token_v1'
const HUB_USER_KEY = 'doca_hub_user_v1'

export function getProApiBase(): string {
  // Portal API: sempre o Pro do mesmo ambiente do Plus (evita token de um e API do outro).
  try {
    const h = (typeof window !== 'undefined' ? window.location.hostname : '').toLowerCase()
    if (h.includes('homolog') || h.includes('homologacao')) {
      return 'https://doca-livre-wms-pro-homologacao.onrender.com/'
    }
  } catch {
    /* ignore */
  }
  const fromEnv = (import.meta.env.VITE_WMS_PRO_URL as string | undefined)?.trim()
  if (fromEnv) return fromEnv.replace(/\/?$/, '/')
  return 'https://doca-livre-wms-pro.onrender.com/'
}

async function portalPost<T extends { ok?: boolean; erro?: string }>(
  path: string,
  body: Record<string, unknown>,
): Promise<T | { ok: false; erro: string }> {
  try {
    const res = await fetch(`${getProApiBase()}${path.replace(/^\//, '')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => ({}))) as T & {
      smtp_motivo?: string
    }
    if (!res.ok || !data.ok) {
      const base = data.erro || 'Não foi possível concluir a operação.'
      const detail = (data.smtp_motivo || '').trim()
      return {
        ok: false,
        erro: detail && !base.includes(detail) ? `${base} (${detail})` : base,
      }
    }
    return data
  } catch {
    return { ok: false, erro: 'Falha de conexão com o portal.' }
  }
}

export function loadHubSession(): { usuario: string; hubToken: string } | null {
  try {
    const hubToken = sessionStorage.getItem(HUB_TOKEN_KEY)?.trim() || ''
    const usuario = sessionStorage.getItem(HUB_USER_KEY)?.trim() || ''
    if (!hubToken || !usuario) return null
    return { usuario, hubToken }
  } catch {
    return null
  }
}

export function saveHubSession(usuario: string, hubToken: string): void {
  sessionStorage.setItem(HUB_USER_KEY, usuario)
  sessionStorage.setItem(HUB_TOKEN_KEY, hubToken)
}

export function clearHubSession(): void {
  try {
    sessionStorage.removeItem(HUB_TOKEN_KEY)
    sessionStorage.removeItem(HUB_USER_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Acorda o Pro (Render free) com retries.
 * Cold start costuma fechar a conexão na 1ª tentativa e só responde após ~20–50s.
 */
export async function wakeProApi(
  timeoutMs = 90000,
  onAttempt?: (info: { attempt: number; elapsedMs: number }) => void,
): Promise<boolean> {
  const base = getProApiBase()
  const deadline = Date.now() + timeoutMs
  let attempt = 0
  while (Date.now() < deadline) {
    attempt += 1
    onAttempt?.({ attempt, elapsedMs: Date.now() - (deadline - timeoutMs) })
    const remaining = Math.max(1000, deadline - Date.now())
    const perTry = Math.min(25000, remaining)
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), perTry)
    try {
      const res = await fetch(`${base}api/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })
      if (res.ok) return true
    } catch {
      /* cold start: connection closed / abort → tenta de novo */
    } finally {
      window.clearTimeout(timer)
    }
    // Pausa curta entre tentativas (Render solta o socket ao acordar).
    const pause = Math.min(1500, Math.max(400, deadline - Date.now()))
    if (pause > 0) await new Promise((r) => setTimeout(r, pause))
  }
  return false
}

export async function portalLogin(
  usuario: string,
  senha: string,
  opts?: {
    onPhase?: (phase: 'wake' | 'login', detail?: { attempt?: number; elapsedMs?: number }) => void
  },
): Promise<
  | {
      ok: true
      usuario: string
      hubToken: string
      isSuperuser?: boolean
      permissoes?: Record<
        string,
        { pode_acessar?: boolean; modulos?: string[] | Record<string, string> | null }
      > | null
    }
  | { ok: false; erro: string }
> {
  opts?.onPhase?.('wake', { attempt: 1, elapsedMs: 0 })
  const awake = await wakeProApi(90000, (info) => {
    opts?.onPhase?.('wake', info)
  })
  if (!awake) {
    return {
      ok: false,
      erro: 'O servidor ainda está acordando (plano free). Aguarde ~1 minuto e clique em Entrar de novo.',
    }
  }
  opts?.onPhase?.('login')

  // Até 2 tentativas: após cold start o 1º login pode falhar se o worker ainda sobe o schema.
  let lastErro = 'Falha de conexão com o portal.'
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 25000)
    try {
      const res = await fetch(`${getProApiBase()}api/portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha }),
        signal: controller.signal,
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        usuario?: string
        hub_token?: string
        is_superuser?: boolean
        permissoes?: Record<
          string,
          { pode_acessar?: boolean; modulos?: string[] | Record<string, string> | null }
        > | null
        erro?: string
      }
      if (res.status === 503 && attempt < 2) {
        lastErro = data.erro || lastErro
        await new Promise((r) => setTimeout(r, 1500))
        continue
      }
      if (!res.ok || !data.ok || !data.hub_token || !data.usuario) {
        return { ok: false, erro: data.erro || 'Usuário ou senha incorretos.' }
      }
      saveHubSession(data.usuario, data.hub_token)
      return {
        ok: true,
        usuario: data.usuario,
        hubToken: data.hub_token,
        isSuperuser: Boolean(data.is_superuser),
        permissoes: data.permissoes ?? null,
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        lastErro = 'O servidor demorou para responder. Aguarde ~30s e tente de novo.'
      } else {
        lastErro = 'Falha de conexão com o portal.'
      }
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1200))
        continue
      }
    } finally {
      window.clearTimeout(timer)
    }
  }
  return { ok: false, erro: lastErro }
}

export async function portalCadastroEnviarCodigo(email: string) {
  return portalPost<{
    ok: true
    mensagem?: string
    email?: string
    debug_codigo?: string
  }>('api/portal/cadastro/enviar-codigo', { email })
}

export async function portalCadastroVerificarCodigo(email: string, codigo: string) {
  return portalPost<{
    ok: true
    verify_token: string
    email?: string
    mensagem?: string
  }>('api/portal/cadastro/verificar-codigo', { email, codigo })
}

export async function portalCadastroConcluir(input: {
  verifyToken: string
  usuario: string
  senha: string
  confirmarSenha: string
}) {
  return portalPost<{ ok: true; mensagem?: string; usuario?: string }>('api/portal/cadastro/concluir', {
    verify_token: input.verifyToken,
    usuario: input.usuario,
    senha: input.senha,
    confirmar_senha: input.confirmarSenha,
  })
}

export async function portalSenhaEnviarCodigo(identificador: string) {
  return portalPost<{
    ok: true
    enviado?: boolean
    mensagem?: string
    email_mascarado?: string
    debug_codigo?: string
  }>('api/portal/senha/enviar-codigo', { identificador })
}

export async function portalSenhaVerificarCodigo(identificador: string, codigo: string) {
  return portalPost<{
    ok: true
    verify_token: string
    usuario?: string
    email?: string
    mensagem?: string
  }>('api/portal/senha/verificar-codigo', { identificador, codigo })
}

export async function portalSenhaRedefinir(input: {
  verifyToken: string
  senha: string
  confirmarSenha: string
}) {
  return portalPost<{ ok: true; mensagem?: string; usuario?: string }>('api/portal/senha/redefinir', {
    verify_token: input.verifyToken,
    senha: input.senha,
    confirmar_senha: input.confirmarSenha,
  })
}

export async function issueSystemSsoUrl(
  system: 'light' | 'plus' | 'pro',
  hubToken: string,
): Promise<{ ok: true; url: string } | { ok: false; erro: string }> {
  try {
    const res = await fetch(`${getProApiBase()}api/sso/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hubToken}`,
      },
      body: JSON.stringify({ system, hub_token: hubToken }),
    })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; erro?: string }
    if (!res.ok || !data.ok || !data.url) {
      return { ok: false, erro: data.erro || 'Não foi possível abrir o sistema.' }
    }
    return { ok: true, url: data.url }
  } catch {
    return { ok: false, erro: 'Falha de conexão ao emitir SSO.' }
  }
}
