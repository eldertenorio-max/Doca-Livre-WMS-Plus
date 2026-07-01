import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync('public/supabase-config.json', 'utf8'))
const url = config.url
const key = config.anonKey
const h = { apikey: key, Authorization: `Bearer ${key}` }

async function count(table) {
  const r = await fetch(`${url}/rest/v1/${table}?select=id`, {
    headers: { ...h, Prefer: 'count=exact', Range: '0-0' },
  })
  const c = r.headers.get('content-range')
  return c ? c.split('/')[1] : '?'
}

async function getJson(path) {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: h })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

const tables = [
  'ultrafrio_notas_fiscais',
  'ultrafrio_nf_itens',
  'ultrafrio_enderecamentos',
  'ultrafrio_movimentos',
  'ultrafrio_notas_canceladas',
]

for (const t of tables) {
  console.log(`${t}: ${await count(t)}`)
}

const movs = await getJson(
  'ultrafrio_movimentos?select=id,tipo,nf_numero,payload&order=created_at.desc&limit=10',
)
console.log('\nUltimos movimentos:')
for (const m of movs) {
  const itens = m.payload?.itens ?? []
  const ends = itens.reduce((s, it) => s + (it.addressIds?.length ?? 0), 0)
  console.log(
    `  ${m.tipo} NF ${m.nf_numero} excl=${!!m.payload?.excluido} itens=${itens.length} ends=${ends}`,
  )
}

const nfs = await getJson('ultrafrio_notas_fiscais?select=numero,status&order=created_at.desc&limit=20')
console.log(`\nNFs no estoque (${nfs.length} mostradas):`, nfs.map((n) => n.numero).join(', ') || '(nenhuma)')

const movEntrada = await getJson(
  'ultrafrio_movimentos?select=nf_numero,payload&tipo=eq.entrada&order=created_at.desc',
)
const numerosHistorico = [
  ...new Set(
    movEntrada
      .filter((m) => (m.payload?.itens ?? []).some((it) => it.addressIds?.length))
      .map((m) => m.nf_numero),
  ),
]
console.log(`\nNFs com enderecos no historico: ${numerosHistorico.length}`)
if (numerosHistorico.length) console.log(numerosHistorico.slice(0, 30).join(', '))
