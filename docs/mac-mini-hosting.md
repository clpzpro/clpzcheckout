# Cpay - Hospedagem segura no Mac mini M4

## Objetivo
Publicar o Cpay para testes externos sem abrir portas do roteador e com controle de quem acessa.

## Arquitetura recomendada
- Mac mini roda `web`, `api`, `auth-db`, `core-db`, `redis`, `caddy` e `cloudflared` em Docker.
- O trafego entra via Cloudflare Tunnel (TLS na borda da Cloudflare).
- Ninguem acessa Postgres/Redis diretamente da internet.

## 1) Pre-requisitos no Mac mini
- Docker Desktop instalado.
- Dominio ativo na Cloudflare.
- Projeto Supabase criado (somente Auth nesta fase).

## 2) Criar tunnel e DNS na Cloudflare
1. No painel da Cloudflare, crie um Tunnel em Zero Trust.
2. Associe o hostname (ex.: `cpay-test.seudominio.com`).
3. Defina o destino do tunnel para `http://caddy:8080`.
4. Copie o `CF_TUNNEL_TOKEN`.

## 3) Configurar ambiente
Nao precisa editar arquivo manualmente.
Use o comando de deploy abaixo com parametros.

## 4) Subir stack de hospedagem
```bash
npm run macmini:deploy -- \
  --domain cpay-test.seudominio.com \
  --tunnel-token <CF_TUNNEL_TOKEN> \
  --supabase-url https://<seu-projeto>.supabase.co \
  --supabase-anon-key <SUPABASE_ANON_KEY>
```
Esse comando gera/atualiza `infra/.env.macmini`, cria senha forte de banco automaticamente e sobe tudo.

## 5) Restringir acesso (fundamental)
No Cloudflare Access:
1. Crie um app protegido para `cpay-test.seudominio.com`.
2. Policy: liberar somente emails dos seus amigos testers.
3. Ative OTP por email ou login social com MFA.

## 6) Boas praticas de operacao
- Deixe o firewall do macOS ativo.
- Atualize imagens Docker periodicamente (`docker compose pull`).
- Nunca compartilhe `CF_TUNNEL_TOKEN` e credenciais de banco.
- Use usuarios de teste no Supabase, nunca dados reais.

## Comandos uteis
```bash
# Ver status
npm run macmini:status

# Ver logs em tempo real
npm run macmini:logs

# Parar stack
npm run macmini:down
```
