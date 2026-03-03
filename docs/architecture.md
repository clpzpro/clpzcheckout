# Cpay - Arquitetura inicial

## Objetivo do MVP
Plataforma SaaS para criar checkouts padronizados com pequenas customizacoes visuais.
Nesta fase, os gateways ainda nao estao habilitados.

## Stack escolhida
- Front-end: Next.js (App Router) em `apps/web`
- Back-end: Fastify + TypeScript em `apps/api`
- Contratos compartilhados (schema): Zod em `packages/contracts`
- Banco de autenticacao: Supabase Auth (producao) + Postgres auth-shadow local
- Banco de negocio (checkout/pagamentos): Postgres dedicado (Neon ou Supabase segundo projeto)
- Cache e fila curta: Redis (preparado no `docker-compose`)

## Bancos separados (seguranca + custo)
1. Banco de autenticacao
- Fica isolado para login/cadastro, tokens, reset de senha e eventos de acesso.
- Producao recomendada: Supabase Auth (barato no inicio e seguro por padrao).
- No projeto: `auth-db` recebe espelho de perfil e eventos no schema `user_profiles/auth_events`.

2. Banco de negocio
- Guarda checkouts, sessoes de pagamento e configuracoes de integracao.
- Separacao reduz risco de vazamento transversal e facilita escalabilidade independente.

## Estrutura de pastas
- `apps/web`: landing, login/cadastro, dashboard, template de checkout.
- `apps/api`: API REST (`/v1/auth`, `/v1/checkouts`) preparada para fase 2 de gateways.
- `packages/contracts`: tipos e validacoes compartilhadas.
- `infra`: docker local e schemas SQL.
- `docs`: decisoes de arquitetura e seguranca.

## Fluxo resumido
1. Usuario se cadastra/login no Supabase Auth pelo front-end.
2. Front-end recebe JWT e chama API com Bearer token.
3. API valida JWT via JWKS do Supabase.
4. API grava perfil/eventos no auth-db e dados de checkout no core-db.
5. Tentativas de criar sessao de pagamento retornam `501` ate os gateways da fase 2 serem ativados.
