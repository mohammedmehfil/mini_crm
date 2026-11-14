/* ============================================================
   MiniCRM – script.js
   Full CRM Suite: Contact/Deals/Tasks, Role-Based Authentication
   & Manager Sales Employee Work Rate Dashboard
   ============================================================ */

'use strict';

// ═══════════════════════════════════════════════════════════════
// 1.  STORAGE KEYS & STATE
// ═══════════════════════════════════════════════════════════════
const STORAGE_KEY = 'minicrm_v1';
const STORAGE_DARK = 'minicrm_dark';
const STORAGE_COLOR = 'minicrm_color';
const STORAGE_PROFILE = 'minicrm_profile';
const STORAGE_NOTIFS = 'minicrm_notifs';
const STORAGE_AUTH = 'minicrm_auth_user';

// Employees / Team Roster with Sales Quotas & Roles
const EMPLOYEES = [
  {
    id: 'emp_1',
    name: 'Alex Morgan',
    email: 'alex@crm.com',
    role: 'manager',
    title: 'Sales Director & Manager',
    avatar: 'AM',
    color: '#4f46e5',
    target: 150000,
    phone: '+1 555 111 2233'
  },
  {
    id: 'emp_2',
    name: 'Sarah Johnson',
    email: 'sarah@crm.com',
    role: 'employee',
    title: 'Senior Account Executive',
    avatar: 'SJ',
    color: '#059669',
    target: 60000,
    phone: '+1 555 222 3344'
  },
  {
    id: 'emp_3',
    name: 'Mike Williams',
    email: 'mike@crm.com',
    role: 'employee',
    title: 'Enterprise Account Executive',
    avatar: 'MW',
    color: '#0284c7',
    target: 50000,
    phone: '+1 555 333 4455'
  },
  {
    id: 'emp_4',
    name: 'Emily Chen',
    email: 'emily@crm.com',
    role: 'employee',
    title: 'Sales Development Rep (SDR)',
    avatar: 'EC',
    color: '#db2777',
    target: 40000,
    phone: '+1 555 444 5566'
  },
  {
    id: 'emp_5',
    name: 'Robert Patel',
    email: 'robert@crm.com',
    role: 'employee',
    title: 'Technical Sales Specialist',
    avatar: 'RP',
    color: '#d97706',
    target: 45000,
    phone: '+1 555 555 6677'
  }
];

let currentUser = null;
const DB = { contacts: [], deals: [], tasks: [], activities: [] };
let notifications = [];
let sortState = { col: null, asc: true };

// ─── Persistence ─────────────────────────────────────────────
function saveDB() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
    updateSaveBadge(true);
    updateStorageInfo();
  } catch (err) {
    console.warn('MiniCRM save error', err);
  }
}

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    DB.contacts = Array.isArray(s.contacts) ? s.contacts : [];
    DB.deals = Array.isArray(s.deals) ? s.deals : [];
    DB.tasks = Array.isArray(s.tasks) ? s.tasks : [];
    DB.activities = Array.isArray(s.activities) ? s.activities : [];
    return true;
  } catch (_) { return false; }
}

function resetDB() {
  if (!confirm('Reset ALL data to initial demo state? This cannot be undone.')) return;
  localStorage.removeItem(STORAGE_KEY);
  DB.contacts = []; DB.deals = []; DB.tasks = []; DB.activities = [];
  seedDemoData();
  renderAll();
  saveDB();
  toast('Data reset to fresh demo state 🔄', 'warning');
}

function updateSaveBadge(saved) {
  const badge = document.getElementById('saveBadge');
  if (!badge) return;
  badge.innerHTML = saved
    ? `<i class="fa-solid fa-floppy-disk"></i> Saved`
    : `<i class="fa-solid fa-circle-exclamation"></i> Unsaved`;
  badge.style.background = saved ? '' : '#fef3c7';
  badge.style.color = saved ? '' : '#b45309';
  badge.style.borderColor = saved ? '' : '#fde68a';
}

function updateStorageInfo() {
  const el = document.getElementById('storageInfo');
  const fill = document.getElementById('storageBarFill');
  if (!el) return;
  const bytes = new Blob([localStorage.getItem(STORAGE_KEY) || '']).size;
  const kb = (bytes / 1024).toFixed(1);
  const maxKb = 5120;
  const pct = Math.min(100, (bytes / (maxKb * 1024)) * 100);
  el.textContent = `${kb} KB of ~5 MB used`;
  if (fill) fill.style.width = `${Math.max(2, pct)}%`;
}

// ═══════════════════════════════════════════════════════════════
// 2.  AUTHENTICATION & ROLE PORTAL
// ═══════════════════════════════════════════════════════════════
function initAuth() {
  const savedUserId = localStorage.getItem(STORAGE_AUTH);
  if (savedUserId) {
    const found = EMPLOYEES.find(e => e.id === savedUserId);
    if (found) {
      currentUser = found;
      applyUserSession();
      return;
    }
  }
  // Default to Manager if first visit, or show portal
  showLoginPortal(true);
}

function applyUserSession() {
  if (!currentUser) return;

  // Update Sidebar Profile
  const avatarEl = $('currentUserAvatar');
  const nameEl = $('currentUserName');
  const roleEl = $('currentUserRole');
  if (avatarEl) {
    avatarEl.textContent = currentUser.avatar;
    avatarEl.style.background = currentUser.color;
  }
  if (nameEl) nameEl.textContent = currentUser.name;
  if (roleEl) {
    if (currentUser.role === 'manager') {
      roleEl.innerHTML = `<i class="fa-solid fa-crown" style="color:#ca8a04"></i> Manager`;
    } else {
      roleEl.innerHTML = `<i class="fa-solid fa-briefcase" style="color:#0284c7"></i> Sales Rep`;
    }
  }

  // Update Topbar Profile Pill
  const topAvatar = $('topbarUserAvatar');
  const topName = $('topbarUserName');
  const topRole = $('topbarUserRole');
  if (topAvatar) {
    topAvatar.textContent = currentUser.avatar;
    topAvatar.style.background = currentUser.color;
  }
  if (topName) topName.textContent = currentUser.name.split(' ')[0];
  if (topRole) {
    topRole.textContent = currentUser.role === 'manager' ? 'Manager' : 'Employee';
    topRole.className = currentUser.role === 'manager' ? 'badge-role' : 'badge-role employee-pill';
  }

  // Role Permissions
  const workRateNav = $('navWorkRate');
  const workRatePill = $('workRateNavPill');
  if (currentUser.role === 'manager') {
    if (workRateNav) workRateNav.style.display = 'flex';
    if (workRatePill) {
      workRatePill.textContent = 'Manager';
      workRatePill.className = 'role-badge-pill manager-pill';
    }
  } else {
    // Employee view
    if (workRateNav) workRateNav.style.display = 'flex';
    if (workRatePill) {
      workRatePill.textContent = 'My Stats';
      workRatePill.className = 'role-badge-pill employee-pill';
    }
  }

  // Hide login portal
  showLoginPortal(false);
  localStorage.setItem(STORAGE_AUTH, currentUser.id);

  // Update subtitle greeting
  const sub = document.querySelector('.page-subtitle');
  if (sub && sub.textContent.includes('Welcome back')) {
    sub.textContent = `Welcome back, ${currentUser.name} 👋 (${currentUser.title})`;
  }
}

function showLoginPortal(show) {
  const portal = $('loginPortal');
  if (!portal) return;
  if (show) {
    portal.classList.remove('hidden');
    renderDemoAccountsList('manager');
  } else {
    portal.classList.add('hidden');
  }
}

function renderDemoAccountsList(role) {
  const container = $('demoAccountsList');
  if (!container) return;
  const list = role ? EMPLOYEES.filter(e => e.role === role) : EMPLOYEES;
  container.innerHTML = list.map(emp => `
    <div class="demo-account-item" onclick="loginAs('${emp.id}')">
      <div class="demo-acc-avatar" style="background:${emp.color}">${emp.avatar}</div>
      <div class="demo-acc-info">
        <div class="demo-acc-name">${emp.name}</div>
        <div class="demo-acc-role">${emp.title}</div>
      </div>
      <i class="fa-solid fa-arrow-right demo-acc-arrow"></i>
    </div>
  `).join('');
}

function loginAs(employeeId) {
  const emp = EMPLOYEES.find(e => e.id === employeeId);
  if (!emp) return;
  currentUser = emp;
  applyUserSession();
  toast(`Signed in as ${emp.name} (${emp.role.toUpperCase()}) 👋`);
  logActivity('contact', `User signed in: <strong>${emp.name}</strong> (${emp.title})`);
  refreshDashboard();
  renderWorkRate();
  renderKanban();
  renderTasks();
}

function logout() {
  localStorage.removeItem(STORAGE_AUTH);
  currentUser = null;
  toast('Signed out successfully');
  showLoginPortal(true);
}

// ═══════════════════════════════════════════════════════════════
// 3.  HELPERS & NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════
const uid = () => '_' + Math.random().toString(36).slice(2, 9);
const $ = id => document.getElementById(id);
const fmt = n => '$' + Number(n || 0).toLocaleString();

const relTime = iso => {
  const diff = Date.now() - new Date(iso);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const AVATAR_COLORS = ['#4f46e5', '#0284c7', '#059669', '#d97706', '#db2777', '#7c3aed', '#0891b2'];
const avatarColor = str => AVATAR_COLORS[(str || 'A').charCodeAt(0) % AVATAR_COLORS.length];
const initials = (f, l) => ((f[0] || '') + (l[0] || '')).toUpperCase();

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = type === 'success' ? 'circle-check'
    : type === 'error' ? 'circle-xmark'
      : 'triangle-exclamation';
  el.innerHTML = `<i class="fa-solid fa-${icon}"></i> ${msg}`;
  $('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function addNotification(text) {
  const n = { id: uid(), text, time: new Date().toISOString(), read: false };
  notifications.unshift(n);
  if (notifications.length > 25) notifications.pop();
  try { localStorage.setItem(STORAGE_NOTIFS, JSON.stringify(notifications)); } catch (_) { }
  renderNotifs();
}

function loadNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_NOTIFS);
    notifications = raw ? JSON.parse(raw) : [];
  } catch (_) { notifications = []; }
}

function renderNotifs() {
  const unread = notifications.filter(n => !n.read).length;
  const badge = $('notifBadge');
  if (badge) {
    badge.textContent = unread;
    badge.style.display = unread ? 'block' : 'none';
  }
  const list = $('notifList');
  if (!list) return;
  if (!notifications.length) {
    list.innerHTML = `<p class="empty-state" style="padding:16px">No notifications</p>`;
    return;
  }
  list.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
      <div class="notif-dot ${n.read ? 'read' : ''}"></div>
      <div class="notif-text">
        <div>${n.text}</div>
        <div class="notif-time">${relTime(n.time)}</div>
      </div>
    </div>`).join('');

  list.querySelectorAll('.notif-item').forEach(el => {
    el.addEventListener('click', () => {
      const it = notifications.find(x => x.id === el.dataset.id);
      if (it) it.read = true;
      try { localStorage.setItem(STORAGE_NOTIFS, JSON.stringify(notifications)); } catch (_) { }
      renderNotifs();
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// 4.  ACTIVITY LOG
// ═══════════════════════════════════════════════════════════════
const ACTIVITY_ICONS = {
  contact: { icon: 'user-plus', bg: '#e0f2fe', color: '#0284c7' },
  deal: { icon: 'handshake', bg: '#fef3c7', color: '#d97706' },
  task: { icon: 'list-check', bg: '#dcfce7', color: '#16a34a' },
  delete: { icon: 'trash', bg: '#fee2e2', color: '#dc2626' },
  update: { icon: 'pen-to-square', bg: '#ede9fe', color: '#7c3aed' },
};

function logActivity(type, message) {
  const author = currentUser ? currentUser.name : 'System';
  DB.activities.unshift({
    id: uid(),
    type,
    message: `${message} <span style="font-size:11px;color:var(--text-muted)">by ${author}</span>`,
    time: new Date().toISOString()
  });
  if (DB.activities.length > 100) DB.activities.length = 100;
  renderActivities();
  saveDB();
}

// ═══════════════════════════════════════════════════════════════
// 5.  STAGES & NAVIGATION
// ═══════════════════════════════════════════════════════════════
const STAGES = [
  { id: 'lead', label: 'Lead', color: '#1d4ed8' },
  { id: 'qualified', label: 'Qualified', color: '#0369a1' },
  { id: 'proposal', label: 'Proposal', color: '#6d28d9' },
  { id: 'negotiation', label: 'Negotiation', color: '#92400e' },
  { id: 'won', label: 'Won', color: '#15803d' },
  { id: 'lost', label: 'Lost', color: '#b91c1c' },
];
const STAGE_COLORS = { lead: '#1d4ed8', qualified: '#0369a1', proposal: '#6d28d9', negotiation: '#d97706', won: '#16a34a', lost: '#dc2626' };

const PAGES = ['dashboard', 'contacts', 'deals', 'tasks', 'activities', 'reports', 'workrate', 'settings'];

function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  const p = $(`page-${name}`);
  if (p) p.classList.remove('hidden');
  document.querySelectorAll(`[data-page="${name}"]`).forEach(a => a.classList.add('active'));

  if (name === 'dashboard') refreshDashboard();
  if (name === 'reports') renderReports();
  if (name === 'workrate') renderWorkRate();
  if (name === 'settings') updateStorageInfo();
}

const openModal = id => $(id).classList.remove('hidden');
const closeModal = id => $(id).classList.add('hidden');

// ═══════════════════════════════════════════════════════════════
// 6.  CONTACTS
// ═══════════════════════════════════════════════════════════════
function openAddContact(contact = null) {
  $('contactModalTitle').textContent = contact ? 'Edit Contact' : 'Add Contact';
  $('contactId').value = contact?.id || '';
  $('contactFirst').value = contact?.first || '';
  $('contactLast').value = contact?.last || '';
  $('contactEmail').value = contact?.email || '';
  $('contactPhone').value = contact?.phone || '';
  $('contactCompany').value = contact?.company || '';
  $('contactTag').value = contact?.tag || 'lead';
  $('contactNotes').value = contact?.notes || '';
  openModal('contactModal');
  setTimeout(() => $('contactFirst').focus(), 80);
}

function saveContact(e) {
  e.preventDefault();
  const id = $('contactId').value;
  const data = {
    id: id || uid(),
    first: $('contactFirst').value.trim(),
    last: $('contactLast').value.trim(),
    email: $('contactEmail').value.trim(),
    phone: $('contactPhone').value.trim(),
    company: $('contactCompany').value.trim(),
    tag: $('contactTag').value,
    notes: $('contactNotes').value.trim(),
    created: id ? (DB.contacts.find(c => c.id === id)?.created || new Date().toISOString())
      : new Date().toISOString(),
  };
  if (id) {
    DB.contacts[DB.contacts.findIndex(c => c.id === id)] = data;
    logActivity('update', `Updated contact <strong>${data.first} ${data.last}</strong>`);
    toast('Contact updated');
  } else {
    DB.contacts.unshift(data);
    logActivity('contact', `Added contact <strong>${data.first} ${data.last}</strong>`);
    addNotification(`New contact added: ${data.first} ${data.last}`);
    toast('Contact added');
  }
  closeModal('contactModal');
  renderContacts();
  refreshDashboard();
  populateDropdowns();
}

function deleteContact(id) {
  const c = DB.contacts.find(x => x.id === id);
  if (!c) return;
  DB.contacts = DB.contacts.filter(x => x.id !== id);
  logActivity('delete', `Deleted contact <strong>${c.first} ${c.last}</strong>`);
  toast('Contact deleted', 'warning');
  renderContacts();
  refreshDashboard();
  populateDropdowns();
}

function renderContacts() {
  const search = $('contactSearch')?.value.toLowerCase() || '';
  const tagFilter = $('contactFilter')?.value || '';

    let list = DB.contacts.filter(c => {
      const name = `${c.first} ${c.last}`.toLowerCase();
      const ok = !search || name.includes(search)
        || c.email.toLowerCase().includes(search)
        || (c.company || '').toLowerCase().includes(search);
      return ok && (!tagFilter || c.tag === tagFilter);
    });

    // Handle Sort
    if (sortState.col) {
      list.sort((a, b) => {
        let va = a[sortState.col] || '';
        let vb = b[sortState.col] || '';
        if (sortState.col === 'name') {
          va = `${a.first} ${a.last}`.toLowerCase();
          vb = `${b.first} ${b.last}`.toLowerCase();
        } else {
          va = String(va).toLowerCase();
          vb = String(vb).toLowerCase();
        }
        if (va < vb) return sortState.asc ? -1 : 1;
        if (va > vb) return sortState.asc ? 1 : -1;
        return 0;
      });
    }

    const tbody = $('contactsBody');
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No contacts found.</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(c => {
      const color = avatarColor(c.first);
      const ini = initials(c.first, c.last);
      return `
    <tr>
      <td>
        <div class="contact-name-cell">
          <div class="avatar-sm" style="background:${color}">${ini}</div>
          <span class="contact-name" style="cursor:pointer;font-weight:600"
                data-id="${c.id}">${c.first} ${c.last}</span>
        </div>
      </td>
      <td>${c.email}</td>
      <td>${c.phone || '—'}</td>
      <td>${c.company || '—'}</td>
      <td><span class="tag tag-${c.tag}">${c.tag}</span></td>
      <td>${new Date(c.created).toLocaleDateString()}</td>
      <td>
        <div class="action-btns">
          <button class="icon-btn" title="View details" onclick="viewContact('${c.id}')"><i class="fa-solid fa-eye"></i></button>
          <button class="icon-btn" title="Edit" onclick="openAddContact(DB.contacts.find(x=>x.id==='${c.id}'))"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn danger" title="Delete" onclick="deleteContact('${c.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
    }).join('');

    tbody.querySelectorAll('.contact-name').forEach(el =>
      el.addEventListener('click', () => viewContact(el.dataset.id)));
  }

function viewContact(id) {
      const c = DB.contacts.find(x => x.id === id);
      if (!c) return;
      const color = avatarColor(c.first);
      const ini = initials(c.first, c.last);
      const relDeals = DB.deals.filter(d => d.contact === id);
      const relTasks = DB.tasks.filter(t => t.contact === id);

      $('detailContent').innerHTML = `
    <div class="detail-avatar" style="background:${color}">${ini}</div>
    <div class="detail-name">${c.first} ${c.last}</div>
    <div class="detail-company">${c.company || 'No company specified'}</div>
    <span class="tag tag-${c.tag}">${c.tag}</span>
    <div class="detail-fields" style="margin-top:14px">
      <div class="detail-field"><i class="fa-solid fa-envelope"></i> ${c.email}</div>
      ${c.phone ? `<div class="detail-field"><i class="fa-solid fa-phone"></i> ${c.phone}</div>` : ''}
      ${c.notes ? `<div class="detail-field"><i class="fa-solid fa-note-sticky"></i> ${c.notes}</div>` : ''}
    </div>

    <!-- Quick Contact Actions -->
    <div style="display:flex;gap:8px;margin:16px 0;padding-bottom:14px;border-bottom:1px solid var(--border)">
      <button class="btn btn-primary btn-sm" onclick="quickAddDealForContact('${c.id}')"><i class="fa-solid fa-handshake"></i> Add Deal</button>
      <button class="btn btn-ghost btn-sm" onclick="quickAddTaskForContact('${c.id}')"><i class="fa-solid fa-list-check"></i> Add Task</button>
    </div>

    <div class="detail-section-title">Deals (${relDeals.length})</div>
    ${relDeals.length
      ? relDeals.map(d => {
          const rep = EMPLOYEES.find(e => e.id === d.assignedTo);
          return `< div style = "font-size:13px;padding:6px 0;border-bottom:1px solid var(--border)" >
        <strong>${d.title}</strong> — ${ fmt(d.value) }
      <span class="tag tag-${d.stage}" style="margin-left:4px">${d.stage}</span>
            ${ rep ? `<span style="font-size:11px;color:var(--text-muted);display:block">👤 Rep: ${rep.name}</span>` : '' }
          </div > `;
        }).join('')
      : '<p class="empty-state">No deals associated.</p>'}
    <div class="detail-section-title">Tasks (${relTasks.length})</div>
    ${relTasks.length
      ? relTasks.map(t => `<div style="font-size:13px;padding:6px 0;border-bottom:1px solid var(--border)">
          <strong>${t.title}</strong>
          <span style="color:var(--text-muted);font-size:11px">${t.due ? '· due ' + t.due : ''}</span>
        </div>`).join('')
      : '<p class="empty-state">No pending tasks.</p>'}
    <div style="margin-top:20px;display:flex;gap:8px">
      <button class="btn btn-primary btn-sm"
        onclick="openAddContact(DB.contacts.find(x=>x.id==='${c.id}'));closeDetailPanel()">Edit Contact</button>
      <button class="btn btn-ghost btn-sm" onclick="closeDetailPanel()">Close</button>
    </div>`;
  $('contactDetail').classList.remove('hidden');
}

function closeDetailPanel() { $('contactDetail').classList.add('hidden'); }

function quickAddDealForContact(contactId) {
  closeDetailPanel();
  openAddDeal();
  setTimeout(() => { $('dealContact').value = contactId; }, 50);
}

function quickAddTaskForContact(contactId) {
  closeDetailPanel();
  openAddTask();
  setTimeout(() => { $('taskContact').value = contactId; }, 50);
}

// ═══════════════════════════════════════════════════════════════
// 7.  DEALS (Kanban & Sales Assignment)
// ═══════════════════════════════════════════════════════════════
let draggedDealId = null;

function openAddDeal(deal = null) {
  $('dealModalTitle').textContent = deal ? 'Edit Deal' : 'Add Deal';
  $('dealId').value = deal?.id || '';
  $('dealTitle').value = deal?.title || '';
  $('dealValue').value = deal?.value || '';
  $('dealStage').value = deal?.stage || 'lead';
  $('dealContact').value = deal?.contact || '';
  $('dealAssignee').value = deal?.assignedTo || (currentUser ? currentUser.id : 'emp_2');
  $('dealClose').value = deal?.close || '';
  $('dealNotes').value = deal?.notes || '';
  openModal('dealModal');
}

function saveDeal(e) {
  e.preventDefault();
  const id = $('dealId').value;
  const data = {
    id: id || uid(),
    title: $('dealTitle').value.trim(),
    value: parseFloat($('dealValue').value) || 0,
    stage: $('dealStage').value,
    contact: $('dealContact').value,
    assignedTo: $('dealAssignee').value || 'emp_2',
    close: $('dealClose').value,
    notes: $('dealNotes').value.trim(),
    created: id ? (DB.deals.find(d => d.id === id)?.created || new Date().toISOString())
      : new Date().toISOString(),
  };

  const rep = EMPLOYEES.find(e => e.id === data.assignedTo);
  const repName = rep ? rep.name : 'Unassigned';

  if (id) {
    DB.deals[DB.deals.findIndex(d => d.id === id)] = data;
    logActivity('update', `Updated deal <strong>${data.title}</strong> (Rep: ${repName})`);
    toast('Deal updated');
  } else {
    DB.deals.unshift(data);
    logActivity('deal', `Added deal <strong>${data.title}</strong> — ${fmt(data.value)} (Assigned to: ${repName})`);
    addNotification(`New deal: ${data.title} assigned to ${repName}`);
    toast('Deal created and assigned!');
  }
  closeModal('dealModal');
  renderKanban();
  refreshDashboard();
  renderWorkRate();
}

function deleteDeal(id) {
  const d = DB.deals.find(x => x.id === id);
  if (!d) return;
  DB.deals = DB.deals.filter(x => x.id !== id);
  logActivity('delete', `Deleted deal <strong>${d.title}</strong>`);
  toast('Deal deleted', 'warning');
  renderKanban();
  refreshDashboard();
  renderWorkRate();
}

function renderKanban() {
  const board = $('kanbanBoard');
  board.innerHTML = STAGES.map(stage => {
    // If logged in as standard employee, show their deals or all deals
    const cards = DB.deals.filter(d => d.stage === stage.id);
    return `
    <div class="kanban-col" data-stage="${stage.id}">
      <div class="kanban-col-header" style="color:${stage.color}">
        ${stage.label}<span class="col-count">${cards.length}</span>
      </div>
      <div class="kanban-cards" data-stage="${stage.id}">
        ${cards.length
        ? cards.map(d => kanbanCard(d)).join('')
        : '<p style="color:var(--text-muted);font-size:12px;text-align:center;padding:16px 0">Empty</p>'}
      </div>
    </div>`;
  }).join('');

  // Drag & Drop
  board.querySelectorAll('.kanban-card').forEach(card => {
    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', e => {
      draggedDealId = card.dataset.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      board.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));
    });
  });

  board.querySelectorAll('.kanban-col').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const targetStage = col.dataset.stage;
      if (!draggedDealId || !targetStage) return;
      const deal = DB.deals.find(d => d.id === draggedDealId);
      if (deal && deal.stage !== targetStage) {
        deal.stage = targetStage;
        const rep = EMPLOYEES.find(x => x.id === deal.assignedTo);
        const repText = rep ? ` [Rep: ${rep.name}]` : '';

        logActivity('deal', `Moved deal <strong>${deal.title}</strong> to <em>${targetStage.toUpperCase()}</em>${repText}`);

        if (targetStage === 'won') {
          addNotification(`🎉 Deal Won: ${deal.title} (${fmt(deal.value)}) by ${rep ? rep.name : 'Team'}`);
          toast(`Deal Won! ${fmt(deal.value)} 🎉`);
        } else {
          toast(`Deal moved to ${targetStage}`);
        }
        renderKanban();
        refreshDashboard();
        renderWorkRate();
      }
    });
  });
}

function kanbanCard(d) {
  const contact = DB.contacts.find(c => c.id === d.contact);
  const rep = EMPLOYEES.find(e => e.id === d.assignedTo);
  return `
  <div class="kanban-card" data-id="${d.id}">
    <div class="kanban-card-actions">
      <button class="icon-btn" title="Edit"
        onclick="event.stopPropagation();openAddDeal(DB.deals.find(x=>x.id==='${d.id}'))">
        <i class="fa-solid fa-pen"></i></button>
      <button class="icon-btn danger" title="Delete"
        onclick="event.stopPropagation();deleteDeal('${d.id}')">
        <i class="fa-solid fa-trash"></i></button>
    </div>
    <div class="kanban-card-title">${d.title}</div>
    ${d.value ? `<div class="kanban-card-value">${fmt(d.value)}</div>` : ''}
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--text-muted)">
      <span>${contact ? `<i class="fa-solid fa-user" style="font-size:10px"></i> ${contact.first} ${contact.last}` : 'No contact'}</span>
      ${rep ? `<span class="employee-pill" style="font-size:10px;padding:1px 6px" title="Assigned Rep: ${rep.name}">${rep.avatar}</span>` : ''}
    </div>
    ${d.close ? `<div class="kanban-card-contact"><i class="fa-solid fa-calendar" style="font-size:10px"></i> Close: ${d.close}</div>` : ''}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// 8.  TASKS
// ═══════════════════════════════════════════════════════════════
function openAddTask(task = null) {
  $('taskModalTitle').textContent = task ? 'Edit Task' : 'Add Task';
  $('taskId').value = task?.id || '';
  $('taskTitle').value = task?.title || '';
  $('taskDue').value = task?.due || '';
  $('taskPriority').value = task?.priority || 'medium';
  $('taskContact').value = task?.contact || '';
  $('taskAssignee').value = task?.assignedTo || (currentUser ? currentUser.id : 'emp_2');
  $('taskNotes').value = task?.notes || '';
  openModal('taskModal');
}

function saveTask(e) {
  e.preventDefault();
  const id = $('taskId').value;
  const data = {
    id: id || uid(),
    title: $('taskTitle').value.trim(),
    due: $('taskDue').value,
    priority: $('taskPriority').value,
    contact: $('taskContact').value,
    assignedTo: $('taskAssignee').value || 'emp_2',
    notes: $('taskNotes').value.trim(),
    done: id ? (DB.tasks.find(t => t.id === id)?.done || false) : false,
    created: id ? (DB.tasks.find(t => t.id === id)?.created || new Date().toISOString())
      : new Date().toISOString(),
  };

  const rep = EMPLOYEES.find(e => e.id === data.assignedTo);
  const repName = rep ? rep.name : 'Unassigned';

  if (id) {
    DB.tasks[DB.tasks.findIndex(t => t.id === id)] = data;
    logActivity('update', `Updated task <strong>${data.title}</strong> (Rep: ${repName})`);
    toast('Task updated');
  } else {
    DB.tasks.unshift(data);
    logActivity('task', `Added task <strong>${data.title}</strong> (Assigned to: ${repName})`);
    addNotification(`New task for ${repName}: ${data.title}`);
    toast('Task created!');
  }
  closeModal('taskModal');
  renderTasks();
  refreshDashboard();
  renderWorkRate();
}

function toggleTask(id) {
  const t = DB.tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  const rep = EMPLOYEES.find(e => e.id === t.assignedTo);
  logActivity('task', t.done
      ? `Completed task <strong>${t.title}</strong> by ${rep ? rep.name : 'Rep'}`
      : `Reopened task <strong>${t.title}</strong>`);
  toast(t.done ? 'Task marked complete ✓' : 'Task reopened');
  renderTasks();
  refreshDashboard();
  renderWorkRate();
}

function deleteTask(id) {
  const t = DB.tasks.find(x => x.id === id);
  if (!t) return;
  DB.tasks = DB.tasks.filter(x => x.id !== id);
  logActivity('delete', `Deleted task <strong>${t.title}</strong>`);
  toast('Task deleted', 'warning');
  renderTasks();
  refreshDashboard();
  renderWorkRate();
}

function renderTasks() {
  const statusFilter = $('taskFilter')?.value || '';
  const priFilter = $('taskPriorityFilter')?.value || '';
  const list = DB.tasks.filter(t => {
    const okStatus = !statusFilter || (statusFilter === 'done' ? t.done : !t.done);
    const okPri = !priFilter || t.priority === priFilter;
    return okStatus && okPri;
  });

  const container = $('taskList');
  if (!list.length) { container.innerHTML = `<p class="empty-state">No tasks found.</p>`; return; }

  const todayStr = new Date().toISOString().split('T')[0];

  container.innerHTML = list.map(t => {
    const contact = DB.contacts.find(c => c.id === t.contact);
    const rep = EMPLOYEES.find(e => e.id === t.assignedTo);

    let dueBadge = '';
    if (t.due && !t.done) {
      if (t.due < todayStr) {
        dueBadge = `<span class="due-badge due-overdue"><i class="fa-solid fa-triangle-exclamation"></i> Overdue</span>`;
      } else if (t.due === todayStr) {
        dueBadge = `<span class="due-badge due-today"><i class="fa-solid fa-clock"></i> Due Today</span>`;
      } else {
        dueBadge = `<span class="due-badge due-future"><i class="fa-solid fa-calendar"></i> ${t.due}</span>`;
      }
    }

    return `
    <div class="task-item">
      <div class="task-check ${t.done ? 'done' : ''}" onclick="toggleTask('${t.id}')">
        ${t.done ? '<i class="fa-solid fa-check"></i>' : ''}
      </div>
      <div class="priority-dot priority-${t.priority}"></div>
      <div class="task-info">
        <div class="task-title ${t.done ? 'done' : ''}">${t.title}</div>
        <div class="task-meta">
          ${dueBadge}
          ${rep ? `<span class="role-badge-pill employee-pill" style="margin-left:4px">👤 ${rep.name}</span>` : ''}
          ${contact ? ` &middot; <i class="fa-solid fa-user" style="font-size:10px"></i> ${contact.first} ${contact.last}` : ''}
          ${t.notes ? ` &middot; ${t.notes}` : ''}
        </div>
      </div>
      <div class="action-btns">
        <button class="icon-btn" onclick="openAddTask(DB.tasks.find(x=>x.id==='${t.id}'))"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn danger" onclick="deleteTask('${t.id}')"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
// 9.  EMPLOYEE WORK RATE SYSTEM (FOR MANAGERS)
// ═══════════════════════════════════════════════════════════════
function getEmployeeWorkRateData(empId) {
  const emp = EMPLOYEES.find(e => e.id === empId);
  if (!emp) return null;

  // Deals
  const repDeals = DB.deals.filter(d => d.assignedTo === empId);
  const dealsWon = repDeals.filter(d => d.stage === 'won');
  const revenueClosed = dealsWon.reduce((s, d) => s + (d.value || 0), 0);
  const winRate = repDeals.length ? Math.round((dealsWon.length / repDeals.length) * 100) : 0;
  const attainment = emp.target ? Math.round((revenueClosed / emp.target) * 100) : 0;

  // Tasks
  const repTasks = DB.tasks.filter(t => t.assignedTo === empId);
  const tasksDone = repTasks.filter(t => t.done).length;
  const taskVelocity = repTasks.length ? Math.round((tasksDone / repTasks.length) * 100) : 100;

  // Activities (calls/emails/updates mentioning rep name)
  const activitiesCount = DB.activities.filter(a => a.message.includes(emp.name)).length + 4; // base activity count

  // Composite Work Rate Formula:
  // 45% Quota Attainment + 35% Task Velocity + 20% Activity Volume
  const attainmentScore = Math.min(100, attainment);
  const activityScore = Math.min(100, activitiesCount * 12);
  const workRateScore = Math.min(100, Math.round((attainmentScore * 0.45) + (taskVelocity * 0.35) + (activityScore * 0.20)));

  // Tier designation
  let tier = { label: 'Needs Coaching ⚠️', class: 'tier-warn' };
  if (workRateScore >= 90) {
    tier = { label: 'Top Performer ⭐', class: 'tier-top' };
  } else if (workRateScore >= 75) {
    tier = { label: 'High Velocity 🔥', class: 'tier-high' };
  } else if (workRateScore >= 60) {
    tier = { label: 'On Track 👍', class: 'tier-good' };
  }

  return {
    emp,
    repDeals,
    dealsWon,
    revenueClosed,
    winRate,
    attainment,
    repTasks,
    tasksDone,
    taskVelocity,
    activitiesCount,
    workRateScore,
    tier
  };
}

function renderWorkRate() {
  const salesReps = EMPLOYEES.filter(e => e.role === 'employee');
  const filterRepId = $('workRateEmpFilter')?.value || 'all';

  const repsData = salesReps.map(r => getEmployeeWorkRateData(r.id)).sort((a, b) => b.workRateScore - a.workRateScore);

  // 1. Team Summary KPIs
  const totalTeamWon = repsData.reduce((s, r) => s + r.revenueClosed, 0);
  const totalTeamTarget = repsData.reduce((s, r) => s + r.emp.target, 0);
  const teamAttainment = totalTeamTarget ? Math.round((totalTeamWon / totalTeamTarget) * 100) : 0;
  const avgWorkRate = Math.round(repsData.reduce((s, r) => s + r.workRateScore, 0) / (repsData.length || 1));
  const topRep = repsData[0]?.emp?.name || '—';

  const kpisWrap = $('teamWorkRateKpis');
  if (kpisWrap) {
    kpisWrap.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#e0f2fe;color:#0284c7"><i class="fa-solid fa-gauge-high"></i></div>
        <div class="kpi-info">
          <span class="kpi-label">Team Work Rate Index</span>
          <span class="kpi-value">${avgWorkRate}%</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#dcfce7;color:#16a34a"><i class="fa-solid fa-sack-dollar"></i></div>
        <div class="kpi-info">
          <span class="kpi-label">Revenue Closed</span>
          <span class="kpi-value">${fmt(totalTeamWon)}</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fef9c3;color:#ca8a04"><i class="fa-solid fa-bullseye"></i></div>
        <div class="kpi-info">
          <span class="kpi-label">Team Quota Attainment</span>
          <span class="kpi-value">${teamAttainment}%</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#ede9fe;color:#7c3aed"><i class="fa-solid fa-trophy"></i></div>
        <div class="kpi-info">
          <span class="kpi-label">Top Performer</span>
          <span class="kpi-value" style="font-size:18px">${topRep}</span>
        </div>
      </div>
    `;
  }

  // 2. Filter data if specific employee selected
  const displayedReps = filterRepId === 'all'
    ? repsData
    : repsData.filter(r => r.emp.id === filterRepId);

  // 3. Render Employee Cards Grid
  const gridEl = $('employeeWorkRateGrid');
  if (gridEl) {
    gridEl.innerHTML = displayedReps.map(r => `
      <div class="employee-card">
        <div class="emp-card-header">
          <div class="emp-card-avatar" style="background:${r.emp.color}">${r.emp.avatar}</div>
          <div class="emp-card-meta">
            <div class="emp-card-name">${r.emp.name}</div>
            <div class="emp-card-title">${r.emp.title}</div>
          </div>
          <span class="emp-tier-badge ${r.tier.class}">${r.tier.label}</span>
        </div>

        <div class="emp-gauge-section">
          <div>
            <div class="emp-gauge-label">Work Rate Score</div>
            <div class="emp-score-number" style="color:${r.workRateScore >= 75 ? 'var(--success)' : 'var(--warning)'}">${r.workRateScore}%</div>
          </div>
          <div style="text-align:right">
            <div class="emp-gauge-label">Quota Attainment</div>
            <div style="font-size:18px;font-weight:700;color:var(--text)">${r.attainment}%</div>
          </div>
        </div>

        <div class="emp-metrics-grid">
          <div class="emp-metric-tile">
            <span class="emp-metric-label">Deals Won / Total</span>
            <span class="emp-metric-val">${r.dealsWon.length} / ${r.repDeals.length} <span style="font-size:11px;color:var(--text-muted)">(${r.winRate}%)</span></span>
          </div>
          <div class="emp-metric-tile">
            <span class="emp-metric-label">Revenue Closed</span>
            <span class="emp-metric-val" style="color:var(--success)">${fmt(r.revenueClosed)}</span>
          </div>
          <div class="emp-metric-tile">
            <span class="emp-metric-label">Tasks Velocity</span>
            <span class="emp-metric-val">${r.tasksDone}/${r.repTasks.length} <span style="font-size:11px;color:var(--text-muted)">(${r.taskVelocity}%)</span></span>
          </div>
          <div class="emp-metric-tile">
            <span class="emp-metric-label">Sales Target</span>
            <span class="emp-metric-val">${fmt(r.emp.target)}</span>
          </div>
        </div>

        <div class="emp-progress-wrap">
          <div class="emp-progress-header">
            <span>Sales Quota Progress</span>
            <span>${fmt(r.revenueClosed)} / ${fmt(r.emp.target)}</span>
          </div>
          <div class="emp-progress-track">
            <div class="emp-progress-fill" style="width:${Math.min(100, r.attainment)}%;background:${r.attainment >= 80 ? 'var(--success)' : 'var(--primary)'}"></div>
          </div>
        </div>

        <div class="emp-card-actions">
          <button class="btn btn-primary btn-sm" onclick="assignDealTo('${r.emp.id}')"><i class="fa-solid fa-plus"></i> Assign Deal</button>
          <button class="btn btn-ghost btn-sm" onclick="filterDealsByRep('${r.emp.id}')"><i class="fa-solid fa-eye"></i> View Pipeline</button>
        </div>
      </div>
    `).join('');
  }

  // 4. Render Work Rate Comparison Table
  const tableBody = $('workRateTableBody');
  if (tableBody) {
    tableBody.innerHTML = repsData.map((r, i) => `
      <tr>
        <td><strong>#${i + 1}</strong></td>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar-sm" style="background:${r.emp.color}">${r.emp.avatar}</div>
            <div>
              <div style="font-weight:700">${r.emp.name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${r.emp.title}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:50px;height:6px;background:var(--border);border-radius:10px;overflow:hidden">
              <div style="width:${r.workRateScore}%;height:100%;background:${r.workRateScore >= 75 ? 'var(--success)' : 'var(--primary)'}"></div>
            </div>
            <strong>${r.workRateScore}%</strong>
          </div>
        </td>
        <td style="font-weight:700;color:var(--success)">${fmt(r.revenueClosed)}</td>
        <td>${fmt(r.emp.target)}</td>
        <td><strong>${r.attainment}%</strong></td>
        <td>${r.dealsWon.length} / ${r.repDeals.length} <span style="font-size:11px;color:var(--text-muted)">(${r.winRate}%)</span></td>
        <td>${r.tasksDone} / ${r.repTasks.length}</td>
        <td>${r.activitiesCount} calls/logs</td>
        <td><span class="emp-tier-badge ${r.tier.class}">${r.tier.label}</span></td>
        <td>
          <button class="icon-btn" title="Assign Deal" onclick="assignDealTo('${r.emp.id}')"><i class="fa-solid fa-plus"></i></button>
        </td>
      </tr>
    `).join('');
  }

  // 5. Manager Recommendations Box
  const insightsBox = $('managerInsightsBox');
  if (insightsBox) {
    insightsBox.innerHTML = `
      <div class="insight-item">
        <div class="insight-icon" style="background:#dcfce7;color:#16a34a"><i class="fa-solid fa-star"></i></div>
        <div><strong>Top Performer Recognition:</strong> ${topRep} leads the sales team with strong quota attainment and fast task turnaround.</div>
      </div>
      <div class="insight-item">
        <div class="insight-icon" style="background:#e0f2fe;color:#0284c7"><i class="fa-solid fa-arrow-trend-up"></i></div>
        <div><strong>Pipeline Momentum:</strong> Enterprise licence negotiations are active. Ensure Mike Williams receives technical support for the API deal.</div>
      </div>
      <div class="insight-item">
        <div class="insight-icon" style="background:#fef3c7;color:#d97706"><i class="fa-solid fa-users-gear"></i></div>
        <div><strong>Capacity &amp; Distribution:</strong> Sales rep workloads are balanced. Consider assigning new inbound enterprise leads to Sarah Johnson.</div>
      </div>
    `;
  }
}

function assignDealTo(empId) {
  openAddDeal();
  setTimeout(() => {
    const sel = $('dealAssignee');
    if (sel) sel.value = empId;
  }, 50);
}

function filterDealsByRep(empId) {
  switchPage('deals');
  const rep = EMPLOYEES.find(e => e.id === empId);
  if (rep) toast(`Filtered view for ${rep.name}`);
}

// ═══════════════════════════════════════════════════════════════
// 10. ACTIVITIES & DASHBOARD
// ═══════════════════════════════════════════════════════════════
function renderActivities() {
  const feed = $('activityFeed');
  if (!DB.activities.length) {
    feed.innerHTML = `<p class="empty-state">No activity recorded yet.</p>`;
    return;
  }
  feed.innerHTML = DB.activities.slice(0, 50).map(a => {
    const meta = ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.update;
    return `
    <div class="activity-item">
      <div class="activity-icon" style="background:${meta.bg};color:${meta.color}">
        <i class="fa-solid fa-${meta.icon}"></i>
      </div>
      <div class="activity-text">
        <div>${a.message}</div>
        <div class="activity-time">${relTime(a.time)}</div>
      </div>
    </div>`;
  }).join('');
}

function refreshDashboard() {
  const openDeals = DB.deals.filter(d => !['won', 'lost'].includes(d.stage));
  const pipeline = openDeals.reduce((s, d) => s + (d.value || 0), 0);
  const pending = DB.tasks.filter(t => !t.done).length;

  $('kpiContacts').textContent = DB.contacts.length;
  $('kpiDeals').textContent = openDeals.length;
  $('kpiPipeline').textContent = fmt(pipeline);
  $('kpiTasks').textContent = pending;

  // Recent contacts
  const rc = $('dashRecentContacts');
  rc.innerHTML = DB.contacts.slice(0, 5).map(c => `
    <div class="recent-contact-row">
      <div class="avatar-sm" style="background:${avatarColor(c.first)}">${initials(c.first, c.last)}</div>
      <div class="recent-contact-info">
        <div class="recent-contact-name">${c.first} ${c.last}</div>
        <div class="recent-contact-company">${c.company || c.email}</div>
      </div>
      <span class="tag tag-${c.tag}">${c.tag}</span>
    </div>`).join('') || `<p class="empty-state">No contacts yet.</p>`;

  // Pipeline bar
  const totalPipeline = DB.deals.reduce((s, d) => s + (d.value || 0), 0);
  const barWrap = $('pipelineBarWrap');
  const stageData = STAGES.map(s => ({
    ...s,
    val: DB.deals.filter(d => d.stage === s.id).reduce((sum, d) => sum + (d.value || 0), 0),
  })).filter(s => s.val > 0);

  barWrap.innerHTML = stageData.length ? stageData.map(s => {
    const pct = totalPipeline ? Math.round(s.val / totalPipeline * 100) : 0;
    return `
    <div class="pipeline-stage-row">
      <span class="pipeline-stage-label">${s.label}</span>
      <div class="pipeline-bar-track">
        <div class="pipeline-bar-fill" style="width:${pct}%;background:${STAGE_COLORS[s.id]}"></div>
      </div>
      <span class="pipeline-stage-val" style="color:${STAGE_COLORS[s.id]}">${fmt(s.val)}</span>
    </div>`;
  }).join('') : `<p class="empty-state">No deal data yet.</p>`;

  // Upcoming Tasks
  const upcoming = DB.tasks.filter(t => !t.done).slice(0, 5);
  $('dashTasks').innerHTML = upcoming.length ? upcoming.map(t => {
    const rep = EMPLOYEES.find(e => e.id === t.assignedTo);
    return `
    < div style = "display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:8px;border:1px solid var(--border);margin-bottom:8px" >
      <div class="priority-dot priority-${t.priority}"></div>
      <div class="task-info">
        <div class="task-title">${t.title}</div>
        <div class="task-meta">${t.due ? '📅 ' + t.due : 'No due date'} ${rep ? '&middot; 👤 ' + rep.name : ''}</div>
      </div>
    </div>`;
}).join('') : `<p class="empty-state">No pending tasks.</p>`;
}

// ═══════════════════════════════════════════════════════════════
// 11. REPORTS
// ═══════════════════════════════════════════════════════════════
const REPORT_COLORS = ['#4f46e5', '#0284c7', '#059669', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#dc2626'];

function buildDonut(slices) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (!total) return '<p class="empty-state">No data.</p>';
  const cx = 70, cy = 70, r = 55;
  let html = `<div class="report-donut-wrap"><svg width="140" height="140" viewBox="0 0 140 140" class="donut-svg">`;
  let angle = -Math.PI / 2;
  slices.forEach(sl => {
    const sweep = (sl.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle);
    html += `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${sweep > Math.PI ? 1 : 0},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z"
                  fill="${sl.color}" stroke="var(--surface)" stroke-width="2"/>`;
  });
  html += `<circle cx="${cx}" cy="${cy}" r="30" fill="var(--surface)"/>
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" style="font-size:16px;font-weight:700;fill:var(--text)">${total}</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" style="font-size:11px;fill:var(--text-muted)">total</text>
    </svg><div class="donut-legend">`;
  slices.forEach(sl => {
    const pct = Math.round(sl.value / total * 100);
    html += `<div class="legend-item">
      <div class="legend-dot" style="background:${sl.color}"></div>
      <span class="legend-label">${sl.label}</span>
      <span class="legend-val">${sl.value} <span style="color:var(--text-muted);font-weight:400">(${pct}%)</span></span>
    </div>`;
  });
  return html + '</div></div>';
}

function buildBars(items, fmtVal = v => v) {
  if (!items.length) return '<p class="empty-state">No data.</p>';
  const max = Math.max(...items.map(i => i.value));
  return items.map(item => {
    const pct = max ? Math.round(item.value / max * 100) : 0;
    return `<div class="report-bar-row">
      <span class="report-bar-label" title="${item.label}">${item.label}</span>
      <div class="report-bar-track">
        <div class="report-bar-fill" style="width:${pct}%;background:${item.color || 'var(--primary)'}"></div>
      </div>
      <span class="report-bar-val">${fmtVal(item.value)}</span>
    </div>`;
  }).join('');
}

function renderReports() {
  const wonDeals = DB.deals.filter(d => d.stage === 'won');
  const lostDeals = DB.deals.filter(d => d.stage === 'lost');
  const openDeals = DB.deals.filter(d => !['won', 'lost'].includes(d.stage));
  const wonValue = wonDeals.reduce((s, d) => s + d.value, 0);
  const openValue = openDeals.reduce((s, d) => s + d.value, 0);
  const doneTask = DB.tasks.filter(t => t.done).length;

  $('reportKpis').innerHTML = [
    { label: 'Total Contacts', val: DB.contacts.length, icon: 'users', bg: '#e0f2fe', col: '#0284c7' },
    { label: 'Deals Won', val: wonDeals.length, icon: 'trophy', bg: '#dcfce7', col: '#16a34a' },
    { label: 'Revenue Closed', val: fmt(wonValue), icon: 'sack-dollar', bg: '#fef3c7', col: '#d97706' },
    { label: 'Tasks Done', val: `${doneTask}/${DB.tasks.length}`, icon: 'circle-check', bg: '#ede9fe', col: '#7c3aed' },
  ].map(k => `
    <div class="kpi-card">
      <div class="kpi-icon" style="background:${k.bg};color:${k.col}"><i class="fa-solid fa-${k.icon}"></i></div>
      <div class="kpi-info"><span class="kpi-label">${k.label}</span><span class="kpi-value">${k.val}</span></div>
    </div>`).join('');

  // Contacts by tag
  const tagCounts = {};
  DB.contacts.forEach(c => tagCounts[c.tag] = (tagCounts[c.tag] || 0) + 1);
  $('reportContactTags').innerHTML = buildDonut(
    Object.entries(tagCounts).map(([t, v], i) => ({
      label: t.charAt(0).toUpperCase() + t.slice(1), value: v, color: REPORT_COLORS[i % REPORT_COLORS.length],
    })));

  // Deal value by stage
  $('reportDealStages').innerHTML = buildBars(
    STAGES.map(s => ({
      label: s.label,
      value: DB.deals.filter(d => d.stage === s.id).reduce((sum, d) => sum + d.value, 0),
      color: STAGE_COLORS[s.id],
    })).filter(s => s.value > 0), fmt);

  // Win rate
  const total = wonDeals.length + lostDeals.length;
  const rate = total ? Math.round(wonDeals.length / total * 100) : 0;
  const C = 2 * Math.PI * 40;
  $('reportWinRate').innerHTML = `
    <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="40" fill="none" stroke="var(--border)" stroke-width="12"/>
        <circle cx="60" cy="60" r="40" fill="none" stroke="${rate >= 50 ? '#16a34a' : '#dc2626'}"
          stroke-width="12" stroke-dasharray="${C.toFixed(2)}"
          stroke-dashoffset="${(C - (rate / 100) * C).toFixed(2)}" stroke-linecap="round"
          transform="rotate(-90 60 60)" style="transition:stroke-dashoffset .6s ease"/>
        <text x="60" y="55" text-anchor="middle" style="font-size:20px;font-weight:800;fill:var(--text)">${rate}%</text>
        <text x="60" y="72" text-anchor="middle" style="font-size:10px;fill:var(--text-muted)">Win Rate</text>
      </svg>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div class="legend-item"><div class="legend-dot" style="background:#16a34a"></div><span class="legend-label">Won</span><span class="legend-val">${wonDeals.length} deals · ${fmt(wonValue)}</span></div>
        <div class="legend-item"><div class="legend-dot" style="background:#dc2626"></div><span class="legend-label">Lost</span><span class="legend-val">${lostDeals.length} deals</span></div>
        <div class="legend-item"><div class="legend-dot" style="background:#d97706"></div><span class="legend-label">Open</span><span class="legend-val">${openDeals.length} deals · ${fmt(openValue)}</span></div>
      </div>
    </div>`;

  // Task completion
  const totalT = DB.tasks.length || 1;
  const pctDone = Math.round(doneTask / totalT * 100);
  $('reportTaskCompletion').innerHTML = `
    <div class="task-progress-wrap">
      <div>
        <div class="task-progress-label"><span>Completed</span><span>${doneTask} / ${DB.tasks.length}</span></div>
        <div class="task-progress-bar"><div class="task-progress-fill" style="width:${pctDone}%;background:#16a34a"></div></div>
      </div>
      <div>
        <div class="task-progress-label"><span>Pending</span><span>${DB.tasks.length - doneTask} / ${DB.tasks.length}</span></div>
        <div class="task-progress-bar"><div class="task-progress-fill" style="width:${100 - pctDone}%;background:#d97706"></div></div>
      </div>
    </div>`;

  // Top 5 deals
  const top5 = [...DB.deals].sort((a, b) => b.value - a.value).slice(0, 5);
  $('reportTopDeals').innerHTML = top5.length ? `
    <table class="top-deals-table">
      <thead><tr><th>#</th><th>Deal</th><th>Contact</th><th>Sales Rep</th><th>Stage</th><th style="text-align:right">Value</th></tr></thead>
      <tbody>${top5.map((d, i) => {
    const c = DB.contacts.find(x => x.id === d.contact);
    const rep = EMPLOYEES.find(e => e.id === d.assignedTo);
    return `<tr>
          <td><span class="rank-badge">${i + 1}</span></td>
          <td><strong>${d.title}</strong></td>
          <td>${c ? c.first + ' ' + c.last : '—'}</td>
          <td>${rep ? `<span class="employee-pill" style="font-size:11px;padding:2px 6px">👤 ${rep.name}</span>` : '—'}</td>
          <td><span class="tag tag-${d.stage}">${d.stage}</span></td>
          <td style="text-align:right;font-weight:700;color:var(--success)">${fmt(d.value)}</td>
        </tr>`;
  }).join('')}</tbody>
    </table>` : '<p class="empty-state">No deals yet.</p>';
}

// ═══════════════════════════════════════════════════════════════
// 12. BACKUP & RESTORE (JSON & CSV)
// ═══════════════════════════════════════════════════════════════
function exportCSV() {
  if (!DB.contacts.length) { toast('No contacts to export', 'warning'); return; }
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Tag', 'Created'];
  const rows = DB.contacts.map(c => [
    c.first, c.last, c.email, c.phone || '', c.company || '', c.tag,
    new Date(c.created).toLocaleDateString(),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`));
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: 'minicrm-contacts.csv' });
  a.click();
  URL.revokeObjectURL(url);
  toast('Contacts exported as CSV 📥');
  logActivity('update', `Exported <strong>${DB.contacts.length}</strong> contacts to CSV`);
}

function importCSV(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { toast('CSV file is empty or invalid', 'error'); return; }
    let added = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = (lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [])
        .map(c => c.replace(/^"|"$/g, '').trim());

      const first = cols[0] || 'Unknown';
      const last = cols[1] || '';
      const email = cols[2] || '';
      const phone = cols[3] || '';
      const company = cols[4] || '';
      const tag = ['lead', 'customer', 'partner', 'vip'].includes(cols[5]?.toLowerCase())
        ? cols[5].toLowerCase() : 'lead';

      if (!email && !first) continue;

      DB.contacts.unshift({
        id: uid(), first, last, email, phone, company, tag, notes: '',
        created: new Date().toISOString()
      });
      added++;
    }

    if (added) {
      logActivity('contact', `Imported <strong>${added}</strong> contacts from CSV`);
      addNotification(`Imported ${added} contacts from CSV`);
      toast(`Imported ${added} contacts successfully! 📥`);
      renderContacts();
      populateDropdowns();
      refreshDashboard();
      saveDB();
    } else {
      toast('No valid contacts found in CSV', 'warning');
    }
  };
  reader.readAsText(file);
}

function backupJSON() {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: '2.0',
    database: DB
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `minicrm-backup-${new Date().toISOString().split('T')[0]}.json` });
  a.click();
  URL.revokeObjectURL(url);
  toast('Full database backup downloaded (JSON) 🛡️');
  logActivity('update', 'Full database JSON backup exported');
}

function restoreJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data && data.database) {
        DB.contacts = data.database.contacts || [];
        DB.deals = data.database.deals || [];
        DB.tasks = data.database.tasks || [];
        DB.activities = data.database.activities || [];
        saveDB();
        renderAll();
        toast('Database restored successfully from backup! 📦');
        logActivity('update', 'Database restored from JSON backup');
      } else {
        toast('Invalid backup file structure', 'error');
      }
    } catch (err) {
      toast('Failed to parse JSON backup file', 'error');
    }
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════
// 13. SETTINGS & THEMING
// ═══════════════════════════════════════════════════════════════
function applyTheme(isDark) {
  document.body.classList.toggle('dark', isDark);
  const btn = $('darkModeToggle');
  if (btn) btn.querySelector('i').className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  localStorage.setItem(STORAGE_DARK, isDark ? '1' : '0');
  document.querySelectorAll('.theme-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.theme === (isDark ? 'dark' : 'light')));
}

function applyAccentColor(hex) {
  document.documentElement.style.setProperty('--primary', hex);
  document.documentElement.style.setProperty('--primary-light', hex + '1a');
  localStorage.setItem(STORAGE_COLOR, hex);
  document.querySelectorAll('.swatch').forEach(s =>
    s.classList.toggle('active', s.dataset.color === hex));
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (p.first || p.last) {
      if ($('settingFirst')) $('settingFirst').value = p.first || '';
      if ($('settingLast')) $('settingLast').value = p.last || '';
      if ($('settingRole')) $('settingRole').value = p.role || '';
    }
  } catch (_) { }
}

function saveProfile() {
  const p = {
    first: $('settingFirst').value.trim(),
    last: $('settingLast').value.trim(),
    role: $('settingRole').value.trim() || 'Manager',
  };
  localStorage.setItem(STORAGE_PROFILE, JSON.stringify(p));
  if (currentUser) {
    currentUser.name = `${p.first} ${p.last}`.trim() || currentUser.name;
    currentUser.title = p.role;
    applyUserSession();
  }
  toast('Profile updated');
}

// ═══════════════════════════════════════════════════════════════
// 14. DROPDOWNS & SEED DATA
// ═══════════════════════════════════════════════════════════════
    function populateDropdowns() {
      // Contact Selects
      const contactOpts = [`<option value="">— None —</option>`,
        ...DB.contacts.map(c => `<option value="${c.id}">${c.first} ${c.last}</option>`)].join('');
      if ($('dealContact')) $('dealContact').innerHTML = contactOpts;
      if ($('taskContact')) $('taskContact').innerHTML = contactOpts;

      // Sales Employee Assignees
      const empOpts = EMPLOYEES.map(e => `<option value="${e.id}">${e.name} (${e.role === 'manager' ? 'Manager' : 'Sales Rep'})</option>`).join('');
      if ($('dealAssignee')) $('dealAssignee').innerHTML = empOpts;
      if ($('taskAssignee')) $('taskAssignee').innerHTML = empOpts;

      // Work Rate Rep Filter
      const filterEl = $('workRateEmpFilter');
      if (filterEl) {
        filterEl.innerHTML = `<option value="all">👥 All Sales Employees</option>` +
          EMPLOYEES.filter(e => e.role === 'employee').map(e => `<option value="${e.id}">👤 ${e.name}</option>`).join('');
      }
    }

function renderAll() {
      renderContacts();
      renderKanban();
      renderTasks();
      renderActivities();
      populateDropdowns();
      refreshDashboard();
      renderWorkRate();
      renderNotifs();
    }

function seedDemoData() {
      const contacts = [
        { first: 'Sarah', last: 'Johnson', email: 'sarah@acme.com', phone: '+1 555 100 2000', company: 'Acme Corp', tag: 'customer' },
        { first: 'Mike', last: 'Williams', email: 'mike@globex.io', phone: '+1 555 200 3000', company: 'Globex Inc', tag: 'lead' },
        { first: 'Emily', last: 'Chen', email: 'emily@techwave.co', phone: '+1 555 300 4000', company: 'TechWave', tag: 'vip' },
        { first: 'Robert', last: 'Patel', email: 'rpatel@vertex.ai', phone: '+1 555 400 5000', company: 'Vertex AI', tag: 'partner' },
        { first: 'Lisa', last: 'Torres', email: 'lisa@startup.io', phone: '+1 555 500 6000', company: 'Startup.io', tag: 'lead' },
      ];
      contacts.forEach(c => DB.contacts.push({ ...c, id: uid(), notes: '', created: new Date().toISOString() }));

      const cids = DB.contacts.map(c => c.id);

      // Deals distributed across sales employees
      const deals = [
        { title: 'Enterprise Licence', value: 34000, stage: 'proposal', close: '2026-12-15', contact: cids[0], assignedTo: 'emp_2' },
        { title: 'SaaS Subscription', value: 18500, stage: 'won', close: '2026-11-05', contact: cids[1], assignedTo: 'emp_2' },
        { title: 'Premium Support Plan', value: 15000, stage: 'negotiation', close: '2026-12-01', contact: cids[2], assignedTo: 'emp_3' },
        { title: 'API Integration', value: 22000, stage: 'won', close: '2026-10-20', contact: cids[3], assignedTo: 'emp_3' },
        { title: 'Pilot Program', value: 12500, stage: 'lead', close: '2026-12-31', contact: cids[4], assignedTo: 'emp_4' },
        { title: 'Cloud Upgrade Pack', value: 28000, stage: 'won', close: '2026-11-08', contact: cids[0], assignedTo: 'emp_5' },
        { title: 'Security Add-on', value: 14000, stage: 'qualified', close: '2026-12-20', contact: cids[2], assignedTo: 'emp_4' },
      ];
      deals.forEach(d => DB.deals.push({ ...d, id: uid(), notes: '', created: new Date().toISOString() }));

      // Tasks distributed across employees
      const tasks = [
        { title: 'Send renewed proposal to Sarah Johnson', due: '2026-11-15', priority: 'high', contact: cids[0], assignedTo: 'emp_2', done: true },
        { title: 'Schedule technical demo with Mike', due: '2026-11-18', priority: 'medium', contact: cids[1], assignedTo: 'emp_3', done: false },
        { title: 'Follow up on API contract integration', due: '2026-11-20', priority: 'low', contact: cids[3], assignedTo: 'emp_3', done: true },
        { title: 'Prepare SDR onboarding pitch deck', due: '2026-11-25', priority: 'high', contact: cids[4], assignedTo: 'emp_4', done: false },
        { title: 'Review security compliance audit sheet', due: '2026-11-16', priority: 'medium', contact: cids[2], assignedTo: 'emp_5', done: true },
      ];
      tasks.forEach(t => DB.tasks.push({ ...t, id: uid(), notes: '', created: new Date().toISOString() }));

      DB.activities.unshift(
        { id: uid(), type: 'deal', time: new Date().toISOString(), message: 'Sarah Johnson closed SaaS Subscription for <strong>$18,500</strong>' },
        { id: uid(), type: 'deal', time: new Date().toISOString(), message: 'Mike Williams won API Integration for <strong>$22,000</strong>' },
        { id: uid(), type: 'contact', time: new Date().toISOString(), message: 'CRM loaded with <strong>5 contacts, 7 deals, 5 tasks</strong>' }
      );

      notifications = [
        { id: uid(), text: 'Manager Alert: Sarah Johnson has achieved 85% of monthly sales quota!', time: new Date().toISOString(), read: false },
        { id: uid(), text: 'New deal assigned to Mike Williams ($15,000 Premium Support).', time: new Date().toISOString(), read: false },
      ];
      try { localStorage.setItem(STORAGE_NOTIFS, JSON.stringify(notifications)); } catch (_) { }
    }

// ═══════════════════════════════════════════════════════════════
// 15. INITIALIZATION & EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

        // ── Authentication Check ──
        initAuth();

      // ── Sidebar Toggle ──
      $('sidebarToggle')?.addEventListener('click', () =>
        document.getElementById('sidebar').classList.toggle('collapsed'));

      // ── Navigation ──
      document.querySelectorAll('.nav-item[data-page]').forEach(a =>
        a.addEventListener('click', e => { e.preventDefault(); switchPage(a.dataset.page); }));
      document.querySelectorAll('.nav-link[data-page]').forEach(a =>
        a.addEventListener('click', e => { e.preventDefault(); switchPage(a.dataset.page); }));

      // ── Modals & Drawers ──
      document.querySelectorAll('[data-modal]').forEach(btn =>
        btn.addEventListener('click', () => closeModal(btn.dataset.modal)));
      document.querySelectorAll('.modal-overlay').forEach(ov =>
        ov.addEventListener('click', e => { if (e.target === ov) closeModal(ov.id); }));
      $('closeDetail')?.addEventListener('click', closeDetailPanel);

      // ── Quick Add ──
      $('quickAddBtn')?.addEventListener('click', () => openModal('quickAddModal'));
      $('qaContact')?.addEventListener('click', () => { closeModal('quickAddModal'); openAddContact(); });
      $('qaDeal')?.addEventListener('click', () => { closeModal('quickAddModal'); openAddDeal(); });
      $('qaTask')?.addEventListener('click', () => { closeModal('quickAddModal'); openAddTask(); });

      // ── Contacts Page ──
      $('addContactBtn')?.addEventListener('click', () => openAddContact());
      $('contactForm')?.addEventListener('submit', saveContact);
      $('contactSearch')?.addEventListener('input', renderContacts);
      $('contactFilter')?.addEventListener('change', renderContacts);

      // Table Column Header Sort
      document.querySelectorAll('.sortable-th').forEach(th => {
        th.addEventListener('click', () => {
          const col = th.dataset.sort;
          if (sortState.col === col) {
            sortState.asc = !sortState.asc;
          } else {
            sortState.col = col;
            sortState.asc = true;
          }
          document.querySelectorAll('.sortable-th').forEach(el => el.classList.remove('sorted'));
          th.classList.add('sorted');
          const icon = th.querySelector('i');
          if (icon) {
            icon.className = sortState.asc ? 'fa-solid fa-arrow-up-short-wide' : 'fa-solid fa-arrow-down-wide-short';
          }
          renderContacts();
        });
      });

      // ── Deals Page ──
      $('addDealBtn')?.addEventListener('click', () => openAddDeal());
      $('dealForm')?.addEventListener('submit', saveDeal);

      // ── Tasks Page ──
      $('addTaskBtn')?.addEventListener('click', () => openAddTask());
      $('taskForm')?.addEventListener('submit', saveTask);
      $('taskFilter')?.addEventListener('change', renderTasks);
      $('taskPriorityFilter')?.addEventListener('change', renderTasks);

      // ── Topbar Actions ──
        $('darkModeToggle')?.addEventListener('click', () =>
          applyTheme(!document.body.classList.contains('dark')));
        $('exportCsvBtn')?.addEventListener('click', exportCSV);
        $('importCsvInput')?.addEventListener('change', e => {
          importCSV(e.target.files[0]);
          e.target.value = '';
        });

          // Topbar User Pill click -> switch account / logout
          $('topbarUserPill')?.addEventListener('click', () => showLoginPortal(true));

          // Notifications Bell
          $('notifBell')?.addEventListener('click', e => {
            e.stopPropagation();
            $('notifDropdown').classList.toggle('hidden');
          });
          document.addEventListener('click', e => {
            if (!e.target.closest('#notifDropdown') && !e.target.closest('#notifBell')) {
              $('notifDropdown')?.classList.add('hidden');
            }
          });
            $('clearNotifs')?.addEventListener('click', () => {
              notifications = [];
              try { localStorage.removeItem(STORAGE_NOTIFS); } catch (_) { }
              renderNotifs();
              toast('Notifications cleared');
            });

            // ── Settings Page ──
              $('saveProfileBtn')?.addEventListener('click', saveProfile);
              $('settingsExportBtn')?.addEventListener('click', exportCSV);
              $('settingsImportInput')?.addEventListener('change', e => {
                importCSV(e.target.files[0]);
                e.target.value = '';
              });
              $('backupJsonBtn')?.addEventListener('click', backupJSON);
              $('restoreJsonInput')?.addEventListener('change', e => {
                restoreJSON(e.target.files[0]);
                e.target.value = '';
              });
              $('settingsResetBtn')?.addEventListener('click', resetDB);

              document.querySelectorAll('.theme-btn').forEach(btn =>
                btn.addEventListener('click', () => applyTheme(btn.dataset.theme === 'dark')));

              document.querySelectorAll('.swatch').forEach(sw =>
                sw.addEventListener('click', () => applyAccentColor(sw.dataset.color)));

              // ── Work Rate Dashboard Controls ──
              $('workRateEmpFilter')?.addEventListener('change', renderWorkRate);
              $('quickAssignDealBtn')?.addEventListener('click', () => openAddDeal());
              $('exportWorkRateReportBtn')?.addEventListener('click', () => {
                window.print();
              });
              $('printReportBtn')?.addEventListener('click', () => {
                window.print();
              });

              // ── Global Search ──
                $('globalSearch')?.addEventListener('input', function () {
                  const q = this.value.toLowerCase().trim();
                  if (!q) return;
                  if (DB.contacts.some(c => `${c.first} ${c.last} ${c.email}`.toLowerCase().includes(q))) {
                    switchPage('contacts');
                    setTimeout(() => { $('contactSearch').value = q; renderContacts(); }, 50);
                  } else if (DB.deals.some(d => d.title.toLowerCase().includes(q))) {
                    switchPage('deals');
                  }
                });

                // ── Login Portal Event Listeners ──
                $('roleTabManager')?.addEventListener('click', () => {
                  $('roleTabManager').classList.add('active');
                  $('roleTabEmployee').classList.remove('active');
                  renderDemoAccountsList('manager');
                  $('roleContextHint').innerHTML = `👔 <strong>Manager Mode:</strong> Full admin permissions, Employee Work Rate Dashboard, and sales target tracking.`;
                });

                $('roleTabEmployee')?.addEventListener('click', () => {
                  $('roleTabEmployee').classList.add('active');
                  $('roleTabManager').classList.remove('active');
                  renderDemoAccountsList('employee');
                  $('roleContextHint').innerHTML = `💼 <strong>Sales Employee Mode:</strong> Manage personal deals, assigned tasks, contacts, and track work progress.`;
                });

                $('loginForm')?.addEventListener('submit', e => {
                  e.preventDefault();
                  const email = $('loginEmail').value.trim().toLowerCase();
                  const matched = EMPLOYEES.find(emp => emp.email.toLowerCase() === email);
                  if (matched) {
                    loginAs(matched.id);
                  } else {
                    // Default fallback or first employee
                    const activeRoleTab = document.querySelector('.role-tab.active')?.dataset.role || 'manager';
                    const fallback = EMPLOYEES.find(emp => emp.role === activeRoleTab) || EMPLOYEES[0];
                    loginAs(fallback.id);
                  }
                });

                // Logout button
                $('logoutBtn')?.addEventListener('click', logout);

                // ── Keyboard Shortcuts ──
                document.addEventListener('keydown', e => {
                  const tag = e.target.tagName.toLowerCase();
                  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
                    if (e.key === 'Escape') {
                      document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
                      closeDetailPanel();
                    }
                    return;
                  }

                  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    $('globalSearch').focus();
                  } else if (e.key === 'Escape') {
                    document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
                    closeDetailPanel();
                    $('notifDropdown')?.classList.add('hidden');
                  } else if (e.key === 'n' || e.key === 'N') {
                    e.preventDefault();
                    openAddContact();
                  } else if (e.key === 'd' || e.key === 'D') {
                    e.preventDefault();
                    openAddDeal();
                  } else if (e.key === 't' || e.key === 'T') {
                    e.preventDefault();
                    openAddTask();
                  } else if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key)) {
                    const idx = parseInt(e.key) - 1;
                    if (PAGES[idx]) switchPage(PAGES[idx]);
                  }
                });

                // ── Auto-save Heartbeat (every 60 s) ──
                setInterval(saveDB, 60_000);

                // ══ INIT ══
                const restored = loadDB();
                if (!restored) {
                  seedDemoData();
                  saveDB();
                }

                loadNotifications();

                // Restore Theme
                if (localStorage.getItem(STORAGE_DARK) === '1') applyTheme(true);

                // Restore Accent Color
                const savedColor = localStorage.getItem(STORAGE_COLOR);
                if (savedColor) applyAccentColor(savedColor);

                // Restore Profile
                loadProfile();

                // "Saved" badge in sidebar
                const brand = document.querySelector('.sidebar-brand');
                brand.insertAdjacentHTML('beforeend',
                  `<span id="saveBadge" class="persist-badge"><i class="fa-solid fa-floppy-disk"></i> ${restored ? 'Saved' : 'Demo'}</span>`);

                renderAll();
                switchPage('dashboard');
              });
