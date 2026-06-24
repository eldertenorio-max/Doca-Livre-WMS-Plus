import { useState } from 'react'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { formatAddressLabel } from '../layout/camaras'
import {
  CONSULTA_FILTROS_VAZIOS,
  type ConsultaEstoqueFiltros,
  type ConsultaEstoqueResultado,
} from '../lib/consultaEstoque'
import type { ItemManualInput } from '../lib/adicionarItemNf'
import type { NotaFiscal } from '../types'
import { ConsultaItemManualForm } from './ConsultaItemManualForm'

type Props = {
  emitentesSugeridos: string[]
  resultados: ConsultaEstoqueResultado[]
  buscaErro: string | null
  onBuscar: (filtros: ConsultaEstoqueFiltros) => void
  onLimpar: () => void
  nfAdicionar: NotaFiscal | null
  nfAdicionarErro: string | null
  itemAdicionadoMsg: string | null
  itemManualErro: string | null
  onBuscarNfAdicionar: (numero: string) => void
  onReplicarItem: (itemIndex: number) => void
  onExcluirItem: (itemIndex: number) => void
  onAdicionarItemManual: (input: ItemManualInput) => void
  onLimparNfAdicionar: () => void
}

export function ConsultaEstoquePanel({
  emitentesSugeridos,
  resultados,
  buscaErro,
  onBuscar,
  onLimpar,
  nfAdicionar,
  nfAdicionarErro,
  itemAdicionadoMsg,
  itemManualErro,
  onBuscarNfAdicionar,
  onReplicarItem,
  onExcluirItem,
  onAdicionarItemManual,
  onLimparNfAdicionar,
}: Props) {
  const [filtros, setFiltros] = useState<ConsultaEstoqueFiltros>(CONSULTA_FILTROS_VAZIOS)
  const [numeroNf, setNumeroNf] = useState('')
  const [mostrarFormManual, setMostrarFormManual] = useState(false)
  const [itemExcluirIndex, setItemExcluirIndex] = useState<number | null>(null)

  useBodyScrollLock(itemExcluirIndex != null)

  const itemExcluir =
    nfAdicionar && itemExcluirIndex != null
      ? nfAdicionar.items.find((it) => it.index === itemExcluirIndex) ?? null
      : null

  function patch(partial: Partial<ConsultaEstoqueFiltros>) {
    setFiltros((prev) => ({ ...prev, ...partial }))
  }

  function handleBuscar() {
    onBuscar(filtros)
    setFiltros(CONSULTA_FILTROS_VAZIOS)
  }

  function handleLimpar() {
    setFiltros(CONSULTA_FILTROS_VAZIOS)
    onLimpar()
  }

  function handleBuscarNf() {
    onBuscarNfAdicionar(numeroNf.trim())
    setNumeroNf('')
  }

  const agrupados = agruparPorNf(resultados)

  return (
    <>
      <div className="sidebar-block">
        <p className="muted">
          Filtre por nota, item, remetente ou lote. Os endereços encontrados aparecem no painel com
          fundo verde claro, sem cobrir o número da NF.
        </p>

        <div className="consulta-filtros">
          <label className="consulta-campo">
            <span>Nota fiscal</span>
            <input
              type="text"
              className="input-nf"
              placeholder="Número da NF"
              value={filtros.nfNumero}
              onChange={(e) => patch({ nfNumero: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
            />
          </label>

          <label className="consulta-campo">
            <span>Item</span>
            <input
              type="text"
              className="input-nf"
              placeholder="Código ou descrição"
              value={filtros.item}
              onChange={(e) => patch({ item: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
            />
          </label>

          <label className="consulta-campo">
            <span>Remetente</span>
            <input
              type="text"
              className="input-nf"
              placeholder="Nome do remetente"
              list="consulta-emitentes"
              value={filtros.remetente}
              onChange={(e) => patch({ remetente: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
            />
            <datalist id="consulta-emitentes">
              {emitentesSugeridos.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
          </label>

          <label className="consulta-campo">
            <span>Lote</span>
            <input
              type="text"
              className="input-nf"
              placeholder="Lote do item"
              value={filtros.lote}
              onChange={(e) => patch({ lote: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
            />
          </label>
        </div>

        <div className="consulta-actions">
          <button type="button" className="btn primary" onClick={handleBuscar}>
            Pesquisar
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleLimpar}>
            Limpar
          </button>
        </div>

        {buscaErro && <p className="error">{buscaErro}</p>}
      </div>

      {resultados.length > 0 && (
        <div className="sidebar-block">
          <h3>
            {resultados.length}{' '}
            {resultados.length === 1 ? 'endereço encontrado' : 'endereços encontrados'}
          </h3>
          <ul className="consulta-resultados">
            {agrupados.map((grupo) => (
              <li key={grupo.nfId} className="consulta-grupo">
                <p className="consulta-grupo-titulo">
                  <strong>NF {grupo.nfNumero}</strong>
                  <span className="muted"> · {grupo.emitente}</span>
                </p>
                <ul className="consulta-grupo-itens">
                  {grupo.itens.map((item) => (
                    <li key={`${grupo.nfId}-${item.itemIndex}`}>
                      <span className="consulta-item-codigo">{item.codigo}</span>
                      <span className="muted"> — {item.descricao}</span>
                      {(item.lote || item.up) && (
                        <span className="consulta-item-meta">
                          {item.lote ? ` · Lote ${item.lote}` : ''}
                          {item.up ? ` · UP ${item.up}` : ''}
                        </span>
                      )}
                      <ul className="consulta-enderecos">
                        {item.enderecos.map((addr) => (
                          <li key={addr}>{formatAddressLabel(addr)}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="sidebar-block consulta-adicionar">
        <h3 className="consulta-section-title">Adicionar item à NF</h3>
        <p className="muted">
          Busque uma NF já importada por XML. Replique um item existente ou cadastre um item manual
          e depois enderece na aba Entrada.
        </p>
        <div className="saida-busca">
          <input
            type="text"
            className="input-nf"
            placeholder="Número da NF"
            value={numeroNf}
            onChange={(e) => setNumeroNf(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleBuscarNf()}
          />
          <button type="button" className="btn primary" onClick={handleBuscarNf}>
            Buscar
          </button>
        </div>
        {nfAdicionarErro && <p className="error">{nfAdicionarErro}</p>}
        {itemAdicionadoMsg && <p className="consulta-sucesso">{itemAdicionadoMsg}</p>}

        {nfAdicionar && (
          <div className="consulta-nf-adicionar">
            <div className="consulta-nf-adicionar-head">
              <p className="consulta-grupo-titulo">
                <strong>NF {nfAdicionar.numero}</strong>
                <span className="muted"> · {nfAdicionar.emitente}</span>
              </p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onLimparNfAdicionar}>
                Limpar
              </button>
            </div>
            <p className="muted consulta-nf-adicionar-hint">
              Replique um item existente ou adicione um item manual:
            </p>
            <ul className="consulta-itens-adicionar">
              {nfAdicionar.items.map((item) => {
                const podeExcluir = nfAdicionar.items.length > 1
                return (
                <li key={item.index}>
                  <div className="consulta-item-adicionar-row">
                    <div className="consulta-item-adicionar-info">
                      <span className="consulta-item-codigo">{item.codigo}</span>
                      <span className="muted"> — {item.descricao}</span>
                      {(item.lote || item.up) && (
                        <span className="consulta-item-meta">
                          {item.lote ? ` · Lote ${item.lote}` : ''}
                          {item.up ? ` · UP ${item.up}` : ''}
                        </span>
                      )}
                      {item.allocatedAddresses.length > 0 && (
                        <span className="consulta-item-meta">
                          {' '}
                          · {item.allocatedAddresses.length} endereço(s)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="consulta-item-remove"
                      title={podeExcluir ? 'Excluir item' : 'A NF precisa ter ao menos um item'}
                      disabled={!podeExcluir}
                      aria-label="Excluir item"
                      onClick={() => podeExcluir && setItemExcluirIndex(item.index)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  <div className="consulta-item-adicionar-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => onReplicarItem(item.index)}
                    >
                      Replicar item
                    </button>
                  </div>
                </li>
                )
              })}
            </ul>

            {!mostrarFormManual ? (
              <button
                type="button"
                className="btn btn-ghost consulta-btn-adicionar"
                onClick={() => setMostrarFormManual(true)}
              >
                + Adicionar item manual
              </button>
            ) : (
              <ConsultaItemManualForm
                erro={itemManualErro}
                onCancel={() => setMostrarFormManual(false)}
                onConfirm={(input) => {
                  onAdicionarItemManual(input)
                  setMostrarFormManual(false)
                }}
              />
            )}
          </div>
        )}

      {itemExcluir && nfAdicionar && (
        <div className="confirm-backdrop" onClick={() => setItemExcluirIndex(null)}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <h4>Excluir item?</h4>
            <p>
              <strong>{itemExcluir.codigo}</strong>
              <span className="muted"> — {itemExcluir.descricao}</span>
            </p>
            {itemExcluir.allocatedAddresses.length > 0 ? (
              <p className="confirm-warn">
                Este item tem {itemExcluir.allocatedAddresses.length} endereço(s) alocado(s). Eles
                serão liberados no painel.
              </p>
            ) : (
              <p className="muted">A linha será removida da NF {nfAdicionar.numero}.</p>
            )}
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={() => setItemExcluirIndex(null)}>
                Voltar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  onExcluirItem(itemExcluir.index)
                  setItemExcluirIndex(null)
                }}
              >
                Excluir item
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3h6m-8 4h10m-1 0-.7 12.1a2 2 0 0 1-2 1.9H9.7a2 2 0 0 1-2-1.9L7 7m3 4v5m4-5v5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type GrupoNf = {
  nfId: string
  nfNumero: string
  emitente: string
  itens: Array<{
    itemIndex: number
    codigo: string
    descricao: string
    lote?: string
    up?: string
    enderecos: string[]
  }>
}

function agruparPorNf(resultados: ConsultaEstoqueResultado[]): GrupoNf[] {
  const porNf = new Map<string, GrupoNf>()

  for (const r of resultados) {
    let grupo = porNf.get(r.nfId)
    if (!grupo) {
      grupo = { nfId: r.nfId, nfNumero: r.nfNumero, emitente: r.emitente, itens: [] }
      porNf.set(r.nfId, grupo)
    }

    let item = grupo.itens.find((it) => it.itemIndex === r.itemIndex)
    if (!item) {
      item = {
        itemIndex: r.itemIndex,
        codigo: r.codigo,
        descricao: r.descricao,
        ...(r.lote ? { lote: r.lote } : {}),
        ...(r.up ? { up: r.up } : {}),
        enderecos: [],
      }
      grupo.itens.push(item)
    }
    if (!item.enderecos.includes(r.addressId)) item.enderecos.push(r.addressId)
  }

  return [...porNf.values()]
}
