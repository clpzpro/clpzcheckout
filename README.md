# Cpay

Base inicial do SaaS de checkout com bancos separados para autenticacao e dados de negocio.
Nesta fase, nenhum gateway real de pagamento esta habilitado.

## Projeto
- `apps/web`: Front-end Next.js (landing, login, cadastro, dashboard, checkout template)
- `apps/api`: API Fastify com JWT e gerenciamento de checkouts
- `packages/contracts`: validacoes e tipos compartilhados
- `infra`: bancos locais e schemas SQL

## Requisitos
- Node.js 22+
- Docker + Docker Compose

## 1) Subir infraestrutura local
```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

## 2) Configurar variaveis de ambiente
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

Preencha os dados reais do Supabase em:
- `apps/api/.env`
- `apps/web/.env.local`

## 3) Instalar dependencias
```bash
npm install
```

## 4) Rodar web e API
```bash
npm run dev
```

## Endpoints principais
- `GET /health`
- `GET /v1/auth/me`
- `GET /v1/checkouts`
- `POST /v1/checkouts`
- `POST /v1/checkouts/:checkoutId/payments` (retorna `501` ate a fase 2 de gateways)

## Decisoes de arquitetura
- `docs/architecture.md`
- `docs/security.md`
- `docs/cost-plan.md`
- `docs/mac-mini-hosting.md`

## Hospedagem no Mac mini (segura para testes)
Consulte o guia completo em `docs/mac-mini-hosting.md`.
Resumo:
```bash
npm run macmini:deploy -- \
  --domain cpay-test.seudominio.com \
  --tunnel-token <CF_TUNNEL_TOKEN> \
  --supabase-url https://<seu-projeto>.supabase.co \
  --supabase-anon-key <SUPABASE_ANON_KEY>
```
