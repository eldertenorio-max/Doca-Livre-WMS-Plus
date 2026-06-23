import { useState, type ChangeEvent } from 'react'
import type { EntradaCampoId, EntradaCamposConfig, EntradaItemCampos } from '../lib/entradaCampos'
import { ENTRADA_CAMPOS_LIST, entradaCamposAtivos } from '../lib/entradaCampos'
import type { NfeItem, NotaFiscal } from '../types'
import { allItemsAllocated } from '../lib/repository'
import { formatAddressLabel } from '../layout/camaras'

type Props = {
  notas: NotaFiscal[]
  activeNfId: string | null
  activeItemIndex: number | null
  pendingCount: number
  camposConfig: EntradaCamposConfig
  camposDraft: EntradaCamposConfig
  camposDirty: boolean
  camposSavedHint: boolean
  onToggleCampo: (id: EntradaCampoId) => void
  onSaveCampos: () => void
  onUpload: (files: File[]) => void | Promise<void>
  onCadastrarManual: () => void
  onSelectNf: (id: string) => void
  onSelectItem: (index: number) => void
  onUpdateItemCampos: (itemIndex: number, patch: EntradaItemCampos) => void
  onConfirmItem: () => void
  onFinishEntrada: () => void
  onCancelarEntrada: (nfId: string) => void
  onLimparSelecao: () => void
  uploadError: string | null
}

function itemStatus(item: NfeItem): 'pendente' | 'ok' {
  if (item.allocatedAddresses.length === 0) return 'pendente'
  return 'ok'
}

function formatItemExtra(label: string, value: string | undefined): string | null {
  if (!value?.trim()) return null
  return `${label}: ${value}`
}

export function EntradaPanel({
  notas,
  activeNfId,
  activeItemIndex,
  pendingCount,
  camposConfig,
  camposDraft,
  camposDirty,
  camposSavedHint,
  onToggleCampo,
  onSaveCampos,
  onUpload,
  onCadastrarManual,
  onSelectNf,
  onSelectItem,
  onUpdateItemCampos,
  onConfirmItem,
  onFinishEntrada,
  onCancelarEntrada,
  onLimparSelecao,
  uploadError,
}: Props) {
  const [confirmarCancelar, setConfirmarCancelar] = useState<string | null>(null)
  const emAndamento = notas.filter((n) => n.status === 'em_andamento')
  const activeNf = notas.find((n) => n.id === activeNfId) ?? null
  const activeItem =
    activeNf && activeItemIndex != null
      ? activeNf.items.find((it) => it.index === activeItemIndex) ?? null
      : null

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : []
    if (files.length > 0) void onUpload(files)
    e.target.value = ''
  }

  return (
    <>
      <div className="sidebar-block">
        <label className="upload-btn">
          <input
            type="file"
            accept=".xml,text/xml,application/xml"
            multiple
            hidden
            onChange={handleFile}
          />
          Subir XML da NF-e (entrada)
        </label>
        <p className="muted entrada-upload-hint">Selecione um ou vários XMLs. NFs repetidas são ignoradas.</p>

        <div className="entrada-campos-box">
          <p className="entrada-campos-title">Informações extras na entrada</p>
          <p className="muted entrada-campos-hint">Marque o que deseja preencher por item e salve.</p>
          <ul className="entrada-campos-list">
            {ENTRADA_CAMPOS_LIST.map((campo) => (
              <li key={campo.id}>
                <label className="entrada-campos-check">
                  <input
                    type="checkbox"
                    checked={camposDraft[campo.id]}
                    onChange={() => onToggleCampo(campo.id)}
                  />
                  <span>{campo.label}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="entrada-campos-actions">
            <button type="button" className="btn primary btn-sm" onClick={onSaveCampos} disabled={!camposDirty}>
              Salvar opções
            </button>
            {camposSavedHint && <span className="entrada-campos-saved">Salvo</span>}
          </div>
        </div>

        <button type="button" className="upload-btn upload-btn--muted" onClick={onCadastrarManual}>
          Cadastrar NF manual
        </button>
        {uploadError && <p className="error">{uploadError}</p>}
      </div>

      {emAndamento.length > 0 && (
        <div className="sidebar-block">
          <h3>Entradas em andamento</h3>
          <ul className="nf-list">
            {emAndamento.map((nf) => (
              <li key={nf.id}>
                <button
                  type="button"
                  className={`nf-chip ${nf.id === activeNfId ? 'nf-chip--active' : ''}`}
                  onClick={() => onSelectNf(nf.id)}
                >
                  <strong>NF {nf.numero}</strong>
                  <span>Alocar endereços</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeNf && activeNf.status === 'em_andamento' && (
        <div className="sidebar-block nf-detail">
          <div className="nf-detail-head">
            <h3>NF {activeNf.numero}</h3>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirmarCancelar(activeNf.id)}
            >
              Cancelar entrada
            </button>
          </div>
          {activeNf.nfCanceladaOrigemNumero && (
            <p className="vinculo-entrada-badge">
              Substitui NF cancelada <strong>{activeNf.nfCanceladaOrigemNumero}</strong>
            </p>
          )}
          <dl className="meta-list">
            <div><dt>Emitente</dt><dd>{activeNf.emitente || '—'}</dd></div>
            <div><dt>Emissão</dt><dd>{formatDate(activeNf.dataEmissao)}</dd></div>
          </dl>

          <h4>Itens — marque endereços no painel</h4>
          <ul className="item-list">
            {activeNf.items.map((item) => {
              const st = itemStatus(item)
              const isActive = activeItemIndex === item.index
              const extras = [
                formatItemExtra('UP', item.up),
                formatItemExtra('Lote', item.lote),
                formatItemExtra('Fab.', item.dataFabricacao),
                formatItemExtra('Val.', item.dataValidade),
              ].filter(Boolean)
              return (
                <li key={item.index}>
                  <button
                    type="button"
                    className={`item-row ${isActive ? 'item-row--active' : ''} item-row--${st}`}
                    onClick={() => onSelectItem(item.index)}
                  >
                    <span className="item-check">{st === 'ok' ? '✓' : '○'}</span>
                    <span className="item-text">
                      <strong>{item.codigo}</strong>
                      <span>{item.descricao}</span>
                      <span className="muted">
                        {item.quantidade} {item.unidade} · {item.allocatedAddresses.length} end.
                      </span>
                      {extras.length > 0 && (
                        <span className="muted item-extra-line">{extras.join(' · ')}</span>
                      )}
                    </span>
                  </button>
                  {item.allocatedAddresses.length > 0 && (
                    <ul className="addr-mini">
                      {item.allocatedAddresses.map((a) => (
                        <li key={a}>{formatAddressLabel(a)}</li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>

          {activeItem && entradaCamposAtivos(camposConfig) && (
            <div className="entrada-item-campos">
              <h4>Dados do item {activeItem.codigo}</h4>
              {camposConfig.up && (
                <label className="entrada-campo-field">
                  <span>UP</span>
                  <input
                    type="text"
                    className="input-nf"
                    value={activeItem.up ?? ''}
                    onChange={(e) => onUpdateItemCampos(activeItem.index, { up: e.target.value })}
                  />
                </label>
              )}
              {camposConfig.lote && (
                <label className="entrada-campo-field">
                  <span>Lote</span>
                  <input
                    type="text"
                    className="input-nf"
                    value={activeItem.lote ?? ''}
                    onChange={(e) => onUpdateItemCampos(activeItem.index, { lote: e.target.value })}
                  />
                </label>
              )}
              {camposConfig.dataFabricacao && (
                <label className="entrada-campo-field">
                  <span>Data de fabricação</span>
                  <input
                    type="date"
                    className="input-nf"
                    value={activeItem.dataFabricacao ?? ''}
                    onChange={(e) =>
                      onUpdateItemCampos(activeItem.index, { dataFabricacao: e.target.value })
                    }
                  />
                </label>
              )}
              {camposConfig.dataValidade && (
                <label className="entrada-campo-field">
                  <span>Data de validade</span>
                  <input
                    type="date"
                    className="input-nf"
                    value={activeItem.dataValidade ?? ''}
                    onChange={(e) =>
                      onUpdateItemCampos(activeItem.index, { dataValidade: e.target.value })
                    }
                  />
                </label>
              )}
            </div>
          )}

          {activeItemIndex != null && (
            <div className="item-actions">
              <p className="muted">{pendingCount} endereço(s) selecionado(s)</p>
              <div className="item-actions-row">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onLimparSelecao}
                  disabled={pendingCount === 0}
                >
                  Limpar tudo
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={onConfirmItem}
                  disabled={pendingCount === 0}
                >
                  Confirmar endereços do item
                </button>
              </div>
            </div>
          )}

          {allItemsAllocated(activeNf) && (
            <button type="button" className="btn success full" onClick={onFinishEntrada}>
              Finalizar entrada — NF {activeNf.numero}
            </button>
          )}
        </div>
      )}

      {confirmarCancelar && (() => {
        const nf = notas.find((n) => n.id === confirmarCancelar)
        if (!nf) return null
        return (
          <div className="confirm-backdrop" onClick={() => setConfirmarCancelar(null)}>
            <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
              <h4>Cancelar entrada?</h4>
              <p>
                NF <strong>{nf.numero}</strong>
              </p>
              <p className="confirm-warn">
                A nota será removida, as posições marcadas serão liberadas e o registro de entrada será excluído do histórico.
              </p>
              <div className="confirm-actions">
                <button type="button" className="btn" onClick={() => setConfirmarCancelar(null)}>
                  Voltar
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    onCancelarEntrada(nf.id)
                    setConfirmarCancelar(null)
                  }}
                >
                  Cancelar entrada
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}

function formatDate(raw: string): string {
  if (!raw) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10)
  return d.toLocaleString('pt-BR')
}
