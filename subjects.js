// ─── subjects.js ──────────────────────────────────────────
// Manages subject/category data and rendering

const SUBJECT_COLORS = [
  '#8b5cf6','#22d3ee','#10b981','#f59e0b',
  '#ef4444','#f97316','#ec4899','#6366f1',
  '#14b8a6','#84cc16',
];

let subjects = [];

export function loadSubjects() {
  try { subjects = JSON.parse(localStorage.getItem('stm_subjects') || '[]'); }
  catch { subjects = []; }
  if (subjects.length === 0) {
    subjects = [
      { id: 's1', name: 'Mathematics',   icon: '📐', color: '#8b5cf6' },
      { id: 's2', name: 'Science',        icon: '🔬', color: '#22d3ee' },
      { id: 's3', name: 'English',        icon: '📖', color: '#10b981' },
      { id: 's4', name: 'History',        icon: '🏛️', color: '#f59e0b' },
      { id: 's5', name: 'Computer Sci.',  icon: '💻', color: '#ef4444' },
    ];
    saveSubjects();
  }
}

export function saveSubjects() {
  localStorage.setItem('stm_subjects', JSON.stringify(subjects));
}

export function getSubjects() { return subjects; }

export function getSubjectById(id) {
  return subjects.find(s => s.id === id) || null;
}

export function addSubject(subjectData) {
  const subject = {
    id: 'sub_' + Date.now(),
    name: subjectData.name.trim(),
    icon: subjectData.icon || '📘',
    color: subjectData.color || SUBJECT_COLORS[0],
  };
  subjects.push(subject);
  saveSubjects();
  return subject;
}

export function deleteSubject(id) {
  subjects = subjects.filter(s => s.id !== id);
  saveSubjects();
}

// Renders subjects page grid
export function renderSubjectsPage(tasks) {
  const grid = document.getElementById('subjects-grid');
  if (!grid) return;

  if (subjects.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <span class="empty-icon">📚</span>
      <p>No subjects added yet.<br>Add a subject to tag your tasks!</p>
    </div>`;
    return;
  }

  grid.innerHTML = subjects.map(s => {
    const taskCount = tasks.filter(t => t.subjectId === s.id).length;
    const doneCount = tasks.filter(t => t.subjectId === s.id && t.status === 'done').length;
    const pct = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;
    return `
    <div class="subject-card" id="subject-card-${s.id}" style="border-color:${s.color}22;">
      <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:${s.color};border-radius:0 0 16px 16px;"></div>
      <div class="subject-header">
        <div>
          <span class="subject-icon">${s.icon}</span>
          <div class="subject-name" style="color:${s.color}">${escHtml(s.name)}</div>
          <div class="subject-count">${taskCount} task${taskCount !== 1 ? 's' : ''} · ${doneCount} done</div>
        </div>
        <button class="btn btn-danger btn-sm btn-icon" onclick="window.deleteSubjectById('${s.id}')" title="Delete Subject">🗑️</button>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" style="width:${pct}%;background:${s.color};"></div>
      </div>
      <div style="text-align:right;font-size:0.75rem;color:var(--text-muted);margin-top:4px;">${pct}% complete</div>
    </div>`;
  }).join('');
}

// Fills subject dropdowns across the app
export function populateSubjectSelects() {
  const ids = ['task-subject-input', 'filter-subject', 'grade-subject-input'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const isFilter = id === 'filter-subject';
    const isGrade  = id === 'grade-subject-input';
    const current = el.value;
    el.innerHTML = isFilter
      ? '<option value="">All Subjects</option>'
      : isGrade
        ? '<option value="">— Select Subject —</option>'
        : '<option value="">No Subject</option>';
    subjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.icon} ${s.name}`;
      el.appendChild(opt);
    });
    if (current) el.value = current;
  });
}

// Render color picker inside subject modal
export function renderColorPicker(selectedColor) {
  const row = document.getElementById('color-picker-row');
  if (!row) return;
  row.innerHTML = SUBJECT_COLORS.map(c => `
    <div class="color-dot${c === selectedColor ? ' selected' : ''}"
      style="background:${c};"
      data-color="${c}"
      onclick="window.selectSubjectColor('${c}')"
      title="${c}">
    </div>
  `).join('');
}

export function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
