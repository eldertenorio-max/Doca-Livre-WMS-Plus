import { useCallback, useEffect, useMemo, useState } from 'react'
import PortalHierarchyTree from '../components/PortalHierarchyTree'
import {
  fetchPortalConfigOverview,
  isLocalSuperUser,
  savePortalPermissoes,
  type PortalConfigOverview,
  type PortalUsuarioRow,
  type SistemaId,
  type SistemaPermissao,
} from '../lib/portalConfigApi'
import './PortalConfigScreen.css'

type Props = {
  usuario: string
  onContinuar: () => void
  onSair: () => void
}

const SISTEMA_LABEL: Record<SistemaId, string> = {
  light: 'WMS Light',
  plus: 'WMS Plus',
  pro: 'WMS Pro',
}

const SISTEMA_HINT: Record<SistemaId, string> = {
  light: 'Estoque · inventário · endereçamento',
  plus: 'Entrada · saída · consulta · financeiro',
  pro: 'Carga · retorno · descarga · WMS',
}

function isHiddenConfigUser(u: PortalUsuarioRow): boolean {
  return Boolean(u.is_superuser) || isLocalSuperUser(u.usuario) || isLocalSuperUser(u.email || '')
}

function userInitials(nome: string): string {
  const parts = (nome || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function countSistemasLiberados(
  matriz: Record<SistemaId, SistemaPermissao> | null | undefined,
): number {
  if (!matriz) return 0
  return (['light', 'plus', 'pro'] as SistemaId[]).filter((s) => matriz[s]?.pode_acessar !== false)
    .length
}

export default function PortalConfigScreen({ usuario, onContinuar, onSair }: Props) {
  const [tab, setTab] = useState<'hierarquia' | 'permissoes'>('hierarquia')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [data, setData] = useState<PortalConfigOverview | null>(null)
  const [selected, setSelected] = useState<string>('')
  const [filtroUser, setFiltroUser] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErro(null)
    const res = await fetchPortalConfigOverview()
    setLoading(false)
    if (!res.ok) {
      setErro(res.erro)
      return
    }
    setData(res)
    const editaveis = res.usuarios.filter((u) => !isHiddenConfigUser(u))
    setSelected((prev) => {
      if (prev && editaveis.some((u) => u.usuario === prev)) return prev
      return editaveis[0]?.usuario || ''
    })
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const usuariosEditaveis = useMemo(
    () => (data?.usuarios || []).filter((u) => !isHiddenConfigUser(u)),
    [data],
  )

  const usuariosFiltrados = useMemo(() => {
    const q = filtroUser.trim().toLowerCase()
    if (!q) return usuariosEditaveis
    return usuariosEditaveis.filter(
      (u) =>
        u.usuario.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.nivel || '').toLowerCase().includes(q),
    )
  }, [usuariosEditaveis, filtroUser])

  const selectedUser = useMemo(
    () => usuariosEditaveis.find((u) => u.usuario === selected) || null,
    [usuariosEditaveis, selected],
  )

  const perms = useMemo(() => {
    if (!data || !selected) return null
    return data.matriz[selected] || null
  }, [data, selected])

  async function handleSavePermissoes() {
    if (!selected || !perms) return
    setSaving(true)
    setErro(null)
    setOkMsg(null)
    const res = await savePortalPermissoes(selected, perms as Record<SistemaId, SistemaPermissao>)
    setSaving(false)
    if (!res.ok) {
      setErro(res.erro)
      return
    }
    setOkMsg('Permissões salvas.')
    void load()
  }

  function patchSistema(sistema: SistemaId, patch: Partial<SistemaPermissao>) {
    if (!data || !selected) return
    const atual = data.matriz[selected] || {
      light: { pode_acessar: true, modulos: null },
      plus: { pode_acessar: true, modulos: null },
      pro: { pode_acessar: true, modulos: null },
    }
    const bloco = { ...(atual[sistema] || { pode_acessar: true, modulos: null }), ...patch }
    setData({
      ...data,
      matriz: {
        ...data.matriz,
        [selected]: { ...atual, [sistema]: bloco },
      },
    })
  }

  function toggleModulo(sistema: SistemaId, modId: string) {
    if (!data || !selected || !perms) return
    const bloco = perms[sistema] || { pode_acessar: true, modulos: null }
    const mods = data.modulos[sistema] || []
    const allIds = mods.map((m) => m.id)
    let selectedMods = bloco.modulos == null ? [...allIds] : [...bloco.modulos]
    if (selectedMods.includes(modId)) {
      selectedMods = selectedMods.filter((id) => id !== modId)
    } else {
      selectedMods.push(modId)
    }
    const next =
      selectedMods.length === allIds.length && allIds.every((id) => selectedMods.includes(id))
        ? null
        : selectedMods
    patchSistema(sistema, { modulos: next })
  }

  function setAllModulos(sistema: SistemaId, liberar: boolean) {
    if (!data) return
    patchSistema(sistema, { modulos: liberar ? null : [] })
  }

  if (loading && !data) {
    return <div className="portal-config__loading">Carregando configuração do portal…</div>
  }

  return (
    <div className="portal-config" role="main">
      <div className={`portal-config__shell${tab === 'hierarquia' ? ' portal-config__shell--wide' : ''}`}>
        <header className="portal-config__header">
          <div>
            <h1 className="portal-config__title">Configuração do portal</h1>
            <p className="portal-config__sub">
              Super Usuário <strong>{usuario}</strong> — hierarquia e permissões dos sistemas Light, Plus e
              Pro
            </p>
          </div>
          <div className="portal-config__actions">
            <button type="button" className="portal-config__btn" onClick={onSair}>
              Sair
            </button>
            <button type="button" className="portal-config__btn portal-config__btn--primary" onClick={onContinuar}>
              Ir aos sistemas
            </button>
          </div>
        </header>

        <div className="portal-config__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={`portal-config__tab${tab === 'hierarquia' ? ' portal-config__tab--active' : ''}`}
            onClick={() => setTab('hierarquia')}
          >
            Hierarquia
          </button>
          <button
            type="button"
            role="tab"
            className={`portal-config__tab${tab === 'permissoes' ? ' portal-config__tab--active' : ''}`}
            onClick={() => setTab('permissoes')}
          >
            Permissões de acesso
          </button>
        </div>

        {erro ? <p className="portal-config__erro">{erro}</p> : null}
        {okMsg ? <p className="portal-config__msg">{okMsg}</p> : null}

        {!data ? (
          <p className="portal-config__erro">Não foi possível carregar os dados.</p>
        ) : tab === 'hierarquia' ? (
          <section className="portal-config__panel portal-config__panel--full">
            <PortalHierarchyTree arvore={data.arvore || []} onChanged={() => void load()} />
          </section>
        ) : (
          <div className="portal-config__body portal-config__body--perms">
            <aside className="portal-config__list" aria-label="Usuários">
              <div className="portal-config__list-head">
                <div className="portal-config__list-title">
                  <strong>Usuários</strong>
                  <span className="portal-config__list-count">{usuariosEditaveis.length}</span>
                </div>
                <input
                  type="search"
                  className="portal-config__search"
                  placeholder="Buscar nome ou e-mail…"
                  value={filtroUser}
                  onChange={(e) => setFiltroUser(e.target.value)}
                  aria-label="Buscar usuário"
                />
              </div>
              {usuariosFiltrados.length === 0 ? (
                <p className="portal-config__empty">
                  {usuariosEditaveis.length === 0
                    ? 'Nenhum usuário para configurar ainda.'
                    : 'Nenhum resultado na busca.'}
                </p>
              ) : (
                <div className="portal-config__user-scroll">
                  {usuariosFiltrados.map((u) => {
                    const nSis = countSistemasLiberados(data.matriz[u.usuario])
                    return (
                      <button
                        key={u.usuario}
                        type="button"
                        className={`portal-config__user${selected === u.usuario ? ' portal-config__user--active' : ''}`}
                        onClick={() => {
                          setSelected(u.usuario)
                          setOkMsg(null)
                          setErro(null)
                        }}
                      >
                        <span className="portal-config__avatar" aria-hidden>
                          {userInitials(u.usuario)}
                        </span>
                        <span className="portal-config__user-text">
                          <span className="portal-config__user-name">{u.usuario}</span>
                          <span className="portal-config__user-meta">
                            {u.email || u.nivel || 'Sem e-mail'}
                          </span>
                        </span>
                        <span
                          className={`portal-config__user-badge${nSis === 0 ? ' portal-config__user-badge--off' : ''}`}
                          title={`${nSis} sistema(s) liberado(s)`}
                        >
                          {nSis}/3
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </aside>

            <section className="portal-config__panel portal-config__panel--perms">
              {!selectedUser ? (
                <div className="portal-config__empty-panel">
                  <p>
                    {usuariosEditaveis.length === 0
                      ? 'Cadastre outros usuários no portal para definir permissões.'
                      : 'Selecione um usuário à esquerda.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="portal-config__perms-hero">
                    <span className="portal-config__avatar portal-config__avatar--lg" aria-hidden>
                      {userInitials(selectedUser.usuario)}
                    </span>
                    <div>
                      <h2 className="portal-config__perms-title">{selectedUser.usuario}</h2>
                      <p className="portal-config__sub">
                        {selectedUser.email ? selectedUser.email : 'Sem e-mail'}
                        {selectedUser.nivel ? ` · ${selectedUser.nivel}` : ''}
                      </p>
                    </div>
                  </div>
                  <p className="portal-config__perms-hint">
                    Escolha quais sistemas a pessoa pode abrir e quais telas liberar em cada um. Sem
                    restrição de módulos = acesso a tudo do sistema.
                  </p>

                  <div className="portal-config__sistemas">
                    {(['light', 'plus', 'pro'] as SistemaId[]).map((sistema) => {
                      const bloco = perms?.[sistema] || { pode_acessar: true, modulos: null }
                      const mods = data.modulos[sistema] || []
                      const selectedMods = bloco.modulos
                      const liberados =
                        selectedMods == null
                          ? mods.length
                          : mods.filter((m) => selectedMods.includes(m.id)).length
                      return (
                        <article
                          key={sistema}
                          className={`portal-config__sistema portal-config__sistema--${sistema}${bloco.pode_acessar ? '' : ' portal-config__sistema--off'}`}
                        >
                          <div className="portal-config__sistema-head">
                            <div className="portal-config__sistema-titles">
                              <span className={`portal-config__sis-pill portal-config__sis-pill--${sistema}`}>
                                {sistema}
                              </span>
                              <div>
                                <strong>{SISTEMA_LABEL[sistema]}</strong>
                                <p className="portal-config__sis-hint">{SISTEMA_HINT[sistema]}</p>
                              </div>
                            </div>
                            <label className="portal-config__switch">
                              <input
                                type="checkbox"
                                checked={bloco.pode_acessar}
                                onChange={(e) => patchSistema(sistema, { pode_acessar: e.target.checked })}
                              />
                              <span className="portal-config__switch-ui" aria-hidden />
                              <span className="portal-config__switch-label">
                                {bloco.pode_acessar ? 'Acesso liberado' : 'Bloqueado'}
                              </span>
                            </label>
                          </div>

                          {bloco.pode_acessar ? (
                            <>
                              <div className="portal-config__mods-toolbar">
                                <span className="portal-config__mods-count">
                                  Telas · {liberados}/{mods.length}
                                  {selectedMods == null ? ' · todas' : ''}
                                </span>
                                <div className="portal-config__mods-actions">
                                  <button
                                    type="button"
                                    className="portal-config__link-btn"
                                    onClick={() => setAllModulos(sistema, true)}
                                  >
                                    Todas
                                  </button>
                                  <button
                                    type="button"
                                    className="portal-config__link-btn"
                                    onClick={() => setAllModulos(sistema, false)}
                                  >
                                    Nenhuma
                                  </button>
                                </div>
                              </div>
                              <div className="portal-config__mods">
                                {mods.map((m) => {
                                  const checked = selectedMods == null || selectedMods.includes(m.id)
                                  return (
                                    <label
                                      key={m.id}
                                      className={`portal-config__chip${checked ? ' portal-config__chip--on' : ''}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleModulo(sistema, m.id)}
                                      />
                                      <span>{m.label}</span>
                                    </label>
                                  )
                                })}
                              </div>
                            </>
                          ) : (
                            <p className="portal-config__blocked">
                              Sistema oculto no hub. Ative o acesso acima para liberar as telas.
                            </p>
                          )}
                        </article>
                      )
                    })}
                  </div>

                  <div className="portal-config__save-bar">
                    <button
                      type="button"
                      className="portal-config__btn portal-config__btn--primary portal-config__btn--save"
                      disabled={saving}
                      onClick={() => void handleSavePermissoes()}
                    >
                      {saving ? 'Salvando…' : 'Salvar permissões'}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
