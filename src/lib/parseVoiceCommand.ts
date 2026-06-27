import type { SidebarSectionId } from '../components/CollapsibleSidebarSection'
import type { ConsultaEstoqueFiltros } from './consultaEstoque'
import { parseEnderecoFalado } from './parseEnderecoFalado'
import type { SidebarMode } from './sidebarMode'
import { normalizeVoiceText } from './voiceNormalize'
import type { AddressId } from '../types'

export type VoiceCommand =
  | { type: 'open_section'; section: SidebarSectionId; label: string }
  | { type: 'buscar_nota'; numero: string }
  | { type: 'consultar'; filtros: Partial<ConsultaEstoqueFiltros> }
  | { type: 'painel_periodo'; dias: number; label: string }
  | { type: 'confirmar_movimentacao' }
  | { type: 'sidebar_mode'; mode: SidebarMode; label: string }
  | { type: 'toggle_theme'; theme: 'light' | 'dark'; label: string }
  | { type: 'endereco'; addressId: AddressId }
  | { type: 'parar' }
  | { type: 'desconhecido'; raw: string }

const SECTION_ALIASES: { section: SidebarSectionId; patterns: RegExp[]; label: string }[] = [
  {
    section: 'painel',
    label: 'Painel',
    patterns: [
      /\b(abrir|mostrar|ver|ir para|ir ao)\s+(o\s+)?painel\b/,
      /\bpainel analitico\b/,
    ],
  },
  {
    section: 'consulta',
    label: 'Consulta estoque',
    patterns: [
      /\b(abrir|mostrar|ver|ir para)\s+(a\s+)?consulta\b/,
      /\bconsulta estoque\b/,
    ],
  },
  {
    section: 'editar',
    label: 'Movimentação',
    patterns: [
      /\b(abrir|mostrar|ver|ir para)\s+(a\s+)?movimentac(ao|ao)\b/,
      /\b(abrir|mostrar)\s+reposicionar\b/,
    ],
  },
  {
    section: 'entrada',
    label: 'Entrada',
    patterns: [/\b(abrir|mostrar|ver|ir para)\s+(a\s+)?entrada\b/],
  },
  {
    section: 'saida',
    label: 'Saída',
    patterns: [/\b(abrir|mostrar|ver|ir para)\s+(a\s+)?saida\b/],
  },
  {
    section: 'historico',
    label: 'Histórico',
    patterns: [/\b(abrir|mostrar|ver|ir para)\s+(o\s+)?historico\b/],
  },
  {
    section: 'imprimir',
    label: 'Mapa',
    patterns: [
      /\b(abrir|mostrar|ver|ir para)\s+(o\s+)?mapa\b/,
      /\bimprimir mapa\b/,
    ],
  },
  {
    section: 'canceladas',
    label: 'NF cancelada',
    patterns: [/\b(abrir|mostrar|ver)\s+(nf\s+)?cancelad/],
  },
  {
    section: 'cadastroVoz',
    label: 'Cadastro de voz',
    patterns: [
      /\b(abrir|mostrar|ver|ir para)\s+(o\s+)?cadastro de voz\b/,
      /\b(abrir|mostrar)\s+(a\s+)?voz\b/,
    ],
  },
]

export const VOICE_COMMAND_EXAMPLES: { frase: string; descricao: string }[] = [
  { frase: 'ok estoque', descricao: 'Ativa o assistente — depois fale o comando.' },
  { frase: 'ok estoque abrir painel', descricao: 'Abre o painel analítico em tela cheia.' },
  { frase: 'ok estoque abrir consulta', descricao: 'Abre a consulta de estoque.' },
  { frase: 'ok estoque abrir movimentação', descricao: 'Abre a reposição de paletes.' },
  { frase: 'ok estoque buscar nota 20835', descricao: 'Busca NF na movimentação.' },
  { frase: 'ok estoque consultar leite', descricao: 'Pesquisa item no estoque.' },
  { frase: 'ok estoque últimos sete dias', descricao: 'Filtra o painel pelos últimos 7 dias.' },
  { frase: 'ok estoque último mês', descricao: 'Filtra o painel pelos últimos 30 dias.' },
  { frase: 'ok estoque confirmar movimentação', descricao: 'Confirma reposição se distribuição completa.' },
  { frase: 'ok estoque menu tela cheia', descricao: 'Expande o menu lateral.' },
  { frase: 'ok estoque parar', descricao: 'Desarma o assistente.' },
]

function extractAfter(text: string, pattern: RegExp): string | null {
  const m = text.match(pattern)
  return m?.[1]?.trim() ?? null
}

export function parseVoiceCommand(text: string): VoiceCommand | null {
  const norm = normalizeVoiceText(text)
  if (!norm) return null

  if (/^(parar|cancelar|desligar|silencio|pare)$/.test(norm)) {
    return { type: 'parar' }
  }

  if (/^(tema escuro|modo escuro|dark mode)$/.test(norm)) {
    return { type: 'toggle_theme', theme: 'dark', label: 'Tema escuro' }
  }
  if (/^(tema claro|modo claro|light mode)$/.test(norm)) {
    return { type: 'toggle_theme', theme: 'light', label: 'Tema claro' }
  }

  if (/\b(menu|sidebar)\s+(tela cheia|fullscreen|cheio)\b/.test(norm) || norm === 'tela cheia') {
    return { type: 'sidebar_mode', mode: 'fullscreen', label: 'Menu tela cheia' }
  }
  if (/\b(menu|sidebar)\s+(aberto|lateral)\b/.test(norm) || norm === 'menu aberto') {
    return { type: 'sidebar_mode', mode: 'open', label: 'Menu aberto' }
  }
  if (/\b(menu|sidebar)\s+(recolhido|fechado|minimo)\b/.test(norm) || norm === 'menu recolhido') {
    return { type: 'sidebar_mode', mode: 'collapsed', label: 'Menu recolhido' }
  }

  if (/\bconfirmar movimentac/.test(norm)) {
    return { type: 'confirmar_movimentacao' }
  }

  const notaNum = extractAfter(
    norm,
    /\b(buscar|procurar|pesquisar|abrir)\s+(a\s+)?(nota|nf)\s+(\d[\d\s.-]*)/,
  )
  if (notaNum) {
    const numero = notaNum.replace(/\D/g, '')
    if (numero) return { type: 'buscar_nota', numero }
  }

  const consultaQuery =
    extractAfter(norm, /\bconsultar\s+(o\s+)?(item\s+)?(.+)/) ??
    extractAfter(norm, /\bpesquisar\s+(o\s+)?(item\s+)?(.+)/)
  if (consultaQuery) {
    const q = consultaQuery.trim()
    if (/^\d[\d\s.-]*$/.test(q.replace(/\s/g, ''))) {
      return {
        type: 'consultar',
        filtros: { nfNumero: q.replace(/\D/g, '') },
      }
    }
    return { type: 'consultar', filtros: { item: q } }
  }

  if (/\b(ultimos|ultimo)\s+(7|sete)\s+dias\b/.test(norm)) {
    return { type: 'painel_periodo', dias: 7, label: 'Últimos 7 dias' }
  }
  if (/\b(ultimos|ultimo)\s+(30|trinta)\s+dias\b/.test(norm) || /\bultimo mes\b/.test(norm)) {
    return { type: 'painel_periodo', dias: 30, label: 'Último mês' }
  }
  if (/\bhoje\b/.test(norm) && /\bpainel\b/.test(norm)) {
    return { type: 'painel_periodo', dias: 0, label: 'Hoje' }
  }

  for (const entry of SECTION_ALIASES) {
    if (entry.patterns.some((p) => p.test(norm))) {
      return { type: 'open_section', section: entry.section, label: entry.label }
    }
  }

  const endereco = parseEnderecoFalado(norm)
  if (endereco) {
    return { type: 'endereco', addressId: endereco }
  }

  if (norm.length > 2) {
    return { type: 'desconhecido', raw: text.trim() }
  }

  return null
}

export function describeVoiceCommand(cmd: VoiceCommand): string {
  switch (cmd.type) {
    case 'open_section':
      return `Abrindo ${cmd.label}`
    case 'buscar_nota':
      return `Buscando NF ${cmd.numero}`
    case 'consultar':
      return 'Consultando estoque'
    case 'painel_periodo':
      return `Painel: ${cmd.label}`
    case 'confirmar_movimentacao':
      return 'Confirmando movimentação'
    case 'sidebar_mode':
      return cmd.label
    case 'toggle_theme':
      return cmd.label
    case 'endereco':
      return `Endereço ${cmd.addressId}`
    case 'parar':
      return 'Assistente desarmado'
    case 'desconhecido':
      return `Não entendi: "${cmd.raw}"`
  }
}

export function painelFiltrosPorDias(dias: number) {
  const fim = new Date()
  const inicio = new Date()
  if (dias <= 0) {
    /* hoje */
  } else {
    inicio.setDate(inicio.getDate() - dias)
  }
  return {
    dataInicio: inicio.toISOString().slice(0, 10),
    horaInicio: '00:00',
    dataFim: fim.toISOString().slice(0, 10),
    horaFim: '23:59',
  }
}
