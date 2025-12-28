-- Initial schema for MJWorkHub activity tracking
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  module text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_seconds int,
  metadata jsonb DEFAULT '{}'
);

CREATE TABLE events (
  id bigserial PRIMARY KEY,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  user_id uuid,
  module text,
  event_type text,
  event_time timestamptz,
  metadata jsonb
);

CREATE INDEX idx_sessions_company_user_started ON sessions (company_id, user_id, started_at);
CREATE INDEX idx_events_session_event_time ON events (session_id, event_time);
