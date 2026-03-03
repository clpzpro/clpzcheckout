# Cpay - Baseline de seguranca

## Medidas aplicadas nesta base
- Validacao de JWT com issuer, audience e JWKS remoto.
- Separacao fisica/logica de dados de autenticacao e dados de negocio.
- SQL com parametros (`$1, $2...`) para evitar SQL injection.
- SSL forcado em producao para conexoes Postgres.
- Campos de payload validados por schema Zod.
- Fase 1 sem gateway ativo (reduz superficie de ataque com cartao/webhook).

## Regras para manter baixo custo sem perder estabilidade
- Comecar com um unico node API (vertical) e escalar horizontal so apos 70% de uso de CPU/memoria.
- Usar pool de conexao (ja configurado) para evitar saturacao do Postgres serverless.
- Logs estruturados e monitoramento de erros (Sentry) antes de aumentar infraestrutura.
- Cache de leitura com Redis apenas em endpoints quentes (lista publica de checkout, configuracoes).

## Proximos hardenings (fase 2)
- Criptografar segredos de gateway em KMS (AWS KMS ou Vault Transit).
- Adicionar rate limit por IP + por tenant no API gateway.
- Implementar webhook signature verification para cada gateway.
- Ativar WAF/CDN (Cloudflare) no dominio de checkout.
- Backups automaticos com teste de restore mensal.
