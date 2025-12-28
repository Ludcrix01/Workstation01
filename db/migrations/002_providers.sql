-- Providers and assignments migration for MJWorkHub

CREATE TABLE providers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,                -- e.g. 'microsoft', 'cegid'
  display_name text NOT NULL,
  client_id text,
  client_secret_enc text,
  default_scopes text[],
  created_by uuid,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE provider_company_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  allowed_scopes text[],
  assigned_by uuid,
  assigned_at timestamptz DEFAULT now()
);

CREATE TABLE provider_user_permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id),
  user_id uuid REFERENCES users(id),
  role text NOT NULL, -- 'viewer'|'editor'|'admin'
  granted_by uuid,
  granted_at timestamptz DEFAULT now()
);

CREATE TABLE admin_audit_logs (
  id bigserial PRIMARY KEY,
  actor_user_id uuid,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_providers_name ON providers (name);
CREATE INDEX idx_assignments_company ON provider_company_assignments (company_id);
CREATE INDEX idx_user_permissions_user ON provider_user_permissions (user_id);
