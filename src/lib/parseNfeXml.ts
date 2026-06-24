import type { NfeItem, NotaFiscal } from '../types'

function textOf(el: Element | null, tag: string): string {
  if (!el) return ''
  const node = el.getElementsByTagName(tag)[0]
  return node?.textContent?.trim() ?? ''
}

function numOf(el: Element | null, tag: string): number {
  const raw = textOf(el, tag).replace(',', '.')
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

function isUnidadePeso(unidade: string): boolean {
  const u = unidade.trim().toUpperCase()
  return u === 'KG' || u === 'KGM' || u === 'QUILO' || u === 'QUILOGRAMA'
}

function parsePesoBrutoItem(prod: Element, quantidade: number, unidade: string): number | undefined {
  const uTrib = textOf(prod, 'uTrib')
  const qTrib = numOf(prod, 'qTrib')
  if (isUnidadePeso(uTrib) && qTrib > 0) return qTrib
  if (isUnidadePeso(unidade) && quantidade > 0) return quantidade
  return undefined
}

function parseQuantidadeVolume(transp: Element | undefined): string | undefined {
  if (!transp) return undefined
  const volNodes = Array.from(transp.getElementsByTagName('vol'))
  if (volNodes.length === 0) return undefined

  const parts: string[] = []
  for (const vol of volNodes) {
    const q = numOf(vol, 'qVol')
    const esp = textOf(vol, 'esp') || 'VOL'
    if (q > 0) parts.push(`${q.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${esp}`)
  }
  return parts.length > 0 ? parts.join(' · ') : undefined
}

function parseTotaisTransporte(transp: Element | undefined): {
  pesoBruto?: number
  pesoLiquido?: number
} {
  if (!transp) return {}
  const volNodes = Array.from(transp.getElementsByTagName('vol'))
  let pesoBruto = 0
  let pesoLiquido = 0
  for (const vol of volNodes) {
    pesoBruto += numOf(vol, 'pesoB')
    pesoLiquido += numOf(vol, 'pesoL')
  }
  return {
    ...(pesoBruto > 0 ? { pesoBruto } : {}),
    ...(pesoLiquido > 0 ? { pesoLiquido } : {}),
  }
}

function findInfNFe(doc: Document): Element | null {
  return (
    doc.querySelector('infNFe') ??
    doc.getElementsByTagName('infNFe')[0] ??
    null
  )
}

export function parseNfeXml(xmlText: string): NotaFiscal {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error('XML inválido ou corrompido.')
  }

  const inf = findInfNFe(doc)
  if (!inf) {
    throw new Error('Arquivo não parece ser uma NF-e (infNFe não encontrado).')
  }

  const ide = inf.getElementsByTagName('ide')[0]
  const emit = inf.getElementsByTagName('emit')[0]
  const numero = textOf(ide, 'nNF')
  const serie = textOf(ide, 'serie')
  const chave = inf.getAttribute('Id')?.replace(/^NFe/, '') ?? ''
  const emitente = textOf(emit, 'xNome') || textOf(emit, 'xFant')
  const dataEmissao = textOf(ide, 'dhEmi') || textOf(ide, 'dEmi')

  const detNodes = Array.from(inf.getElementsByTagName('det'))
  const items: NfeItem[] = detNodes.map((det, index) => {
    const prod = det.getElementsByTagName('prod')[0]
    const quantidade = numOf(prod, 'qCom')
    const unidade = textOf(prod, 'uCom')
    const valorUnitario = numOf(prod, 'vUnCom')
    const valorTotal = numOf(prod, 'vProd')
    const pesoBruto = parsePesoBrutoItem(prod, quantidade, unidade)
    return {
      index,
      codigo: textOf(prod, 'cProd'),
      descricao: textOf(prod, 'xProd'),
      quantidade,
      unidade,
      allocatedAddresses: [],
      ...(pesoBruto != null ? { pesoBruto } : {}),
      ...(valorUnitario > 0 ? { valorUnitario } : {}),
      ...(valorTotal > 0 ? { valorTotal } : {}),
    }
  })

  if (items.length === 0) {
    throw new Error('Nenhum item encontrado na nota fiscal.')
  }

  const id = chave || `nf-${numero}-${serie}-${Date.now()}`

  const total = inf.getElementsByTagName('total')[0]
  const valorTotalNota = numOf(total, 'vNF')
  const transp = inf.getElementsByTagName('transp')[0]
  const totaisTransp = parseTotaisTransporte(transp)
  const quantidadeVolume = parseQuantidadeVolume(transp)

  return {
    id,
    numero,
    serie,
    chave,
    emitente,
    dataEmissao,
    items,
    status: 'em_andamento',
    createdAt: new Date().toISOString(),
    ...totaisTransp,
    ...(valorTotalNota > 0 ? { valorTotalNota } : {}),
    ...(quantidadeVolume ? { quantidadeVolume } : {}),
  }
}
