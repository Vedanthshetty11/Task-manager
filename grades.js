// ─── grades.js ────────────────────────────────────────────
// Grade & GPA tracking

import { getSubjectById, escHtml } from './subjects.js';

let grades = [];

export function loadGrades() {
  try { grades = JSON.parse(localStorage.getItem('stm_grades') || '[]'); }
  catch { grades = []; }
}

export function saveGrades() {
  localStorage.setItem('stm_grades', JSON.stringify(grades));
}

export function getGrades() { return grades; }

export function addGrade(data) {
  const grade = {
    id: 'grade_' + Date.now(),
    subjectId:  data.subjectId,
    name:       data.name.trim(),
    score:      Number(data.score),
    date:       data.date || '',
    addedAt:    new Date().toISOString(),
  };
  grades.unshift(grade);
  saveGrades();
  return grade;
}

export function deleteGrade(id) {
  grades = grades.filter(g => g.id !== id);
  saveGrades();
}

// ── Score → Letter / GPA points ──────────────────────────
export function scoreToLetter(score) {
  if (score >= 97) return { letter: 'A+', points: 4.0 };
  if (score >= 93) return { letter: 'A',  points: 4.0 };
  if (score >= 90) return { letter: 'A-', points: 3.7 };
  if (score >= 87) return { letter: 'B+', points: 3.3 };
  if (score >= 83) return { letter: 'B',  points: 3.0 };
  if (score >= 80) return { letter: 'B-', points: 2.7 };
  if (score >= 77) return { letter: 'C+', points: 2.3 };
  if (score >= 73) return { letter: 'C',  points: 2.0 };
  if (score >= 70) return { letter: 'C-', points: 1.7 };
  if (score >= 67) return { letter: 'D+', points: 1.3 };
  if (score >= 63) return { letter: 'D',  points: 1.0 };
  if (score >= 60) return { letter: 'D-', points: 0.7 };
  return { letter: 'F', points: 0.0 };
}

export function calculateGPA() {
  if (grades.length === 0) return null;
  const total = grades.reduce((sum, g) => sum + scoreToLetter(g.score).points, 0);
  return Math.round((total / grades.length) * 100) / 100;
}

function letterClass(letter) {
  if (letter.startsWith('A')) return 'grade-A';
  if (letter.startsWith('B')) return 'grade-B';
  if (letter.startsWith('C')) return 'grade-C';
  if (letter.startsWith('D')) return 'grade-D';
  return 'grade-F';
}

function gpaToOverallLetter(gpa) {
  if (gpa >= 3.7) return 'A';
  if (gpa >= 3.3) return 'B+';
  if (gpa >= 3.0) return 'B';
  if (gpa >= 2.7) return 'B-';
  if (gpa >= 2.3) return 'C+';
  if (gpa >= 2.0) return 'C';
  if (gpa >= 1.0) return 'D';
  return 'F';
}

// ── Render Grades Page ────────────────────────────────────
export function renderGradesPage() {
  const gpa = calculateGPA();

  // Hero
  const gpaDisplay = document.getElementById('gpa-display');
  const gpaLetter  = document.getElementById('gpa-letter-display');
  if (gpaDisplay) gpaDisplay.textContent = gpa != null ? gpa.toFixed(2) : '—';
  if (gpaLetter)  gpaLetter.textContent  = gpa != null ? gpaToOverallLetter(gpa) : 'N/A';

  // Table
  const tbody = document.getElementById('grades-tbody');
  if (!tbody) return;

  if (grades.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state">
        <span class="empty-icon">🏆</span>
        <p>No grades yet.<br>Add your first grade to track your GPA.</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = grades.map(g => {
    const { letter, points } = scoreToLetter(g.score);
    const subject = g.subjectId ? getSubjectById(g.subjectId) : null;
    const dateStr = g.date
      ? new Date(g.date + 'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
      : '—';

    return `<tr>
      <td>
        ${subject
          ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:2px 10px;border-radius:20px;font-size:0.8rem;font-weight:600;background:${subject.color}22;color:${subject.color};">${subject.icon} ${escHtml(subject.name)}</span>`
          : '<span style="color:var(--text-muted)">—</span>'}
      </td>
      <td>${escHtml(g.name)}</td>
      <td>
        <span style="font-weight:700;">${g.score}</span>
        <span style="color:var(--text-muted);font-size:0.8rem;">/100</span>
      </td>
      <td><span class="grade-letter-pill ${letterClass(letter)}">${letter}</span></td>
      <td><span class="gpa-points">${points.toFixed(1)}</span></td>
      <td style="color:var(--text-secondary);font-size:0.85rem;">${dateStr}</td>
      <td>
        <button class="btn btn-danger btn-sm btn-icon" onclick="window.deleteGradeById('${g.id}')" title="Delete">🗑️</button>
      </td>
    </tr>`;
  }).join('');

  return gpa;
}
