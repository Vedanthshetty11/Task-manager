// ─── app.js ───────────────────────────────────────────────
// Main entry point: routing, theme, modal orchestration

import {
  loadSubjects, saveSubjects, getSubjects, addSubject, deleteSubject,
  renderSubjectsPage, populateSubjectSelects, renderColorPicker, escHtml
} from './subjects.js';

import {
  loadTasks, getTasks, addTask, updateTask, deleteTask, getTaskById,
  renderTasks, renderUpcoming, updateStats
} from './tasks.js';

import {
  loadGrades, getGrades, addGrade, deleteGrade,
  renderGradesPage, calculateGPA
} from './grades.js';

// ── State ─────────────────────────────────────────────────
let currentPage       = 'dashboard';
let taskEditId        = null;      // null = creating, string = editing
let selectedSubjColor = '#8b5cf6'; // for subject modal

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadSubjects();
  loadTasks();
  loadGrades();

  initTheme();
  initNav();
  initTaskModal();
  initSubjectModal();
  initGradeModal();
  initFilters();

  // Set today's date label
  const el = document.getElementById('dashboard-date');
  if (el) {
    el.textContent = new Date().toLocaleDateString('en-US',{
      weekday:'long', year:'numeric', month:'long', day:'numeric'
    });
  }

  // Wire global action buttons
  document.getElementById('dash-add-task')?.addEventListener('click', () => openTaskModal());
  document.getElementById('tasks-add-btn')?.addEventListener('click', () => openTaskModal());
  document.getElementById('subjects-add-btn')?.addEventListener('click', () => openSubjectModal());
  document.getElementById('grades-add-btn')?.addEventListener('click', () => openGradeModal());

  refreshAll();
  navigateTo('dashboard');
});

// ── Global helpers (called from inline HTML) ──────────────
window.openEditTask        = openEditTask;
window.cycleTaskStatus     = cycleTaskStatus;
window.confirmDeleteTask   = confirmDeleteTask;
window.deleteSubjectById   = deleteSubjectById;
window.deleteGradeById     = deleteGradeById;
window.selectSubjectColor  = selectSubjectColor;

// ── Theme ─────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('stm_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const curr = document.documentElement.getAttribute('data-theme');
    const next = curr === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('stm_theme', next);
  });
}

// ── Navigation ────────────────────────────────────────────
function initNav() {
  document.querySelectorAll('#main-nav button').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });
}

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('#main-nav button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach(sec => {
    sec.classList.toggle('active', sec.id === `page-${page}`);
  });
  if (page === 'subjects') renderSubjectsPage(getTasks());
  if (page === 'grades')   renderGradesPage();
  if (page === 'dashboard') refreshDashboard();
}

// ── Refresh All ───────────────────────────────────────────
function refreshAll() {
  populateSubjectSelects();
  renderTasks(
    document.getElementById('filter-subject')?.value || '',
    document.getElementById('filter-priority')?.value || '',
    document.getElementById('task-search')?.value || ''
  );
  refreshDashboard();
}

function refreshDashboard() {
  const gpa = calculateGPA();
  updateStats(gpa);
  renderUpcoming();
}

// ── Filter Bar ────────────────────────────────────────────
function initFilters() {
  ['task-search','filter-subject','filter-priority'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', applyFilters);
    document.getElementById(id)?.addEventListener('change', applyFilters);
  });
}

function applyFilters() {
  renderTasks(
    document.getElementById('filter-subject')?.value || '',
    document.getElementById('filter-priority')?.value || '',
    document.getElementById('task-search')?.value || ''
  );
}

// ═══════════════════════════════════════════════════════════
// TASK MODAL
// ═══════════════════════════════════════════════════════════
function initTaskModal() {
  document.getElementById('task-modal-close')?.addEventListener('click', closeTaskModal);
  document.getElementById('task-cancel-btn')?.addEventListener('click', closeTaskModal);
  document.getElementById('task-modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeTaskModal();
  });
  document.getElementById('task-form')?.addEventListener('submit', handleTaskSubmit);
}

function openTaskModal(editId = null) {
  taskEditId = editId;
  const title  = document.getElementById('task-modal-title');
  const submit = document.getElementById('task-submit-btn');

  populateSubjectSelects();

  if (editId) {
    const t = getTaskById(editId);
    if (!t) return;
    if (title)  title.textContent  = 'Edit Task';
    if (submit) submit.textContent = 'Save Changes';
    setField('task-title-input',    t.title);
    setField('task-desc-input',     t.desc);
    setField('task-subject-input',  t.subjectId);
    setField('task-priority-input', t.priority);
    setField('task-status-input',   t.status);
    setField('task-due-input',      t.dueDate);
  } else {
    if (title)  title.textContent  = 'New Task';
    if (submit) submit.textContent = 'Create Task';
    document.getElementById('task-form')?.reset();
    // default priority to medium
    setField('task-priority-input', 'medium');
  }

  document.getElementById('task-modal-overlay')?.classList.add('open');
}

function openEditTask(id) { openTaskModal(id); }

function closeTaskModal() {
  document.getElementById('task-modal-overlay')?.classList.remove('open');
  taskEditId = null;
}

function handleTaskSubmit(e) {
  e.preventDefault();
  const data = {
    title:     getField('task-title-input'),
    desc:      getField('task-desc-input'),
    subjectId: getField('task-subject-input'),
    priority:  getField('task-priority-input'),
    status:    getField('task-status-input'),
    dueDate:   getField('task-due-input'),
  };

  if (!data.title) return;

  if (taskEditId) {
    updateTask(taskEditId, data);
  } else {
    addTask(data);
  }

  closeTaskModal();
  refreshAll();
  if (currentPage === 'subjects') renderSubjectsPage(getTasks());
}

// ── Cycle Task Status (quick action) ─────────────────────
function cycleTaskStatus(id) {
  const t = getTaskById(id);
  if (!t) return;
  const next = { todo: 'progress', progress: 'done', done: 'todo' };
  updateTask(id, { status: next[t.status] });
  refreshAll();
  if (currentPage === 'subjects') renderSubjectsPage(getTasks());
}

// ── Delete Task ───────────────────────────────────────────
function confirmDeleteTask(id) {
  if (!confirm('Delete this task?')) return;
  deleteTask(id);
  refreshAll();
  if (currentPage === 'subjects') renderSubjectsPage(getTasks());
}

// ═══════════════════════════════════════════════════════════
// SUBJECT MODAL
// ═══════════════════════════════════════════════════════════
function initSubjectModal() {
  document.getElementById('subject-modal-close')?.addEventListener('click', closeSubjectModal);
  document.getElementById('subject-cancel-btn')?.addEventListener('click', closeSubjectModal);
  document.getElementById('subject-modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeSubjectModal();
  });
  document.getElementById('subject-form')?.addEventListener('submit', handleSubjectSubmit);
}

function openSubjectModal() {
  selectedSubjColor = '#8b5cf6';
  document.getElementById('subject-form')?.reset();
  setField('subject-icon-input', '📘');
  renderColorPicker(selectedSubjColor);
  document.getElementById('subject-modal-overlay')?.classList.add('open');
}

function closeSubjectModal() {
  document.getElementById('subject-modal-overlay')?.classList.remove('open');
}

function selectSubjectColor(color) {
  selectedSubjColor = color;
  renderColorPicker(color);
}

function handleSubjectSubmit(e) {
  e.preventDefault();
  addSubject({
    name:  getField('subject-name-input'),
    icon:  getField('subject-icon-input') || '📘',
    color: selectedSubjColor,
  });
  closeSubjectModal();
  populateSubjectSelects();
  renderSubjectsPage(getTasks());
}

function deleteSubjectById(id) {
  if (!confirm('Delete this subject? Tasks tagged with it will lose the tag.')) return;
  // Detach tasks
  getTasks().forEach(t => {
    if (t.subjectId === id) updateTask(t.id, { subjectId: '' });
  });
  deleteSubject(id);
  populateSubjectSelects();
  renderSubjectsPage(getTasks());
  refreshAll();
}

// ═══════════════════════════════════════════════════════════
// GRADE MODAL
// ═══════════════════════════════════════════════════════════
function initGradeModal() {
  document.getElementById('grade-modal-close')?.addEventListener('click', closeGradeModal);
  document.getElementById('grade-cancel-btn')?.addEventListener('click', closeGradeModal);
  document.getElementById('grade-modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeGradeModal();
  });
  document.getElementById('grade-form')?.addEventListener('submit', handleGradeSubmit);
}

function openGradeModal() {
  document.getElementById('grade-form')?.reset();
  populateSubjectSelects();
  const dateInput = document.getElementById('grade-date-input');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  document.getElementById('grade-modal-overlay')?.classList.add('open');
}

function closeGradeModal() {
  document.getElementById('grade-modal-overlay')?.classList.remove('open');
}

function handleGradeSubmit(e) {
  e.preventDefault();
  const score = Number(getField('grade-score-input'));
  if (isNaN(score) || score < 0 || score > 100) {
    alert('Please enter a valid score between 0 and 100.');
    return;
  }
  addGrade({
    subjectId: getField('grade-subject-input'),
    name:      getField('grade-name-input'),
    score,
    date:      getField('grade-date-input'),
  });
  closeGradeModal();
  renderGradesPage();
  refreshDashboard();
}

function deleteGradeById(id) {
  if (!confirm('Delete this grade entry?')) return;
  deleteGrade(id);
  renderGradesPage();
  refreshDashboard();
}

// ── Field Utilities ───────────────────────────────────────
function getField(id) {
  return document.getElementById(id)?.value || '';
}
function setField(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}
