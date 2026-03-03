#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/infra/.env.macmini"
ENV_TEMPLATE="$ROOT_DIR/infra/.env.macmini.example"
COMPOSE_FILE="$ROOT_DIR/infra/docker-compose.macmini.yml"

usage() {
  cat <<USAGE
Uso:
  $(basename "$0") --domain <dominio> --tunnel-token <token> --supabase-url <url> --supabase-anon-key <key> [--audience authenticated]

Tambem aceita variaveis de ambiente:
  CPAY_PUBLIC_DOMAIN, CF_TUNNEL_TOKEN, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_AUDIENCE, CPAY_DB_PASSWORD
USAGE
}

read_env() {
  local key="$1"
  if [[ -f "$ENV_FILE" ]]; then
    awk -F= -v k="$key" '$1==k {sub(/^[^=]*=/, ""); print; exit}' "$ENV_FILE"
  fi
}

upsert_env() {
  local key="$1"
  local value="$2"

  if grep -q "^${key}=" "$ENV_FILE"; then
    local tmp
    tmp="$(mktemp)"
    awk -v k="$key" -v v="$value" 'BEGIN{re="^" k "="} $0 ~ re {$0=k "=" v} {print}' "$ENV_FILE" > "$tmp"
    mv "$tmp" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

assert_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Erro: comando '$cmd' nao encontrado." >&2
    exit 1
  fi
}

DOMAIN=""
TUNNEL_TOKEN=""
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_AUDIENCE=""
DB_PASSWORD=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN="${2:-}"
      shift 2
      ;;
    --tunnel-token)
      TUNNEL_TOKEN="${2:-}"
      shift 2
      ;;
    --supabase-url)
      SUPABASE_URL="${2:-}"
      shift 2
      ;;
    --supabase-anon-key)
      SUPABASE_ANON_KEY="${2:-}"
      shift 2
      ;;
    --audience)
      SUPABASE_AUDIENCE="${2:-}"
      shift 2
      ;;
    --db-password)
      DB_PASSWORD="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Argumento invalido: $1" >&2
      usage
      exit 1
      ;;
  esac
done

assert_command docker

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ENV_TEMPLATE" "$ENV_FILE"
fi

DOMAIN="${DOMAIN:-${CPAY_PUBLIC_DOMAIN:-$(read_env CPAY_PUBLIC_DOMAIN)}}"
TUNNEL_TOKEN="${TUNNEL_TOKEN:-${CF_TUNNEL_TOKEN:-$(read_env CF_TUNNEL_TOKEN)}}"
SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-$(read_env NEXT_PUBLIC_SUPABASE_URL)}}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-$(read_env NEXT_PUBLIC_SUPABASE_ANON_KEY)}}"
SUPABASE_AUDIENCE="${SUPABASE_AUDIENCE:-${SUPABASE_AUDIENCE:-$(read_env SUPABASE_AUDIENCE)}}"
DB_PASSWORD="${DB_PASSWORD:-${CPAY_DB_PASSWORD:-$(read_env CPAY_DB_PASSWORD)}}"

if [[ -z "$DOMAIN" ]]; then
  echo "Erro: informe dominio via --domain ou CPAY_PUBLIC_DOMAIN." >&2
  exit 1
fi

if [[ -z "$TUNNEL_TOKEN" ]]; then
  echo "Erro: informe token do tunnel via --tunnel-token ou CF_TUNNEL_TOKEN." >&2
  exit 1
fi

if [[ -z "$SUPABASE_URL" ]]; then
  echo "Erro: informe URL do Supabase via --supabase-url ou NEXT_PUBLIC_SUPABASE_URL." >&2
  exit 1
fi

if [[ -z "$SUPABASE_ANON_KEY" ]]; then
  echo "Erro: informe anon key do Supabase via --supabase-anon-key ou NEXT_PUBLIC_SUPABASE_ANON_KEY." >&2
  exit 1
fi

if [[ "$SUPABASE_URL" != https://* ]]; then
  echo "Erro: URL do Supabase precisa comecar com https://" >&2
  exit 1
fi

if [[ -z "$SUPABASE_AUDIENCE" ]]; then
  SUPABASE_AUDIENCE="authenticated"
fi

if [[ -z "$DB_PASSWORD" || "$DB_PASSWORD" == "troque-por-uma-senha-longa-e-aleatoria" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    DB_PASSWORD="$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 36)"
  else
    DB_PASSWORD="$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 36)"
  fi
fi

SUPABASE_BASE="${SUPABASE_URL%/}"
SUPABASE_JWKS_URL="$SUPABASE_BASE/auth/v1/.well-known/jwks.json"
SUPABASE_ISSUER="$SUPABASE_BASE/auth/v1"

upsert_env CPAY_PUBLIC_DOMAIN "$DOMAIN"
upsert_env CF_TUNNEL_TOKEN "$TUNNEL_TOKEN"
upsert_env CPAY_DB_PASSWORD "$DB_PASSWORD"
upsert_env NEXT_PUBLIC_SUPABASE_URL "$SUPABASE_BASE"
upsert_env NEXT_PUBLIC_SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY"
upsert_env SUPABASE_JWKS_URL "$SUPABASE_JWKS_URL"
upsert_env SUPABASE_ISSUER "$SUPABASE_ISSUER"
upsert_env SUPABASE_AUDIENCE "$SUPABASE_AUDIENCE"

echo "Subindo stack do Cpay no Mac mini..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

echo
echo "Cpay iniciado com sucesso."
echo "Dominio esperado: https://$DOMAIN"
echo "Arquivo de ambiente: $ENV_FILE"
echo
echo "Comandos uteis:"
echo "  docker compose --env-file $ENV_FILE -f $COMPOSE_FILE ps"
echo "  docker compose --env-file $ENV_FILE -f $COMPOSE_FILE logs -f"
echo "  docker compose --env-file $ENV_FILE -f $COMPOSE_FILE down"
