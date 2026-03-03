# Cpay - Plano de custo inicial (MVP)

## Arquitetura enxuta recomendada
- Front-end: Vercel Hobby/Pro inicial.
- API: Railway ou Fly.io com 1 instancia pequena.
- Auth: Supabase (Auth + limites de free/pro inicial).
- Core DB: Neon Postgres (compute scale-to-zero para ambiente de baixo trafego).
- Redis: Upstash plano inicial.

## Opcao de custo minimo (seu Mac mini M4)
- Rodar web + API + bancos em Docker no Mac mini.
- Expor via Cloudflare Tunnel (sem abrir porta no roteador).
- Limitar acesso com Cloudflare Access (somente emails permitidos).

## Ordem de investimento
1. Primeiro gasto: Core DB estavel + backups.
2. Segundo gasto: API com observabilidade.
3. Terceiro gasto: CDN/WAF e replicas de leitura.

## Por que essa combinacao
- Separa risco de auth e negocio sem precisar um time de infra grande.
- Custo baixo no inicio porque quase tudo tem camada gratuita ou entrada barata.
- Escala sem reescrever o produto (troca de plano > troca de arquitetura).
