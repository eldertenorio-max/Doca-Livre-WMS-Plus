# Configurar Supabase — dados iguais em todo lugar

Siga estes passos **uma vez**. Depois disso, qualquer PC ou navegador que abrir o app verá os **mesmos dados atualizados** (entrada, saída, histórico, canceladas).

Projeto Supabase do Ultrafrio: `rmcsubgerhbaeyitegvt`  
URL: https://supabase.com/dashboard/project/rmcsubgerhbaeyitegvt

---

## 1. Criar tabelas no Supabase

No **SQL Editor** do Supabase, execute **nesta ordem** (copie e cole cada arquivo):

1. `supabase/sql/create_ultrafrio_enderecamento.sql`
2. `supabase/sql/create_ultrafrio_movimentos.sql`
3. `supabase/sql/create_ultrafrio_notas_canceladas.sql`
4. `supabase/sql/create_ultrafrio_cadastro_remetentes.sql` ← cadastro de remetentes no NF manual
5. `supabase/sql/movimentos_historico_soft_delete.sql` (se ainda não rodou)
6. `supabase/sql/enable_realtime.sql` ← necessário para atualizar sem recarregar a página

---

## 2. Copiar chaves da API

No Supabase: **Project Settings → API**

| Campo no Render / `.env` | Onde pegar no Supabase |
|--------------------------|-------------------------|
| `VITE_SUPABASE_URL` | **Project URL** (ex.: `https://rmcsubgerhbaeyitegvt.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | **anon public** ou **publishable** key |

---

## 3. Configurar no Render (produção)

1. Abra https://dashboard.render.com → serviço **ultrafrio-enderecamento**
2. **Environment** → adicione:
   - `VITE_SUPABASE_URL` = URL do passo 2
   - `VITE_SUPABASE_ANON_KEY` = chave anon do passo 2
3. Clique em **Manual Deploy → Deploy latest commit**  
   (obrigatório: variáveis `VITE_*` entram no **build**)

---

## 4. Desenvolvimento local (opcional)

Na pasta do projeto:

```bash
cp .env.example .env
```

Edite `.env` com as mesmas duas variáveis e rode:

```bash
npm run dev
```

---

## 5. Conferir se funcionou

- O aviso amarelo **“só neste navegador”** deve sumir.
- Aparece o banner verde: **“Dados sincronizados na nuvem — iguais em todos os navegadores.”**
- Abra o app em outro PC/navegador: os mesmos dados devem aparecer.
- Alterações em um lugar atualizam os outros em poucos segundos (tempo real + verificação a cada 20 s).

---

## Migração automática

Se este navegador já tinha dados no `localStorage` e a nuvem estava vazia, na primeira carga com Supabase configurado os dados são **enviados automaticamente** para a nuvem.

---

## Problemas comuns

| Sintoma | Solução |
|---------|---------|
| Ainda mostra “só neste navegador” | Variáveis não estão no build do Render → confira env vars e faça **novo deploy** |
| Erro ao salvar / nuvem indisponível | Rode os SQLs no Supabase; confira URL e chave |
| Sugestões de remetente vazias | Rode `create_ultrafrio_cadastro_remetentes.sql` |
| Outro PC não atualiza na hora | Rode `enable_realtime.sql`; recarregue a página |
| Dados diferentes em dois PCs | Um deles pode estar sem Supabase (modo local) — confira o banner no topo |

---

## Backup manual

Use **Exportar backup** na barra lateral para guardar um JSON. **Importar backup** restaura em qualquer instalação.
