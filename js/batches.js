/**
 * Tuition Management System - Batch Management Controller
 */

let allBatches = [];
let allTeachers = [];
let activeStudentsList = [];
let currentManagingBatch = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  await loadTeachersDropdown();
  await loadBatches();
  initBatchEventListeners();
});

/**
 * Load Teachers for the dropdown
 */
async function loadTeachersDropdown() {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  if (sb && window.isSupabaseConfigured) {
    try {
      const { data, error } = await sb.from('teachers').select('id, full_name, subject_specialization').eq('status', 'active');
      if (!error && data) allTeachers = data;
    } catch (e) {
      console.warn("Could not load teachers for dropdown:", e);
    }
  } else {
    allTeachers = [
      { id: '11111111-1111-1111-1111-111111111101', full_name: 'Dr. Rajesh Sharma', subject_specialization: 'Physics' },
      { id: '11111111-1111-1111-1111-111111111102', full_name: 'Prof. Ananya Sen', subject_specialization: 'Chemistry' },
      { id: '11111111-1111-1111-1111-111111111103', full_name: 'Vikram Malhotra', subject_specialization: 'English' }
    ];
  }

  const select = document.getElementById('batch-teacher-select');
  if (select) {
    select.innerHTML = `<option value="">-- Assign Teacher --</option>` +
      allTeachers.map(t => `<option value="${t.id}">${escapeHTML(t.full_name)} (${escapeHTML(t.subject_specialization)})</option>`).join('');
  }
}

/**
 * Load Batches with student enrollments count
 */
async function loadBatches() {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));
  const tableBody = document.getElementById('batches-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem;"><span class="spinner"></span> Loading batches...</td></tr>`;

  if (sb && window.isSupabaseConfigured) {
    try {
      const { data, error } = await sb
        .from('batches')
        .select(`
          *,
          teachers (id, full_name, subject_specialization),
          student_batches (
            id,
            status,
            students (id, student_id, full_name, phone)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      allBatches = data || [];
      renderBatchesTable(allBatches);
      return;
    } catch (err) {
      console.warn("Live batches load failed:", err);
      showToast("Loading demo batches", "info");
    }
  }

  // Demo batches
  allBatches = getMockBatches();
  renderBatchesTable(allBatches);
}

/**
 * Render Batches Table
 */
function renderBatchesTable(batches) {
  const tableBody = document.getElementById('batches-table-body');
  if (!tableBody) return;

  if (!batches || batches.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
              <path d="M6 6h10"></path><path d="M6 10h10"></path>
            </svg>
            <h4 class="empty-state-title">No batches found</h4>
            <p class="empty-state-text">No batches created or matching the active filter.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const isAdminUser = isAdmin();

  tableBody.innerHTML = batches.map(b => {
    const activeEnrollments = (b.student_batches || []).filter(sb => sb.status === 'active');
    const enrolledCount = activeEnrollments.length;
    const maxCapacity = b.max_capacity || 30;
    const capacityPct = Math.min(100, Math.round((enrolledCount / maxCapacity) * 100));

    return `
      <tr>
        <td>
          <strong>${escapeHTML(b.batch_name)}</strong>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Starts: ${formatDate(b.start_date)}</div>
        </td>
        <td>${escapeHTML(b.subject)}</td>
        <td><span class="badge badge-info">${escapeHTML(b.grade)}</span></td>
        <td>${escapeHTML(b.teachers ? b.teachers.full_name : 'Unassigned')}</td>
        <td>⏱️ ${escapeHTML(b.class_timing)}</td>
        <td>
          <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 0.2rem;">
            ${enrolledCount} / ${maxCapacity} Enrolled
          </div>
          <div style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">
            <div style="width: ${capacityPct}%; height: 100%; background: ${capacityPct >= 90 ? 'var(--danger)' : 'var(--primary)'};"></div>
          </div>
        </td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-secondary btn-sm" onclick="openEnrollmentModal('${b.id}')">Students (${enrolledCount})</button>
            ${isAdminUser ? `
              <button class="btn btn-secondary btn-sm" onclick="openEditBatchModal('${b.id}')">Edit</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Filter batches
 */
function filterBatches() {
  const searchTerm = (document.getElementById('search-batch').value || '').toLowerCase().trim();
  const gradeFilter = document.getElementById('filter-grade').value;

  const filtered = allBatches.filter(b => {
    const matchesSearch = 
      b.batch_name.toLowerCase().includes(searchTerm) ||
      b.subject.toLowerCase().includes(searchTerm) ||
      (b.teachers && b.teachers.full_name.toLowerCase().includes(searchTerm));

    const matchesGrade = gradeFilter ? b.grade === gradeFilter : true;
    return matchesSearch && matchesGrade;
  });

  renderBatchesTable(filtered);
}

/**
 * Event listeners
 */
function initBatchEventListeners() {
  document.getElementById('search-batch')?.addEventListener('input', filterBatches);
  document.getElementById('filter-grade')?.addEventListener('change', filterBatches);

  document.getElementById('create-batch-btn')?.addEventListener('click', () => {
    if (!isAdmin()) {
      showToast('Only administrators can create batches.', 'error');
      return;
    }
    openAddBatchModal();
  });

  document.getElementById('batch-form')?.addEventListener('submit', handleBatchFormSubmit);
  document.getElementById('enrol-student-btn')?.addEventListener('click', handleEnrolStudent);
}

/**
 * Open Add Batch Modal
 */
function openAddBatchModal() {
  document.getElementById('batch-modal-title').textContent = 'Create New Batch';
  document.getElementById('batch-form').reset();
  document.getElementById('batch-db-id').value = '';
  document.getElementById('batch-start-date').value = new Date().toISOString().slice(0, 10);
  openModal('batch-form-modal');
}

/**
 * Open Edit Batch Modal
 */
function openEditBatchModal(id) {
  const b = allBatches.find(item => item.id === id);
  if (!b) return;

  document.getElementById('batch-modal-title').textContent = 'Edit Batch';
  document.getElementById('batch-db-id').value = b.id;
  document.getElementById('batch-name-field').value = b.batch_name;
  document.getElementById('batch-subject-field').value = b.subject;
  document.getElementById('batch-grade-field').value = b.grade;
  document.getElementById('batch-teacher-select').value = b.teacher_id || (b.teachers ? b.teachers.id : '');
  document.getElementById('batch-start-date').value = b.start_date;
  document.getElementById('batch-end-date').value = b.end_date || '';
  document.getElementById('batch-timing-field').value = b.class_timing;
  document.getElementById('batch-capacity-field').value = b.max_capacity;
  document.getElementById('batch-status-field').value = b.status;

  openModal('batch-form-modal');
}

/**
 * Handle Batch Form Submit
 */
async function handleBatchFormSubmit(e) {
  e.preventDefault();

  const dbId = document.getElementById('batch-db-id').value;
  const name = document.getElementById('batch-name-field').value.trim();
  const subject = document.getElementById('batch-subject-field').value.trim();
  const grade = document.getElementById('batch-grade-field').value.trim();
  const teacherId = document.getElementById('batch-teacher-select').value || null;
  const startDate = document.getElementById('batch-start-date').value;
  const endDate = document.getElementById('batch-end-date').value || null;
  const timing = document.getElementById('batch-timing-field').value.trim();
  const capacity = parseInt(document.getElementById('batch-capacity-field').value, 10) || 30;
  const status = document.getElementById('batch-status-field').value;

  if (!name || !subject || !grade || !timing) {
    showToast('Please fill in all required batch fields.', 'error');
    return;
  }

  const payload = {
    batch_name: name,
    subject: subject,
    grade: grade,
    teacher_id: teacherId,
    start_date: startDate,
    end_date: endDate,
    class_timing: timing,
    max_capacity: capacity,
    status: status
  };

  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  try {
    if (sb && window.isSupabaseConfigured) {
      if (dbId) {
        const { error } = await sb.from('batches').update(payload).eq('id', dbId);
        if (error) throw error;
      } else {
        const { error } = await sb.from('batches').insert(payload);
        if (error) throw error;
      }

      showToast(dbId ? 'Batch updated successfully' : 'Batch created successfully', 'success');
      closeModal('batch-form-modal');
      await loadBatches();
      return;
    }

    // Mock
    if (dbId) {
      const idx = allBatches.findIndex(b => b.id === dbId);
      if (idx !== -1) allBatches[idx] = { ...allBatches[idx], ...payload };
    } else {
      payload.id = 'demo-b-' + Date.now();
      payload.teachers = allTeachers.find(t => t.id === teacherId) || null;
      payload.student_batches = [];
      allBatches.unshift(payload);
    }

    showToast('Batch saved (Demo Mode)', 'success');
    closeModal('batch-form-modal');
    renderBatchesTable(allBatches);
  } catch (err) {
    showToast(err.message || 'Error saving batch', 'error');
  }
}

/**
 * Open Enrollment Management Modal
 */
async function openEnrollmentModal(batchId) {
  const batch = allBatches.find(b => b.id === batchId);
  if (!batch) return;
  currentManagingBatch = batch;

  document.getElementById('enrol-batch-title').textContent = batch.batch_name;
  document.getElementById('enrol-batch-capacity').textContent = `Max Capacity: ${batch.max_capacity}`;

  // Fetch available students to populate enrollment dropdown
  await loadAvailableStudentsForBatch(batch);
  renderEnrolledStudentsList();

  openModal('batch-enrollment-modal');
}

/**
 * Load available students to enroll
 */
async function loadAvailableStudentsForBatch(batch) {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  let students = [];
  if (sb && window.isSupabaseConfigured) {
    try {
      const { data } = await sb.from('students').select('id, student_id, full_name').neq('status', 'archived');
      students = data || [];
    } catch (e) {
      console.warn("Could not load students for enrollment select:", e);
    }
  } else {
    students = [
      { id: '33333333-3333-3333-3333-333333333301', student_id: 'STU-2026-0001', full_name: 'Aarav Patel' },
      { id: '33333333-3333-3333-3333-333333333302', student_id: 'STU-2026-0002', full_name: 'Diya Kulkarni' },
      { id: '33333333-3333-3333-3333-333333333303', student_id: 'STU-2026-0003', full_name: 'Rohan Gupta' },
      { id: '33333333-3333-3333-3333-333333333304', student_id: 'STU-2026-0004', full_name: 'Sneha Roy' },
      { id: '33333333-3333-3333-3333-333333333305', student_id: 'STU-2026-0005', full_name: 'Karan Verma' }
    ];
  }

  // Filter out students already actively enrolled
  const activeStudentIds = new Set(
    (batch.student_batches || [])
      .filter(sb => sb.status === 'active' && sb.students)
      .map(sb => sb.students.id)
  );

  const available = students.filter(s => !activeStudentIds.has(s.id));
  const select = document.getElementById('available-students-select');

  if (select) {
    if (available.length === 0) {
      select.innerHTML = `<option value="">No other students available</option>`;
      document.getElementById('enrol-student-btn').disabled = true;
    } else {
      select.innerHTML = `<option value="">-- Choose student to enrol --</option>` +
        available.map(s => `<option value="${s.id}">${escapeHTML(s.student_id)} - ${escapeHTML(s.full_name)}</option>`).join('');
      document.getElementById('enrol-student-btn').disabled = false;
    }
  }
}

/**
 * Render Enrolled Students List
 */
function renderEnrolledStudentsList() {
  const container = document.getElementById('enrolled-students-body');
  if (!container || !currentManagingBatch) return;

  const activeEnrollments = (currentManagingBatch.student_batches || []).filter(sb => sb.status === 'active');

  if (activeEnrollments.length === 0) {
    container.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No students enrolled yet.</td></tr>`;
    return;
  }

  container.innerHTML = activeEnrollments.map(sb => {
    const student = sb.students || { full_name: 'Student', student_id: 'N/A', phone: '-' };
    return `
      <tr>
        <td><code>${escapeHTML(student.student_id)}</code></td>
        <td><strong>${escapeHTML(student.full_name)}</strong></td>
        <td>${escapeHTML(student.phone || '-')}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="removeStudentFromBatch('${sb.id}')" style="color: var(--danger);">
            Drop / Remove
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Handle Enrolling a student
 */
async function handleEnrolStudent() {
  if (!currentManagingBatch) return;

  const activeCount = (currentManagingBatch.student_batches || []).filter(sb => sb.status === 'active').length;
  if (activeCount >= currentManagingBatch.max_capacity) {
    showToast(`Batch capacity of ${currentManagingBatch.max_capacity} reached! Cannot enrol more students.`, 'error');
    return;
  }

  const studentSelect = document.getElementById('available-students-select');
  const studentId = studentSelect.value;
  if (!studentId) {
    showToast('Please select a student to enrol.', 'error');
    return;
  }

  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  try {
    if (sb && window.isSupabaseConfigured) {
      const { error } = await sb.from('student_batches').insert({
        batch_id: currentManagingBatch.id,
        student_id: studentId,
        enrolled_date: new Date().toISOString().slice(0, 10),
        status: 'active'
      });
      if (error) throw error;
      showToast('Student enrolled successfully', 'success');
      await loadBatches();
      currentManagingBatch = allBatches.find(b => b.id === currentManagingBatch.id);
      await loadAvailableStudentsForBatch(currentManagingBatch);
      renderEnrolledStudentsList();
      return;
    }

    // Mock
    const newEnrollment = {
      id: 'demo-sb-' + Date.now(),
      status: 'active',
      students: { id: studentId, student_id: 'STU-2026-X', full_name: studentSelect.options[studentSelect.selectedIndex].text, phone: '+91 99999 99999' }
    };
    currentManagingBatch.student_batches.push(newEnrollment);
    showToast('Enrolled (Demo Mode)', 'success');
    await loadAvailableStudentsForBatch(currentManagingBatch);
    renderEnrolledStudentsList();
    renderBatchesTable(allBatches);
  } catch (err) {
    showToast(err.message || 'Failed to enrol student', 'error');
  }
}

/**
 * Remove Student from batch without deleting historical records
 */
async function removeStudentFromBatch(studentBatchId) {
  const confirmed = await confirmDialog(
    'Remove Student from Batch',
    'Are you sure you want to remove this student from this batch? Their historical attendance and fee records will be preserved.',
    'Remove',
    true
  );
  if (!confirmed) return;

  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  try {
    if (sb && window.isSupabaseConfigured) {
      // Set status to 'dropped'
      const { error } = await sb.from('student_batches').update({ status: 'dropped' }).eq('id', studentBatchId);
      if (error) throw error;
      showToast('Student removed from batch (status: dropped)', 'success');
      await loadBatches();
      currentManagingBatch = allBatches.find(b => b.id === currentManagingBatch.id);
      await loadAvailableStudentsForBatch(currentManagingBatch);
      renderEnrolledStudentsList();
      return;
    }

    // Mock
    const sbItem = currentManagingBatch.student_batches.find(i => i.id === studentBatchId);
    if (sbItem) sbItem.status = 'dropped';
    showToast('Student removed (Demo Mode)', 'success');
    await loadAvailableStudentsForBatch(currentManagingBatch);
    renderEnrolledStudentsList();
    renderBatchesTable(allBatches);
  } catch (err) {
    showToast(err.message || 'Failed to remove student', 'error');
  }
}

/**
 * Mock Batches
 */
function getMockBatches() {
  return [
    {
      id: '22222222-2222-2222-2222-222222222201',
      batch_name: 'Grade 10 - Advanced Physics',
      subject: 'Physics',
      grade: 'Grade 10',
      start_date: '2026-01-10',
      class_timing: '04:00 PM - 05:30 PM',
      max_capacity: 25,
      status: 'active',
      teachers: { id: '11111111-1111-1111-1111-111111111101', full_name: 'Dr. Rajesh Sharma', subject_specialization: 'Physics' },
      student_batches: [
        { id: 'sb-1', status: 'active', students: { id: '33333333-3333-3333-3333-333333333301', student_id: 'STU-2026-0001', full_name: 'Aarav Patel', phone: '+91 91234 56789' } },
        { id: 'sb-2', status: 'active', students: { id: '33333333-3333-3333-3333-333333333303', student_id: 'STU-2026-0003', full_name: 'Rohan Gupta', phone: '+91 91234 56791' } }
      ]
    },
    {
      id: '22222222-2222-2222-2222-222222222202',
      batch_name: 'Grade 12 - Organic Chemistry',
      subject: 'Chemistry',
      grade: 'Grade 12',
      start_date: '2026-01-12',
      class_timing: '05:45 PM - 07:15 PM',
      max_capacity: 20,
      status: 'active',
      teachers: { id: '11111111-1111-1111-1111-111111111102', full_name: 'Prof. Ananya Sen', subject_specialization: 'Chemistry' },
      student_batches: [
        { id: 'sb-3', status: 'active', students: { id: '33333333-3333-3333-3333-333333333302', student_id: 'STU-2026-0002', full_name: 'Diya Kulkarni', phone: '+91 91234 56790' } },
        { id: 'sb-4', status: 'active', students: { id: '33333333-3333-3333-3333-333333333305', student_id: 'STU-2026-0005', full_name: 'Karan Verma', phone: '+91 91234 56793' } }
      ]
    },
    {
      id: '22222222-2222-2222-2222-222222222203',
      batch_name: 'Grade 10 - Mathematics Mastery',
      subject: 'Mathematics',
      grade: 'Grade 10',
      start_date: '2026-02-01',
      class_timing: '06:00 PM - 07:30 PM',
      max_capacity: 30,
      status: 'active',
      teachers: { id: '11111111-1111-1111-1111-111111111101', full_name: 'Dr. Rajesh Sharma', subject_specialization: 'Mathematics' },
      student_batches: [
        { id: 'sb-5', status: 'active', students: { id: '33333333-3333-3333-3333-333333333301', student_id: 'STU-2026-0001', full_name: 'Aarav Patel', phone: '+91 91234 56789' } }
      ]
    }
  ];
}
