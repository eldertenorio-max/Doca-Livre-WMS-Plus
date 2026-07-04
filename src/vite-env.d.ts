/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** homolog | producao — opcional; hostname também identifica o ambiente */
  readonly VITE_APP_AMBIENTE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
