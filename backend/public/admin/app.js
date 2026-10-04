/**
 * EQUIPTRACK ADMIN CONSOLE — CLIENT APPLICATION
 * Minimalist Monochrome Shadcn/Vercel Design System
 */

(function () {
  'use strict';

  // ─── APPLICATION STATE ───────────────────────────────────────────────────
  const state = {
    token: localStorage.getItem('equiptrack_admin_token') || '',
    user: JSON.parse(localStorage.getItem('equiptrack_admin_user') || 'null'),
    apiUrl: localStorage.getItem('equiptrack_api_url') || window.location.origin,
    activeTab: 'tab-overview',
    usersPage: 1,
    usersLimit: 20,
    pollTimer: null,
    machinesListCache: [],
    sectionsListCache: [],
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

    // Overview
    metricTotalUsers: document.getElementById('metricTotalUsers'),
    metricActiveUsers: document.getElementById('metricActiveUsers'),
    metricTotalMachines: document.getElementById('metricTotalMachines'),
    metricTotalSections: document.getElementById('metricTotalSections'),
    metricTotalRecords: document.getElementById('metricTotalRecords'),
    metricDbSize: document.getElementById('metricDbSize'),
    metricDbPool: document.getElementById('metricDbPool'),
    miniAuditList: document.getElementById('miniAuditList'),
    btnQuickBackup: document.getElementById('btnQuickBackup'),
    btnQuickTgTest: document.getElementById('btnQuickTgTest'),
    btnQuickAddUser: document.getElementById('btnQuickAddUser'),
    btnQuickDbCheck: document.getElementById('btnQuickDbCheck'),

    // Users
    usersTbody: document.getElementById('usersTbody'),
    userSearchInput: document.getElementById('userSearchInput'),
    userRoleFilter: document.getElementById('userRoleFilter'),
    userStatusFilter: document.getElementById('userStatusFilter'),
    usersPageInfo: document.getElementById('usersPageInfo'),
    btnUsersPrev: document.getElementById('btnUsersPrev'),
    btnUsersNext: document.getElementById('btnUsersNext'),
    btnOpenAddUserModal: document.getElementById('btnOpenAddUserModal'),

    // Machines
    machinesTbody: document.getElementById('machinesTbody'),
    machineSearchInput: document.getElementById('machineSearchInput'),
    btnOpenAddMachineModal: document.getElementById('btnOpenAddMachineModal'),

    // Sections
    sectionsTbody: document.getElementById('sectionsTbody'),
    btnOpenAddSectionModal: document.getElementById('btnOpenAddSectionModal'),

    // Usage Records
    usageRecordsTbody: document.getElementById('usageRecordsTbody'),
    btnOpenAddRecordModal: document.getElementById('btnOpenAddRecordModal'),

    // Error Logs
    errorLogsTbody: document.getElementById('errorLogsTbody'),
    btnClearAllErrors: document.getElementById('btnClearAllErrors'),
    btnRefreshErrors: document.getElementById('btnRefreshErrors'),

    // Raw Tables
    rawTableSelect: document.getElementById('rawTableSelect'),
    rawTableContainer: document.getElementById('rawTableContainer'),
    btnRefreshRawTable: document.getElementById('btnRefreshRawTable'),

    // Backup & Telegram
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

    // Modals
    modalAddUser: document.getElementById('modalAddUser'),
    formAddUser: document.getElementById('formAddUser'),
    newEmail: document.getElementById('newEmail'),
    newPassword: document.getElementById('newPassword'),
    newRole: document.getElementById('newRole'),

    modalResetPassword: document.getElementById('modalResetPassword'),
    formResetPassword: document.getElementById('formResetPassword'),
    resetUserId: document.getElementById('resetUserId'),
    resetUserEmail: document.getElementById('resetUserEmail'),
    resetPasswordInput: document.getElementById('resetPasswordInput'),

    modalMachine: document.getElementById('modalMachine'),
    modalMachineTitle: document.getElementById('modalMachineTitle'),
    formMachine: document.getElementById('formMachine'),
    machineEditId: document.getElementById('machineEditId'),
    machineNameInput: document.getElementById('machineNameInput'),
    machineDescInput: document.getElementById('machineDescInput'),

    modalSection: document.getElementById('modalSection'),
    modalSectionTitle: document.getElementById('modalSectionTitle'),
    formSection: document.getElementById('formSection'),
    sectionEditId: document.getElementById('sectionEditId'),
    sectionMachineSelect: document.getElementById('sectionMachineSelect'),
    sectionMachineSelectGroup: document.getElementById('sectionMachineSelectGroup'),
    sectionNameInput: document.getElementById('sectionNameInput'),

    modalRecord: document.getElementById('modalRecord'),
    modalRecordTitle: document.getElementById('modalRecordTitle'),
    formRecord: document.getElementById('formRecord'),
    recordEditId: document.getElementById('recordEditId'),
    recordSectionSelect: document.getElementById('recordSectionSelect'),
    recordSectionSelectGroup: document.getElementById('recordSectionSelectGroup'),
    recordNameInput: document.getElementById('recordNameInput'),
    recordDateInput: document.getElementById('recordDateInput'),

    modalDetail: document.getElementById('modalDetail'),
    modalDetailTitle: document.getElementById('modalDetailTitle'),
    modalDetailBody: document.getElementById('modalDetailBody'),
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
        showToast('Session expired. Please sign in again.', 'error');
        logout();
        throw new Error('Unauthorized');
      }

      if (response.status === 403) {
        showToast(data.error?.message || 'Administrator privileges required', 'error');
        throw new Error(data.error?.message || 'Forbidden');
      }

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || `HTTP ${response.status}: Request failed`);
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
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 3500);
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
        throw new Error('Invalid response from authentication service');
      }

      if (res.data.user?.role !== 'admin') {
        throw new Error('Account does not possess administrator role privileges');
      }

      state.token = res.data.token;
      state.user = res.data.user;
      localStorage.setItem('equiptrack_admin_token', state.token);
      localStorage.setItem('equiptrack_admin_user', JSON.stringify(state.user));

      showToast(`Authenticated as ${state.user.email}`, 'success');
      initDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      dom.btnLogin.disabled = false;
      dom.btnLogin.querySelector('.spinner').classList.add('hidden');
      dom.btnLogin.querySelector('.btn-text').textContent = 'Authenticate';
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

  // ─── DASHBOARD INIT ───────────────────────────────────────────────────────
  function initDashboard() {
    dom.authScreen.classList.add('hidden');
    dom.appContainer.classList.remove('hidden');

    dom.sidebarUserEmail.textContent = state.user?.email || 'admin@equiptrack.com';
    dom.sidebarAvatar.textContent = (state.user?.email || 'A')[0].toUpperCase();

    const isLocal = state.apiUrl.includes('localhost') || state.apiUrl.includes('127.0.0.1');
    dom.envBadge.textContent = isLocal ? 'LOCAL' : 'PRODUCTION';

    refreshCurrentTab();

    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(() => {
      if (!document.hidden && state.token) {
        refreshCurrentTab(true);
      }
    }, 30000);
  }

  function refreshCurrentTab(silent = false) {
    loadOverviewMetrics();
    if (state.activeTab === 'tab-overview') loadOverviewMetrics();
    if (state.activeTab === 'tab-users') loadUsers();
    if (state.activeTab === 'tab-machines') loadMachines();
    if (state.activeTab === 'tab-sections') loadSections();
    if (state.activeTab === 'tab-usage-records') loadUsageRecords();
    if (state.activeTab === 'tab-error-logs') loadErrorLogs();
    if (state.activeTab === 'tab-tables') loadRawTableData();
    if (state.activeTab === 'tab-backup') loadBackupConfigAndHistory();
    if (state.activeTab === 'tab-audit') loadAuditLogs();
    if (state.activeTab === 'tab-system') loadSystemAndDbStats();

    if (!silent) showToast('Data refreshed', 'info');
  }

  // ─── 1. OVERVIEW METRICS ──────────────────────────────────────────────────
  async function loadOverviewMetrics() {
    try {
      const [dbRes, recRes] = await Promise.all([
        api('/api/admin/db'),
        api('/api/admin/usage-records?limit=1').catch(() => ({ pagination: { total: 0 } })),
      ]);

      if (dbRes.data) {
        const tables = dbRes.data.tables || [];
        const uRow = tables.find(t => t.table_name === 'users');
        const mRow = tables.find(t => t.table_name === 'machines');
        const sRow = tables.find(t => t.table_name === 'sections');

        dom.metricTotalUsers.textContent = uRow ? uRow.row_count : '—';
        dom.metricTotalMachines.textContent = mRow ? mRow.row_count : '—';
        dom.metricTotalSections.textContent = `${sRow?.row_count || 0} components`;
        dom.metricTotalRecords.textContent = recRes.pagination?.total ?? '—';
        dom.metricDbSize.textContent = dbRes.data.databaseSize || '—';
        dom.metricDbPool.textContent = `Pool: ${dbRes.data.connectionPool?.totalCount || 0} connections`;
      }

      // Load mini audit list
      const auditRes = await api('/api/admin/audit-logs?limit=5');
      if (auditRes.data && dom.miniAuditList) {
        dom.miniAuditList.innerHTML = auditRes.data.map(l => `
          <div class="mini-item">
            <div>
              <span class="font-mono font-medium">${escapeHtml(l.action)}</span>
              <span class="text-muted text-xs ml-2">${escapeHtml(l.user_email || 'system')}</span>
            </div>
            <span class="text-dim text-xs font-mono">${formatDate(l.created_at)}</span>
          </div>
        `).join('') || '<div class="empty-state">No audit logs recorded yet</div>';
      }
    } catch (err) {
      console.warn('Overview load error:', err);
    }
  }

  // ─── 2. USERS MANAGEMENT (CRUD) ───────────────────────────────────────────
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
      dom.usersTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No users found</td></tr>';
      return;
    }

    dom.usersTbody.innerHTML = users.map(u => `
      <tr data-user-id="${u.id}">
        <td class="font-medium">${escapeHtml(u.email)}</td>
        <td><span class="tag ${u.role === 'admin' ? 'tag-warn' : ''}">${u.role}</span></td>
        <td><span class="tag ${u.status === 'active' ? 'tag-success' : 'tag-danger'}">${u.status}</span></td>
        <td class="text-sm text-muted font-mono">${formatDate(u.created_at)}</td>
        <td><button class="btn btn-link btn-view-user" data-id="${u.id}">View Activity →</button></td>
        <td class="text-right">
          <div class="action-bar" style="justify-content: flex-end;">
            <button class="btn btn-outline btn-sm btn-user-pwd" data-id="${u.id}" data-email="${escapeHtml(u.email)}">Password</button>
            <button class="btn btn-outline btn-sm btn-user-role" data-id="${u.id}" data-role="${u.role}">${u.role === 'admin' ? 'Demote' : 'Make Admin'}</button>
            <button class="btn btn-outline btn-sm btn-user-status" data-id="${u.id}" data-status="${u.status}">${u.status === 'active' ? 'Suspend' : 'Activate'}</button>
            <button class="btn btn-danger btn-sm btn-user-del" data-id="${u.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    dom.usersTbody.querySelectorAll('.btn-view-user').forEach(b => b.addEventListener('click', () => viewUserActivity(b.dataset.id)));
    dom.usersTbody.querySelectorAll('.btn-user-pwd').forEach(b => b.addEventListener('click', () => openResetPasswordModal(b.dataset.id, b.dataset.email)));
    dom.usersTbody.querySelectorAll('.btn-user-role').forEach(b => b.addEventListener('click', () => toggleUserRole(b.dataset.id, b.dataset.role)));
    dom.usersTbody.querySelectorAll('.btn-user-status').forEach(b => b.addEventListener('click', () => toggleUserStatus(b.dataset.id, b.dataset.status)));
    dom.usersTbody.querySelectorAll('.btn-user-del').forEach(b => b.addEventListener('click', () => deleteUser(b.dataset.id)));
  }

  async function createUser() {
    const email = dom.newEmail.value.trim();
    const password = dom.newPassword.value;
    const role = dom.newRole.value;

    try {
      await api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      });
      showToast(`User account created: ${email}`, 'success');
      closeAllModals();
      loadUsers();
      loadOverviewMetrics();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function openResetPasswordModal(userId, email) {
    dom.resetUserId.value = userId;
    dom.resetUserEmail.textContent = email;
    dom.resetPasswordInput.value = '';
    dom.modalResetPassword.classList.remove('hidden');
  }

  async function submitResetPassword() {
    const userId = dom.resetUserId.value;
    const password = dom.resetPasswordInput.value;

    try {
      await api(`/api/admin/users/${userId}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      });
      showToast('Password updated successfully', 'success');
      closeAllModals();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function toggleUserRole(userId, currentRole) {
    const targetRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Change role to ${targetRole.toUpperCase()}?`)) return;

    try {
      await api(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: targetRole }),
      });
      showToast(`Role updated to ${targetRole}`, 'success');
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function toggleUserStatus(userId, currentStatus) {
    const targetStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!confirm(`Change account status to ${targetStatus.toUpperCase()}?`)) return;

    try {
      await api(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus }),
      });
      showToast(`Status updated to ${targetStatus}`, 'success');
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function deleteUser(userId) {
    if (!confirm('Are you sure you want to permanently delete this user and their workspace entities?')) return;

    try {
      await api(`/api/admin/users/${userId}`, { method: 'DELETE' });
      showToast('User deleted successfully', 'success');
      loadUsers();
      loadOverviewMetrics();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function viewUserActivity(userId) {
    try {
      const res = await api(`/api/admin/users/${userId}/activity`);
      const { user, activity } = res.data;
      openDetailModal(`User Activity: ${user.email}`, {
        user,
        summary: {
          machineCount: activity.machineCount,
          sectionCount: activity.sectionCount,
          usageRecordCount: activity.usageRecordCount,
        },
        recentAuditLogs: activity.recentAuditLogs,
      });
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ─── 3. MACHINES CRUD ─────────────────────────────────────────────────────
  async function loadMachines() {
    const search = dom.machineSearchInput.value.trim();
    let url = '/api/admin/machines?limit=100';
    if (search) url += `&search=${encodeURIComponent(search)}`;

    try {
      const res = await api(url);
      state.machinesListCache = res.data || [];
      renderMachines(state.machinesListCache);
    } catch (err) {
      console.warn('Machine load error:', err);
    }
  }

  function renderMachines(machines) {
    if (machines.length === 0) {
      dom.machinesTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No machines found</td></tr>';
      return;
    }

    dom.machinesTbody.innerHTML = machines.map(m => `
      <tr>
        <td class="font-medium">${escapeHtml(m.name)}</td>
        <td class="text-muted text-sm">${escapeHtml(m.description || '—')}</td>
        <td class="text-sm">${escapeHtml(m.owner_email || '—')}</td>
        <td class="font-mono"><span class="tag">${m.section_count || 0}</span></td>
        <td class="text-sm text-muted font-mono">${formatDate(m.created_at)}</td>
        <td class="text-right">
          <div class="action-bar" style="justify-content: flex-end;">
            <button class="btn btn-outline btn-sm btn-edit-machine" data-id="${m.id}" data-name="${escapeHtml(m.name)}" data-desc="${escapeHtml(m.description || '')}">Edit</button>
            <button class="btn btn-danger btn-sm btn-del-machine" data-id="${m.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    dom.machinesTbody.querySelectorAll('.btn-edit-machine').forEach(b => {
      b.addEventListener('click', () => openMachineModal(b.dataset.id, b.dataset.name, b.dataset.desc));
    });
    dom.machinesTbody.querySelectorAll('.btn-del-machine').forEach(b => {
      b.addEventListener('click', () => deleteMachine(b.dataset.id));
    });
  }

  function openMachineModal(id = '', name = '', desc = '') {
    dom.machineEditId.value = id;
    dom.machineNameInput.value = name;
    dom.machineDescInput.value = desc;
    dom.modalMachineTitle.textContent = id ? 'Edit Machine' : 'Add Machine';
    dom.modalMachine.classList.remove('hidden');
  }

  async function saveMachine() {
    const id = dom.machineEditId.value;
    const name = dom.machineNameInput.value.trim();
    const description = dom.machineDescInput.value.trim();

    try {
      if (id) {
        await api(`/api/admin/machines/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, description }),
        });
        showToast('Machine updated', 'success');
      } else {
        await api('/api/admin/machines', {
          method: 'POST',
          body: JSON.stringify({ name, description }),
        });
        showToast('Machine created', 'success');
      }
      closeAllModals();
      loadMachines();
      loadOverviewMetrics();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function deleteMachine(id) {
    if (!confirm('Are you sure you want to delete this machine and all its components?')) return;
    try {
      await api(`/api/admin/machines/${id}`, { method: 'DELETE' });
      showToast('Machine deleted', 'success');
      loadMachines();
      loadOverviewMetrics();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ─── 4. COMPONENTS / SECTIONS CRUD ────────────────────────────────────────
  async function loadSections() {
    try {
      const res = await api('/api/admin/sections?limit=100');
      state.sectionsListCache = res.data || [];
      renderSections(state.sectionsListCache);
    } catch (err) {
      console.warn('Section load error:', err);
    }
  }

  function renderSections(sections) {
    if (sections.length === 0) {
      dom.sectionsTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No components found</td></tr>';
      return;
    }

    dom.sectionsTbody.innerHTML = sections.map(s => `
      <tr>
        <td class="font-medium">${escapeHtml(s.name)}</td>
        <td class="text-sm font-mono">${escapeHtml(s.machine_name || '—')}</td>
        <td class="font-mono"><span class="tag">${s.record_count || 0}</span></td>
        <td class="text-sm text-muted font-mono">${formatDate(s.created_at)}</td>
        <td class="text-right">
          <div class="action-bar" style="justify-content: flex-end;">
            <button class="btn btn-outline btn-sm btn-edit-section" data-id="${s.id}" data-name="${escapeHtml(s.name)}">Edit</button>
            <button class="btn btn-danger btn-sm btn-del-section" data-id="${s.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    dom.sectionsTbody.querySelectorAll('.btn-edit-section').forEach(b => {
      b.addEventListener('click', () => openSectionModal(b.dataset.id, b.dataset.name));
    });
    dom.sectionsTbody.querySelectorAll('.btn-del-section').forEach(b => {
      b.addEventListener('click', () => deleteSection(b.dataset.id));
    });
  }

  async function openSectionModal(id = '', name = '') {
    dom.sectionEditId.value = id;
    dom.sectionNameInput.value = name;
    dom.modalSectionTitle.textContent = id ? 'Edit Component' : 'Add Component';

    if (!id) {
      dom.sectionMachineSelectGroup.classList.remove('hidden');
      if (state.machinesListCache.length === 0) await loadMachines();
      dom.sectionMachineSelect.innerHTML = state.machinesListCache.map(m => `
        <option value="${m.id}">${escapeHtml(m.name)}</option>
      `).join('');
    } else {
      dom.sectionMachineSelectGroup.classList.add('hidden');
    }

    dom.modalSection.classList.remove('hidden');
  }

  async function saveSection() {
    const id = dom.sectionEditId.value;
    const name = dom.sectionNameInput.value.trim();

    try {
      if (id) {
        await api(`/api/admin/sections/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name }),
        });
        showToast('Component updated', 'success');
      } else {
        const machineId = dom.sectionMachineSelect.value;
        await api('/api/admin/sections', {
          method: 'POST',
          body: JSON.stringify({ machineId, name }),
        });
        showToast('Component created', 'success');
      }
      closeAllModals();
      loadSections();
      loadOverviewMetrics();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function deleteSection(id) {
    if (!confirm('Are you sure you want to delete this component and its usage records?')) return;
    try {
      await api(`/api/admin/sections/${id}`, { method: 'DELETE' });
      showToast('Component deleted', 'success');
      loadSections();
      loadOverviewMetrics();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ─── 5. USAGE RECORDS CRUD ────────────────────────────────────────────────
  async function loadUsageRecords() {
    try {
      const res = await api('/api/admin/usage-records?limit=100');
      renderUsageRecords(res.data || []);
    } catch (err) {
      console.warn('Usage records error:', err);
    }
  }

  function renderUsageRecords(records) {
    if (records.length === 0) {
      dom.usageRecordsTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No usage records found</td></tr>';
      return;
    }

    dom.usageRecordsTbody.innerHTML = records.map(r => `
      <tr>
        <td class="font-medium">${escapeHtml(r.name)}</td>
        <td class="font-mono text-sm">${escapeHtml(r.usage_date)}</td>
        <td class="text-sm">${escapeHtml(r.section_name || '—')}</td>
        <td class="text-sm text-muted">${escapeHtml(r.machine_name || '—')}</td>
        <td class="text-xs text-dim font-mono">${escapeHtml(r.creator_email || '—')}</td>
        <td class="text-right">
          <div class="action-bar" style="justify-content: flex-end;">
            <button class="btn btn-outline btn-sm btn-edit-record" data-id="${r.id}" data-name="${escapeHtml(r.name)}" data-date="${r.usage_date}">Edit</button>
            <button class="btn btn-danger btn-sm btn-del-record" data-id="${r.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    dom.usageRecordsTbody.querySelectorAll('.btn-edit-record').forEach(b => {
      b.addEventListener('click', () => openRecordModal(b.dataset.id, b.dataset.name, b.dataset.date));
    });
    dom.usageRecordsTbody.querySelectorAll('.btn-del-record').forEach(b => {
      b.addEventListener('click', () => deleteRecord(b.dataset.id));
    });
  }

  async function openRecordModal(id = '', name = '', date = '') {
    dom.recordEditId.value = id;
    dom.recordNameInput.value = name;
    dom.recordDateInput.value = date || new Date().toISOString().split('T')[0];
    dom.modalRecordTitle.textContent = id ? 'Edit Record' : 'Add Record';

    if (!id) {
      dom.recordSectionSelectGroup.classList.remove('hidden');
      if (state.sectionsListCache.length === 0) await loadSections();
      dom.recordSectionSelect.innerHTML = state.sectionsListCache.map(s => `
        <option value="${s.id}">${escapeHtml(s.machine_name || '')} → ${escapeHtml(s.name)}</option>
      `).join('');
    } else {
      dom.recordSectionSelectGroup.classList.add('hidden');
    }

    dom.modalRecord.classList.remove('hidden');
  }

  async function saveRecord() {
    const id = dom.recordEditId.value;
    const name = dom.recordNameInput.value.trim();
    const usageDate = dom.recordDateInput.value;

    try {
      if (id) {
        await api(`/api/admin/usage-records/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, usageDate }),
        });
        showToast('Record updated', 'success');
      } else {
        const sectionId = dom.recordSectionSelect.value;
        await api('/api/admin/usage-records', {
          method: 'POST',
          body: JSON.stringify({ sectionId, name, usageDate }),
        });
        showToast('Record created', 'success');
      }
      closeAllModals();
      loadUsageRecords();
      loadOverviewMetrics();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function deleteRecord(id) {
    if (!confirm('Are you sure you want to delete this usage record?')) return;
    try {
      await api(`/api/admin/usage-records/${id}`, { method: 'DELETE' });
      showToast('Record deleted', 'success');
      loadUsageRecords();
      loadOverviewMetrics();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ─── 6. ERROR LOGS ────────────────────────────────────────────────────────
  async function loadErrorLogs() {
    try {
      const res = await api('/api/admin/error-logs?limit=50');
      renderErrorLogs(res.data || []);
    } catch (err) {
      console.warn('Error logs error:', err);
    }
  }

  function renderErrorLogs(logs) {
    if (logs.length === 0) {
      dom.errorLogsTbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No error logs recorded</td></tr>';
      return;
    }

    dom.errorLogsTbody.innerHTML = logs.map(l => `
      <tr>
        <td class="font-mono text-xs text-muted">${formatDate(l.created_at)}</td>
        <td><span class="tag ${l.level === 'error' ? 'tag-danger' : 'tag-warn'}">${l.level}</span></td>
        <td class="font-mono text-xs">${escapeHtml(l.source || 'server')}</td>
        <td class="font-mono text-xs">${escapeHtml(l.endpoint || '—')}</td>
        <td class="font-mono text-xs">${l.status_code || '—'}</td>
        <td class="text-sm font-medium" style="max-width: 300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${escapeHtml(l.message)}
        </td>
        <td class="text-right">
          <div class="action-bar" style="justify-content: flex-end;">
            <button class="btn btn-outline btn-sm btn-error-stack" data-id="${l.id}">Details</button>
            <button class="btn btn-danger btn-sm btn-del-error" data-id="${l.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    dom.errorLogsTbody.querySelectorAll('.btn-error-stack').forEach(b => {
      b.addEventListener('click', () => {
        const log = logs.find(item => item.id === b.dataset.id);
        if (log) {
          openDetailModal(`Error Log: ${log.endpoint || log.message}`, log);
        }
      });
    });

    dom.errorLogsTbody.querySelectorAll('.btn-del-error').forEach(b => {
      b.addEventListener('click', async () => {
        try {
          await api(`/api/admin/error-logs/${b.dataset.id}`, { method: 'DELETE' });
          showToast('Error log deleted', 'success');
          loadErrorLogs();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }

  async function clearAllErrors() {
    if (!confirm('Clear all error logs permanently?')) return;
    try {
      await api('/api/admin/error-logs', { method: 'DELETE' });
      showToast('All error logs cleared', 'success');
      loadErrorLogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ─── 7. RAW TABLE DATA EXPLORER ───────────────────────────────────────────
  async function loadRawTableData() {
    const table = dom.rawTableSelect.value;
    dom.rawTableContainer.innerHTML = '<div class="empty-state">Loading table data...</div>';

    try {
      const res = await api(`/api/admin/tables/${table}?limit=30`);
      const rows = res.data || [];
      if (rows.length === 0) {
        dom.rawTableContainer.innerHTML = `<div class="empty-state">Table "${table}" is empty (0 rows).</div>`;
        return;
      }

      const columns = Object.keys(rows[0]);
      let html = `
        <div class="p-2 text-xs text-muted font-mono mb-2">
          Table: <strong>${table}</strong> | Showing ${rows.length} of ${res.pagination?.total || rows.length} records
        </div>
        <table class="table table-sm">
          <thead>
            <tr>${columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr>
          </thead>
          <tbody>
      `;

      for (const row of rows) {
        html += '<tr>';
        for (const col of columns) {
          let val = row[col];
          if (val === null || val === undefined) val = '<span class="text-dim">NULL</span>';
          else if (typeof val === 'object') val = escapeHtml(JSON.stringify(val));
          else val = escapeHtml(String(val));
          html += `<td class="font-mono text-xs">${val}</td>`;
        }
        html += '</tr>';
      }

      html += '</tbody></table>';
      dom.rawTableContainer.innerHTML = html;
    } catch (err) {
      dom.rawTableContainer.innerHTML = `<div class="empty-state text-danger">Error: ${escapeHtml(err.message)}</div>`;
    }
  }

  // ─── 8. TELEGRAM & BACKUP HUB ─────────────────────────────────────────────
  async function loadBackupConfigAndHistory() {
    try {
      const [confRes, histRes] = await Promise.all([
        api('/api/admin/backup/config'),
        api('/api/admin/backup/history?limit=25'),
      ]);

      if (confRes.data) {
        const c = confRes.data;
        dom.configCron.value = c.cron || '0 2 * * *';
        dom.configTz.value = c.timezone || 'Asia/Kolkata';
        dom.configRetention.value = c.retentionDays || 30;
        dom.configDefaultFormat.value = c.format || 'sql';
        dom.configSchedulerEnabled.checked = !!c.enabled;

        if (c.telegramChatId) {
          dom.tgChannelName.textContent = `Chat ID: ${c.telegramChatId} (Active)`;
        } else {
          dom.tgChannelName.textContent = 'Channel connected via bot credentials';
        }
      }

      if (histRes.data && Array.isArray(histRes.data)) {
        renderBackupHistory(histRes.data);
      }
    } catch (err) {
      console.warn('Backup load error:', err);
    }
  }

  function renderBackupHistory(items) {
    if (items.length === 0) {
      dom.backupHistoryTbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No backup records found</td></tr>';
      return;
    }

    dom.backupHistoryTbody.innerHTML = items.map(item => `
      <tr>
        <td class="font-mono text-sm">${formatDate(item.created_at)}</td>
        <td><span class="tag ${item.status === 'success' ? 'tag-success' : 'tag-danger'}">${item.status}</span></td>
        <td class="font-mono text-xs uppercase">${item.format}</td>
        <td class="font-mono text-sm">${item.file_size_bytes ? formatBytes(item.file_size_bytes) : '—'}</td>
        <td><span class="tag ${item.telegram_status === 'sent' ? 'tag-success' : ''}">${item.telegram_status || 'NONE'}</span></td>
        <td class="text-sm text-muted">${item.triggered_by || 'manual'}</td>
        <td class="font-mono text-xs text-dim">${item.checksum ? item.checksum.substring(0, 16) + '...' : '—'}</td>
      </tr>
    `).join('');
  }

  async function executeBackup() {
    const format = dom.backupFormatSelect.value;
    const sendToTelegram = dom.backupSendTgCheck.checked;

    dom.btnExecuteBackup.disabled = true;
    showToast(`Generating ${format.toUpperCase()} backup...`, 'info');

    try {
      const res = await api('/api/admin/backup/run', {
        method: 'POST',
        body: JSON.stringify({ format, sendToTelegram }),
      });

      showToast(`Backup created! Telegram: ${res.data.telegram}`, 'success');
      loadBackupConfigAndHistory();
    } catch (err) {
      showToast(`Backup error: ${err.message}`, 'error');
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
      showToast('Scheduler configuration saved', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      dom.btnSaveBackupConfig.disabled = false;
    }
  }

  async function testTelegramPing() {
    showToast('Sending test message to Telegram...', 'info');
    try {
      const res = await api('/api/admin/backup/telegram/test', { method: 'POST' });
      showToast(`Telegram Ping Succeeded: ${res.message}`, 'success');
    } catch (err) {
      showToast(`Telegram Ping Failed: ${err.message}`, 'error');
    }
  }

  // ─── 9. AUDIT TRAIL ───────────────────────────────────────────────────────
  async function loadAuditLogs() {
    try {
      const res = await api('/api/admin/audit-logs?limit=50');
      const logs = res.data || [];
      renderAuditLogs(logs);
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
      dom.auditTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No audit logs found</td></tr>';
      return;
    }

    dom.auditTbody.innerHTML = filtered.map(l => `
      <tr>
        <td class="font-mono text-xs text-muted">${formatDate(l.created_at)}</td>
        <td><span class="tag font-mono">${escapeHtml(l.action)}</span></td>
        <td class="text-sm font-medium">${escapeHtml(l.user_email || 'System')}</td>
        <td class="font-mono text-xs text-dim">${escapeHtml(l.ip_address || '—')}</td>
        <td class="font-mono text-xs text-dim">${escapeHtml(JSON.stringify(l.metadata || l.details || {}))}</td>
      </tr>
    `).join('');
  }

  // ─── 10. SYSTEM & DB STATS ────────────────────────────────────────────────
  async function loadSystemAndDbStats() {
    try {
      const [sysRes, dbRes] = await Promise.all([
        api('/api/admin/system'),
        api('/api/admin/db'),
      ]);

      if (sysRes.data) {
        const s = sysRes.data;
        dom.sysApp.textContent = s.application || 'EquipTrack Backend';
        dom.sysNode.textContent = s.nodeVersion || '—';
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
        `).join('');
      }
    } catch (err) {
      console.warn('System/DB load error:', err);
    }
  }

  // ─── MODAL CONTROLS ───────────────────────────────────────────────────────
  function openDetailModal(title, data) {
    dom.modalDetailTitle.textContent = title;
    dom.modalDetailBody.innerHTML = `<pre class="code-block">${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
    dom.modalDetail.classList.remove('hidden');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
  }

  // ─── FORMATTERS ───────────────────────────────────────────────────────────
  function formatDate(d) {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'medium' });
    } catch {
      return d;
    }
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

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // ─── EVENT LISTENERS ──────────────────────────────────────────────────────
  function initEventListeners() {
    // Toggle password view
    dom.togglePwdBtn.addEventListener('click', () => {
      const type = dom.loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
      dom.loginPassword.setAttribute('type', type);
      dom.togglePwdBtn.textContent = type === 'password' ? 'Show' : 'Hide';
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

    // Global refresh
    dom.btnGlobalRefresh.addEventListener('click', () => refreshCurrentTab(false));

    // Nav tabs
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        const pane = document.getElementById(target);
        if (pane) pane.classList.add('active');

        state.activeTab = target;
        dom.pageTitle.textContent = btn.querySelector('span:last-child').textContent;
        refreshCurrentTab(true);
      });
    });

    // Quick links
    document.querySelectorAll('[data-tab-target]').forEach(link => {
      link.addEventListener('click', () => {
        const targetTab = link.dataset.tabTarget;
        const navBtn = document.querySelector(`.nav-item[data-tab="${targetTab}"]`);
        if (navBtn) navBtn.click();
      });
    });

    // Overview Quick actions
    dom.btnQuickBackup.addEventListener('click', executeBackup);
    dom.btnQuickTgTest.addEventListener('click', testTelegramPing);
    dom.btnQuickAddUser.addEventListener('click', () => {
      dom.modalAddUser.classList.remove('hidden');
    });
    dom.btnQuickDbCheck.addEventListener('click', async () => {
      try {
        const res = await api('/api/admin/db');
        showToast(`Database healthy: ${res.data.databaseSize}, Pool: ${res.data.connectionPool.totalCount} conns`, 'success');
      } catch (err) {
        showToast(`DB check failed: ${err.message}`, 'error');
      }
    });

    // User buttons & search
    dom.btnOpenAddUserModal.addEventListener('click', () => {
      dom.newEmail.value = '';
      dom.newPassword.value = '';
      dom.modalAddUser.classList.remove('hidden');
    });
    dom.formAddUser.addEventListener('submit', createUser);
    dom.formResetPassword.addEventListener('submit', submitResetPassword);

    dom.userSearchInput.addEventListener('input', debounce(loadUsers, 300));
    dom.userRoleFilter.addEventListener('change', () => { state.usersPage = 1; loadUsers(); });
    dom.userStatusFilter.addEventListener('change', () => { state.usersPage = 1; loadUsers(); });
    dom.btnUsersPrev.addEventListener('click', () => { if (state.usersPage > 1) { state.usersPage--; loadUsers(); } });
    dom.btnUsersNext.addEventListener('click', () => { state.usersPage++; loadUsers(); });

    // Machines
    dom.btnOpenAddMachineModal.addEventListener('click', () => openMachineModal());
    dom.formMachine.addEventListener('submit', saveMachine);
    dom.machineSearchInput.addEventListener('input', debounce(loadMachines, 300));

    // Sections
    dom.btnOpenAddSectionModal.addEventListener('click', () => openSectionModal());
    dom.formSection.addEventListener('submit', saveSection);

    // Records
    dom.btnOpenAddRecordModal.addEventListener('click', () => openRecordModal());
    dom.formRecord.addEventListener('submit', saveRecord);

    // Errors
    dom.btnClearAllErrors.addEventListener('click', clearAllErrors);
    dom.btnRefreshErrors.addEventListener('click', loadErrorLogs);

    // Raw Tables
    dom.rawTableSelect.addEventListener('change', loadRawTableData);
    dom.btnRefreshRawTable.addEventListener('click', loadRawTableData);

    // Backups & Telegram
    dom.btnExecuteBackup.addEventListener('click', executeBackup);
    dom.btnSaveBackupConfig.addEventListener('click', saveBackupConfig);
    dom.btnTestTgConfig.addEventListener('click', testTelegramPing);
    dom.btnRefreshHistory.addEventListener('click', loadBackupConfigAndHistory);

    // Audit
    dom.auditSearchInput.addEventListener('input', debounce(loadAuditLogs, 300));
    dom.btnRefreshAudit.addEventListener('click', loadAuditLogs);

    // Close modals
    document.querySelectorAll('[data-close-modal]').forEach(b => {
      b.addEventListener('click', closeAllModals);
    });
    document.querySelectorAll('.modal-backdrop').forEach(m => {
      m.addEventListener('click', (e) => {
        if (e.target === m) closeAllModals();
      });
    });
  }

  // ─── STARTUP ──────────────────────────────────────────────────────────────
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
