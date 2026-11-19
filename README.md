# Kivo — Plataforma Independente de Inspeções & Relatórios Ambientais

O **Kivo** é uma plataforma multi-cliente para auditorias ambientais em campo, checklists normativos (11 temáticas e 63 itens), gestão de desvios com plano de ação e emissão de Relatórios Técnicos com registro fotográfico e cálculo de aderência/maturidade, 100% persistida no **Supabase Cloud** e responsiva para desktop, tablet e celular.

---

## Módulos Persistidos no Supabase

- **Autenticação Multiusuário & Perfil RT** (`auth.users` / `user_metadata`): login, cadastro, recuperação de senha e dados do Responsável Técnico.
- **Meu Painel**: métricas consolidadas de vistorias ativas, desvios em checklists, média de conformidade e relatórios emitidos.
- **Vistorias & Checklists** (`public.clientes`, `public.tematicas`, `public.checklist_itens_modelo`, `public.inspecoes`, `public.inspecao_respostas`): inspeções com 11 temáticas, 63 itens, tratativa de desvios e upload de evidências fotográficas.
- **Relatórios Técnicos** (`public.relatorios_inspecao`, `public.relatorio_desvios`, `public.relatorio_registros_fotograficos`, bucket `relatorios-midia`): geração integrada e ressincronização bidirecional a partir do checklist, 8 métricas consolidadas, 56+ registros fotográficos e impressão/PDF.

---

## Como Rodar Localmente

1. Copie `.env.example` para `.env` e preencha:
   ```env
   VITE_SUPABASE_URL=https://seuprojeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
   ```
2. Aplique as migrations SQL em `supabase/migrations/` (`001_checklist_emserh.sql`, `002_clientes_multi_empresa.sql`, `003_relatorios_inspecao.sql`) no SQL Editor do Supabase.
3. Instale e execute:
   ```bash
   npm install
   npm run dev
   ```

---

## Hospedagem no Render

O projeto já está pronto para deploy no **Render** das duas formas abaixo:

### Opção 1 — Blueprint / Static Site (Recomendado, plano gratuito sem sleep)
O arquivo [`render.yaml`](render.yaml) e [`public/_redirects`](public/_redirects) já configuram o build e o rewrite SPA (`/* -> /index.html`):
1. Suba o repositório no GitHub/GitLab.
2. No painel do Render, clique em **New → Blueprint** (ou **New → Static Site** apontando para `npm ci && npm run build` e Publish Directory `dist`).
3. Em **Environment Variables**, cadastre:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Faça o deploy.

### Opção 2 — Web Service Node (`server.js`)
Se preferir subir como **Web Service**:
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm start` (`node server.js`, escutando em `0.0.0.0:$PORT` com fallback SPA para `dist/index.html`)
- **Environment Variables**: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

### Configuração final no Supabase (Obrigatória após publicar)
No painel do Supabase (**Authentication → URL Configuration**):
- Atualize **Site URL** para `https://<seu-app>.onrender.com`
- Em **Redirect URLs**, adicione `https://<seu-app>.onrender.com/**`

Isso garante que links de confirmação de cadastro e recuperação de senha enviados por e-mail redirecionem corretamente para o domínio do Render.
