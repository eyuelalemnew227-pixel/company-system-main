document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'api.php';

  // Navigation Tabs
  const navLinks = document.querySelectorAll('.nav-link');
  const tabContents = document.querySelectorAll('.tab-content');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute('data-tab');

      navLinks.forEach(l => l.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      link.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.add('active');

      document.getElementById('page-title').textContent = link.textContent.trim();

      loadTabData(targetTab);
    });
  });

  function loadTabData(tab) {
    switch (tab) {
      case 'overview':
        loadStats();
        loadRecentComms();
        break;
      case 'communications':
        loadCommunications();
        break;
      case 'users':
        loadUsers();
        break;
      case 'bindings':
        loadBindings();
        break;
      case 'config':
        loadConfig();
        break;
    }
  }

  // Toast Notifications
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : '⚠️'}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Generic Modal Handling
  window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  };

  window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  };

  // API Wrapper
  async function apiCall(action, method = 'GET', data = null) {
    let url = `${API_BASE}?action=${action}`;
    const options = { method, headers: {} };

    if (method === 'POST' && data) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    } else if (data && method === 'GET') {
      const params = new URLSearchParams(data).toString();
      url += `&${params}`;
    }

    try {
      const res = await fetch(url, options);
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'API request failed');
      }
      return json.data !== undefined ? json.data : json;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  }

  // 1. Stats & Overview
  async function loadStats() {
    try {
      const data = await apiCall('stats');
      document.getElementById('stat-total-comms').textContent = data.total_communications || 0;
      document.getElementById('stat-recorded-comms').textContent = data.recorded_communications || 0;
      document.getElementById('stat-forwarded-comms').textContent = data.forwarded_communications || 0;
      document.getElementById('stat-responded-comms').textContent = data.responded_communications || 0;
      document.getElementById('stat-total-users').textContent = data.total_users || 0;
      document.getElementById('stat-total-bindings').textContent = data.total_bindings || 0;
    } catch (err) {
      console.error(err);
    }
  }

  async function loadRecentComms() {
    const tbody = document.getElementById('recent-comms-tbody');
    tbody.innerHTML = '<tr><td colspan="6">Loading recent communications...</td></tr>';
    try {
      const comms = await apiCall('communications', 'GET', { limit: 5 });
      if (!comms || comms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No recent communication records found.</td></tr>';
        return;
      }

      tbody.innerHTML = comms.map(r => `
        <tr>
          <td><strong>${r.referenceNo}</strong></td>
          <td>${r.region}</td>
          <td>${r.branchName || 'Unassigned'}</td>
          <td>${r.topicName} <span class="text-muted">(${r.department})</span></td>
          <td><span class="badge badge-${r.status}">${r.status}</span></td>
          <td>${new Date(r.createdAt).toLocaleString()}</td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6">Error loading data.</td></tr>';
    }
  }

  // 2. Communications Tab
  const filterForm = document.getElementById('comms-filter-form');
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      loadCommunications();
    });
  }

  async function loadCommunications() {
    const tbody = document.getElementById('comms-tbody');
    tbody.innerHTML = '<tr><td colspan="7">Loading communication records...</td></tr>';

    const params = {
      q: document.getElementById('comm-search').value,
      status: document.getElementById('comm-status-filter').value,
      region: document.getElementById('comm-region-filter').value,
      limit: 50
    };

    try {
      const records = await apiCall('communications', 'GET', params);
      if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No matching communication records found.</td></tr>';
        return;
      }

      tbody.innerHTML = records.map(r => `
        <tr>
          <td><strong>${r.referenceNo}</strong></td>
          <td>${r.region}</td>
          <td>${r.branchName || 'Unassigned'}</td>
          <td>${r.topicName} <br><small style="color:var(--text-muted)">Dept: ${r.department}</small></td>
          <td>${r.senderDisplayName}</td>
          <td>
            <select class="status-select" data-ref="${r.referenceNo}" onchange="changeCommStatus('${r.referenceNo}', this.value)">
              <option value="recorded" ${r.status === 'recorded' ? 'selected' : ''}>Recorded</option>
              <option value="forwarded" ${r.status === 'forwarded' ? 'selected' : ''}>Forwarded</option>
              <option value="responded" ${r.status === 'responded' ? 'selected' : ''}>Responded</option>
            </select>
          </td>
          <td>${new Date(r.createdAt).toLocaleString()}</td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="7">Failed to load communications.</td></tr>';
    }
  }

  window.changeCommStatus = async function (refNo, newStatus) {
    try {
      await apiCall('update_communication_status', 'POST', { referenceNo: refNo, status: newStatus });
      showToast(`Updated ${refNo} status to ${newStatus}`);
      loadStats();
    } catch (err) {
      loadCommunications();
    }
  };

  // 3. User Management Tab
  async function loadUsers() {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '<tr><td colspan="6">Loading users...</td></tr>';
    try {
      const users = await apiCall('users');
      if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No registered users found.</td></tr>';
        return;
      }

      tbody.innerHTML = users.map(u => `
        <tr>
          <td><strong>${u.displayName}</strong><br><small style="color:var(--text-muted)">ID: ${u.telegramUserId}</small></td>
          <td><span class="badge badge-role">${formatRole(u.role)}</span></td>
          <td>${u.region || '—'}</td>
          <td>${u.branchName || u.department || '—'}</td>
          <td>${u.canForward ? '✅ Yes' : '❌ No'}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.telegramUserId}, '${u.displayName}')">Delete</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6">Failed to load users.</td></tr>';
    }
  }

  function formatRole(role) {
    switch (role) {
      case 'branch_manager': return 'Branch Manager';
      case 'regional_manager': return 'Regional Manager';
      case 'department_head': return 'Department Head';
      case 'operations_director': return 'Operations Director';
      default: return role;
    }
  }

  const userForm = document.getElementById('user-form');
  if (userForm) {
    userForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        telegramUserId: parseInt(document.getElementById('user-id').value, 10),
        displayName: document.getElementById('user-name').value,
        role: document.getElementById('user-role').value,
        region: document.getElementById('user-region').value,
        branchName: document.getElementById('user-branch').value,
        department: document.getElementById('user-dept').value,
        canForward: document.getElementById('user-can-forward').checked
      };

      try {
        await apiCall('save_user', 'POST', payload);
        showToast('User saved successfully');
        closeModal('modal-user');
        userForm.reset();
        loadUsers();
        loadStats();
      } catch (err) {}
    });
  }

  window.deleteUser = async function (id, name) {
    if (!confirm(`Are you sure you want to delete registration for ${name}?`)) return;
    try {
      await apiCall('delete_user', 'POST', { telegramUserId: id });
      showToast(`User ${name} deleted.`);
      loadUsers();
      loadStats();
    } catch (err) {}
  };

  // 4. Topic Bindings Tab
  async function loadBindings() {
    const container = document.getElementById('bindings-container');
    container.innerHTML = '<p>Loading topic bindings...</p>';
    try {
      const bindings = await apiCall('bindings');
      if (!bindings || bindings.length === 0) {
        container.innerHTML = '<p class="text-muted">No topic bindings configured yet.</p>';
        return;
      }

      container.innerHTML = bindings.map(b => `
        <div class="binding-card">
          <div class="binding-header">
            <div>
              <div class="binding-topic">${b.topicName}</div>
              <div class="binding-dept">Department: <strong>${b.department}</strong></div>
            </div>
            <span class="badge badge-role">${b.groupKey}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:0.75rem;">
            <small style="color:var(--text-muted)">Thread ID: ${b.threadId}</small>
            <button class="btn btn-danger btn-sm" onclick="deleteBinding('${b.groupKey}', ${b.threadId})">Remove</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = '<p class="text-muted">Failed to load topic bindings.</p>';
    }
  }

  const bindingForm = document.getElementById('binding-form');
  if (bindingForm) {
    bindingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        groupKey: document.getElementById('bind-group-key').value,
        threadId: parseInt(document.getElementById('bind-thread-id').value, 10),
        topicName: document.getElementById('bind-topic-name').value,
        department: document.getElementById('bind-dept').value
      };

      try {
        await apiCall('save_binding', 'POST', payload);
        showToast('Topic binding saved.');
        closeModal('modal-binding');
        bindingForm.reset();
        loadBindings();
        loadStats();
      } catch (err) {}
    });
  }

  window.deleteBinding = async function (groupKey, threadId) {
    if (!confirm(`Delete binding for Thread #${threadId} in ${groupKey}?`)) return;
    try {
      await apiCall('delete_binding', 'POST', { groupKey, threadId });
      showToast('Binding removed.');
      loadBindings();
      loadStats();
    } catch (err) {}
  };

  // 5. Config Tab
  async function loadConfig() {
    try {
      const cfg = await apiCall('config');
      document.getElementById('cfg-bot-token').placeholder = cfg.bot_token_masked || 'Enter new token...';
      document.getElementById('cfg-db-path').value = cfg.database_path || 'kaldis.sqlite';
      document.getElementById('cfg-director-id').value = cfg.operations_director_user_id || '';
      document.getElementById('cfg-ho-chat-id').value = cfg.ho_group_chat_id || '';
      document.getElementById('cfg-r1-chat-id').value = cfg.region_groups ? (cfg.region_groups['Region 1'] || '') : '';
      document.getElementById('cfg-r2-chat-id').value = cfg.region_groups ? (cfg.region_groups['Region 2'] || '') : '';
    } catch (err) {
      console.error(err);
    }
  }

  const configForm = document.getElementById('config-form');
  if (configForm) {
    configForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tokenInput = document.getElementById('cfg-bot-token').value.trim();
      const payload = {
        database_path: document.getElementById('cfg-db-path').value.trim(),
        operations_director_user_id: parseInt(document.getElementById('cfg-director-id').value, 10) || null,
        ho_group_chat_id: parseInt(document.getElementById('cfg-ho-chat-id').value, 10) || null,
        region_groups: {
          "Region 1": parseInt(document.getElementById('cfg-r1-chat-id').value, 10) || 0,
          "Region 2": parseInt(document.getElementById('cfg-r2-chat-id').value, 10) || 0
        }
      };

      if (tokenInput !== '') {
        payload.bot_token = tokenInput;
      }

      try {
        await apiCall('save_config', 'POST', payload);
        showToast('Configuration updated successfully.');
        loadConfig();
      } catch (err) {}
    });
  }

  // Initial Load
  loadStats();
  loadRecentComms();
});
