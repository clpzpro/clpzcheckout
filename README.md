# clpzcheckout

Base inicial do SaaS de checkout com bancos separados para autenticacao e dados de negocio.
Nesta fase, nenhum gateway real de pagamento esta habilitado.

## Projeto
- `apps/web`: Front-end Next.js (login, cadastro, dashboard, checkout template)
- `apps/api`: API Fastify com autenticacao por cookie HTTP-only/JWT e gerenciamento de checkouts
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

Defina no minimo:
- `apps/api/.env`: `AUTH_DB_URL`, `CORE_DB_URL`, `JWT_SECRET`, `APP_ORIGIN`
- `apps/web/.env.local`: `NEXT_PUBLIC_API_URL`

Opcional no backend:
- `APP_ORIGINS` para liberar origens adicionais (separadas por virgula), ex.: `https://www.clpzcheckout.cloud`

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
- `POST /v1/auth/check-availability`
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/logout`
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
  --tunnel-token <CF_TUNNEL_TOKEN>
```
