/**
 * Tuition Management System - Attendance Management Controller
 */

let availableBatches = [];
let enrolledStudents = [];
let existingAttendanceMap = {}; // student_id -> { id, status, remarks }

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  
  // Set default date to today
  document.getElementById('attendance-date').value = new Date().toISOString().slice(0, 10);

  await loadAttendanceBatches();
  initAttendanceEventListeners();
});

/**
 * Load Batches accessible by the current user
 * (Teachers are restricted to their assigned batches)
 */
async function loadAttendanceBatches() {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));
  const profile = getCurrentProfile();

  if (sb && window.isSupabaseConfigured) {
    try {
      let query = sb.from('batches').select('id, batch_name, grade, teacher_id, teachers(full_name)').eq('status', 'active');
      
      // If user is a teacher, restrict batch list to teacher's batches
      if (profile && profile.role === 'teacher' && profile.teacher_id) {
        query = query.eq('teacher_id', profile.teacher_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      availableBatches = data || [];
    } catch (err) {
      console.warn("Could not load batches from Supabase:", err);
    }
  } else {
    // Demo batches
    availableBatches = [
      { id: '22222222-2222-2222-2222-222222222201', batch_name: 'Grade 10 - Advanced Physics', grade: 'Grade 10', teacher_id: '11111111-1111-1111-1111-111111111101' },
      { id: '22222222-2222-2222-2222-222222222202', batch_name: 'Grade 12 - Organic Chemistry', grade: 'Grade 12', teacher_id: '11111111-1111-1111-1111-111111111102' },
      { id: '22222222-2222-2222-2222-222222222203', batch_name: 'Grade 10 - Mathematics Mastery', grade: 'Grade 10', teacher_id: '11111111-1111-1111-1111-111111111101' }
    ];

    if (profile && profile.role === 'teacher' && profile.teacher_id) {
      availableBatches = availableBatches.filter(b => b.teacher_id === profile.teacher_id);
    }
  }

  const select = document.getElementById('attendance-batch-select');
  if (select) {
    if (availableBatches.length === 0) {
      select.innerHTML = `<option value="">No batches assigned to your account</option>`;
      document.getElementById('load-attendance-btn').disabled = true;
    } else {
      select.innerHTML = `<option value="">-- Select Batch --</option>` +
        availableBatches.map(b => `<option value="${b.id}">${escapeHTML(b.batch_name)} (${escapeHTML(b.grade)})</option>`).join('');
      document.getElementById('load-attendance-btn').disabled = false;
    }
  }
}

/**
 * Event Listeners
 */
function initAttendanceEventListeners() {
  document.getElementById('load-attendance-btn')?.addEventListener('click', loadAttendanceSheet);
  document.getElementById('mark-all-present-btn')?.addEventListener('click', markAllPresent);
  document.getElementById('save-attendance-btn')?.addEventListener('click', saveAttendanceSheet);
  document.getElementById('attendance-batch-select')?.addEventListener('change', loadAttendanceSheet);
  document.getElementById('attendance-date')?.addEventListener('change', loadAttendanceSheet);
}

/**
 * Load Attendance Sheet for selected batch and date
 */
async function loadAttendanceSheet() {
  const batchId = document.getElementById('attendance-batch-select').value;
  const dateVal = document.getElementById('attendance-date').value;

  if (!batchId) {
    showToast('Please select a batch first.', 'warning');
    return;
  }
  if (!dateVal) {
    showToast('Please select an attendance date.', 'warning');
    return;
  }

  const tableBody = document.getElementById('attendance-table-body');
  tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem;"><span class="spinner"></span> Loading enrolled students and logs...</td></tr>`;

  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  existingAttendanceMap = {};
  enrolledStudents = [];

  if (sb && window.isSupabaseConfigured) {
    try {
      // 1. Fetch enrolled students for this batch
      const { data: enrollments, error: enrolErr } = await sb
        .from('student_batches')
        .select(`
          student_id,
          students (id, student_id, full_name, phone)
        `)
        .eq('batch_id', batchId)
        .eq('status', 'active');

      if (enrolErr) throw enrolErr;
      enrolledStudents = (enrollments || []).map(e => e.students).filter(Boolean);

      // 2. Fetch existing attendance records for this batch and date
      const { data: attList, error: attErr } = await sb
        .from('attendance')
        .select('id, student_id, status, remarks')
        .eq('batch_id', batchId)
        .eq('date', dateVal);

      if (attErr) throw attErr;

      (attList || []).forEach(row => {
        existingAttendanceMap[row.student_id] = {
          id: row.id,
          status: row.status,
          remarks: row.remarks
        };
      });

      renderAttendanceRows();
      return;
    } catch (err) {
      console.warn("Supabase attendance fetch failed:", err);
      showToast("Loading offline demo attendance", "info");
    }
  }

  // Demo fallback
  enrolledStudents = [
    { id: '33333333-3333-3333-3333-333333333301', student_id: 'STU-2026-0001', full_name: 'Aarav Patel', phone: '+91 91234 56789' },
    { id: '33333333-3333-3333-3333-333333333303', student_id: 'STU-2026-0003', full_name: 'Rohan Gupta', phone: '+91 91234 56791' }
  ];
  existingAttendanceMap['33333333-3333-3333-3333-333333333301'] = { status: 'present', remarks: 'On time' };
  existingAttendanceMap['33333333-3333-3333-3333-333333333303'] = { status: 'late', remarks: '10 mins late' };

  renderAttendanceRows();
}

/**
 * Render Student Attendance Rows
 */
function renderAttendanceRows() {
  const tableBody = document.getElementById('attendance-table-body');
  if (!tableBody) return;

  if (enrolledStudents.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <h4 class="empty-state-title">No students enrolled in this batch</h4>
            <p class="empty-state-text">Go to the Batches module to enrol students into this batch first.</p>
          </div>
        </td>
      </tr>
    `;
    updateAttendanceStats();
    return;
  }

  tableBody.innerHTML = enrolledStudents.map(s => {
    const existing = existingAttendanceMap[s.id] || { status: 'present', remarks: '' };

    return `
      <tr data-student-id="${s.id}">
        <td><code>${escapeHTML(s.student_id)}</code></td>
        <td><strong>${escapeHTML(s.full_name)}</strong></td>
        <td>
          <div style="display: flex; gap: 0.75rem;">
            <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer; color: var(--success-text); font-weight: 600;">
              <input type="radio" name="status-${s.id}" value="present" ${existing.status === 'present' ? 'checked' : ''} onchange="updateAttendanceStats()">
              Present
            </label>
            <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer; color: var(--danger-text); font-weight: 600;">
              <input type="radio" name="status-${s.id}" value="absent" ${existing.status === 'absent' ? 'checked' : ''} onchange="updateAttendanceStats()">
              Absent
            </label>
            <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer; color: var(--warning-text); font-weight: 600;">
              <input type="radio" name="status-${s.id}" value="late" ${existing.status === 'late' ? 'checked' : ''} onchange="updateAttendanceStats()">
              Late
            </label>
          </div>
        </td>
        <td>
          <input type="text" class="form-control form-control-sm" id="remarks-${s.id}" placeholder="Optional note..." value="${escapeHTML(existing.remarks || '')}" style="max-width: 260px;">
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="viewStudentAttendanceHistory('${s.id}', '${escapeHTML(s.full_name)}')">
            History
          </button>
        </td>
      </tr>
    `;
  }).join('');

  updateAttendanceStats();
}

/**
 * Shortcut: Mark All Present
 */
function markAllPresent() {
  enrolledStudents.forEach(s => {
    const radio = document.querySelector(`input[name="status-${s.id}"][value="present"]`);
    if (radio) radio.checked = true;
  });
  updateAttendanceStats();
  showToast('Marked all students as Present', 'info');
}

/**
 * Update realtime attendance stats header
 */
function updateAttendanceStats() {
  let present = 0, absent = 0, late = 0;

  enrolledStudents.forEach(s => {
    const checked = document.querySelector(`input[name="status-${s.id}"]:checked`);
    if (checked) {
      if (checked.value === 'present') present++;
      else if (checked.value === 'absent') absent++;
      else if (checked.value === 'late') late++;
    }
  });

  const total = enrolledStudents.length;
  const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  document.getElementById('att-summary-present').textContent = present;
  document.getElementById('att-summary-absent').textContent = absent;
  document.getElementById('att-summary-late').textContent = late;
  document.getElementById('att-summary-pct').textContent = `${pct}% Rate`;
}

/**
 * Save Attendance Sheet to Supabase with Duplicate Prevention
 */
async function saveAttendanceSheet() {
  const batchId = document.getElementById('attendance-batch-select').value;
  const dateVal = document.getElementById('attendance-date').value;

  if (!batchId || !dateVal) {
    showToast('Batch and Date are required.', 'error');
    return;
  }

  if (enrolledStudents.length === 0) {
    showToast('No students enrolled to record attendance.', 'warning');
    return;
  }

  const recordsToUpsert = enrolledStudents.map(s => {
    const statusRadio = document.querySelector(`input[name="status-${s.id}"]:checked`);
    const status = statusRadio ? statusRadio.value : 'present';
    const remarks = (document.getElementById(`remarks-${s.id}`)?.value || '').trim() || null;

    return {
      student_id: s.id,
      batch_id: batchId,
      date: dateVal,
      status: status,
      remarks: remarks
    };
  });

  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  try {
    if (sb && window.isSupabaseConfigured) {
      // Upsert into Supabase attendance table, using unique constraint (student_id, batch_id, date)
      const { data, error } = await sb
        .from('attendance')
        .upsert(recordsToUpsert, { onConflict: 'student_id,batch_id,date' });

      if (error) throw error;
      showToast(`Saved attendance for ${recordsToUpsert.length} students successfully!`, 'success');
      await loadAttendanceSheet();
      return;
    }

    // Mock
    recordsToUpsert.forEach(r => {
      existingAttendanceMap[r.student_id] = { status: r.status, remarks: r.remarks };
    });
    showToast(`Saved attendance (Demo Mode)`, 'success');
  } catch (err) {
    showToast(err.message || 'Failed to save attendance', 'error');
  }
}

/**
 * View Student Attendance History Modal
 */
async function viewStudentAttendanceHistory(studentId, studentName) {
  document.getElementById('history-student-name').textContent = studentName;
  const tableBody = document.getElementById('history-table-body');
  tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 1.5rem;"><span class="spinner"></span> Loading history...</td></tr>`;

  openModal('attendance-history-modal');

  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  let historyRecords = [];

  if (sb && window.isSupabaseConfigured) {
    try {
      const { data, error } = await sb
        .from('attendance')
        .select(`date, status, remarks, batches(batch_name)`)
        .eq('student_id', studentId)
        .order('date', { ascending: false });

      if (error) throw error;
      historyRecords = data || [];
    } catch (e) {
      console.warn("Could not load history from Supabase:", e);
    }
  } else {
    historyRecords = [
      { date: '2026-10-18', status: 'present', remarks: 'On time', batches: { batch_name: 'Grade 10 - Physics' } },
      { date: '2026-10-16', status: 'present', remarks: 'Active', batches: { batch_name: 'Grade 10 - Physics' } },
      { date: '2026-10-14', status: 'late', remarks: 'Bus late', batches: { batch_name: 'Grade 10 - Physics' } },
      { date: '2026-10-12', status: 'present', remarks: '', batches: { batch_name: 'Grade 10 - Physics' } },
      { date: '2026-10-10', status: 'absent', remarks: 'Fever', batches: { batch_name: 'Grade 10 - Physics' } }
    ];
  }

  // Calculate stats
  let present = 0, absent = 0, late = 0;
  historyRecords.forEach(h => {
    if (h.status === 'present') present++;
    else if (h.status === 'absent') absent++;
    else if (h.status === 'late') late++;
  });

  const total = historyRecords.length;
  const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
  document.getElementById('history-student-rate').textContent = `${pct}% Attendance (${total} Total Sessions)`;

  if (historyRecords.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No historical records found for this student.</td></tr>`;
    return;
  }

  tableBody.innerHTML = historyRecords.map(h => `
    <tr>
      <td>${formatDate(h.date)}</td>
      <td>${escapeHTML(h.batches ? h.batches.batch_name : '-')}</td>
      <td>${renderBadge(h.status)}</td>
      <td>${escapeHTML(h.remarks || '-')}</td>
    </tr>
  `).join('');
}
