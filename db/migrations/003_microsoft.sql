-- Microsoft accounts and planner mapping

CREATE TABLE microsoft_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  tenant_id text,
  client_id text,
  client_secret_enc text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE planner_tasks_map (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id uuid,
  company_id uuid,
  external_task_id text,
  stored_task_id uuid,
  last_sync_at timestamptz
);

CREATE INDEX idx_microsoft_accounts_company ON microsoft_accounts (company_id);
CREATE INDEX idx_planner_tasks_map_ext ON planner_tasks_map (external_task_id);
