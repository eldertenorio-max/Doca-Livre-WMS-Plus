import { labelJustificativaSaida } from './justificativaSaida'
import { itemNoStage } from '../layout/stage'
import type { MovimentoRegistro, NotaFiscal, MovimentoTipo } from '../types'

export type PainelGraficoId =
  | 'entradas-saidas-dia'
  | 'movimentos-tipo'
  | 'movimentos-linha'
  | 'top-emitentes'
  | 'saidas-motivo'
  | 'paletes-dia'
  | 'nfs-dia'
  | 'stage-armazem'

export type PainelFiltros = {
  dataInicio: string
  horaInicio: string
  dataFim: string
  horaFim: string
}

export type PainelGraficoSugestao = {
  id: PainelGraficoId
  titulo: string
  descricao: string
  categoria: 'movimentacao' | 'estoque' | 'operacao'
}

export type PainelSerie = {
  label: string
  value: number
  cor?: string
}

export const PAINEL_GRAFICOS_SUGESTOES: PainelGraficoSugestao[] = [
  {
    id: 'entradas-saidas-dia',
    titulo: 'Entradas vs saídas por dia',
    descricao: 'Comparativo diário de NFs que entraram e saíram do estoque.',
    categoria: 'movimentacao',
  },
  {
    id: 'movimentos-tipo',
    titulo: 'Movimentos por tipo',
    descricao: 'Distribuição entre entrada, saída e movimentação interna.',
    categoria: 'movimentacao',
  },
  {
    id: 'movimentos-linha',
    titulo: 'Volume ao longo do tempo',
    descricao: 'Total de registros por dia no período selecionado.',
    categoria: 'movimentacao',
  },
  {
    id: 'top-emitentes',
    titulo: 'Top emitentes (entradas)',
    descricao: 'Remetentes com mais entradas registradas no período.',
    categoria: 'operacao',
  },
  {
    id: 'saidas-motivo',
    titulo: 'Saídas por motivo',
    descricao: 'Motivos informados nas saídas finalizadas.',
    categoria: 'operacao',
  },
  {
    id: 'paletes-dia',
    titulo: 'Paletes movimentados por dia',
    descricao: 'Soma de endereços/paletes envolvidos em movimentos.',
    categoria: 'movimentacao',
  },
  {
    id: 'nfs-dia',
    titulo: 'NFs processadas por dia',
    descricao: 'Quantidade de notas distintas com movimento por dia.',
    categoria: 'operacao',
  },
  {
    id: 'stage-armazem',
    titulo: 'Stage vs armazém (atual)',
    descricao: 'Itens hoje em separação no stage e no armazém físico.',
    categoria: 'estoque',
  },
]

const TIPO_LABEL: Record<MovimentoTipo, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  movimentacao: 'Movimentação',
}

const CORES_TIPO: Record<MovimentoTipo, string> = {
  entrada: '#22c55e',
  saida: '#f59e0b',
  movimentacao: '#3b82f6',
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function defaultPainelFiltros(): PainelFiltros {
  const fim = new Date()
  const inicio = new Date()
  inicio.setDate(inicio.getDate() - 30)
  return {
    dataInicio: inicio.toISOString().slice(0, 10),
    horaInicio: '00:00',
    dataFim: fim.toISOString().slice(0, 10),
    horaFim: '23:59',
  }
}

export function filtrosParaIntervalo(filtros: PainelFiltros): { inicio: Date; fim: Date } | null {
  if (!filtros.dataInicio || !filtros.dataFim) return null
  const inicio = new Date(`${filtros.dataInicio}T${filtros.horaInicio || '00:00'}:00`)
  const fim = new Date(`${filtros.dataFim}T${filtros.horaFim || '23:59'}:59`)
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return null
  if (inicio > fim) return null
  return { inicio, fim }
}

export function filtrarMovimentos(
  movimentos: MovimentoRegistro[],
  filtros: PainelFiltros,
): MovimentoRegistro[] {
  const intervalo = filtrosParaIntervalo(filtros)
  if (!intervalo) return movimentos
  const { inicio, fim } = intervalo
  return movimentos.filter((m) => {
    const t = new Date(m.createdAt).getTime()
    return t >= inicio.getTime() && t <= fim.getTime()
  })
}

function diaKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDiaLabel(key: string): string {
  const [, m, d] = key.split('-')
  return `${d}/${m}`
}

function diasNoIntervalo(filtros: PainelFiltros): string[] {
  const intervalo = filtrosParaIntervalo(filtros)
  if (!intervalo) return []
  const dias: string[] = []
  const cur = new Date(intervalo.inicio)
  cur.setHours(0, 0, 0, 0)
  const end = new Date(intervalo.fim)
  end.setHours(0, 0, 0, 0)
  while (cur <= end) {
    dias.push(`${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`)
    cur.setDate(cur.getDate() + 1)
  }
  return dias.length > 31 ? dias.slice(-31) : dias
}

function contarPaletesMovimento(m: MovimentoRegistro): number {
  return m.itens.reduce((s, it) => s + (it.paletes ?? it.addressIds.length), 0)
}

export function dadosGrafico(
  id: PainelGraficoId,
  movimentos: MovimentoRegistro[],
  notas: NotaFiscal[],
  filtros: PainelFiltros,
): PainelSerie[] {
  const filtrados = filtrarMovimentos(movimentos, filtros)

  switch (id) {
    case 'entradas-saidas-dia': {
      const dias = diasNoIntervalo(filtros)
      const entradas = new Map<string, number>()
      const saidas = new Map<string, number>()
      for (const d of dias) {
        entradas.set(d, 0)
        saidas.set(d, 0)
      }
      for (const m of filtrados) {
        if (m.tipo !== 'entrada' && m.tipo !== 'saida') continue
        const k = diaKey(m.createdAt)
        const map = m.tipo === 'entrada' ? entradas : saidas
        map.set(k, (map.get(k) ?? 0) + 1)
      }
      const result: PainelSerie[] = []
      for (const d of dias) {
        result.push({ label: `${formatDiaLabel(d)} · Ent`, value: entradas.get(d) ?? 0, cor: CORES_TIPO.entrada })
        result.push({ label: `${formatDiaLabel(d)} · Sai`, value: saidas.get(d) ?? 0, cor: CORES_TIPO.saida })
      }
      return result.filter((s) => s.value > 0).length > 0 ? result : dias.map((d) => ({ label: formatDiaLabel(d), value: 0 }))
    }

    case 'movimentos-tipo': {
      const counts: Record<MovimentoTipo, number> = { entrada: 0, saida: 0, movimentacao: 0 }
      for (const m of filtrados) counts[m.tipo]++
      return (['entrada', 'saida', 'movimentacao'] as MovimentoTipo[]).map((t) => ({
        label: TIPO_LABEL[t],
        value: counts[t],
        cor: CORES_TIPO[t],
      }))
    }

    case 'movimentos-linha': {
      const dias = diasNoIntervalo(filtros)
      const map = new Map(dias.map((d) => [d, 0]))
      for (const m of filtrados) {
        const k = diaKey(m.createdAt)
        map.set(k, (map.get(k) ?? 0) + 1)
      }
      return dias.map((d) => ({ label: formatDiaLabel(d), value: map.get(d) ?? 0, cor: '#6366f1' }))
    }

    case 'top-emitentes': {
      const map = new Map<string, number>()
      for (const m of filtrados.filter((x) => x.tipo === 'entrada')) {
        const e = m.emitente.trim() || 'Sem emitente'
        map.set(e, (map.get(e) ?? 0) + 1)
      }
      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, value]) => ({ label, value, cor: '#22c55e' }))
    }

    case 'saidas-motivo': {
      const map = new Map<string, number>()
      for (const m of filtrados.filter((x) => x.tipo === 'saida')) {
        const label =
          (m.justificativaSaida ? labelJustificativaSaida(m.justificativaSaida) : null) ??
          'Não informado'
        map.set(label, (map.get(label) ?? 0) + 1)
      }
      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value, cor: '#f59e0b' }))
    }

    case 'paletes-dia': {
      const dias = diasNoIntervalo(filtros)
      const map = new Map(dias.map((d) => [d, 0]))
      for (const m of filtrados) {
        const k = diaKey(m.createdAt)
        map.set(k, (map.get(k) ?? 0) + contarPaletesMovimento(m))
      }
      return dias.map((d) => ({ label: formatDiaLabel(d), value: map.get(d) ?? 0, cor: '#8b5cf6' }))
    }

    case 'nfs-dia': {
      const dias = diasNoIntervalo(filtros)
      const porDia = new Map<string, Set<string>>()
      for (const d of dias) porDia.set(d, new Set())
      for (const m of filtrados) {
        const k = diaKey(m.createdAt)
        porDia.get(k)?.add(m.nfId)
      }
      return dias.map((d) => ({
        label: formatDiaLabel(d),
        value: porDia.get(d)?.size ?? 0,
        cor: '#0ea5e9',
      }))
    }

    case 'stage-armazem': {
      let stage = 0
      let armazem = 0
      for (const nf of notas) {
        for (const item of nf.items) {
          if (itemNoStage(item)) stage++
          else if (item.allocatedAddresses.length > 0) armazem++
        }
      }
      return [
        { label: 'Stage', value: stage, cor: '#a855f7' },
        { label: 'Armazém', value: armazem, cor: '#3b82f6' },
      ]
    }

    default:
      return []
  }
}

export function tituloGrafico(id: PainelGraficoId): string {
  return PAINEL_GRAFICOS_SUGESTOES.find((g) => g.id === id)?.titulo ?? id
}

export function tipoVisualGrafico(id: PainelGraficoId): 'bar' | 'line' | 'donut' | 'grouped-bar' {
  if (id === 'movimentos-tipo' || id === 'stage-armazem' || id === 'saidas-motivo') return 'donut'
  if (id === 'movimentos-linha' || id === 'paletes-dia' || id === 'nfs-dia') return 'line'
  if (id === 'entradas-saidas-dia') return 'grouped-bar'
  return 'bar'
}

export function resumoPeriodo(filtros: PainelFiltros, totalMovimentos: number): string {
  const intervalo = filtrosParaIntervalo(filtros)
  if (!intervalo) return `${totalMovimentos} movimento(s) — período inválido`
  const fmt = (d: Date) =>
    d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  return `${totalMovimentos} movimento(s) · ${fmt(intervalo.inicio)} — ${fmt(intervalo.fim)}`
}
