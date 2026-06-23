import { getSupabase } from './supabaseClient'

const TABLES = [
  'ultrafrio_notas_fiscais',
  'ultrafrio_nf_itens',
  'ultrafrio_enderecamentos',
  'ultrafrio_movimentos',
  'ultrafrio_notas_canceladas',
  'ultrafrio_emitentes',
] as const

export function subscribeEnderecamentoChanges(onChange: () => void): () => void {
  const sb = getSupabase()
  let channel = sb.channel('ultrafrio-sync')

  for (const table of TABLES) {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      () => onChange(),
    )
  }

  channel.subscribe()
  return () => {
    void sb.removeChannel(channel)
  }
}
