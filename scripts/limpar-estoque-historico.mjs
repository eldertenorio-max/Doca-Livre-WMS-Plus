/**
 * Zera estoque (câmaras ocupadas) e histórico no Supabase.
 * Mantém o cadastro de remetentes e vozes.
 *
 * Uso: node scripts/limpar-estoque-historico.mjs
 */
import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync('public/supabase-config.json', 'utf8'))
const url = config.url
const key = config.anonKey
const h = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }

async function count(table) {
  const r = await fetch(`${url}/rest/v1/${table}?select=id`, {
    headers: { ...h, Prefer: 'count=exact', Range: '0-0' },
  })
  const c = r.headers.get('content-range')
  return c ? c.split('/')[1] : '?'
}

async function deleteAll(table, filter) {
  const r = await fetch(`${url}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers: { ...h, Prefer: 'return=minimal' },
  })
  if (!r.ok) throw new Error(`${table}: ${await r.text()}`)
}

// Ordem respeita FKs (enderecamentos e itens dependem de notas_fiscais).
const tables = [
  ['ultrafrio_movimentos', 'id=not.is.null'],
  ['ultrafrio_notas_canceladas', 'id=not.is.null'],
  ['ultrafrio_enderecamentos', 'nf_id=not.is.null'],
  ['ultrafrio_nf_itens', 'nf_id=not.is.null'],
  ['ultrafrio_notas_fiscais', 'id=not.is.null'],
]

console.log('Antes:')
for (const [t] of tables) console.log(`  ${t}: ${await count(t)}`)

for (const [t, filter] of tables) {
  await deleteAll(t, filter)
  console.log(`Limpo: ${t}`)
}

console.log('\nDepois:')
for (const [t] of tables) console.log(`  ${t}: ${await count(t)}`)

console.log('\nEstoque e histórico zerados. Recarregue o painel (F5).')
