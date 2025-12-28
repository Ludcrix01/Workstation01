// Simple test server to receive tracking calls and log them
// Usage: node backend/test-server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

// Serve the static test page when accessing the root
const STATIC_DIR = path.join(__dirname, '..', 'docs', 'test-page');
app.use(express.static(STATIC_DIR));
app.get('/', (req, res) => res.sendFile(path.join(STATIC_DIR, 'index.html')));
app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/api/track/start-session', (req, res) => {
  const { userId, module } = req.body || {};
  const sessionId = randomUUID();
  console.log('[start-session]', { userId, module, sessionId });
  res.status(201).json({ sessionId, received: true });
});

app.post('/api/track/event', (req, res) => {
  const { sessionId, events } = req.body || {};
  console.log('[events]', { sessionId, eventsCount: Array.isArray(events) ? events.length : 0 });
  if (Array.isArray(events)) {
    events.forEach(e => console.log('  -', e));
  }
  res.json({ accepted: true });
});

app.post('/api/track/end-session', (req, res) => {
  const { sessionId } = req.body || {};
  console.log('[end-session]', { sessionId });
  res.json({ ok: true });
});

// --- Admin providers endpoints (simple, in-memory fallback) ---
const { Pool } = require('pg');
let pool = null;
(async function tryDb() {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mjworkhub' });
    await pool.query('SELECT 1');
    console.log('Postgres reachable for admin endpoints.');
  } catch (e) {
    console.warn('Postgres not reachable from admin endpoints. Falling back to in-memory store.');
    pool = null;
  }
})();

const providersStore = new Map();
const microsoftAccountsStore = new Map(); // store tokens per company/provider in memory for testing

function ensureSuperAdmin(req, res) {
  const role = req.headers['x-user-role'];
  if (!role || role !== 'superadmin') {
    res.status(403).json({ error: 'superadmin required' });
    return false;
  }
  return true;
}

app.get('/admin/providers', async (req, res) => {
  if (!ensureSuperAdmin(req, res)) return;
  if (pool) {
    try {
      const r = await pool.query('SELECT id, name, display_name, enabled FROM providers ORDER BY name');
      return res.json(r.rows);
    } catch(e) {
      console.error('db error', e); // fallback
    }
  }
  // fallback in-memory
  const arr = Array.from(providersStore.values()).map(p => ({ id: p.id, name: p.name, display_name: p.display_name, enabled: p.enabled, default_scopes: p.default_scopes }));
  res.json(arr);
});

// Test connection for provider (e.g., try client_credentials token as a best-effort test)
app.post('/admin/providers/:id/test-connection', async (req, res) => {
  if (!ensureSuperAdmin(req, res)) return;
  const id = req.params.id;
  let rec = providersStore.get(id);
  if (!rec && pool) {
    try {
      const r = await pool.query('SELECT client_id, client_secret_enc FROM providers WHERE id=$1', [id]);
      if (r.rowCount) rec = r.rows[0];
    } catch (e) { console.error(e); }
  }
  if (!rec) return res.status(404).json({ error: 'provider not found' });

  const clientId = rec.client_id || rec.clientId;
  const clientSecretEnc = rec.client_secret_enc || rec.client_secret_enc || rec.clientSecretEnc;
  const clientSecret = clientSecretEnc ? Buffer.from(clientSecretEnc, 'base64').toString('utf8') : null;
  if (!clientId || !clientSecret) return res.json({ ok: false, details: 'Missing client_id or client_secret' });

  try {
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'client_credentials');

    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', { method: 'POST', body: params });
    const json = await tokenRes.json();
    if (json.access_token) return res.json({ ok: true, details: 'client_credentials token obtained' });
    return res.json({ ok: false, details: json });
  } catch (e) {
    console.error('test-connection error', e);
    return res.json({ ok: false, details: String(e) });
  }
});

// Start Microsoft OAuth flow (delegated)
app.get('/auth/microsoft/start', (req, res) => {
  const { providerId, companyId, scopes } = req.query;
  let rec = providerId ? providersStore.get(providerId) : null;
  if (!rec && providerId && pool) {
    // fetch from db is optional for test-server: omitted to keep simple
  }
  if (!rec) {
    return res.status(400).send('invalid providerId (in test server use admin to create provider first)');
  }
  const clientId = rec.client_id || rec.clientId;
  const defaultScopes = (rec.default_scopes || rec.defaultScopes || scopes || 'openid profile offline_access Tasks.ReadWrite Mail.Read').toString();
  const state = JSON.stringify({ providerId, companyId });
  const redirectUri = `${process.env.APP_BASE_URL || ('http://localhost:' + (process.env.FRONTEND_PORT||3000))}/auth/microsoft/callback`;
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(defaultScopes)}&state=${encodeURIComponent(state)}`;
  res.redirect(authUrl);
});

// OAuth callback
app.get('/auth/microsoft/callback', async (req, res) => {
  const { code, state } = req.query;
  let parsedState = null;
  try { parsedState = JSON.parse(state); } catch(e){}
  const providerId = parsedState?.providerId;
  const companyId = parsedState?.companyId;
  let rec = providerId ? providersStore.get(providerId) : null;
  if (!rec && pool) {
    try {
      const r = await pool.query('SELECT client_id, client_secret_enc FROM providers WHERE id=$1', [providerId]);
      if (r.rowCount) rec = r.rows[0];
    } catch(e) { console.error(e); }
  }
  if (!rec) return res.status(400).send('unknown provider');
  const clientId = rec.client_id || rec.clientId;
  const clientSecret = rec.client_secret_enc ? Buffer.from(rec.client_secret_enc, 'base64').toString('utf8') : null;
  const redirectUri = `${process.env.APP_BASE_URL || ('http://localhost:' + (process.env.FRONTEND_PORT||3000))}/auth/microsoft/callback`;
  try {
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('scope', 'offline_access openid profile');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('grant_type', 'authorization_code');
    if (clientSecret) params.append('client_secret', clientSecret);

    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', { method: 'POST', body: params });
    const json = await tokenRes.json();
    if (json.error) {
      console.error('token exchange error', json);
      return res.status(500).json({ error: 'token_exchange_failed', details: json });
    }
    // store tokens in memory for test purposes
    const accountKey = `${providerId}::${companyId || 'default'}`;
    microsoftAccountsStore.set(accountKey, { providerId, companyId, tokenSet: json, receivedAt: new Date().toISOString() });
    return res.json({ ok: true, received: true, providerId, companyId });
  } catch (e) {
    console.error('callback error', e);
    return res.status(500).json({ error: 'internal', details: String(e) });
  }
});
app.post('/admin/providers', async (req, res) => {
  if (!ensureSuperAdmin(req, res)) return;
  const { name, display_name, client_id, client_secret, default_scopes } = req.body || {};
  const id = require('crypto').randomUUID();
  const rec = { id, name, display_name, client_id, client_secret_enc: client_secret ? Buffer.from(client_secret).toString('base64') : null, default_scopes };
  if (pool) {
    try {
      await pool.query('INSERT INTO providers (id, name, display_name, client_id, client_secret_enc, default_scopes, created_at) VALUES ($1,$2,$3,$4,$5,$6,now())', [id, name, display_name, client_id, rec.client_secret_enc, default_scopes || []]);
      return res.status(201).json({ id });
    } catch(e) {
      console.error('db insert error', e);
      return res.status(500).json({ error: 'db error' });
    }
  }
  providersStore.set(id, { ...rec, enabled: true });
  res.status(201).json({ id });
});

app.post('/admin/providers/:id/assign-company', async (req, res) => {
  if (!ensureSuperAdmin(req, res)) return;
  const id = req.params.id;
  const { companyId, enabled, allowed_scopes } = req.body || {};
  if (pool) {
    try {
      // upsert
      await pool.query(`INSERT INTO provider_company_assignments (provider_id, company_id, enabled, allowed_scopes, assigned_by, assigned_at) VALUES ($1,$2,$3,$4,$5,now()) ON CONFLICT (provider_id, company_id) DO UPDATE SET enabled=EXCLUDED.enabled, allowed_scopes=EXCLUDED.allowed_scopes, assigned_at=now()`, [id, companyId, enabled ?? true, allowed_scopes || [], req.headers['x-user-id'] || null]);
      return res.json({ assigned: true });
    } catch(e){ console.error(e); return res.status(500).json({ error: 'db error' }); }
  }
  // in-memory: store assignment on provider record
  const p = providersStore.get(id);
  if (!p) return res.status(404).json({ error: 'provider not found' });
  p.assignment = { companyId, enabled: enabled ?? true, allowed_scopes };
  res.json({ assigned: true });
});

app.post('/admin/providers/:id/assign-user', async (req, res) => {
  if (!ensureSuperAdmin(req, res)) return;
  const id = req.params.id;
  const { companyId, userId, role } = req.body || {};
  if (pool) {
    try {
      await pool.query('INSERT INTO provider_user_permissions (provider_id, company_id, user_id, role, granted_by, granted_at) VALUES ($1,$2,$3,$4,$5,now())', [id, companyId, userId, role, req.headers['x-user-id'] || null]);
      return res.json({ granted: true });
    } catch(e){ console.error(e); return res.status(500).json({ error: 'db error' }); }
  }
  const p = providersStore.get(id);
  if (!p) return res.status(404).json({ error: 'provider not found' });
  p.permissions = p.permissions || [];
  p.permissions.push({ companyId, userId, role });
  res.json({ granted: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server listening on http://0.0.0.0:${PORT}`);
  console.log('Endpoints: POST /api/track/start-session, /api/track/event, /api/track/end-session');
  console.log('Admin endpoints: GET/POST /admin/providers, POST /admin/providers/:id/assign-company, POST /admin/providers/:id/assign-user');
});
