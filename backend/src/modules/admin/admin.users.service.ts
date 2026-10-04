import { query, pool } from '../../db/index.js';
import { AuditService } from '../audit/audit.service.js';

export interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export class AdminUsersService {
  static async listUsers(opts: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }): Promise<{ rows: AdminUserRow[]; total: number }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (opts.search) {
      conditions.push(`email ILIKE $${idx++}`);
      params.push(`%${opts.search}%`);
    }
    if (opts.role && ['user', 'admin'].includes(opts.role)) {
      conditions.push(`role = $${idx++}`);
      params.push(opts.role);
    }
    if (opts.status && ['active', 'suspended'].includes(opts.status)) {
      conditions.push(`status = $${idx++}`);
      params.push(opts.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSort = ['email', 'role', 'status', 'created_at', 'updated_at'];
    const sortCol = allowedSort.includes(opts.sortBy ?? '') ? opts.sortBy! : 'created_at';
    const sortDir = opts.sortDir === 'asc' ? 'ASC' : 'DESC';

    const [countRes, rowsRes] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*) FROM users ${where}`, params),
      query<AdminUserRow>(
        `SELECT id, email, role, status, created_at, updated_at
         FROM users ${where}
         ORDER BY ${sortCol} ${sortDir}
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      ),
    ]);

    return { rows: rowsRes.rows, total: parseInt(countRes.rows[0]?.count ?? '0', 10) };
  }

  static async getUserById(id: string): Promise<AdminUserRow | null> {
    const res = await query<AdminUserRow>(
      'SELECT id, email, role, status, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return res.rows[0] ?? null;
  }

  static async getUserActivity(userId: string, opts: { page?: number; limit?: number }): Promise<{
    machineCount: number;
    sectionCount: number;
    usageRecordCount: number;
    recentAuditLogs: unknown[];
  }> {
    const [mRes, sRes, rRes] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*) FROM machines WHERE user_id = $1', [userId]),
      query<{ count: string }>('SELECT COUNT(*) FROM sections WHERE user_id = $1', [userId]),
      query<{ count: string }>('SELECT COUNT(*) FROM usage_records WHERE user_id = $1', [userId]),
    ]);

    const auditRes = await query(
      'SELECT action, resource_type, resource_id, created_at FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [userId]
    );

    return {
      machineCount: parseInt(mRes.rows[0].count, 10),
      sectionCount: parseInt(sRes.rows[0].count, 10),
      usageRecordCount: parseInt(rRes.rows[0].count, 10),
      recentAuditLogs: auditRes.rows,
    };
  }

  static async updateUserRole(
    targetUserId: string,
    newRole: 'user' | 'admin',
    adminUserId: string,
    adminEmail: string,
    ipAddress?: string
  ): Promise<AdminUserRow | null> {
    // Safety: never remove the last admin
    if (newRole === 'user') {
      const adminCount = await query<{ count: string }>(
        "SELECT COUNT(*) FROM users WHERE role = 'admin'"
      );
      const target = await query<{ role: string }>(
        'SELECT role FROM users WHERE id = $1',
        [targetUserId]
      );

      if (target.rows[0]?.role === 'admin' && parseInt(adminCount.rows[0].count, 10) <= 1) {
        throw new Error('Cannot demote the last remaining admin. Promote another user first.');
      }
    }

    const res = await query<AdminUserRow>(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, email, role, status, created_at, updated_at`,
      [newRole, targetUserId]
    );

    if (res.rows[0]) {
      await AuditService.log({
        userId: adminUserId,
        userEmail: adminEmail,
        action: 'admin.user.role_changed',
        resourceType: 'user',
        resourceId: targetUserId,
        metadata: { newRole, targetEmail: res.rows[0].email },
        ipAddress,
      });
    }

    return res.rows[0] ?? null;
  }

  static async updateUserStatus(
    targetUserId: string,
    newStatus: 'active' | 'suspended',
    adminUserId: string,
    adminEmail: string,
    ipAddress?: string
  ): Promise<AdminUserRow | null> {
    // Cannot suspend yourself
    if (targetUserId === adminUserId) {
      throw new Error('You cannot change your own account status.');
    }

    const res = await query<AdminUserRow>(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, email, role, status, created_at, updated_at`,
      [newStatus, targetUserId]
    );

    if (res.rows[0]) {
      await AuditService.log({
        userId: adminUserId,
        userEmail: adminEmail,
        action: 'admin.user.status_changed',
        resourceType: 'user',
        resourceId: targetUserId,
        metadata: { newStatus, targetEmail: res.rows[0].email },
        ipAddress,
      });
    }

    return res.rows[0] ?? null;
  }

  static async deleteUser(
    targetUserId: string,
    adminUserId: string,
    adminEmail: string,
    ipAddress?: string
  ): Promise<boolean> {
    // Cannot delete yourself
    if (targetUserId === adminUserId) {
      throw new Error('You cannot delete your own account.');
    }

    // Cannot delete the last admin
    const target = await query<{ role: string; email: string }>(
      'SELECT role, email FROM users WHERE id = $1',
      [targetUserId]
    );

    if (!target.rows[0]) return false;

    if (target.rows[0].role === 'admin') {
      const adminCount = await query<{ count: string }>(
        "SELECT COUNT(*) FROM users WHERE role = 'admin'"
      );
      if (parseInt(adminCount.rows[0].count, 10) <= 1) {
        throw new Error('Cannot delete the last remaining admin.');
      }
    }

    const res = await query('DELETE FROM users WHERE id = $1 RETURNING id', [targetUserId]);
    const deleted = (res.rowCount ?? 0) > 0;

    if (deleted) {
      await AuditService.log({
        userId: adminUserId,
        userEmail: adminEmail,
        action: 'admin.user.deleted',
        resourceType: 'user',
        resourceId: targetUserId,
        metadata: { deletedEmail: target.rows[0].email },
        ipAddress,
      });
    }

    return deleted;
  }
}
