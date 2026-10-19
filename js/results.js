/**
 * Tuition Management System - Examination Results Controller
 */

let allExams = [];
let currentExam = null;
let enrolledStudents = [];
let existingResultsMap = {}; // student_id -> exam_result

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  await loadExamsDropdown();
  initResultsEventListeners();

  // If exam_id passed in URL query, automatically select and load it
  const urlParams = new URLSearchParams(window.location.search);
  const examIdParam = urlParams.get('exam_id');
  if (examIdParam) {
    const select = document.getElementById('select-exam');
    if (select) {
      select.value = examIdParam;
      await onExamSelectionChange();
    }
  }
});

/**
 * Load exams for selection dropdown
 */
async function loadExamsDropdown() {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));
  const profile = getCurrentProfile();

  if (sb && window.isSupabaseConfigured) {
    try {
      let query = sb
        .from('examinations')
        .select(`
          id,
          exam_name,
          exam_date,
          max_marks,
          pass_marks,
          batch_id,
          batches (id, batch_name, grade, teacher_id)
        `)
        .order('exam_date', { ascending: false });

      if (profile && profile.role === 'teacher' && profile.teacher_id) {
        // Teacher filter handled in UI or query
      }

      const { data, error } = await query;
      if (error) throw error;
      allExams = data || [];
    } catch (e) {
      console.warn("Could not load exams from Supabase:", e);
    }
  } else {
    allExams = [
      {
        id: '66666666-6666-6666-6666-666666666601',
        exam_name: 'Mid-Term Mechanics & Motion Test',
        batch_id: '22222222-2222-2222-2222-222222222201',
        exam_date: '2026-09-25',
        max_marks: 100,
        pass_marks: 40,
        batches: { id: '22222222-2222-2222-2222-222222222201', batch_name: 'Grade 10 - Advanced Physics', grade: 'Grade 10' }
      },
      {
        id: '66666666-6666-6666-6666-666666666602',
        exam_name: 'Hydrocarbons & Isomerism Assessment',
        batch_id: '22222222-2222-2222-2222-222222222202',
        exam_date: '2026-09-28',
        max_marks: 50,
        pass_marks: 20,
        batches: { id: '22222222-2222-2222-2222-222222222202', batch_name: 'Grade 12 - Organic Chemistry', grade: 'Grade 12' }
      }
    ];
  }

  const select = document.getElementById('select-exam');
  if (select) {
    select.innerHTML = `<option value="">-- Choose Examination --</option>` +
      allExams.map(e => `
        <option value="${e.id}">${escapeHTML(e.exam_name)} - ${escapeHTML(e.batches ? e.batches.batch_name : 'Batch')} (${formatDate(e.exam_date)})</option>
      `).join('');
  }
}

/**
 * Event Listeners
 */
function initResultsEventListeners() {
  document.getElementById('select-exam')?.addEventListener('change', onExamSelectionChange);
  document.getElementById('save-results-btn')?.addEventListener('click', saveExamResults);
  document.getElementById('print-card-btn')?.addEventListener('click', () => window.print());
}

/**
 * Handle Exam Selection Change
 */
async function onExamSelectionChange() {
  const examId = document.getElementById('select-exam').value;
  if (!examId) {
    document.getElementById('exam-meta-banner').style.display = 'none';
    document.getElementById('results-table-body').innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">Please select an examination above to view and enter results.</td></tr>`;
    return;
  }

  currentExam = allExams.find(e => e.id === examId);
  if (!currentExam) return;

  // Show exam metadata banner
  document.getElementById('exam-meta-banner').style.display = 'flex';
  document.getElementById('meta-exam-name').textContent = currentExam.exam_name;
  document.getElementById('meta-batch-name').textContent = currentExam.batches ? currentExam.batches.batch_name : 'Batch';
  document.getElementById('meta-max-marks').textContent = currentExam.max_marks;
  document.getElementById('meta-pass-marks').textContent = currentExam.pass_marks;
  document.getElementById('meta-date').textContent = formatDate(currentExam.exam_date);

  const tableBody = document.getElementById('results-table-body');
  tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem;"><span class="spinner"></span> Loading enrolled students & results...</td></tr>`;

  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  existingResultsMap = {};
  enrolledStudents = [];

  if (sb && window.isSupabaseConfigured) {
    try {
      // 1. Fetch enrolled students for this exam's batch
      const { data: enrollments } = await sb
        .from('student_batches')
        .select(`
          student_id,
          students (id, student_id, full_name, phone)
        `)
        .eq('batch_id', currentExam.batch_id)
        .eq('status', 'active');

      enrolledStudents = (enrollments || []).map(e => e.students).filter(Boolean);

      // 2. Fetch existing results
      const { data: results } = await sb
        .from('exam_results')
        .select('*')
        .eq('exam_id', examId);

      (results || []).forEach(r => {
        existingResultsMap[r.student_id] = r;
      });

      renderResultsInputRows();
      return;
    } catch (err) {
      console.warn("Could not load results from Supabase:", err);
      showToast("Loading offline demo results", "info");
    }
  }

  // Demo fallback
  enrolledStudents = [
    { id: '33333333-3333-3333-3333-333333333301', student_id: 'STU-2026-0001', full_name: 'Aarav Patel' },
    { id: '33333333-3333-3333-3333-333333333303', student_id: 'STU-2026-0003', full_name: 'Rohan Gupta' }
  ];

  existingResultsMap['33333333-3333-3333-3333-333333333301'] = {
    marks_obtained: 92.5,
    grade: 'A+',
    status: 'passed',
    remarks: 'Outstanding effort'
  };

  renderResultsInputRows();
}

/**
 * Render Input Rows for entering student marks
 */
function renderResultsInputRows() {
  const tableBody = document.getElementById('results-table-body');
  if (!tableBody) return;

  if (enrolledStudents.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No students enrolled in the batch for this exam.</td></tr>`;
    return;
  }

  tableBody.innerHTML = enrolledStudents.map(s => {
    const res = existingResultsMap[s.id] || { marks_obtained: '', grade: '-', status: 'passed', remarks: '' };
    const pct = res.marks_obtained !== '' && currentExam.max_marks ? Math.round((parseFloat(res.marks_obtained) / currentExam.max_marks) * 100) : '-';

    return `
      <tr data-student-id="${s.id}">
        <td><code>${escapeHTML(s.student_id)}</code></td>
        <td><strong>${escapeHTML(s.full_name)}</strong></td>
        <td>
          <input type="number" step="0.5" min="0" max="${currentExam.max_marks}" class="form-control form-control-sm marks-input" id="marks-${s.id}" value="${res.marks_obtained}" placeholder="0 - ${currentExam.max_marks}" style="width: 110px;" oninput="onMarksInputChanged('${s.id}')">
        </td>
        <td><strong id="pct-${s.id}">${pct !== '-' ? pct + '%' : '-'}</strong></td>
        <td><span class="badge badge-info" id="grade-${s.id}">${res.grade || '-'}</span></td>
        <td>
          <select class="form-control form-control-sm" id="status-${s.id}" style="width: 110px;">
            <option value="passed" ${res.status === 'passed' ? 'selected' : ''}>Passed</option>
            <option value="failed" ${res.status === 'failed' ? 'selected' : ''}>Failed</option>
            <option value="absent" ${res.status === 'absent' ? 'selected' : ''}>Absent</option>
          </select>
        </td>
        <td>
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            <input type="text" class="form-control form-control-sm" id="remarks-${s.id}" value="${escapeHTML(res.remarks || '')}" placeholder="Remarks..." style="max-width: 180px;">
            <button class="btn btn-secondary btn-sm" onclick="openStudentReportCard('${s.id}')" title="Print Individual Report Card">Report Card</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Real-time calculation on marks input
 */
function onMarksInputChanged(studentId) {
  if (!currentExam) return;

  const marksField = document.getElementById(`marks-${studentId}`);
  const pctEl = document.getElementById(`pct-${studentId}`);
  const gradeEl = document.getElementById(`grade-${studentId}`);
  const statusSelect = document.getElementById(`status-${studentId}`);

  let val = parseFloat(marksField.value);

  if (isNaN(val)) {
    pctEl.textContent = '-';
    gradeEl.textContent = '-';
    return;
  }

  // Validate range
  if (val < 0) {
    val = 0;
    marksField.value = 0;
  }
  if (val > currentExam.max_marks) {
    val = currentExam.max_marks;
    marksField.value = currentExam.max_marks;
    showToast(`Marks cannot exceed max marks (${currentExam.max_marks})`, 'warning');
  }

  const pct = Math.round((val / currentExam.max_marks) * 100);
  pctEl.textContent = `${pct}%`;

  // Compute Grade
  let grade = 'F';
  if (pct >= 90) grade = 'A+';
  else if (pct >= 80) grade = 'A';
  else if (pct >= 70) grade = 'B';
  else if (pct >= 60) grade = 'C';
  else if (pct >= 40) grade = 'D';

  gradeEl.textContent = grade;

  // Auto select status
  if (val >= currentExam.pass_marks) {
    statusSelect.value = 'passed';
  } else {
    statusSelect.value = 'failed';
  }
}

/**
 * Save Exam Results to Supabase
 */
async function saveExamResults() {
  if (!currentExam) {
    showToast('Please select an examination first.', 'error');
    return;
  }

  const recordsToUpsert = [];

  for (const s of enrolledStudents) {
    const marksVal = document.getElementById(`marks-${s.id}`)?.value;
    if (marksVal === '' || marksVal === undefined) continue;

    const marks = parseFloat(marksVal);
    const grade = document.getElementById(`grade-${s.id}`)?.textContent || 'F';
    const status = document.getElementById(`status-${s.id}`)?.value || 'passed';
    const remarks = document.getElementById(`remarks-${s.id}`)?.value.trim() || null;

    recordsToUpsert.push({
      exam_id: currentExam.id,
      student_id: s.id,
      marks_obtained: marks,
      grade: grade,
      status: status,
      remarks: remarks
    });
  }

  if (recordsToUpsert.length === 0) {
    showToast('No marks entered to save.', 'warning');
    return;
  }

  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  try {
    if (sb && window.isSupabaseConfigured) {
      const { error } = await sb
        .from('exam_results')
        .upsert(recordsToUpsert, { onConflict: 'exam_id,student_id' });

      if (error) throw error;
      showToast(`Results saved for ${recordsToUpsert.length} students!`, 'success');
      await onExamSelectionChange();
      return;
    }

    // Mock
    recordsToUpsert.forEach(r => {
      existingResultsMap[r.student_id] = r;
    });
    showToast('Results saved (Demo Mode)', 'success');
    renderResultsInputRows();
  } catch (err) {
    showToast(err.message || 'Failed to save results', 'error');
  }
}

/**
 * Open Individual Printable Report Card Modal
 */
function openStudentReportCard(studentId) {
  const student = enrolledStudents.find(s => s.id === studentId);
  if (!student || !currentExam) return;

  const marksInput = document.getElementById(`marks-${studentId}`);
  const marks = marksInput ? parseFloat(marksInput.value || 0) : 0;
  const pct = currentExam.max_marks ? Math.round((marks / currentExam.max_marks) * 100) : 0;
  const grade = document.getElementById(`grade-${studentId}`)?.textContent || 'F';
  const status = document.getElementById(`status-${studentId}`)?.value || 'passed';
  const remarks = document.getElementById(`remarks-${studentId}`)?.value || 'Good performance.';

  document.getElementById('rc-student-name').textContent = student.full_name;
  document.getElementById('rc-student-id').textContent = student.student_id;
  document.getElementById('rc-batch-name').textContent = currentExam.batches ? currentExam.batches.batch_name : 'Batch';
  document.getElementById('rc-exam-title').textContent = currentExam.exam_name;
  document.getElementById('rc-exam-date').textContent = formatDate(currentExam.exam_date);
  document.getElementById('rc-marks-obtained').textContent = marks;
  document.getElementById('rc-max-marks').textContent = currentExam.max_marks;
  document.getElementById('rc-pass-marks').textContent = currentExam.pass_marks;
  document.getElementById('rc-percentage').textContent = `${pct}%`;
  document.getElementById('rc-grade').textContent = grade;
  document.getElementById('rc-status').innerHTML = renderBadge(status);
  document.getElementById('rc-remarks').textContent = remarks;

  openModal('report-card-modal');
}
