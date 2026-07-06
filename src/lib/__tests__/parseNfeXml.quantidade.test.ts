import { describe, expect, it } from 'vitest'
import { corrigirQuantidadeItemSePeso, resolverQuantidadeComercialNfe } from '../nfeUnidades'
import type { NfeItem } from '../../types'

describe('resolverQuantidadeComercialNfe', () => {
  it('converte peso KG + qTrib=660 (uTrib=KG) para 660 CX — frango CX VAR', () => {
    const r = resolverQuantidadeComercialNfe({
      qCom: 13697.32,
      uCom: 'KG',
      qTrib: 660,
      uTrib: 'KG',
      descricao: '9369 - FRANGO CONG PCT CX VAR STA CEC',
    })
    expect(r).toEqual({ quantidade: 660, unidade: 'CX' })
  })

  it('converte peso KG + CX20KG na descrição para 660 CX', () => {
    const r = resolverQuantidadeComercialNfe({
      qCom: 13200,
      uCom: 'KG',
      qTrib: 660,
      uTrib: 'KG',
      descricao: '9140 - COXA E SOBRECOXA CARNE FGO CON PCT CX20KG STA CEC',
    })
    expect(r).toEqual({ quantidade: 660, unidade: 'CX' })
  })

  it('deriva caixas pelo vUnTrib quando qTrib repete o peso em KG', () => {
    const r = resolverQuantidadeComercialNfe({
      qCom: 13697.32,
      uCom: 'KG',
      qTrib: 13697.32,
      uTrib: 'KG',
      vUnCom: 6.69,
      vUnTrib: 138.84,
      vProd: 91635.07,
      descricao: '9369 - FRANGO CONG PCT CX VAR STA CEC',
    })
    expect(r).toEqual({ quantidade: 660, unidade: 'CX' })
  })
})

describe('corrigirQuantidadeItemSePeso', () => {
  it('corrige item gravado com quantidade = peso quando há CX20KG na descrição', () => {
    const item: NfeItem = {
      index: 0,
      codigo: '5035900',
      descricao: '9140 - COXA E SOBRECOXA CARNE FGO CON PCT CX20KG STA CEC',
      quantidade: 13200,
      unidade: 'KG',
      allocatedAddresses: [],
      pesoBruto: 13200,
      pesoLiquido: 13200,
    }
    const fixed = corrigirQuantidadeItemSePeso(item)
    expect(fixed.quantidade).toBe(660)
    expect(fixed.unidade).toBe('CX')
    expect(fixed.pesoBruto).toBe(13200)
  })
})
