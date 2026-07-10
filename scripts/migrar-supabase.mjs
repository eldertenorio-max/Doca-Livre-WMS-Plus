/**
 * Migra todos os dados de um projeto Supabase para outro.
 *
 * Origem (padrão): public/supabase-config.json ou OLD_SUPABASE_URL + OLD_SUPABASE_ANON_KEY
 * Destino: NEW_SUPABASE_URL + NEW_SUPABASE_ANON_KEY (ou .env com VITE_SUPABASE_*)
 *
 * Uso:
 *   node scripts/migrar-supabase.mjs --dry-run
 *   node scripts/migrar-supabase.mjs --confirm
 *
 * Antes: rode os SQLs em supabase/sql/ no projeto NOVO.
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

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

const args = process.argv.slice(2)
const dryRun = !args.includes('--confirm')
const saveBackup = args.includes('--save-backup') || args.includes('--confirm')

const current = existsSync('public/supabase-config.json')
  ? JSON.parse(readFileSync('public/supabase-config.json', 'utf8'))
  : {}

const oldUrl =
  process.env.OLD_SUPABASE_URL?.trim() ||
  process.env.SOURCE_SUPABASE_URL?.trim() ||
  current.url ||
  ''
const oldKey =
  process.env.OLD_SUPABASE_ANON_KEY?.trim() ||
  process.env.SOURCE_SUPABASE_ANON_KEY?.trim() ||
  current.anonKey ||
  ''

const newUrl =
  process.env.NEW_SUPABASE_URL?.trim() ||
  process.env.VITE_SUPABASE_URL?.trim() ||
  ''
const newKey =
  process.env.NEW_SUPABASE_ANON_KEY?.trim() ||
  process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  ''

if (!oldUrl || !oldKey) {
  console.error('Origem ausente. Defina OLD_SUPABASE_URL + OLD_SUPABASE_ANON_KEY ou mantenha public/supabase-config.json.')
  process.exit(1)
}
if (!newUrl || !newKey) {
  console.error('Destino ausente. Defina NEW_SUPABASE_URL + NEW_SUPABASE_ANON_KEY (ou VITE_SUPABASE_* no .env).')
  process.exit(1)
}
if (oldUrl === newUrl) {
  console.error('Origem e destino são iguais — abortado.')
  process.exit(1)
}

/** Ordem respeita FKs entre tabelas. */
const TABLES = [
  'ultrafrio_notas_fiscais',
  'ultrafrio_nf_itens',
  'ultrafrio_enderecamentos',
  'ultrafrio_movimentos',
  'ultrafrio_notas_canceladas',
  'ultrafrio_cadastro_remetentes',
  'ultrafrio_fin_tabelas',
  'ultrafrio_fin_clientes',
  'ultrafrio_fin_contratos',
  'ultrafrio_voz_cadastros',
]

const PAGE = 1000

function client(url, key) {
  return createClient(url, key)
}

async function fetchAll(sb, table) {
  const rows = []
  let from = 0
  while (true) {
    const { data, error } = await sb
      .from(table)
      .select('*')
      .range(from, from + PAGE - 1)
    if (error) {
      if (
        error.message.includes('does not exist') ||
        error.code === 'PGRST205' ||
        error.message.includes('Could not find the table')
      ) {
        return []
      }
      throw new Error(`${table}: ${error.message}`)
    }
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < PAGE) break
    from += PAGE
  }
  return rows
}

async function upsertBatch(sb, table, rows, onConflict) {
  if (rows.length === 0) return { stripped: [] }
  const chunk = 200
  let working = rows.map((r) => ({ ...r }))
  const stripped = new Set()

  while (true) {
    try {
      for (let i = 0; i < working.length; i += chunk) {
        const slice = working.slice(i, i + chunk)
        const opts = onConflict ? { onConflict } : undefined
        const { error } = await sb.from(table).upsert(slice, opts)
        if (error) throw error
      }
      return { stripped: [...stripped] }
    } catch (error) {
      const msg = error.message ?? String(error)
      const colMatch = msg.match(/Could not find the '([^']+)' column/)
      if (colMatch && working.some((r) => colMatch[1] in r)) {
        const col = colMatch[1]
        stripped.add(col)
        working = working.map(({ [col]: _omit, ...rest }) => rest)
        continue
      }
      throw new Error(`${table} upsert: ${msg}`)
    }
  }
}

async function countRows(sb, table) {
  const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true })
  if (error) {
    if (
      error.message.includes('does not exist') ||
      error.code === 'PGRST205' ||
      error.message.includes('Could not find the table')
    ) {
      return null
    }
    throw new Error(`${table}: ${error.message}`)
  }
  return count ?? 0
}

async function main() {
  const src = client(oldUrl, oldKey)
  const dst = client(newUrl, newKey)

  console.log('Origem :', oldUrl)
  console.log('Destino:', newUrl)
  console.log(dryRun ? '\n[DRY-RUN] Nada será gravado. Use --confirm para migrar.\n' : '\n[MIGRAÇÃO] Gravando no destino...\n')

  const dump = { exportedAt: new Date().toISOString(), source: oldUrl, tables: {} }

  for (const table of TABLES) {
    const rows = await fetchAll(src, table)
    dump.tables[table] = rows
    console.log(`  ${table}: ${rows.length} linha(s) na origem`)
  }

  if (saveBackup && !dryRun) {
    const file = `backup-migracao-${new Date().toISOString().slice(0, 10)}.json`
    writeFileSync(file, `${JSON.stringify(dump, null, 2)}\n`, 'utf8')
    console.log(`\nBackup salvo: ${file}`)
  }

  if (dryRun) {
    console.log('\nConfira os totais acima. Depois rode com --confirm.')
    return
  }

  const onConflict = {
    ultrafrio_notas_fiscais: 'id',
    ultrafrio_nf_itens: 'nf_id,item_index',
    ultrafrio_enderecamentos: 'address_id',
    ultrafrio_movimentos: 'id',
    ultrafrio_notas_canceladas: 'id',
    ultrafrio_cadastro_remetentes: 'nome_key',
    ultrafrio_fin_tabelas: 'id',
    ultrafrio_fin_clientes: 'cnpj',
    ultrafrio_fin_contratos: 'id',
    ultrafrio_voz_cadastros: 'id',
  }

  for (const table of TABLES) {
    const rows = dump.tables[table] ?? []
    if (rows.length === 0) {
      console.log(`  ${table}: (vazio, pulando)`)
      continue
    }
    const { stripped } = await upsertBatch(dst, table, rows, onConflict[table])
    const destCount = await countRows(dst, table)
    const stripNote = stripped.length ? ` (colunas omitidas: ${stripped.join(', ')})` : ''
    console.log(`  ${table}: ${rows.length} importada(s) → destino ${destCount ?? '?'} linha(s)${stripNote}`)
  }

  console.log('\nMigração concluída.')
  console.log('Próximos passos:')
  console.log('  1. Atualize public/supabase-config.json e .env com o projeto NOVO')
  console.log('  2. Atualize VITE_SUPABASE_* no Render (homolog + WMS) e redeploy')
  console.log('  3. Recarregue o painel (F5) e confira os dados')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
