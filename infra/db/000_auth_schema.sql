CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS auth_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  username text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  last_login_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_users_email_ci_idx
  ON auth_users (LOWER(email));

CREATE UNIQUE INDEX IF NOT EXISTS auth_users_username_ci_idx
  ON auth_users (LOWER(username));

CREATE TABLE IF NOT EXISTS auth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_events_user_id_idx ON auth_events (user_id, created_at DESC);
