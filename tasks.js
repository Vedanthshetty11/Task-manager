// ─── tasks.js ────────────────────────────────────────────
// Manages task data, filtering, and rendering (Kanban board)

import { getSubjectById, escHtml } from './subjects.js';

let tasks = [];

export function loadTasks() {
  try { tasks = JSON.parse(localStorage.getItem('stm_tasks') || '[]'); }
  catch { tasks = []; }
}

export function saveTasks() {
  localStorage.setItem('stm_tasks', JSON.stringify(tasks));
}

export function getTasks() { return tasks; }

export function addTask(data) {
  const task = {
    id: 'task_' + Date.now(),
    title:     data.title.trim(),
    desc:      data.desc?.trim() || '',
    subjectId: data.subjectId || '',
    priority:  data.priority  || 'medium',
    status:    data.status    || 'todo',
    dueDate:   data.dueDate   || '',
    createdAt: new Date().toISOString(),
  };
  tasks.unshift(task);
  saveTasks();
  return task;
}

export function updateTask(id, data) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return;
  tasks[idx] = { ...tasks[idx], ...data };
  saveTasks();
}

export function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
}

export function getTaskById(id) {
  return tasks.find(t => t.id === id) || null;
}

// ── Due-date helpers ──────────────────────────────────────
function parseDue(dateStr) {
  if (!dateStr) return null;
  const [y,m,d] = dateStr.split('-').map(Number);
  return new Date(y, m-1, d);
}

function dueStatus(dateStr) {
  if (!dateStr) return 'none';
  const due  = parseDue(dateStr);
  const now  = new Date(); now.setHours(0,0,0,0);
  const diff = Math.ceil((due - now) / 86400000);
  if (diff < 0)  return 'overdue';
  if (diff <= 2) return 'due-soon';
  return 'ok';
}

function dueLabelText(dateStr) {
  if (!dateStr) return '';
  const due  = parseDue(dateStr);
  const now  = new Date(); now.setHours(0,0,0,0);
  const diff = Math.ceil((due - now) / 86400000);
  if (diff < 0)  return `⚠️ Overdue by ${Math.abs(diff)}d`;
  if (diff === 0) return '📅 Due Today';
  if (diff === 1) return '📅 Tomorrow';
  return `📅 ${due.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;
}

// ── Build task card HTML ──────────────────────────────────
function taskCardHTML(task) {
  const subject    = task.subjectId ? getSubjectById(task.subjectId) : null;
  const ds         = dueStatus(task.dueDate);
  const dueText    = dueLabelText(task.dueDate);

  const subjBadge  = subject
    ? `<span class="tag subject-badge" style="background:${subject.color}22;color:${subject.color};border:1px solid ${subject.color}44;">${subject.icon} ${escHtml(subject.name)}</span>`
    : '';

  const dueBadge   = dueText
    ? `<span class="tag due-badge ${ds === 'overdue' ? 'overdue' : ds === 'due-soon' ? 'due-soon' : ''}">${dueText}</span>`
    : '';

  const priorityBadge = `<span class="tag priority-badge priority-${task.priority}">${task.priority.toUpperCase()}</span>`;

  return `
  <div class="task-card priority-${task.priority}" id="task-card-${task.id}" data-id="${task.id}">
    <div class="task-card-header">
      <div class="task-title">${escHtml(task.title)}</div>
      <div class="task-actions">
        <button onclick="window.openEditTask('${task.id}')" title="Edit">✏️</button>
        <button onclick="window.cycleTaskStatus('${task.id}')" title="Move to next status">⏩</button>
        <button onclick="window.confirmDeleteTask('${task.id}')" title="Delete">🗑️</button>
      </div>
    </div>
    ${task.desc ? `<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.4rem;line-height:1.5;">${escHtml(task.desc).slice(0,120)}${task.desc.length > 120 ? '…' : ''}</div>` : ''}
    <div class="task-meta">
      ${subjBadge}
      ${priorityBadge}
      ${dueBadge}
    </div>
  </div>`;
}

// ── Render Kanban Board ───────────────────────────────────
export function renderTasks(filterSubject = '', filterPriority = '', search = '') {
  const cols = { todo: [], progress: [], done: [] };

  const filtered = tasks.filter(t => {
    if (filterSubject  && t.subjectId !== filterSubject)   return false;
    if (filterPriority && t.priority  !== filterPriority)  return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
                  !t.desc.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  filtered.forEach(t => cols[t.status]?.push(t));

  const statuses = ['todo', 'progress', 'done'];
  const listIds  = { todo: 'list-todo', progress: 'list-progress', done: 'list-done' };
  const countIds = { todo: 'count-todo', progress: 'count-progress', done: 'count-done' };

  statuses.forEach(status => {
    const listEl  = document.getElementById(listIds[status]);
    const countEl = document.getElementById(countIds[status]);
    if (!listEl || !countEl) return;

    countEl.textContent = cols[status].length;

    if (cols[status].length === 0) {
      listEl.innerHTML = `<div class="empty-state" style="padding:1.5rem 0.5rem;">
        <span class="empty-icon" style="font-size:2rem;">📭</span>
        <p style="font-size:0.8rem;">No tasks here</p>
      </div>`;
    } else {
      listEl.innerHTML = cols[status].map(taskCardHTML).join('');
    }
  });
}

// ── Render Upcoming Deadlines (Dashboard) ─────────────────
export function renderUpcoming() {
  const container = document.getElementById('upcoming-tasks');
  if (!container) return;

  const now = new Date(); now.setHours(0,0,0,0);
  const upcoming = tasks
    .filter(t => t.status !== 'done' && t.dueDate)
    .map(t => ({ ...t, _due: parseDue(t.dueDate) }))
    .filter(t => t._due >= now)
    .sort((a,b) => a._due - b._due)
    .slice(0, 6);

  if (upcoming.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <span class="empty-icon">📭</span>
      <p>No upcoming tasks.<br>Add some tasks to get started!</p>
    </div>`;
    return;
  }

  const PRIORITY_COLORS = {
    low:'#22d3ee', medium:'#f59e0b', high:'#f97316', critical:'#ef4444'
  };

  container.innerHTML = upcoming.map(t => {
    const subject = t.subjectId ? getSubjectById(t.subjectId) : null;
    return `<div class="recent-task-item">
      <div class="rt-indicator" style="background:${PRIORITY_COLORS[t.priority] || '#8b5cf6'};box-shadow:0 0 6px ${PRIORITY_COLORS[t.priority]}88;"></div>
      <div class="rt-title">${escHtml(t.title)}</div>
      ${subject ? `<span class="tag subject-badge" style="background:${subject.color}22;color:${subject.color};border:1px solid ${subject.color}44;font-size:0.7rem;">${subject.icon} ${escHtml(subject.name)}</span>` : ''}
      <div class="rt-due">${dueLabelText(t.dueDate)}</div>
    </div>`;
  }).join('');
}

// ── Dashboard Stats ───────────────────────────────────────
export function updateStats(gpa) {
  const now = new Date(); now.setHours(0,0,0,0);
  const total    = tasks.length;
  const done     = tasks.filter(t => t.status === 'done').length;
  const dueToday = tasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false;
    const d = parseDue(t.dueDate);
    return d && d.getTime() === now.getTime();
  }).length;

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  setEl('stat-total',     total);
  setEl('stat-due-today', dueToday);
  setEl('stat-done',      done);
  setEl('stat-gpa',       gpa != null ? gpa.toFixed(2) : '—');
  setEl('progress-pct',   pct + '%');
  const bar = document.getElementById('progress-bar');
  if (bar) bar.style.width = pct + '%';
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
