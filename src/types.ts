export type AddressId = string

export type NfeItem = {
  index: number
  codigo: string
  descricao: string
  quantidade: number
  unidade: string
  allocatedAddresses: AddressId[]
}

export type NotaFiscal = {
  id: string
  numero: string
  serie: string
  chave: string
  emitente: string
  dataEmissao: string
  items: NfeItem[]
  status: 'em_andamento' | 'concluida'
  createdAt: string
}

export type MovimentoTipo = 'entrada' | 'saida'

export type MovimentoItemSnapshot = {
  itemIndex: number
  codigo: string
  descricao: string
  quantidade: number
  unidade: string
  addressIds: AddressId[]
}

export type MovimentoRegistro = {
  id: string
  tipo: MovimentoTipo
  nfId: string
  nfNumero: string
  emitente: string
  createdAt: string
  itens: MovimentoItemSnapshot[]
}

export type AddressOccupancy = {
  nfId: string
  nfNumero: string
  itemIndex: number
  codigo: string
  descricao: string
  quantidade: number
  unidade: string
}

export type AppTab = 'entrada' | 'saida' | 'historico'

export type AppState = {
  notas: NotaFiscal[]
  movimentos: MovimentoRegistro[]
  activeNfId: string | null
  activeItemIndex: number | null
}

export type PersistedData = {
  notas: NotaFiscal[]
  movimentos: MovimentoRegistro[]
}
