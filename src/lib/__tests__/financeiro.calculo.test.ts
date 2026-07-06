import { describe, expect, it } from 'vitest'
import {
  calcularCobrancaDetalhada,
  valorAcumuladoArmazenagem,
  valorDiariaPorKilo,
  type ResumoNfArmazenada,
} from '../financeiro/calculo'
import type { ContratoCliente, TabelaCobranca } from '../financeiro/types'

const tabelaBase = (): TabelaCobranca => ({
  id: 't1',
  nome: 'Padrão',
  custoPosicaoPalete: 10,
  custoPorKilo: 0.05,
  custoPorPalete: 15,
  custoEntrada: 50,
  custoSaida: 30,
  criadoEm: '2026-01-01T00:00:00.000Z',
})

const contratoBase = (overrides: Partial<ContratoCliente> = {}): ContratoCliente => ({
  id: 'c1',
  cnpj: '12345678000199',
  razaoSocial: 'Cliente Teste',
  tabelaId: 't1',
  ciclo: 'mensal',
  regraTempo: 'proporcional',
  cobrarPosicaoPalete: false,
  cobrarKilo: false,
  cobrarPalete: true,
  cobrarEntrada: true,
  cobrarSaida: false,
  kiloPorDia: false,
  ativo: true,
  criadoEm: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const resumoNf = (overrides: Partial<ResumoNfArmazenada> = {}): ResumoNfArmazenada => ({
  nfId: 'nf1',
  nfNumero: '206658',
  emitente: 'ASTRAPLUS',
  dataEntrada: '2026-07-05',
  dataSaida: null,
  diasArmazenados: 1,
  pesoBruto: 27500,
  pesoLiquido: 23500,
  pesoEntrada: 27500,
  pesoRestante: 23500,
  pesoSaido: 0,
  saidas: [],
  totalItens: 1,
  totalCaixas: 0,
  totalPaletes: 20,
  valorMercadoria: 0,
  status: 'armazenada',
  ...overrides,
})

describe('calcularCobrancaDetalhada', () => {
  it('cobra palete proporcional ao ciclo mensal (1 dia = 1/30)', () => {
    const cobranca = calcularCobrancaDetalhada(resumoNf(), contratoBase(), tabelaBase(), {
      posicoes: 20,
      pesoBase: 23500,
      paletes: 20,
    })

    expect(cobranca.totalRecorrente).toBeCloseTo(20 * 15 * (1 / 30), 4)
    expect(cobranca.valorDiaria).toBeCloseTo(cobranca.totalRecorrente, 4)
    expect(cobranca.valorVigente).toBeCloseTo(cobranca.valorDiaria, 4)
    expect(cobranca.total).toBeCloseTo(cobranca.totalRecorrente + 50, 4)
  })

  it('valor diaria por kilo = peso bruto x custo kilo / 30 e acumulado = dias x diaria', () => {
    const pesoBruto = 26_028.707
    const custoKilo = 5.58
    const dias = 126
    const diaria = valorDiariaPorKilo(pesoBruto, custoKilo, 'mensal')
    expect(diaria).toBeCloseTo((pesoBruto * custoKilo) / 30, 4)
    expect(valorAcumuladoArmazenagem(dias, diaria)).toBeCloseTo(dias * diaria, 4)

    const cobranca = calcularCobrancaDetalhada(
      resumoNf({ diasArmazenados: dias, pesoEntrada: pesoBruto, pesoBruto }),
      contratoBase({ cobrarPalete: false, cobrarKilo: true, cobrarEntrada: false }),
      { ...tabelaBase(), custoPorKilo: custoKilo },
      { posicoes: 0, pesoBase: 26_897.32, paletes: 0 },
    )

    expect(cobranca.valorDiaria).toBeCloseTo(diaria, 4)
    expect(cobranca.valorVigente).toBeCloseTo(dias * diaria, 4)
  })

  it('cobra kilo por dia quando contrato usa kiloPorDia', () => {
    const cobranca = calcularCobrancaDetalhada(
      resumoNf({ diasArmazenados: 3 }),
      contratoBase({ cobrarPalete: false, cobrarKilo: true, kiloPorDia: true, cobrarEntrada: false }),
      tabelaBase(),
      { posicoes: 0, pesoBase: 1000, paletes: 0 },
    )

    expect(cobranca.totalRecorrente).toBeCloseTo(1000 * 0.05 * 3, 4)
    expect(cobranca.valorDiaria).toBeCloseTo(valorDiariaPorKilo(27_500, 0.05, 'mensal'), 4)
    expect(cobranca.valorVigente).toBeCloseTo(3 * cobranca.valorDiaria, 4)
  })

  it('cobra posição de palete quando habilitado no contrato', () => {
    const cobranca = calcularCobrancaDetalhada(
      resumoNf(),
      contratoBase({ cobrarPalete: false, cobrarPosicaoPalete: true, cobrarEntrada: false }),
      tabelaBase(),
      { posicoes: 25, pesoBase: 0, paletes: 0 },
    )

    expect(cobranca.totalRecorrente).toBeCloseTo(25 * 10 * (1 / 30), 4)
    expect(cobranca.valorDiaria).toBeGreaterThan(0)
  })

  it('retorna zero sem contrato ou tabela', () => {
    const cobranca = calcularCobrancaDetalhada(resumoNf(), null, null, {
      posicoes: 20,
      pesoBase: 23500,
      paletes: 20,
    })

    expect(cobranca.valorDiaria).toBe(0)
    expect(cobranca.valorVigente).toBe(0)
  })
})
