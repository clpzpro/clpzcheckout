CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  currency char(3) NOT NULL DEFAULT 'BRL',
  gateway_provider text NOT NULL,
  theme jsonb NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (owner_id, slug)
);

CREATE TABLE IF NOT EXISTS payment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id uuid NOT NULL REFERENCES checkouts (id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  provider text NOT NULL,
  provider_session_id text NOT NULL,
  amount_in_cents bigint NOT NULL,
  customer jsonb NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_sessions_checkout_id_idx ON payment_sessions (checkout_id, created_at DESC);

CREATE TABLE IF NOT EXISTS gateway_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  provider text NOT NULL,
  encrypted_secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (owner_id, provider)
);
