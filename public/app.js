/* ═══════════════════════════════════════
   STAFF MANAGER - app.js
   ═══════════════════════════════════════ */

const API = (path, opts = {}) =>
  fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Gabim i serverit');
    return data;
  });

// ── TOAST ────────────────────────────────────
const toast = document.getElementById('toast');
let toastTimer;
function showToast(msg, type = '') {
  toast.textContent = msg;
  toast.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.className = '', 3000);
}

// ── CONFIRM DIALOG ───────────────────────────
let confirmResolve;
document.getElementById('confirm-no').onclick = () => { document.getElementById('confirm-overlay').classList.remove('open'); if (confirmResolve) confirmResolve(false); };
document.getElementById('confirm-yes').onclick = () => { document.getElementById('confirm-overlay').classList.remove('open'); if (confirmResolve) confirmResolve(true); };

function confirm(title, msg) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-overlay').classList.add('open');
  return new Promise(r => confirmResolve = r);
}

// ── AUTH ─────────────────────────────────────
const loginScreen = document.getElementById('login-screen');
const appEl = document.getElementById('app');
let currentRole = null;

function applyRole(role) {
  currentRole = role;
  const isAdmin = role === 'admin';
  // Show/hide admin-only elements
  document.querySelectorAll('.admin-only').forEach(el => {
    el.classList.toggle('hidden', !isAdmin);
  });
}

document.getElementById('login-form').onsubmit = async (e) => {
  e.preventDefault();
  const err = document.getElementById('login-error');
  err.style.display = 'none';
  try {
    const res = await API('/auth/login', { method: 'POST', body: { username: document.getElementById('login-user').value, password: document.getElementById('login-pass').value } });
    startApp(res.role, res.displayName);
  } catch (ex) {
    err.textContent = ex.message;
    err.style.display = 'block';
  }
};

async function doLogout() {
  await API('/auth/logout', { method: 'POST' });
  loginScreen.classList.remove('hidden');
  appEl.classList.add('hidden');
  currentRole = null;
}
document.getElementById('logout-btn').onclick = doLogout;
document.getElementById('logout-btn-top').onclick = doLogout;

async function init() {
  try {
    const me = await API('/auth/me');
    if (me.loggedIn) startApp(me.role, me.displayName);
    else { loginScreen.classList.remove('hidden'); }
  } catch { loginScreen.classList.remove('hidden'); }
}

function startApp(role, displayName) {
  loginScreen.classList.add('hidden');
  appEl.classList.remove('hidden');
  applyRole(role);
  // Show username in topbar
  if (displayName) {
    const el = document.getElementById('topbar-user');
    if (el) { el.textContent = '👤 ' + displayName; el.style.display = ''; }
  }
  loadAllData();
  navigateTo('dashboard');
}

// ── NAVIGATION ───────────────────────────────
const pages = ['dashboard', 'workers', 'locations', 'shifts', 'reports'];
let currentPage = 'dashboard';

function navigateTo(page) {
  currentPage = page;
  pages.forEach(p => {
    document.getElementById('page-' + p).classList.toggle('hidden', p !== page);
  });

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.querySelectorAll('.bnav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  const titles = { dashboard: 'Dashboard', workers: 'Punëtorët', locations: 'Lokacionet', shifts: 'Turnet', reports: 'Raportet' };
  document.getElementById('page-title').textContent = titles[page];
  document.getElementById('topbar-actions').innerHTML = '';

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');

  if (page === 'dashboard') loadDashboard();
  else if (page === 'workers') loadWorkers();
  else if (page === 'locations') loadLocations();
  else if (page === 'shifts') loadShifts();
  else if (page === 'reports') loadReportFilters();
}

document.querySelectorAll('.nav-item, .bnav-item').forEach(el => {
  el.addEventListener('click', () => navigateTo(el.dataset.page));
});

// Sidebar toggle (mobile)
const sidebarToggle = document.getElementById('sidebar-toggle');
sidebarToggle.style.display = 'block';
sidebarToggle.onclick = () => document.getElementById('sidebar').classList.toggle('open');

// Close sidebar when clicking outside
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== sidebarToggle) {
    sidebar.classList.remove('open');
  }
});

// Modal close buttons
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.onclick = () => document.getElementById(btn.dataset.close).classList.remove('open');
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ── DATA CACHE ───────────────────────────────
let workers = [], locations = [];

async function loadAllData() {
  [workers, locations] = await Promise.all([
    API('/workers'),
    API('/locations')
  ]);
  populateSelects();
}

function populateSelects() {
  const workerOpts = workers.map(w => `<option value="${w.id}">${esc(w.name)}</option>`).join('');
  const locationOpts = locations.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('');
  const allWorkers = '<option value="">Të gjithë</option>' + workerOpts;
  const allLocations = '<option value="">Të gjithë</option>' + locationOpts;

  ['shift-worker-select'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = workerOpts; });
  ['shift-location-select'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = locationOpts; });
  ['shift-filter-worker', 'rep-worker'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = allWorkers; });
  ['shift-filter-location', 'rep-location'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = allLocations; });
}

// ── HELPERS ──────────────────────────────────
function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d) {
  if (!d) return '-';
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function fmtHours(h) {
  if (!h && h !== 0) return '-';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}min`;
}

function statusBadge(s) {
  const map = { planned: ['badge-planned', 'I planifikuar'], completed: ['badge-completed', 'I kryer'], cancelled: ['badge-cancelled', 'I anuluar'] };
  const [cls, label] = map[s] || ['badge-planned', s];
  return `<span class="badge ${cls}">${label}</span>`;
}

function getWeekDates(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(new Date(date).setDate(diff));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }
  return days;
}

const dayNames = ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die'];

// ── DASHBOARD ────────────────────────────────
let weekDate = new Date();

async function loadDashboard() {
  const [stats, todayShifts, monthSummary] = await Promise.all([
    API('/shifts/stats'),
    API('/shifts/today'),
    API('/workers/summary/month')
  ]);
  renderStats(stats);
  renderTodayList(todayShifts);
  renderMonthSummary(monthSummary);
  renderWeekCalendar();
}

function renderStats(s) {
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><div class="label">Turne sot</div><div class="value">${s.today_shifts}</div><div class="sub">aktive</div></div>
    <div class="stat-card"><div class="label">Punëtorë aktiv sot</div><div class="value">${s.active_workers_today}</div><div class="sub">nga ${s.total_workers} gjithsej</div></div>
    <div class="stat-card"><div class="label">Turne këtë javë</div><div class="value">${s.week_shifts}</div><div class="sub">${fmtDate(s.week_start)} – ${fmtDate(s.week_end)}</div></div>
    <div class="stat-card"><div class="label">Punëtorë gjithsej</div><div class="value">${s.total_workers}</div><div class="sub">të regjistruar</div></div>
  `;
}

function renderTodayList(shifts) {
  const el = document.getElementById('today-list');
  if (!shifts.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">🌙</div><p>Nuk ka turne sot</p></div>';
    return;
  }
  el.innerHTML = '<div class="today-list">' + shifts.map(s => `
    <div class="today-item ${s.status}">
      <div class="time">${s.start_time}</div>
      <div class="info">
        <div class="worker">👷 ${esc(s.worker_name)}</div>
        <div class="location">📍 ${esc(s.location_name)} · ${esc(s.location_address)}</div>
        <div class="duration">⏱ ${fmtHours(s.duration_hours)} · ${statusBadge(s.status)}</div>
      </div>
    </div>
  `).join('') + '</div>';
}

function renderMonthSummary(summary) {
  const el = document.getElementById('month-summary');
  if (!summary.length) { el.innerHTML = '<div class="empty-state"><p>Nuk ka të dhëna</p></div>'; return; }
  el.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Punëtori</th><th>Turne</th><th>Orët</th></tr></thead><tbody>' +
    summary.map(w => `<tr><td>${esc(w.name)}</td><td>${w.shift_count}</td><td><strong>${fmtHours(w.month_hours)}</strong></td></tr>`).join('') +
    '</tbody></table></div>';
}

async function renderWeekCalendar() {
  const days = getWeekDates(weekDate);
  const monday = days[0].toISOString().slice(0, 10);
  const sunday = days[6].toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  document.getElementById('week-label').textContent =
    `${fmtDate(monday)} – ${fmtDate(sunday)}`;

  const data = await API(`/shifts?date_from=${monday}&date_to=${sunday}`);
  // Group by date
  const byDate = {};
  data.forEach(s => {
    if (!byDate[s.date]) byDate[s.date] = [];
    byDate[s.date].push(s);
  });

  // Store shifts data for day-modal access
  window._weekShiftsByDate = byDate;

  document.getElementById('week-grid').innerHTML = days.map((day, i) => {
    const dateStr = day.toISOString().slice(0, 10);
    const isToday = dateStr === today;
    const dayShifts = byDate[dateStr] || [];
    const hasShifts = dayShifts.length > 0;
    return `
      <div class="week-day${isToday ? ' today' : ''}${hasShifts ? ' has-shifts' : ''}" onclick="openDayModal('${dateStr}', '${dayNames[i]} ${day.getDate()}/${day.getMonth()+1}')">
        <div class="week-day-header">
          ${dayNames[i]}<br>${day.getDate()}/${day.getMonth()+1}
          ${hasShifts ? `<span class="day-shift-count">${dayShifts.length}</span>` : ''}
        </div>
        <div class="week-day-body">
          ${hasShifts ? dayShifts.map(s => `
            <div class="shift-chip ${s.status}" title="${esc(s.worker_name)} @ ${esc(s.location_name)}">
              ${s.start_time} ${esc(s.worker_name.split(' ')[0])}<br>
              <span style="opacity:0.8">${esc(s.location_name)}</span>
            </div>
          `).join('') : '<div style="color:#cbd5e0;font-size:0.7rem;padding:4px;">—</div>'}
        </div>
      </div>
    `;
  }).join('');
}

function getWeekNumber(d) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function openDayModal(dateStr, dayLabel) {
  const shifts = (window._weekShiftsByDate || {})[dateStr] || [];
  document.getElementById('day-modal-title').textContent = `📅 ${dayLabel}`;

  if (!shifts.length) {
    document.getElementById('day-modal-body').innerHTML = `
      <div class="empty-state" style="padding:32px;">
        <div class="icon">🌙</div>
        <p>Nuk ka turne këtë ditë</p>
      </div>`;
  } else {
    document.getElementById('day-modal-body').innerHTML = `
      <div style="padding:0 4px;">
        ${shifts.map(s => `
          <div class="day-shift-row ${s.status}">
            <div class="day-shift-time">${s.start_time}<span style="font-size:0.7rem;color:var(--text-muted);display:block;">${fmtHours(s.duration_hours)}</span></div>
            <div class="day-shift-info">
              <div class="day-shift-worker">👷 ${esc(s.worker_name)}</div>
              <div class="day-shift-location">📍 ${esc(s.location_name)}</div>
              ${s.note ? `<div class="day-shift-note">💬 ${esc(s.note)}</div>` : ''}
            </div>
            <div class="day-shift-meta">
              ${statusBadge(s.status)}
              ${currentRole === 'admin' ? `<button class="btn btn-ghost btn-sm admin-only" style="margin-top:6px;" onclick="openShiftEditFromDay(${s.id})">✏️</button>` : ''}
            </div>
          </div>
        `).join('')}
      </div>`;
  }

  // Update "Shto Turn" button with pre-filled date
  const addBtn = document.getElementById('day-add-shift-btn');
  addBtn.onclick = () => {
    document.getElementById('day-modal').classList.remove('open');
    openShiftModal(null, null, null, dateStr);
  };
  if (currentRole === 'admin') addBtn.classList.remove('hidden');
  else addBtn.classList.add('hidden');

  document.getElementById('day-modal').classList.add('open');
}

function openShiftEditFromDay(id) {
  document.getElementById('day-modal').classList.remove('open');
  openShiftEdit(id);
}

document.getElementById('week-prev').onclick = () => { weekDate.setDate(weekDate.getDate() - 7); renderWeekCalendar(); };
document.getElementById('week-next').onclick = () => { weekDate.setDate(weekDate.getDate() + 7); renderWeekCalendar(); };
document.getElementById('week-today').onclick = () => { weekDate = new Date(); renderWeekCalendar(); };

// ── WORKERS ──────────────────────────────────
async function loadWorkers() {
  document.getElementById('workers-list-view').classList.remove('hidden');
  document.getElementById('worker-detail-view').classList.add('hidden');

  const [wrkrs, summary] = await Promise.all([API('/workers'), API('/workers/summary/month')]);
  workers = wrkrs;
  populateSelects();

  const hoursMap = {};
  summary.forEach(s => hoursMap[s.id] = { hours: s.month_hours, count: s.shift_count });

  document.getElementById('workers-tbody').innerHTML = workers.length ? workers.map(w => {
    const h = hoursMap[w.id] || { hours: 0, count: 0 };
    return `<tr>
      <td><strong style="cursor:pointer;color:var(--accent);" onclick="showWorkerDetail(${w.id})">${esc(w.name)}</strong></td>
      <td>${w.phone ? `<a href="tel:${esc(w.phone)}">${esc(w.phone)}</a>` : '-'}</td>
      <td style="max-width:200px;color:var(--text-muted);font-size:0.82rem;">${esc(w.note || '')}</td>
      <td>${fmtHours(h.hours)} <small style="color:var(--text-muted)">(${h.count} turne)</small></td>
      <td>
        ${currentRole === 'admin' ? `<div class="btn-group">
          <button class="btn btn-ghost btn-sm" onclick="editWorker(${w.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteWorker(${w.id}, '${esc(w.name)}')">🗑️</button>
        </div>` : ''}
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="5"><div class="empty-state"><div class="icon">👷</div><p>Nuk ka punëtorë të regjistruar</p></div></td></tr>';
}

async function showWorkerDetail(id) {
  const data = await API('/workers/' + id);
  document.getElementById('workers-list-view').classList.add('hidden');
  const detail = document.getElementById('worker-detail-view');
  detail.classList.remove('hidden');
  detail.innerHTML = `
    <div class="detail-back" onclick="loadWorkers()">← Kthehu tek lista</div>
    <div class="card mb-16">
      <div class="card-header">
        <h3>👷 ${esc(data.name)}</h3>
        <div class="btn-group">
          <button class="btn btn-ghost btn-sm" onclick="editWorker(${data.id})">✏️ Edito</button>
          <button class="btn btn-primary btn-sm" onclick="openShiftModal(null,'${data.id}')">+ Turn i ri</button>
        </div>
      </div>
      <div class="card-body">
        <div class="info-grid">
          <div class="info-item"><label>Telefoni</label><span>${data.phone ? `<a href="tel:${esc(data.phone)}">${esc(data.phone)}</a>` : '-'}</span></div>
          <div class="info-item"><label>Orët këtë muaj</label><span>${fmtHours(data.month_hours)}</span></div>
          <div class="info-item"><label>Shënim</label><span>${esc(data.note || '-')}</span></div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Historia e Turneve</h3></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Ora</th><th>Lokacioni</th><th>Orët</th><th>Statusi</th><th></th></tr></thead>
          <tbody>${data.shifts.length ? data.shifts.map(s => `
            <tr>
              <td>${fmtDate(s.date)}</td>
              <td>${s.start_time}</td>
              <td>${esc(s.location_name)}<br><small style="color:var(--text-muted)">${esc(s.location_address)}</small></td>
              <td>${fmtHours(s.duration_hours)}</td>
              <td>${statusBadge(s.status)}</td>
              <td><button class="btn btn-ghost btn-sm" onclick="openShiftEdit(${s.id})">✏️</button></td>
            </tr>
          `).join('') : '<tr><td colspan="6"><div class="empty-state"><p>Nuk ka turne</p></div></td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

document.getElementById('add-worker-btn').onclick = () => openWorkerModal();

function openWorkerModal(worker = null) {
  document.getElementById('worker-modal-title').textContent = worker ? 'Edito Punëtorin' : 'Shto Punëtor';
  document.getElementById('worker-id').value = worker ? worker.id : '';
  document.getElementById('worker-name').value = worker ? worker.name : '';
  document.getElementById('worker-phone').value = worker ? (worker.phone || '') : '';
  document.getElementById('worker-note').value = worker ? (worker.note || '') : '';
  document.getElementById('worker-modal').classList.add('open');
}

function editWorker(id) {
  const w = workers.find(x => x.id == id);
  if (w) openWorkerModal(w);
  else API('/workers/' + id).then(data => openWorkerModal(data));
}

document.getElementById('worker-save-btn').onclick = async () => {
  const id = document.getElementById('worker-id').value;
  const body = {
    name: document.getElementById('worker-name').value,
    phone: document.getElementById('worker-phone').value,
    note: document.getElementById('worker-note').value
  };
  try {
    if (id) await API('/workers/' + id, { method: 'PUT', body });
    else await API('/workers', { method: 'POST', body });
    document.getElementById('worker-modal').classList.remove('open');
    showToast(id ? 'Punëtori u përditësua' : 'Punëtori u shtua', 'success');
    loadWorkers();
    loadAllData();
  } catch (e) { showToast(e.message, 'error'); }
};

async function deleteWorker(id, name) {
  const ok = await confirm('Fshi punëtorin', `A jeni i sigurt që doni të fshini "${name}"? Të gjitha turnet e tij do të fshihen gjithashtu.`);
  if (!ok) return;
  try {
    await API('/workers/' + id, { method: 'DELETE' });
    showToast('Punëtori u fshi', 'success');
    loadWorkers();
    loadAllData();
  } catch (e) { showToast(e.message, 'error'); }
}

// ── LOCATIONS ────────────────────────────────
async function loadLocations() {
  document.getElementById('locations-list-view').classList.remove('hidden');
  document.getElementById('location-detail-view').classList.add('hidden');

  locations = await API('/locations');
  populateSelects();

  document.getElementById('locations-tbody').innerHTML = locations.length ? locations.map(l => `
    <tr>
      <td><strong style="cursor:pointer;color:var(--accent);" onclick="showLocationDetail(${l.id})">${esc(l.name)}</strong></td>
      <td>${esc(l.address)}</td>
      <td style="max-width:200px;color:var(--text-muted);font-size:0.82rem;">${esc(l.note || '')}</td>
      <td>
        ${currentRole === 'admin' ? `<div class="btn-group">
          <button class="btn btn-ghost btn-sm" onclick="editLocation(${l.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteLocation(${l.id}, '${esc(l.name)}')">🗑️</button>
        </div>` : ''}
      </td>
    </tr>
  `).join('') : '<tr><td colspan="4"><div class="empty-state"><div class="icon">📍</div><p>Nuk ka lokacione të regjistruara</p></div></td></tr>';
}

async function showLocationDetail(id) {
  const data = await API('/locations/' + id);
  document.getElementById('locations-list-view').classList.add('hidden');
  const detail = document.getElementById('location-detail-view');
  detail.classList.remove('hidden');
  detail.innerHTML = `
    <div class="detail-back" onclick="loadLocations()">← Kthehu tek lista</div>
    <div class="card mb-16">
      <div class="card-header">
        <h3>📍 ${esc(data.name)}</h3>
        <div class="btn-group">
          <button class="btn btn-ghost btn-sm" onclick="editLocation(${data.id})">✏️ Edito</button>
          <button class="btn btn-primary btn-sm" onclick="openShiftModal(null,null,'${data.id}')">+ Turn i ri</button>
        </div>
      </div>
      <div class="card-body">
        <div class="info-grid">
          <div class="info-item"><label>Adresa</label><span>${esc(data.address)}</span></div>
          <div class="info-item"><label>Shënim</label><span>${esc(data.note || '-')}</span></div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Historia e Vizitave</h3></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Ora</th><th>Punëtori</th><th>Orët</th><th>Statusi</th><th></th></tr></thead>
          <tbody>${data.visits.length ? data.visits.map(s => `
            <tr>
              <td>${fmtDate(s.date)}</td>
              <td>${s.start_time}</td>
              <td>${esc(s.worker_name)}${s.worker_phone ? `<br><small style="color:var(--text-muted)">${esc(s.worker_phone)}</small>` : ''}</td>
              <td>${fmtHours(s.duration_hours)}</td>
              <td>${statusBadge(s.status)}</td>
              <td><button class="btn btn-ghost btn-sm" onclick="openShiftEdit(${s.id})">✏️</button></td>
            </tr>
          `).join('') : '<tr><td colspan="6"><div class="empty-state"><p>Nuk ka vizita</p></div></td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

document.getElementById('add-location-btn').onclick = () => openLocationModal();

function openLocationModal(loc = null) {
  document.getElementById('location-modal-title').textContent = loc ? 'Edito Lokacionin' : 'Shto Lokacion';
  document.getElementById('location-id').value = loc ? loc.id : '';
  document.getElementById('location-name').value = loc ? loc.name : '';
  document.getElementById('location-address').value = loc ? loc.address : '';
  document.getElementById('location-note').value = loc ? (loc.note || '') : '';
  document.getElementById('location-modal').classList.add('open');
}

function editLocation(id) {
  const l = locations.find(x => x.id == id);
  if (l) openLocationModal(l);
  else API('/locations/' + id).then(data => openLocationModal(data));
}

document.getElementById('location-save-btn').onclick = async () => {
  const id = document.getElementById('location-id').value;
  const body = {
    name: document.getElementById('location-name').value,
    address: document.getElementById('location-address').value,
    note: document.getElementById('location-note').value
  };
  try {
    if (id) await API('/locations/' + id, { method: 'PUT', body });
    else await API('/locations', { method: 'POST', body });
    document.getElementById('location-modal').classList.remove('open');
    showToast(id ? 'Lokacioni u përditësua' : 'Lokacioni u shtua', 'success');
    loadLocations();
    loadAllData();
  } catch (e) { showToast(e.message, 'error'); }
};

async function deleteLocation(id, name) {
  const ok = await confirm('Fshi lokacionin', `A jeni i sigurt që doni të fshini "${name}"? Të gjitha turnet lidhur me të do të fshihen gjithashtu.`);
  if (!ok) return;
  try {
    await API('/locations/' + id, { method: 'DELETE' });
    showToast('Lokacioni u fshi', 'success');
    loadLocations();
    loadAllData();
  } catch (e) { showToast(e.message, 'error'); }
}

// ── SHIFTS ───────────────────────────────────
async function loadShifts() {
  const params = new URLSearchParams();
  const from = document.getElementById('shift-date-from').value;
  const to = document.getElementById('shift-date-to').value;
  const wId = document.getElementById('shift-filter-worker').value;
  const lId = document.getElementById('shift-filter-location').value;
  if (from) params.append('date_from', from);
  if (to) params.append('date_to', to);
  if (wId) params.append('worker_id', wId);
  if (lId) params.append('location_id', lId);

  const path = '/shifts' + (params.toString() ? '?' + params.toString() : '');
  let shifts = await API(path);

  const statusFilter = document.getElementById('shift-filter-status').value;
  if (statusFilter) shifts = shifts.filter(s => s.status === statusFilter);

  document.getElementById('shifts-tbody').innerHTML = shifts.length ? shifts.map(s => `
    <tr data-shift-id="${s.id}">
      <td>${fmtDate(s.date)}</td>
      <td>${s.start_time}</td>
      <td>${esc(s.worker_name)}</td>
      <td>${esc(s.location_name)}<br><small style="color:var(--text-muted)">${esc(s.location_address)}</small></td>
      <td>${fmtHours(s.duration_hours)}</td>
      <td>
        ${currentRole === 'admin' ? `
        <select class="status-select" data-id="${s.id}" style="font-size:0.78rem;padding:4px 8px;border-radius:6px;border:1.5px solid var(--border);">
          <option value="planned" ${s.status==='planned'?'selected':''}>I planifikuar</option>
          <option value="completed" ${s.status==='completed'?'selected':''}>I kryer</option>
          <option value="cancelled" ${s.status==='cancelled'?'selected':''}>I anuluar</option>
        </select>` : statusBadge(s.status)}
      </td>
      <td>
        ${currentRole === 'admin' ? `<div class="btn-group">
          <button class="btn btn-ghost btn-sm" onclick="openShiftEdit(${s.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteShift(${s.id})">🗑️</button>
        </div>` : ''}
      </td>
    </tr>
  `).join('') : '<tr><td colspan="7"><div class="empty-state"><div class="icon">📅</div><p>Nuk ka turne</p></div></td></tr>';

  // Status change inline
  document.querySelectorAll('.status-select').forEach(sel => {
    sel.onchange = async () => {
      try {
        await API('/shifts/' + sel.dataset.id + '/status', { method: 'PATCH', body: { status: sel.value } });
        showToast('Statusi u ndryshua', 'success');
      } catch (e) { showToast(e.message, 'error'); }
    };
  });
}

document.getElementById('shift-filter-btn').onclick = loadShifts;
document.getElementById('shift-filter-status').onchange = loadShifts;
document.getElementById('add-shift-btn').onclick = () => openShiftModal();

document.getElementById('shift-delete-filtered-btn').onclick = async () => {
  const from = document.getElementById('shift-date-from').value;
  const to   = document.getElementById('shift-date-to').value;
  const wId  = document.getElementById('shift-filter-worker').value;
  const lId  = document.getElementById('shift-filter-location').value;
  const status = document.getElementById('shift-filter-status').value;

  // Count how many are visible
  const rows = document.querySelectorAll('#shifts-tbody tr[data-shift-id]');
  const ids  = Array.from(rows).map(r => r.dataset.shiftId).filter(Boolean);

  // Build description
  let desc = ids.length + ' turn' + (ids.length !== 1 ? 'e' : '');
  if (from || to) desc += ` (${from ? fmtDate(from) : '…'} – ${to ? fmtDate(to) : '…'})`;

  if (ids.length === 0) return showToast('Nuk ka turne për të fshirë', 'error');

  const ok = await confirm('Fshi në shumicë', `A jeni i sigurt? Do të fshihen ${desc}.`);
  if (!ok) return;

  let deleted = 0;
  for (const id of ids) {
    try { await API('/shifts/' + id, { method: 'DELETE' }); deleted++; } catch {}
  }
  showToast(`${deleted} turne u fshinë`, 'success');
  loadShifts();
  if (currentPage === 'dashboard') loadDashboard();
};

function openShiftModal(shift = null, preWorkerId = null, preLocationId = null, preDate = null) {
  const isEdit = !!shift;
  document.getElementById('shift-modal-title').textContent = isEdit ? 'Edito Turnin' : 'Shto Turn';
  document.getElementById('shift-id').value = isEdit ? shift.id : '';
  document.getElementById('shift-date').value = isEdit ? shift.date : (preDate || new Date().toISOString().slice(0, 10));
  document.getElementById('shift-start').value = isEdit ? shift.start_time : '08:00';
  document.getElementById('shift-duration').value = isEdit ? shift.duration_hours : '';
  document.getElementById('shift-status').value = isEdit ? shift.status : 'planned';
  document.getElementById('shift-note').value = isEdit ? (shift.note || '') : '';

  // Toggle single vs multi worker
  document.getElementById('worker-single-group').style.display = isEdit ? '' : 'none';
  document.getElementById('worker-multi-group').style.display = isEdit ? 'none' : '';

  if (isEdit) {
    document.getElementById('shift-worker-select').value = shift.worker_id;
  } else {
    // Build checkbox list
    const list = document.getElementById('worker-checkbox-list');
    list.innerHTML = workers.map(w => `
      <label class="worker-checkbox-item">
        <input type="checkbox" value="${w.id}" ${preWorkerId && String(preWorkerId) === String(w.id) ? 'checked' : ''}>
        <span>${esc(w.name)}${w.phone ? `<small style="color:var(--text-muted);margin-left:6px;">${esc(w.phone)}</small>` : ''}</span>
      </label>
    `).join('');
    // Update counter on change
    list.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', updateWorkerCount);
    });
    updateWorkerCount();
  }

  if (preLocationId) document.getElementById('shift-location-select').value = preLocationId;
  else if (isEdit) document.getElementById('shift-location-select').value = shift.location_id;

  // Recurrence — only in create mode
  const recGroup = document.getElementById('recurrence-group');
  recGroup.style.display = isEdit ? 'none' : '';
  if (!isEdit) {
    document.getElementById('shift-recurrence').value = '';
    document.getElementById('shift-recurrence-until').value = '';
    document.getElementById('recurrence-until-group').style.display = 'none';
    document.getElementById('recurrence-preview').textContent = '';
  }

  document.getElementById('shift-modal').classList.add('open');
}

function updateWorkerCount() {
  const checked = document.querySelectorAll('#worker-checkbox-list input:checked').length;
  const el = document.getElementById('worker-selected-count');
  if (el) el.textContent = checked > 0 ? `(${checked} zgjedhur)` : '';
}

// Recurrence helpers
document.getElementById('shift-recurrence').addEventListener('change', function() {
  const hasRecurrence = !!this.value;
  document.getElementById('recurrence-until-group').style.display = hasRecurrence ? '' : 'none';
  if (!hasRecurrence) {
    document.getElementById('shift-recurrence-until').value = '';
    document.getElementById('recurrence-preview').textContent = '';
  } else {
    updateRecurrencePreview();
  }
});

document.getElementById('shift-recurrence-until').addEventListener('change', updateRecurrencePreview);
document.getElementById('shift-date').addEventListener('change', updateRecurrencePreview);

function updateRecurrencePreview() {
  const type = document.getElementById('shift-recurrence').value;
  const startDate = document.getElementById('shift-date').value;
  const until = document.getElementById('shift-recurrence-until').value;
  const preview = document.getElementById('recurrence-preview');
  if (!type || !startDate || !until) { preview.textContent = ''; return; }
  const dates = generateRecurrenceDates(startDate, until, type);
  if (dates.length === 0) { preview.textContent = 'Data e mbarimit duhet të jetë pas datës së fillimit.'; return; }
  preview.textContent = `→ Do të krijohen ${dates.length} turn${dates.length > 1 ? 'e' : ''} (deri më ${fmtDate(until)})`;
}

function generateRecurrenceDates(startDate, untilDate, type) {
  const dates = [];
  const until = new Date(untilDate + 'T00:00:00');
  let current = new Date(startDate + 'T00:00:00');
  const MAX = 365;

  while (current <= until && dates.length < MAX) {
    dates.push(current.toISOString().slice(0, 10));
    const next = new Date(current);
    if (type === 'daily')        next.setDate(current.getDate() + 1);
    else if (type === 'weekly')  next.setDate(current.getDate() + 7);
    else if (type === 'monthly') next.setMonth(current.getMonth() + 1);
    current = next;
  }
  return dates;
}

async function openShiftEdit(id) {
  const shifts = await API('/shifts?worker_id=&location_id=');
  // Try to find in cached data first, otherwise fetch specific
  const all = await API('/shifts');
  const shift = all.find(s => s.id == id);
  if (shift) openShiftModal(shift);
  else {
    const data = await API('/shifts/' + id).catch(() => null);
    if (data) openShiftModal(data);
  }
  navigateTo('shifts');
}

document.getElementById('shift-save-btn').onclick = async () => {
  const id = document.getElementById('shift-id').value;
  const baseBody = {
    location_id: document.getElementById('shift-location-select').value,
    date: document.getElementById('shift-date').value,
    start_time: document.getElementById('shift-start').value,
    duration_hours: document.getElementById('shift-duration').value,
    status: document.getElementById('shift-status').value,
    note: document.getElementById('shift-note').value
  };

  if (!baseBody.location_id) return showToast('Zgjedh një lokacion', 'error');
  if (!baseBody.date) return showToast('Zgjidh datën', 'error');
  if (!baseBody.start_time) return showToast('Zgjidh orën', 'error');
  if (!baseBody.duration_hours) return showToast('Shto kohëzgjatjen', 'error');

  try {
    if (id) {
      // EDIT — single worker
      const body = { ...baseBody, worker_id: document.getElementById('shift-worker-select').value };
      if (!body.worker_id) return showToast('Zgjedh punëtorin', 'error');
      await API('/shifts/' + id, { method: 'PUT', body });
      showToast('Turni u përditësua', 'success');
    } else {
      // CREATE — multi worker + recurrence
      const checkedBoxes = document.querySelectorAll('#worker-checkbox-list input:checked');
      if (checkedBoxes.length === 0) return showToast('Zgjedh të paktën një punëtor', 'error');

      const workerIds = Array.from(checkedBoxes).map(cb => cb.value);
      const recType = document.getElementById('shift-recurrence').value;
      const recUntil = document.getElementById('shift-recurrence-until').value;

      // Build list of dates
      let dates = [baseBody.date];
      if (recType && recUntil) {
        dates = generateRecurrenceDates(baseBody.date, recUntil, recType);
        if (dates.length === 0) return showToast('Data e mbarimit duhet të jetë pas datës së fillimit', 'error');
      }

      let created = 0;
      const errors = [];
      for (const dateStr of dates) {
        for (const wid of workerIds) {
          try {
            await API('/shifts', { method: 'POST', body: { ...baseBody, date: dateStr, worker_id: wid } });
            created++;
          } catch (e) {
            const wName = workers.find(w => String(w.id) === String(wid))?.name || wid;
            errors.push(`${fmtDate(dateStr)} ${wName}: ${e.message}`);
          }
        }
      }
      if (errors.length > 0 && created === 0) {
        showToast(`Gabime: ${errors.slice(0,2).join(' | ')}`, 'error');
      } else if (errors.length > 0) {
        showToast(`${created} u shtuan, ${errors.length} konflikte`, 'error');
      } else {
        showToast(`${created} turn${created > 1 ? 'e' : ''} u shtuan`, 'success');
      }
    }
    document.getElementById('shift-modal').classList.remove('open');
    if (currentPage === 'shifts') loadShifts();
    else loadDashboard();
  } catch (e) { showToast(e.message, 'error'); }
};

async function deleteShift(id) {
  const ok = await confirm('Fshi turnin', 'A jeni i sigurt që doni ta fshini këtë turn?');
  if (!ok) return;
  try {
    await API('/shifts/' + id, { method: 'DELETE' });
    showToast('Turni u fshi', 'success');
    loadShifts();
  } catch (e) { showToast(e.message, 'error'); }
}

// ── REPORTS ──────────────────────────────────
function loadReportFilters() {
  // Set default dates: first of month → today
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const today = now.toISOString().slice(0, 10);
  if (!document.getElementById('rep-date-from').value) document.getElementById('rep-date-from').value = firstDay;
  if (!document.getElementById('rep-date-to').value) document.getElementById('rep-date-to').value = today;
}

document.getElementById('rep-run-btn').onclick = async () => {
  const params = new URLSearchParams();
  const from = document.getElementById('rep-date-from').value;
  const to = document.getElementById('rep-date-to').value;
  const wId = document.getElementById('rep-worker').value;
  const lId = document.getElementById('rep-location').value;
  if (from) params.append('date_from', from);
  if (to) params.append('date_to', to);
  if (wId) params.append('worker_id', wId);
  if (lId) params.append('location_id', lId);

  try {
    const data = await API('/reports?' + params.toString());
    const output = document.getElementById('report-output');
    output.style.display = 'block';

    // Title
    let title = 'Raport';
    if (from || to) title += ` (${fmtDate(from) || '...'} – ${fmtDate(to) || '...'})`;
    document.getElementById('report-title').textContent = title;
    document.getElementById('report-total-badge').textContent = `Total: ${fmtHours(data.total_hours)} · ${data.count} turne`;
    document.getElementById('report-total-hours').textContent = fmtHours(data.total_hours);

    document.getElementById('report-tbody').innerHTML = data.rows.length ? data.rows.map(r => `
      <tr>
        <td>${fmtDate(r.date)}</td>
        <td>${r.start_time}</td>
        <td>${esc(r.worker_name)}</td>
        <td>${esc(r.location_name)}</td>
        <td style="font-size:0.8rem;color:var(--text-muted)">${esc(r.location_address)}</td>
        <td><strong>${fmtHours(r.duration_hours)}</strong></td>
        <td>${statusBadge(r.status)}</td>
        <td style="font-size:0.8rem;color:var(--text-muted)">${esc(r.note || '')}</td>
      </tr>
    `).join('') : '<tr><td colspan="8"><div class="empty-state"><p>Nuk ka të dhëna për filtrat e zgjedhura</p></div></td></tr>';
  } catch (e) { showToast(e.message, 'error'); }
};

document.getElementById('rep-print-btn').onclick = () => window.print();

// ── INIT ─────────────────────────────────────
init();
