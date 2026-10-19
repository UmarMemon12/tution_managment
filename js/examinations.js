/**
 * Tuition Management System - Examinations Controller
 */

let allExams = [];
let allBatches = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  await loadExamBatches();
  await loadExaminations();
  initExamEventListeners();
});

/**
 * Load Batches for Exam creation and filter
 */
async function loadExamBatches() {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));
  const profile = getCurrentProfile();

  if (sb && window.isSupabaseConfigured) {
    try {
      let query = sb.from('batches').select('id, batch_name, grade, teacher_id').eq('status', 'active');
      if (profile && profile.role === 'teacher' && profile.teacher_id) {
        query = query.eq('teacher_id', profile.teacher_id);
      }
      const { data, error } = await query;
      if (!error && data) allBatches = data;
    } catch (e) {
      console.warn("Could not load batches for exams:", e);
    }
  } else {
    allBatches = [
      { id: '22222222-2222-2222-2222-222222222201', batch_name: 'Grade 10 - Advanced Physics', grade: 'Grade 10' },
      { id: '22222222-2222-2222-2222-222222222202', batch_name: 'Grade 12 - Organic Chemistry', grade: 'Grade 12' },
      { id: '22222222-2222-2222-2222-222222222203', batch_name: 'Grade 10 - Mathematics Mastery', grade: 'Grade 10' }
    ];
  }

  const select = document.getElementById('exam-batch-select');
  const filterSelect = document.getElementById('filter-exam-batch');

  const options = allBatches.map(b => `<option value="${b.id}">${escapeHTML(b.batch_name)} (${escapeHTML(b.grade)})</option>`).join('');

  if (select) select.innerHTML = `<option value="">-- Choose Batch --</option>` + options;
  if (filterSelect) filterSelect.innerHTML = `<option value="">All Batches</option>` + options;
}

/**
 * Load Examinations from Supabase
 */
async function loadExaminations() {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));
  const tableBody = document.getElementById('exams-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem;"><span class="spinner"></span> Loading examinations...</td></tr>`;

  if (sb && window.isSupabaseConfigured) {
    try {
      const { data, error } = await sb
        .from('examinations')
        .select(`
          *,
          batches (id, batch_name, grade, teacher_id),
          exam_results (count)
        `)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      allExams = data || [];
      renderExamsTable(allExams);
      return;
    } catch (err) {
      console.warn("Could not load examinations:", err);
      showToast("Loading offline demo examinations", "info");
    }
  }

  // Demo fallback
  allExams = [
    {
      id: '66666666-6666-6666-6666-666666666601',
      exam_name: 'Mid-Term Mechanics & Motion Test',
      batch_id: '22222222-2222-2222-2222-222222222201',
      exam_date: '2026-09-25',
      max_marks: 100,
      pass_marks: 40,
      description: 'Covers kinematics and Newton laws',
      batches: { batch_name: 'Grade 10 - Advanced Physics', grade: 'Grade 10' },
      exam_results: [{ count: 2 }]
    },
    {
      id: '66666666-6666-6666-6666-666666666602',
      exam_name: 'Hydrocarbons Assessment',
      batch_id: '22222222-2222-2222-2222-222222222202',
      exam_date: '2026-09-28',
      max_marks: 50,
      pass_marks: 20,
      description: 'Organic chemistry unit test',
      batches: { batch_name: 'Grade 12 - Organic Chemistry', grade: 'Grade 12' },
      exam_results: [{ count: 2 }]
    },
    {
      id: '66666666-6666-6666-6666-666666666603',
      exam_name: 'Algebra & Quadratic Equations Quiz',
      batch_id: '22222222-2222-2222-2222-222222222203',
      exam_date: '2026-10-25',
      max_marks: 50,
      pass_marks: 20,
      description: 'Upcoming monthly quiz',
      batches: { batch_name: 'Grade 10 - Mathematics Mastery', grade: 'Grade 10' },
      exam_results: [{ count: 0 }]
    }
  ];

  renderExamsTable(allExams);
}

/**
 * Render Exams Table
 */
function renderExamsTable(exams) {
  const tableBody = document.getElementById('exams-table-body');
  if (!tableBody) return;

  if (!exams || exams.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <h4 class="empty-state-title">No examinations scheduled</h4>
            <p class="empty-state-text">Click "Create Examination" to schedule tests and track results.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  tableBody.innerHTML = exams.map(e => {
    const isPast = e.exam_date < todayStr;
    const batch = e.batches || { batch_name: 'Batch' };
    const resultsCount = e.exam_results && e.exam_results[0] ? e.exam_results[0].count : 0;

    return `
      <tr>
        <td>
          <strong>${escapeHTML(e.exam_name)}</strong>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHTML(e.description || 'No description')}</div>
        </td>
        <td><span class="badge badge-info">${escapeHTML(batch.batch_name)}</span></td>
        <td>${formatDate(e.exam_date)}</td>
        <td><strong>${e.max_marks}</strong></td>
        <td>${e.pass_marks}</td>
        <td>
          <span class="badge ${isPast ? 'badge-neutral' : 'badge-warning'}">
            ${isPast ? 'Concluded' : 'Upcoming'}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <a href="results.html?exam_id=${e.id}" class="btn btn-primary btn-sm">
              Results (${resultsCount})
            </a>
            <button class="btn btn-secondary btn-sm" onclick="openEditExamModal('${e.id}')">Edit</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Event Listeners
 */
function initExamEventListeners() {
  document.getElementById('create-exam-btn')?.addEventListener('click', openAddExamModal);
  document.getElementById('exam-form')?.addEventListener('submit', handleExamFormSubmit);
  document.getElementById('search-exam')?.addEventListener('input', filterExams);
  document.getElementById('filter-exam-batch')?.addEventListener('change', filterExams);
}

/**
 * Filter Exams
 */
function filterExams() {
  const term = (document.getElementById('search-exam').value || '').toLowerCase().trim();
  const batchId = document.getElementById('filter-exam-batch').value;

  const filtered = allExams.filter(e => {
    const matchesSearch = 
      e.exam_name.toLowerCase().includes(term) ||
      (e.batches && e.batches.batch_name.toLowerCase().includes(term));
    const matchesBatch = batchId ? e.batch_id === batchId : true;
    return matchesSearch && matchesBatch;
  });

  renderExamsTable(filtered);
}

/**
 * Open Add Exam Modal
 */
function openAddExamModal() {
  document.getElementById('exam-modal-title').textContent = 'Create Examination';
  document.getElementById('exam-form').reset();
  document.getElementById('exam-db-id').value = '';
  document.getElementById('exam-date-field').value = new Date().toISOString().slice(0, 10);
  openModal('exam-form-modal');
}

/**
 * Open Edit Exam Modal
 */
function openEditExamModal(id) {
  const e = allExams.find(item => item.id === id);
  if (!e) return;

  document.getElementById('exam-modal-title').textContent = 'Edit Examination';
  document.getElementById('exam-db-id').value = e.id;
  document.getElementById('exam-name-field').value = e.exam_name;
  document.getElementById('exam-batch-select').value = e.batch_id;
  document.getElementById('exam-date-field').value = e.exam_date;
  document.getElementById('exam-max-marks').value = e.max_marks;
  document.getElementById('exam-pass-marks').value = e.pass_marks;
  document.getElementById('exam-desc-field').value = e.description || '';

  openModal('exam-form-modal');
}

/**
 * Handle Exam Form Submit
 */
async function handleExamFormSubmit(e) {
  e.preventDefault();

  const dbId = document.getElementById('exam-db-id').value;
  const name = document.getElementById('exam-name-field').value.trim();
  const batchId = document.getElementById('exam-batch-select').value;
  const dateVal = document.getElementById('exam-date-field').value;
  const maxMarks = parseFloat(document.getElementById('exam-max-marks').value || 0);
  const passMarks = parseFloat(document.getElementById('exam-pass-marks').value || 0);
  const desc = document.getElementById('exam-desc-field').value.trim() || null;

  if (!name || !batchId || !dateVal || maxMarks <= 0) {
    showToast('Please specify valid exam name, batch, date, and max marks.', 'error');
    return;
  }

  if (passMarks > maxMarks) {
    showToast('Passing marks cannot exceed maximum marks.', 'error');
    return;
  }

  const payload = {
    exam_name: name,
    batch_id: batchId,
    exam_date: dateVal,
    max_marks: maxMarks,
    pass_marks: passMarks,
    description: desc
  };

  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  try {
    if (sb && window.isSupabaseConfigured) {
      if (dbId) {
        const { error } = await sb.from('examinations').update(payload).eq('id', dbId);
        if (error) throw error;
      } else {
        const { error } = await sb.from('examinations').insert(payload);
        if (error) throw error;
      }

      showToast(dbId ? 'Examination updated' : 'Examination scheduled successfully', 'success');
      closeModal('exam-form-modal');
      await loadExaminations();
      return;
    }

    // Mock
    if (dbId) {
      const idx = allExams.findIndex(item => item.id === dbId);
      if (idx !== -1) allExams[idx] = { ...allExams[idx], ...payload };
    } else {
      payload.id = 'demo-ex-' + Date.now();
      payload.batches = allBatches.find(b => b.id === batchId);
      payload.exam_results = [{ count: 0 }];
      allExams.unshift(payload);
    }

    showToast('Saved (Demo Mode)', 'success');
    closeModal('exam-form-modal');
    renderExamsTable(allExams);
  } catch (err) {
    showToast(err.message || 'Error saving examination', 'error');
  }
}
