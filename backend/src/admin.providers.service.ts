import { query } from './db/client';
import { encrypt, decrypt } from './utils/crypto';

export class ProvidersService {
  async createProvider({ name, display_name, client_id, client_secret, default_scopes, created_by }: any) {
    const enc = client_secret ? encrypt(client_secret) : null;
    const res = await query(
      `INSERT INTO providers (name, display_name, client_id, client_secret_enc, default_scopes, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, display_name, client_id, enc, default_scopes || [], created_by || null]
    );
    await this.logAudit(created_by, 'create_provider', 'provider', res.rows[0].id, { name });
    return res.rows[0];
  }

  async assignToCompany({ providerId, companyId, enabled = true, allowed_scopes, assigned_by }: any) {
    // upsert
    const existing = await query(`SELECT id FROM provider_company_assignments WHERE provider_id=$1 AND company_id=$2`, [providerId, companyId]);
    if (existing.rowCount) {
      await query(`UPDATE provider_company_assignments SET enabled=$1, allowed_scopes=$2, assigned_by=$3, assigned_at=now() WHERE id=$4`, [enabled, allowed_scopes || [], assigned_by || null, existing.rows[0].id]);
      await this.logAudit(assigned_by, 'assign_provider_company', 'assignment', existing.rows[0].id, { providerId, companyId });
      return { updated: true };
    }
    const res = await query(`INSERT INTO provider_company_assignments (provider_id, company_id, enabled, allowed_scopes, assigned_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [providerId, companyId, enabled, allowed_scopes || [], assigned_by || null]);
    await this.logAudit(assigned_by, 'assign_provider_company', 'assignment', res.rows[0].id, { providerId, companyId });
    return res.rows[0];
  }

  async grantUser({ providerId, companyId, userId, role, granted_by }: any) {
    const res = await query(`INSERT INTO provider_user_permissions (provider_id, company_id, user_id, role, granted_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [providerId, companyId, userId, role, granted_by || null]);
    await this.logAudit(granted_by, 'grant_user_permission', 'user_permission', res.rows[0].id, { providerId, companyId, userId, role });
    return res.rows[0];
  }

  async logAudit(actor_user_id: any, action: string, target_type: string, target_id: any, details: any) {
    await query(`INSERT INTO admin_audit_logs (actor_user_id, action, target_type, target_id, details) VALUES ($1,$2,$3,$4,$5)`, [actor_user_id || null, action, target_type, target_id, details || {}]);
  }

  async getProviders() {
    const res = await query(`SELECT id, name, display_name, enabled FROM providers ORDER BY name`);
    return res.rows;
  }
}

export const providersService = new ProvidersService();