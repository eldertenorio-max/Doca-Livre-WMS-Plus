import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchPortalConfigOverview,
  savePortalHierarquia,
  savePortalPermissoes,
  type PortalConfigOverview,
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

export default function PortalConfigScreen({ usuario, onContinuar, onSair }: Props) {
  const [tab, setTab] = useState<'hierarquia' | 'permissoes'>('permissoes')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [data, setData] = useState<PortalConfigOverview | null>(null)
  const [selected, setSelected] = useState<string>('')

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
    setSelected((prev) => prev || res.usuarios[0]?.usuario || '')
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const selectedUser = useMemo(
    () => data?.usuarios.find((u) => u.usuario === selected) || null,
    [data, selected],
  )

  const perms = useMemo(() => {
    if (!data || !selected) return null
    return data.matriz[selected] || null
  }, [data, selected])

  async function handleSaveHierarquia() {
    if (!selectedUser || !data) return
    setSaving(true)
    setErro(null)
    setOkMsg(null)
    const res = await savePortalHierarquia({
      usuario: selectedUser.usuario,
      nivel: selectedUser.nivel || '',
      superior: selectedUser.superior || '',
    })
    setSaving(false)
    if (!res.ok) {
      setErro(res.erro)
      return
    }
    setOkMsg('Hierarquia salva.')
    void load()
  }

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

  function patchUser(patch: Partial<{ nivel: string; superior: string }>) {
    if (!data || !selected) return
    setData({
      ...data,
      usuarios: data.usuarios.map((u) => (u.usuario === selected ? { ...u, ...patch } : u)),
    })
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
    const allIds = (data.modulos[sistema] || []).map((m) => m.id)
    const current = bloco.modulos == null ? [...allIds] : [...bloco.modulos]
    const next = current.includes(modId) ? current.filter((x) => x !== modId) : [...current, modId]
    const isAll = allIds.length > 0 && allIds.every((id) => next.includes(id))
    patchSistema(sistema, { modulos: isAll ? null : next })
  }

  if (loading) {
    return <div className="portal-config__loading">Carregando configuração do portal…</div>
  }

  return (
    <div className="portal-config" role="main">
      <div className="portal-config__shell">
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
        ) : (
          <div className="portal-config__body">
            <aside className="portal-config__list" aria-label="Usuários">
              {data.usuarios.map((u) => (
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
                  <span className="portal-config__user-name">{u.usuario}</span>
                  <span className="portal-config__user-meta">
                    {u.is_superuser ? 'Super Usuário' : u.nivel || 'Sem nível'}
                    {u.email ? ` · ${u.email}` : ''}
                  </span>
                </button>
              ))}
            </aside>

            <section className="portal-config__panel">
              {!selectedUser ? (
                <p>Selecione um usuário.</p>
              ) : tab === 'hierarquia' ? (
                <>
                  <h2>Hierarquia — {selectedUser.usuario}</h2>
                  <div className="portal-config__row">
                    <div className="portal-config__field">
                      <label htmlFor="cfg-nivel">Nível</label>
                      <select
                        id="cfg-nivel"
                        value={selectedUser.nivel || ''}
                        onChange={(e) => patchUser({ nivel: e.target.value })}
                      >
                        <option value="">—</option>
                        {data.niveis.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="portal-config__field">
                      <label htmlFor="cfg-superior">Superior</label>
                      <select
                        id="cfg-superior"
                        value={selectedUser.superior || ''}
                        onChange={(e) => patchUser({ superior: e.target.value })}
                      >
                        <option value="">—</option>
                        {data.usuarios
                          .filter((u) => u.usuario !== selectedUser.usuario)
                          .map((u) => (
                            <option key={u.usuario} value={u.usuario}>
                              {u.usuario}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="portal-config__btn portal-config__btn--primary"
                    disabled={saving}
                    onClick={() => void handleSaveHierarquia()}
                  >
                    {saving ? 'Salvando…' : 'Salvar hierarquia'}
                  </button>
                </>
              ) : (
                <>
                  <h2>Permissões — {selectedUser.usuario}</h2>
                  <p className="portal-config__sub" style={{ marginBottom: 14 }}>
                    Marque quais sistemas a pessoa pode abrir e quais telas/módulos pode ver em cada um.
                    Sem restrição de módulos = acesso a tudo do sistema.
                  </p>
                  {(['light', 'plus', 'pro'] as SistemaId[]).map((sistema) => {
                    const bloco = perms?.[sistema] || { pode_acessar: true, modulos: null }
                    const mods = data.modulos[sistema] || []
                    const selectedMods = bloco.modulos
                    return (
                      <div key={sistema} className="portal-config__sistema">
                        <div className="portal-config__sistema-head">
                          <strong>{SISTEMA_LABEL[sistema]}</strong>
                          <label className="portal-config__mod">
                            <input
                              type="checkbox"
                              checked={bloco.pode_acessar}
                              onChange={(e) => patchSistema(sistema, { pode_acessar: e.target.checked })}
                            />
                            Pode acessar este sistema
                          </label>
                        </div>
                        {bloco.pode_acessar ? (
                          <div className="portal-config__mods">
                            {mods.map((m) => {
                              const checked = selectedMods == null || selectedMods.includes(m.id)
                              return (
                                <label key={m.id} className="portal-config__mod">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleModulo(sistema, m.id)}
                                  />
                                  {m.label}
                                </label>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="portal-config__sub">Sistema bloqueado no hub.</p>
                        )}
                      </div>
                    )
                  })}
                  <button
                    type="button"
                    className="portal-config__btn portal-config__btn--primary"
                    disabled={saving}
                    onClick={() => void handleSavePermissoes()}
                  >
                    {saving ? 'Salvando…' : 'Salvar permissões'}
                  </button>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
