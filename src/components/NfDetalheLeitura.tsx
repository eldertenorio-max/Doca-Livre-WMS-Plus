import type { ReactNode } from 'react'
import type { NfeItem, NotaFiscal } from '../types'
import { NfResumoGrid } from './NfResumoGrid'
import { NfItensLeituraTable } from './NfItensLeituraTable'
import { NfLocalizacaoBadge } from './NfLocalizacaoBadge'

type Props = {
  nf: NotaFiscal
  actions?: ReactNode
  items?: NfeItem[]
  activeItemIndex?: number | null
  onSelectItem?: (index: number) => void
  selectablePredicate?: (item: NfeItem) => boolean
  highlightAddresses?: Set<string>
  itensIntro?: string
  showItensTitle?: boolean
  showItensTable?: boolean
}

function formatDate(raw: string): string {
  if (!raw) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10)
  return d.toLocaleString('pt-BR')
}

export function NfDetalheLeitura({
  nf,
  actions,
  items,
  activeItemIndex,
  onSelectItem,
  selectablePredicate,
  highlightAddresses,
  itensIntro,
  showItensTitle = true,
  showItensTable = true,
}: Props) {
  const lista = items ?? nf.items

  return (
    <>
      <div className="nf-detail-head">
        <h3 className="nf-detail-title-row">
          NF {nf.numero}
          <NfLocalizacaoBadge nf={nf} />
        </h3>
        {actions}
      </div>

      <dl className="meta-list meta-list--nf">
        <div>
          <dt>Emitente</dt>
          <dd>{nf.emitente || '—'}</dd>
        </div>
        <div>
          <dt>Emissão</dt>
          <dd>{formatDate(nf.dataEmissao)}</dd>
        </div>
        {nf.serie && (
          <div>
            <dt>Série</dt>
            <dd>{nf.serie}</dd>
          </div>
        )}
      </dl>

      <p className="nf-leitura-subtitle">Totais do documento</p>
      <NfResumoGrid nf={nf} compact />

      {showItensTitle && <h4 className="nf-section-title nf-section-title--sm">Itens da nota</h4>}
      {itensIntro && <p className="muted nf-itens-intro">{itensIntro}</p>}

      {showItensTable && (
        <NfItensLeituraTable
          nf={nf}
          items={lista}
          activeItemIndex={activeItemIndex}
          onSelectItem={onSelectItem}
          selectablePredicate={selectablePredicate}
          highlightAddresses={highlightAddresses}
        />
      )}
    </>
  )
}
