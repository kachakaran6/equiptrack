/**
 * EQUIPTRACK ADMIN CONTROL PANEL — CLIENT APPLICATION LOGIC
 */

(function () {
  'use strict';

  // ─── STATE MANAGEMENT ──────────────────────────────────────────────────────
  const state = {
    token: localStorage.getItem('equiptrack_admin_token') || '',
    user: JSON.parse(localStorage.getItem('equiptrack_admin_user') || 'null'),
    apiUrl: localStorage.getItem('equiptrack_api_url') || window.location.origin,
    activeTab: 'tab-overview',
    usersPage: 1,
    usersLimit: 15,
    usersTotal: 0,
    pollTimer: null,
  };

  // ─── DOM SELECTORS ────────────────────────────────────────────────────────
  const dom = {
    authScreen: document.getElementById('authScreen'),
    appContainer: document.getElementById('appContainer'),
    loginForm: document.getElementById('loginForm'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    apiUrlInput: document.getElementById('apiUrlInput'),
    togglePwdBtn: document.getElementById('togglePwdBtn'),
    btnLogin: document.getElementById('btnLogin'),
    btnLogout: document.getElementById('btnLogout'),
    pageTitle: document.getElementById('pageTitle'),
    envBadge: document.getElementById('envBadge'),
    toastContainer: document.getElementById('toastContainer'),
    sidebarUserEmail: document.getElementById('sidebarUserEmail'),
    sidebarAvatar: document.getElementById('sidebarAvatar'),
    btnGlobalRefresh: document.getElementById('btnGlobalRefresh'),

    // Overview metrics
    metricTotalUsers: document.getElementById('metricTotalUsers'),
    metricActiveUsers: document.getElementById('metricActiveUsers'),
    metricTotalMachines: document.getElementById('metricTotalMachines'),
    metricTotalSections: document.getElementById('metricTotalSections'),
    metricBackupStatus: document.getElementById('metricBackupStatus'),
    metricLastBackup: document.getElementById('metricLastBackup'),
    metricDbSize: document.getElementById('metricDbSize'),
    metricDbPool: document.getElementById('metricDbPool'),
    miniAuditList: document.getElementById('miniAuditList'),
    btnQuickBackup: document.getElementById('btnQuickBackup'),
    btnQuickTgTest: document.getElementById('btnQuickTgTest'),
    btnQuickDbCheck: document.getElementById('btnQuickDbCheck'),

    // Backups
    manualBackupForm: document.getElementById('manualBackupForm'),
    backupFormatSelect: document.getElementById('backupFormatSelect'),
    backupSendTgCheck: document.getElementById('backupSendTgCheck'),
    btnExecuteBackup: document.getElementById('btnExecuteBackup'),
    backupConfigForm: document.getElementById('backupConfigForm'),
    configCron: document.getElementById('configCron'),
    configTz: document.getElementById('configTz'),
    configRetention: document.getElementById('configRetention'),
    configDefaultFormat: document.getElementById('configDefaultFormat'),
    configSchedulerEnabled: document.getElementById('configSchedulerEnabled'),
    btnSaveBackupConfig: document.getElementById('btnSaveBackupConfig'),
    btnTestTgConfig: document.getElementById('btnTestTgConfig'),
    tgChannelName: document.getElementById('tgChannelName'),
    btnRefreshHistory: document.getElementById('btnRefreshHistory'),
    backupHistoryTbody: document.getElementById('backupHistoryTbody'),

    // Users
    usersTbody: document.getElementById('usersTbody'),
    userSearchInput: document.getElementById('userSearchInput'),
    userRoleFilter: document.getElementById('userRoleFilter'),
    userStatusFilter: document.getElementById('userStatusFilter'),
    usersPageInfo: document.getElementById('usersPageInfo'),
    btnUsersPrev: document.getElementById('btnUsersPrev'),
    btnUsersNext: document.getElementById('btnUsersNext'),

    // Audit
    auditTbody: document.getElementById('auditTbody'),
    auditSearchInput: document.getElementById('auditSearchInput'),
    btnRefreshAudit: document.getElementById('btnRefreshAudit'),

    // System
    sysApp: document.getElementById('sysApp'),
    sysNode: document.getElementById('sysNode'),
    sysUptime: document.getElementById('sysUptime'),
    sysPlatform: document.getElementById('sysPlatform'),
    sysMemory: document.getElementById('sysMemory'),
    dbName: document.getElementById('dbName'),
    dbSize: document.getElementById('dbSize'),
    dbPoolStatus: document.getElementById('dbPoolStatus'),
    dbTablesTbody: document.getElementById('dbTablesTbody'),

    // Modal
    userModal: document.getElementById('userModal'),
    userModalTitle: document.getElementById('userModalTitle'),
    userModalBody: document.getElementById('userModalBody'),
    btnCloseUserModal: document.getElementById('btnCloseUserModal'),
  };

  // ─── API HELPER ───────────────────────────────────────────────────────────
  async function api(endpoint, options = {}) {
    const url = `${state.apiUrl.replace(/\/$/, '')}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        showToast('Session expired or unauthorized. Please log in again.', 'error');
        logout();
        throw new Error('Unauthorized');
      }

      if (response.status === 403) {
        showToast(data.error?.message || 'Admin privileges required', 'error');
        throw new Error(data.error?.message || 'Forbidden');
      }

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}: Request failed`);
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  }

  // ─── TOAST NOTIFICATIONS ──────────────────────────────────────────────────
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '✕';

    toast.innerHTML = `<span><strong>${icon}</strong> ${message}</span>`;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ─── AUTHENTICATION ───────────────────────────────────────────────────────
  async function login(email, password) {
    dom.btnLogin.disabled = true;
    dom.btnLogin.querySelector('.spinner').classList.remove('hidden');
    dom.btnLogin.querySelector('.btn-text').textContent = 'Authenticating...';

    try {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!res.data || !res.data.token) {
        throw new Error('Invalid response from server');
      }

      if (res.data.user?.role !== 'admin') {
        throw new Error('Account does not possess administrator role privileges');
      }

      state.token = res.data.token;
      state.user = res.data.user;
      localStorage.setItem('equiptrack_admin_token', state.token);
      localStorage.setItem('equiptrack_admin_user', JSON.stringify(state.user));

      showToast(`Authenticated successfully as ${state.user.email}`, 'success');
      initDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      dom.btnLogin.disabled = false;
      dom.btnLogin.querySelector('.spinner').classList.add('hidden');
      dom.btnLogin.querySelector('.btn-text').textContent = 'Authenticate as Admin';
    }
  }

  function logout() {
    state.token = '';
    state.user = null;
    localStorage.removeItem('equiptrack_admin_token');
    localStorage.removeItem('equiptrack_admin_user');
    if (state.pollTimer) clearInterval(state.pollTimer);

    dom.appContainer.classList.add('hidden');
    dom.authScreen.classList.remove('hidden');
    dom.loginPassword.value = '';
  }

  // ─── DASHBOARD INITIALIZATION ─────────────────────────────────────────────
  function initDashboard() {
    dom.authScreen.classList.add('hidden');
    dom.appContainer.classList.remove('hidden');

    dom.sidebarUserEmail.textContent = state.user?.email || 'admin@equiptrack.com';
    dom.sidebarAvatar.textContent = (state.user?.email || 'A')[0].toUpperCase();

    // Environment badge
    const isLocal = state.apiUrl.includes('localhost') || state.apiUrl.includes('127.0.0.1');
    dom.envBadge.textContent = isLocal ? 'LOCAL' : 'PRODUCTION';
    dom.envBadge.style.color = isLocal ? 'var(--accent-cyan)' : 'var(--accent-emerald)';

    // Load initial data
    refreshAllData();

    // Auto poll every 30 seconds
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(() => {
      if (!document.hidden && state.token) {
        refreshAllData(true);
      }
    }, 30000);
  }

  async function refreshAllData(silent = false) {
    try {
      await Promise.allSettled([
        loadOverviewMetrics(),
        loadBackupConfigAndHistory(),
        loadUsers(),
        loadAuditLogs(),
        loadSystemAndDbStats(),
      ]);
      if (!silent) showToast('Data refreshed successfully', 'info');
    } catch (err) {
      if (!silent) showToast('Failed to refresh some metrics', 'error');
    }
  }

  // ─── TAB 1: OVERVIEW METRICS ──────────────────────────────────────────────
  async function loadOverviewMetrics() {
    try {
      const [sysRes, dbRes, backupRes] = await Promise.all([
        api('/api/admin/system'),
        api('/api/admin/db'),
        api('/api/admin/backup/status').catch(() => ({ data: {} })),
      ]);

      // Database stats
      if (dbRes.data) {
        const tableCounts = dbRes.data.tables || [];
        const userRow = tableCounts.find(t => t.table_name === 'users');
        const machineRow = tableCounts.find(t => t.table_name === 'machines');
        const sectionRow = tableCounts.find(t => t.table_name === 'sections');

        dom.metricTotalUsers.textContent = userRow ? userRow.row_count : '—';
        dom.metricTotalMachines.textContent = machineRow ? machineRow.row_count : '—';
        dom.metricTotalSections.textContent = `${sectionRow?.row_count || 0} components`;
        dom.metricDbSize.textContent = dbRes.data.databaseSize || '—';
        dom.metricDbPool.textContent = `Pool: ${dbRes.data.connectionPool?.totalCount || 0} conns`;
      }

      // Backup status
      if (backupRes.data) {
        const inProg = backupRes.data.backupInProgress;
        dom.metricBackupStatus.textContent = inProg ? 'RUNNING' : 'ONLINE';
        dom.metricBackupStatus.style.color = inProg ? 'var(--accent-amber)' : 'var(--accent-emerald)';

        if (backupRes.data.latestBackup) {
          const lb = backupRes.data.latestBackup;
          dom.metricLastBackup.textContent = `Last: ${formatRelativeTime(lb.created_at)}`;
        }
      }
    } catch (err) {
      console.warn('Overview metric load error:', err);
    }
  }

  // ─── TAB 2: BACKUPS & TELEGRAM ────────────────────────────────────────────
  async function loadBackupConfigAndHistory() {
    try {
      const [confRes, histRes] = await Promise.all([
        api('/api/admin/backup/config'),
        api('/api/admin/backup/history?page=1&limit=15'),
      ]);

      if (confRes.data) {
        const c = confRes.data;
        dom.configCron.value = c.cron_expression || '0 2 * * *';
        dom.configTz.value = c.timezone || 'Asia/Kolkata';
        dom.configRetention.value = c.retention_days || 30;
        dom.configDefaultFormat.value = c.format || 'sql';
        dom.configSchedulerEnabled.checked = !!c.enabled;

        if (c.telegram_chat_id) {
          dom.tgChannelName.textContent = `Chat ID: ${c.telegram_chat_id} (Active)`;
        } else {
          dom.tgChannelName.textContent = 'Channel connected via bot credentials';
        }
      }

      if (histRes.data && Array.isArray(histRes.data)) {
        renderBackupHistory(histRes.data);
      }
    } catch (err) {
      console.warn('Backup config/history error:', err);
    }
  }

  function renderBackupHistory(items) {
    if (items.length === 0) {
      dom.backupHistoryTbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No backup records found</td></tr>';
      return;
    }

    dom.backupHistoryTbody.innerHTML = items.map(item => {
      let statusBadge = `<span class="badge badge-success">${item.status}</span>`;
      if (item.status === 'failed') statusBadge = `<span class="badge badge-danger">FAILED</span>`;
      if (item.status === 'in_progress') statusBadge = `<span class="badge badge-warning">RUNNING</span>`;

      const sizeStr = item.file_size_bytes ? formatBytes(item.file_size_bytes) : '—';
      const tgStatus = item.telegram_status === 'sent' 
        ? '<span class="badge badge-success">SENT</span>' 
        : `<span class="badge badge-warning">${item.telegram_status || 'NONE'}</span>`;

      const checksumStr = item.checksum ? `${item.checksum.substring(0, 10)}...` : '—';

      return `
        <tr>
          <td class="font-mono text-sm">${formatDate(item.created_at)}</td>
          <td>${statusBadge}</td>
          <td><span class="font-mono uppercase">${item.format}</span></td>
          <td class="font-mono">${sizeStr}</td>
          <td>${tgStatus}</td>
          <td class="text-muted text-sm">${item.triggered_by || 'manual'}</td>
          <td class="font-mono text-sm text-dim" title="${item.checksum || ''}">${checksumStr}</td>
        </tr>
      `;
    }).join('');
  }

  async function executeBackup() {
    const format = dom.backupFormatSelect.value;
    const sendToTelegram = dom.backupSendTgCheck.checked;

    dom.btnExecuteBackup.disabled = true;
    showToast(`Starting database backup (${format.toUpperCase()})...`, 'info');

    try {
      const res = await api('/api/admin/backup/run', {
        method: 'POST',
        body: JSON.stringify({ format, sendToTelegram }),
      });

      showToast(`Backup completed successfully! Telegram: ${res.data.telegramStatus}`, 'success');
      loadBackupConfigAndHistory();
      loadOverviewMetrics();
    } catch (err) {
      showToast(`Backup failed: ${err.message}`, 'error');
    } finally {
      dom.btnExecuteBackup.disabled = false;
    }
  }

  async function saveBackupConfig() {
    dom.btnSaveBackupConfig.disabled = true;
    try {
      await api('/api/admin/backup/config', {
        method: 'PATCH',
        body: JSON.stringify({
          cron_expression: dom.configCron.value.trim(),
          timezone: dom.configTz.value.trim(),
          retention_days: parseInt(dom.configRetention.value, 10),
          format: dom.configDefaultFormat.value,
          enabled: dom.configSchedulerEnabled.checked,
        }),
      });
      showToast('Backup scheduler configuration updated', 'success');
    } catch (err) {
      showToast(`Failed to update config: ${err.message}`, 'error');
    } finally {
      dom.btnSaveBackupConfig.disabled = false;
    }
  }

  async function testTelegramPing() {
    showToast('Sending test message to Telegram...', 'info');
    try {
      const res = await api('/api/admin/telegram/test', { method: 'POST' });
      showToast(`Telegram Test Succeeded: ${res.data.channelTitle || 'Message delivered'}`, 'success');
    } catch (err) {
      showToast(`Telegram Test Failed: ${err.message}`, 'error');
    }
  }

  // ─── TAB 3: USER MANAGEMENT ───────────────────────────────────────────────
  async function loadUsers() {
    const search = dom.userSearchInput.value.trim();
    const role = dom.userRoleFilter.value;
    const status = dom.userStatusFilter.value;

    let url = `/api/admin/users?page=${state.usersPage}&limit=${state.usersLimit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (role) url += `&role=${role}`;
    if (status) url += `&status=${status}`;

    try {
      const res = await api(url);
      renderUsers(res.data || []);
      if (res.pagination) {
        state.usersTotal = res.pagination.total;
        dom.usersPageInfo.textContent = `Page ${res.pagination.page} of ${Math.max(1, res.pagination.pages)} (${res.pagination.total} users)`;
        dom.btnUsersPrev.disabled = res.pagination.page <= 1;
        dom.btnUsersNext.disabled = res.pagination.page >= res.pagination.pages;
      }
    } catch (err) {
      console.warn('User load error:', err);
    }
  }

  function renderUsers(users) {
    if (users.length === 0) {
      dom.usersTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No users matched the criteria</td></tr>';
      return;
    }

    dom.usersTbody.innerHTML = users.map(u => {
      const roleBadge = u.role === 'admin' 
        ? '<span class="badge badge-info">ADMIN</span>' 
        : '<span class="badge text-muted">USER</span>';

      const statusBadge = u.status === 'active'
        ? '<span class="badge badge-success">ACTIVE</span>'
        : '<span class="badge badge-danger">SUSPENDED</span>';

      return `
        <tr data-user-id="${u.id}">
          <td class="font-medium">${escapeHtml(u.email)}</td>
          <td>${roleBadge}</td>
          <td>${statusBadge}</td>
          <td class="text-sm text-muted">${formatDate(u.created_at)}</td>
          <td>
            <button class="btn btn-sm btn-link btn-view-user" data-id="${u.id}">Activity Details →</button>
          </td>
          <td>
            <div class="flex gap-2">
              <button class="btn btn-sm btn-secondary btn-toggle-role" data-id="${u.id}" data-current="${u.role}">
                ${u.role === 'admin' ? 'Demote to User' : 'Make Admin'}
              </button>
              <button class="btn btn-sm ${u.status === 'active' ? 'btn-danger' : 'btn-secondary'} btn-toggle-status" data-id="${u.id}" data-current="${u.status}">
                ${u.status === 'active' ? 'Suspend' : 'Activate'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row listeners
    dom.usersTbody.querySelectorAll('.btn-view-user').forEach(b => {
      b.addEventListener('click', () => viewUserActivity(b.dataset.id));
    });

    dom.usersTbody.querySelectorAll('.btn-toggle-role').forEach(b => {
      b.addEventListener('click', () => toggleUserRole(b.dataset.id, b.dataset.current));
    });

    dom.usersTbody.querySelectorAll('.btn-toggle-status').forEach(b => {
      b.addEventListener('click', () => toggleUserStatus(b.dataset.id, b.dataset.current));
    });
  }

  async function toggleUserRole(userId, currentRole) {
    const targetRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Are you sure you want to change this user's role to "${targetRole.toUpperCase()}"?`)) return;

    try {
      await api(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: targetRole }),
      });
      showToast(`User role updated to ${targetRole}`, 'success');
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function toggleUserStatus(userId, currentStatus) {
    const targetStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!confirm(`Are you sure you want to change this user's status to "${targetStatus.toUpperCase()}"?`)) return;

    try {
      await api(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus }),
      });
      showToast(`User status updated to ${targetStatus}`, 'success');
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function viewUserActivity(userId) {
    dom.userModal.classList.remove('hidden');
    dom.userModalBody.innerHTML = '<div class="text-center p-4">Loading user metrics...</div>';

    try {
      const res = await api(`/api/admin/users/${userId}/activity`);
      const { user, activity } = res.data;

      dom.userModalTitle.textContent = `User: ${user.email}`;
      dom.userModalBody.innerHTML = `
        <div class="grid-2-sm mb-3">
          <div class="info-item">
            <span class="info-label">Role</span>
            <span class="font-mono uppercase">${user.role}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Status</span>
            <span class="font-mono uppercase">${user.status}</span>
          </div>
        </div>

        <h4 class="text-sm font-semibold mb-2">Company Workspace Data</h4>
        <div class="grid-3 metrics-grid mb-3" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.5rem;">
          <div class="info-item flex-col text-center">
            <span class="text-xl font-bold font-mono text-cyan">${activity.machineCount}</span>
            <span class="text-xs text-muted">Machines</span>
          </div>
          <div class="info-item flex-col text-center">
            <span class="text-xl font-bold font-mono text-indigo">${activity.sectionCount}</span>
            <span class="text-xs text-muted">Components</span>
          </div>
          <div class="info-item flex-col text-center">
            <span class="text-xl font-bold font-mono text-emerald">${activity.usageRecordCount}</span>
            <span class="text-xs text-muted">Usage Records</span>
          </div>
        </div>

        <h4 class="text-sm font-semibold mb-2">Recent Security Activity</h4>
        <div class="table-responsive">
          <table class="data-table table-sm">
            <thead><tr><th>Action</th><th>Date</th></tr></thead>
            <tbody>
              ${(activity.recentAuditLogs || []).map(l => `
                <tr>
                  <td class="font-mono text-xs">${l.action}</td>
                  <td class="text-xs text-muted">${formatDate(l.created_at)}</td>
                </tr>
              `).join('') || '<tr><td colspan="2" class="text-center text-muted">No recent logs</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      dom.userModalBody.innerHTML = `<div class="text-center text-rose p-4">Error: ${err.message}</div>`;
    }
  }

  // ─── TAB 4: AUDIT LOGS ────────────────────────────────────────────────────
  async function loadAuditLogs() {
    try {
      const res = await api('/api/admin/audit-logs?limit=40');
      const logs = res.data || [];
      renderAuditLogs(logs);

      // Mini audit on overview
      if (dom.miniAuditList) {
        dom.miniAuditList.innerHTML = logs.slice(0, 5).map(l => `
          <div class="mini-log-item">
            <div>
              <span class="font-mono font-medium">${escapeHtml(l.action)}</span>
              <span class="text-muted ml-2 text-xs">${escapeHtml(l.user_email || 'system')}</span>
            </div>
            <span class="text-dim text-xs font-mono">${formatRelativeTime(l.created_at)}</span>
          </div>
        `).join('') || '<div class="empty-state">No audit logs recorded yet</div>';
      }
    } catch (err) {
      console.warn('Audit logs error:', err);
    }
  }

  function renderAuditLogs(logs) {
    const search = dom.auditSearchInput.value.toLowerCase().trim();
    const filtered = search 
      ? logs.filter(l => l.action.toLowerCase().includes(search) || (l.user_email || '').toLowerCase().includes(search))
      : logs;

    if (filtered.length === 0) {
      dom.auditTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No audit records found</td></tr>';
      return;
    }

    dom.auditTbody.innerHTML = filtered.map(l => `
      <tr>
        <td class="font-mono text-xs text-muted">${formatDate(l.created_at)}</td>
        <td><span class="badge badge-info">${escapeHtml(l.action)}</span></td>
        <td class="text-sm">${escapeHtml(l.user_email || 'System')}</td>
        <td class="font-mono text-xs text-dim">${escapeHtml(l.ip_address || '—')}</td>
        <td class="text-xs text-dim font-mono">${escapeHtml(JSON.stringify(l.details || {}))}</td>
      </tr>
    `).join('');
  }

  // ─── TAB 5: SYSTEM & DATABASE STATS ───────────────────────────────────────
  async function loadSystemAndDbStats() {
    try {
      const [sysRes, dbRes] = await Promise.all([
        api('/api/admin/system'),
        api('/api/admin/db'),
      ]);

      if (sysRes.data) {
        const s = sysRes.data;
        dom.sysApp.textContent = s.application || 'EquipTrack Fastify Backend';
        dom.sysNode.textContent = s.nodeVersion || 'v20+';
        dom.sysUptime.textContent = formatUptime(s.uptimeSeconds || 0);
        dom.sysPlatform.textContent = `${s.os?.platform || ''} ${s.os?.arch || ''}`;
        dom.sysMemory.textContent = `RSS: ${s.memory?.rss || ''} | Heap: ${s.memory?.heapUsed || ''} / ${s.memory?.heapTotal || ''}`;
      }

      if (dbRes.data) {
        const d = dbRes.data;
        dom.dbName.textContent = d.databaseName || 'equiptrack';
        dom.dbSize.textContent = d.databaseSize || '—';
        dom.dbPoolStatus.textContent = `Total: ${d.connectionPool?.totalCount || 0} | Active: ${d.connectionPool?.activeCount || 0} | Idle: ${d.connectionPool?.idleCount || 0}`;

        const tables = d.tables || [];
        dom.dbTablesTbody.innerHTML = tables.map(t => `
          <tr>
            <td class="font-mono font-medium">${t.table_name}</td>
            <td class="font-mono">${t.row_count}</td>
            <td class="font-mono text-dim">${t.total_size || '—'}</td>
          </tr>
        `).join('') || '<tr><td colspan="3" class="text-center text-muted">No tables found</td></tr>';
      }
    } catch (err) {
      console.warn('System/DB load error:', err);
    }
  }

  // ─── UTILS & HELPERS ──────────────────────────────────────────────────────
  function formatDate(d) {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'medium' });
    } catch {
      return d;
    }
  }

  function formatRelativeTime(d) {
    if (!d) return 'never';
    const diffMs = Date.now() - new Date(d).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${Math.floor(seconds % 60)}s`;
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str);
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // ─── EVENT LISTENERS ──────────────────────────────────────────────────────
  function initEventListeners() {
    // Toggle password
    dom.togglePwdBtn.addEventListener('click', () => {
      const type = dom.loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
      dom.loginPassword.setAttribute('type', type);
    });

    // Login submit
    dom.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const apiUrl = dom.apiUrlInput.value.trim() || window.location.origin;
      state.apiUrl = apiUrl;
      localStorage.setItem('equiptrack_api_url', state.apiUrl);

      login(dom.loginEmail.value.trim(), dom.loginPassword.value);
    });

    // Logout
    dom.btnLogout.addEventListener('click', logout);

    // Sidebar navigation tabs
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        const pane = document.getElementById(target);
        if (pane) pane.classList.add('active');

        state.activeTab = target;
        dom.pageTitle.textContent = btn.querySelector('span').textContent;
      });
    });

    // Link targets in panels
    document.querySelectorAll('[data-tab-target]').forEach(link => {
      link.addEventListener('click', () => {
        const targetTab = link.dataset.tabTarget;
        const navBtn = document.querySelector(`.nav-item[data-tab="${targetTab}"]`);
        if (navBtn) navBtn.click();
      });
    });

    // Global refresh
    dom.btnGlobalRefresh.addEventListener('click', () => refreshAllData(false));

    // Backup actions
    dom.btnExecuteBackup.addEventListener('click', executeBackup);
    dom.btnSaveBackupConfig.addEventListener('click', saveBackupConfig);
    dom.btnTestTgConfig.addEventListener('click', testTelegramPing);
    dom.btnRefreshHistory.addEventListener('click', loadBackupConfigAndHistory);

    // Quick actions on Overview
    dom.btnQuickBackup.addEventListener('click', executeBackup);
    dom.btnQuickTgTest.addEventListener('click', testTelegramPing);
    dom.btnQuickDbCheck.addEventListener('click', async () => {
      try {
        const res = await api('/api/admin/db');
        showToast(`Database healthy: ${res.data.databaseSize}, Pool: ${res.data.connectionPool.totalCount} conns`, 'success');
      } catch (err) {
        showToast(`DB check failed: ${err.message}`, 'error');
      }
    });

    // Users filters & pagination
    dom.userSearchInput.addEventListener('input', debounce(loadUsers, 300));
    dom.userRoleFilter.addEventListener('change', () => { state.usersPage = 1; loadUsers(); });
    dom.userStatusFilter.addEventListener('change', () => { state.usersPage = 1; loadUsers(); });
    dom.btnUsersPrev.addEventListener('click', () => { if (state.usersPage > 1) { state.usersPage--; loadUsers(); } });
    dom.btnUsersNext.addEventListener('click', () => { state.usersPage++; loadUsers(); });

    // Audit search & refresh
    dom.auditSearchInput.addEventListener('input', debounce(loadAuditLogs, 300));
    dom.btnRefreshAudit.addEventListener('click', loadAuditLogs);

    // Modal close
    dom.btnCloseUserModal.addEventListener('click', () => dom.userModal.classList.add('hidden'));
    dom.userModal.addEventListener('click', (e) => {
      if (e.target === dom.userModal) dom.userModal.classList.add('hidden');
    });
  }

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // ─── STARTUP BOOTSTRAP ────────────────────────────────────────────────────
  function start() {
    dom.apiUrlInput.value = state.apiUrl;
    initEventListeners();

    if (state.token && state.user) {
      initDashboard();
    } else {
      dom.authScreen.classList.remove('hidden');
      dom.appContainer.classList.add('hidden');
    }
  }

  document.addEventListener('DOMContentLoaded', start);
})();
