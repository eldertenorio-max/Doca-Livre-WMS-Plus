/**
 * Recupera NF removida do estoque ou restaura endereços perdidos em NF existente,
 * a partir do snapshot no histórico de movimentos (entrada + movimentação).
 *
 * Uso: node scripts/recuperar-nf-do-historico.mjs 201077 232367 208359
 */
import { existsSync, readFileSync } from 'node:fs'

function loadEnvFile() {
  if (!existsSync('.env')) return
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile()

const config = JSON.parse(readFileSync('public/supabase-config.json', 'utf8'))
const url = process.env.VITE_SUPABASE_URL?.trim() || config.url
const key = process.env.VITE_SUPABASE_ANON_KEY?.trim() || config.anonKey

const numeros = process.argv.slice(2)
if (!numeros.length) {
  console.error('Informe o número da NF. Ex.: node scripts/recuperar-nf-do-historico.mjs 201077')
  process.exit(1)
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

function normNumero(value) {
  return String(value ?? '').replace(/^0+/, '') || '0'
}

function scoreMovimento(mov) {
  const itens = mov.payload?.itens ?? []
  const enderecos = itens.reduce((s, it) => s + (it.addressIds?.length ?? 0), 0)
  return enderecos * 1000 + itens.length
}

function ultimoSnapshotPorItem(movimentos) {
  const porItem = new Map()
  const ordenados = [...movimentos].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  for (const mov of ordenados) {
    for (const it of mov.payload?.itens ?? []) {
      if (!it.addressIds?.length) continue
      if (!porItem.has(it.itemIndex)) {
        porItem.set(it.itemIndex, [...it.addressIds])
      }
    }
  }
  return porItem
}

async function getJson(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function postJson(path, body) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function patchJson(path, body) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
}

async function buscarNfPorNumero(numero) {
  const rows = await getJson(
    `ultrafrio_notas_fiscais?select=id,numero&numero=eq.${encodeURIComponent(numero)}`,
  )
  if (rows.length) return rows[0]

  const todas = await getJson('ultrafrio_notas_fiscais?select=id,numero')
  const alvo = normNumero(numero)
  return todas.find((n) => normNumero(n.numero) === alvo) ?? null
}

async function buscarMovimentosComEnderecos(numero) {
  const entrada = await getJson(
    `ultrafrio_movimentos?select=*&nf_numero=eq.${encodeURIComponent(numero)}&tipo=eq.entrada&order=created_at.desc`,
  )
  const movimentacao = await getJson(
    `ultrafrio_movimentos?select=*&nf_numero=eq.${encodeURIComponent(numero)}&tipo=eq.movimentacao&order=created_at.desc`,
  )
  const todos = [...entrada, ...movimentacao]
  return todos.filter((m) => (m.payload?.itens ?? []).some((it) => it.addressIds?.length))
}

async function verificarConflitos(endRows) {
  const ocupados = await Promise.all(
    [...new Set(endRows.map((r) => r.address_id))].map(async (address_id) => {
      const rows = await getJson(
        `ultrafrio_enderecamentos?select=nf_id&address_id=eq.${encodeURIComponent(address_id)}`,
      )
      return rows.length ? address_id : null
    }),
  )
  return ocupados.filter(Boolean)
}

async function inserirEnderecos(nfId, porItem) {
  const endRows = []
  for (const [itemIndex, addressIds] of porItem.entries()) {
    for (const address_id of addressIds) {
      endRows.push({ nf_id: nfId, item_index: itemIndex, address_id })
    }
  }
  if (!endRows.length) return 0

  const conflitos = await verificarConflitos(endRows)
  if (conflitos.length) {
    console.log(`Posições já ocupadas por outra NF: ${conflitos.join(', ')}`)
    return -1
  }

  await postJson('ultrafrio_enderecamentos', endRows)

  for (const [itemIndex, addressIds] of porItem.entries()) {
    await patchJson(
      `ultrafrio_nf_itens?nf_id=eq.${encodeURIComponent(nfId)}&item_index=eq.${itemIndex}`,
      { localizacao: 'armazem', paletes: addressIds.length },
    )
  }

  return endRows.length
}

async function restaurarEnderecosExistente(numero, nf) {
  const ends = await getJson(
    `ultrafrio_enderecamentos?select=address_id&nf_id=eq.${encodeURIComponent(nf.id)}`,
  )
  if (ends.length) {
    console.log(`NF ${numero}: já tem ${ends.length} endereço(s) no banco.`)
    return
  }

  const candidatos = await buscarMovimentosComEnderecos(numero)
  if (!candidatos.length) {
    console.log(`NF ${numero}: histórico sem endereços salvos — não é possível restaurar.`)
    return
  }

  const porItem = ultimoSnapshotPorItem(candidatos)
  if (!porItem.size) {
    console.log(`NF ${numero}: nenhum snapshot com endereços encontrado.`)
    return
  }

  const inseridos = await inserirEnderecos(nf.id, porItem)
  if (inseridos < 0) return
  if (inseridos === 0) {
    console.log(`NF ${numero}: nada a restaurar.`)
    return
  }

  await patchJson(`ultrafrio_notas_fiscais?id=eq.${encodeURIComponent(nf.id)}`, {
    status: 'concluida',
  })

  console.log(
    `NF ${numero}: ${porItem.size} item(ns), ${inseridos} posição(ões) restaurada(s) na NF existente.`,
  )
}

async function recuperarNfRemovida(numero, mov) {
  const nfId = mov.nf_id ?? mov.payload?.nfIdHistorico
  if (!nfId) {
    console.log(`NF ${numero}: movimento sem identificador da NF.`)
    return
  }

  const existente = await getJson(`ultrafrio_notas_fiscais?select=id,numero&id=eq.${encodeURIComponent(nfId)}`)
  if (existente.length) {
    await restaurarEnderecosExistente(numero, existente[0])
    return
  }

  const itens = mov.payload.itens.filter((it) => it.addressIds?.length)
  const porItem = new Map(itens.map((it) => [it.itemIndex, [...it.addressIds]]))

  await postJson('ultrafrio_notas_fiscais', {
    id: nfId,
    numero: mov.nf_numero,
    serie: '',
    chave: nfId,
    emitente: mov.emitente || '',
    data_emissao: mov.created_at?.slice(0, 10) ?? '',
    status: 'concluida',
    created_at: mov.created_at,
  })

  await postJson(
    'ultrafrio_nf_itens',
    itens.map((it) => ({
      nf_id: nfId,
      item_index: it.itemIndex,
      codigo: it.codigo ?? '',
      descricao: it.descricao ?? '',
      quantidade: it.quantidade ?? 0,
      unidade: it.unidade ?? 'UN',
      localizacao: 'armazem',
      ...(it.paletes != null ? { paletes: it.paletes } : { paletes: it.addressIds.length }),
      ...(it.up ? { up: it.up } : {}),
      ...(it.lote ? { lote: it.lote } : {}),
      ...(it.dataFabricacao ? { data_fabricacao: it.dataFabricacao } : {}),
      ...(it.dataValidade ? { data_validade: it.dataValidade } : {}),
    })),
  )

  const inseridos = await inserirEnderecos(nfId, porItem)
  if (inseridos < 0) return

  await patchJson(`ultrafrio_movimentos?id=eq.${mov.id}`, {
    nf_id: nfId,
    payload: {
      ...mov.payload,
      excluido: false,
      excluidoEm: null,
    },
  })

  console.log(
    `NF ${numero} recuperada: ${itens.length} item(ns), ${inseridos} posição(ões) restaurada(s).`,
  )
}

async function recuperarNumero(numero) {
  const nfExistente = await buscarNfPorNumero(numero)
  if (nfExistente) {
    await restaurarEnderecosExistente(numero, nfExistente)
    return
  }

  const candidatos = await buscarMovimentosComEnderecos(numero)
  if (!candidatos.length) {
    console.log(`NF ${numero}: nenhum movimento com endereços no histórico.`)
    return
  }

  const mov = candidatos.sort((a, b) => scoreMovimento(b) - scoreMovimento(a))[0]
  await recuperarNfRemovida(numero, mov)
}

async function main() {
  for (const numero of numeros) {
    await recuperarNumero(numero.trim())
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
