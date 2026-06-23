import { useState } from 'react'
import type { NotaFiscal } from '../types'
import { enderecosDosItens, nfTemEnderecos } from '../lib/movimentos'
import { formatAddressLabel } from '../layout/camaras'

type Props = {
  nfBusca: NotaFiscal | null
  itensFlagados: Set<number>
  onBuscar: (numero: string) => void
  onToggleItem: (index: number) => void
  onFinalizarSaida: () => void
  buscaErro: string | null
}

export function SaidaPanel({
  nfBusca,
  itensFlagados,
  onBuscar,
  onToggleItem,
  onFinalizarSaida,
  buscaErro,
}: Props) {
  const [numero, setNumero] = useState('')

  function handleBuscar() {
    onBuscar(numero.trim())
  }

  const itensComEndereco = nfBusca?.items.filter((it) => it.allocatedAddresses.length > 0) ?? []
  const enderecosFlagados = nfBusca
    ? enderecosDosItens(nfBusca, [...itensFlagados])
    : []

  return (
    <>
      <div className="sidebar-block">
        <p className="muted">Digite o número da NF para ver onde retirar os itens.</p>
        <div className="saida-busca">
          <input
            type="text"
            className="input-nf"
            placeholder="Número da NF"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
          />
          <button type="button" className="btn primary" onClick={handleBuscar}>
            Buscar
          </button>
        </div>
        {buscaErro && <p className="error">{buscaErro}</p>}
      </div>

      {nfBusca && nfTemEnderecos(nfBusca) && (
        <div className="sidebar-block nf-detail">
          <h3>NF {nfBusca.numero}</h3>
          <p className="muted">{nfBusca.emitente}</p>
          <p className="muted">Marque os itens que vai retirar:</p>

          <ul className="item-list">
            {itensComEndereco.map((item) => {
              const flagged = itensFlagados.has(item.index)
              return (
                <li key={item.index}>
                  <button
                    type="button"
                    className={`item-row ${flagged ? 'item-row--active' : ''}`}
                    onClick={() => onToggleItem(item.index)}
                  >
                    <span className="item-check">{flagged ? '✓' : '○'}</span>
                    <span className="item-text">
                      <strong>{item.codigo}</strong>
                      <span>{item.descricao}</span>
                      <span className="muted">
                        Retirar de {item.allocatedAddresses.length} endereço(s)
                      </span>
                    </span>
                  </button>
                  <ul className="addr-mini addr-mini--saida">
                    {item.allocatedAddresses.map((a) => (
                      <li key={a} className={flagged ? 'addr-flagged' : ''}>
                        {formatAddressLabel(a)}
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>

          {itensFlagados.size > 0 && (
            <div className="item-actions">
              <p className="muted">
                {itensFlagados.size} item(ns) · {enderecosFlagados.length} endereço(s) serão liberados
              </p>
              <button type="button" className="btn warning full" onClick={onFinalizarSaida}>
                Finalizar saída — NF {nfBusca.numero}
              </button>
            </div>
          )}
        </div>
      )}

      {nfBusca && !nfTemEnderecos(nfBusca) && (
        <p className="muted sidebar-block">Esta NF não possui itens em estoque (posições já liberadas).</p>
      )}
    </>
  )
}
