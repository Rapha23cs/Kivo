# 🔄 Kivo Sync Agent (Coolify On-Premise)

Agente de sincronização contínua para rodar dentro da **rede interna no Coolify**, responsável por buscar inspeções ambientais hospitalares concluídas no **Supabase Cloud** e integrá-las automaticamente ao sistema interno **Gerenciamento Ambiental**.

---

## 🏗️ Como Funciona

1. O técnico realiza a inspeção em campo pelo aplicativo web do **Kivo** (checklist oficial EMSERH com 11 temáticas e 63 itens).
2. Ao concluir a inspeção, os dados são gravados nas tabelas `public.inspecoes` e `public.inspecao_respostas` do **Supabase Cloud** com `synced_to_environmental = false`.
3. Este contêiner, rodando dentro do seu **Coolify interno**, consulta o Supabase a cada X minutos (padrão: 10 min) usando a `SUPABASE_SERVICE_ROLE_KEY`.
4. Ao identificar inspeções concluídas pendentes (`status = 'completed'` e `synced_to_environmental = false`):
   - Formata os dados técnicos (cabeçalho Pré-Checklist, 63 itens auditados, desvios da Regra 6 e Resumo Pós-Checklist).
   - Envia via requisição HTTP POST para a API do **Gerenciamento Ambiental** na rede local.
   - Atualiza a inspeção no Supabase como `synced_to_environmental = true`, gravando `environmental_synced_at` e `environmental_record_id`.

---

## 🚀 Passo a Passo: Implantação no Coolify

### Passo 1: Obter as Credenciais do Supabase
1. Acesse o painel do seu projeto no [Supabase](https://supabase.com/dashboard).
2. Vá em **Project Settings** → **API**.
3. Copie:
   - **Project URL** (`SUPABASE_URL`)
   - **service_role key** (`SUPABASE_SERVICE_ROLE_KEY`) — *mantenha essa chave apenas no backend/Coolify, nunca no front-end.*

---

### Passo 2: Criar a Aplicação no Coolify
1. No painel do **Coolify**, clique em **+ Create New** → **Project** → **Application**.
2. Selecione seu repositório Git e informe em **Base Directory**:
   ```text
   sync-agent
   ```
3. O Coolify detectará o `Dockerfile` automaticamente.

---

### Passo 3: Configurar as Variáveis de Ambiente no Coolify

| Variável | Valor de Exemplo | Descrição |
| :--- | :--- | :--- |
| `SUPABASE_URL` | `https://seuprojeto.supabase.co` | URL do projeto no Supabase Cloud |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | Chave `service_role` do Supabase |
| `ENVIRONMENTAL_API_URL` | `http://gerenciamento-ambiental:8000/api/vistorias` | URL interna da API do sistema ambiental |
| `ENVIRONMENTAL_API_TOKEN` | `Bearer_token_opcional` | Token de autenticação (se houver) |
| `SYNC_INTERVAL_MINUTES` | `10` | Frequência de verificação em minutos |
| `DRY_RUN` | `false` | Se `true`, apenas simula no log sem enviar |

---

## 🧪 Como Testar Localmente

```bash
cd sync-agent
npm install

# Teste simulado (não faz POST nem altera o Supabase):
npm run test-sync

# Executar continuamente em modo dev:
npm run dev
```
