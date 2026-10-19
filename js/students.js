/**
 * Tuition Management System - Student Management Controller
 */

let allStudents = [];
let allBatches = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  await loadBatchesDropdown();
  await loadStudents();
  initStudentEventListeners();
});

/**
 * Load Batches for filter and add/edit student modal
 */
async function loadBatchesDropdown() {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  if (sb && window.isSupabaseConfigured) {
    try {
      const { data, error } = await sb.from('batches').select('id, batch_name, grade').eq('status', 'active');
      if (!error && data) allBatches = data;
    } catch (e) {
      console.warn("Could not load batches from Supabase", e);
    }
  }

  // Populate filter dropdown and modal select
  const filterSelect = document.getElementById('filter-batch');
  const modalBatchSelect = document.getElementById('student-batch-select');

  const options = allBatches.map(b => `<option value="${b.id}">${escapeHTML(b.batch_name)} (${escapeHTML(b.grade)})</option>`).join('');

  if (filterSelect) {
    filterSelect.innerHTML = `<option value="">All Batches</option>` + options;
  }
  if (modalBatchSelect) {
    modalBatchSelect.innerHTML = `<option value="">-- Select Batch (Optional) --</option>` + options;
  }
}

/**
 * Load Students from Supabase or Mock Data
 */
async function loadStudents() {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));
  const tableBody = document.getElementById('students-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem;"><span class="spinner"></span> Loading students...</td></tr>`;

  if (sb && window.isSupabaseConfigured) {
    try {
      const { data, error } = await sb
        .from('students')
        .select(`
          *,
          student_batches (
            id,
            status,
            batches (id, batch_name, grade)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      allStudents = data || [];
      renderStudentsTable(allStudents);
      return;
    } catch (err) {
      console.warn("Live students load failed:", err);
      showToast("Using local demonstration students", "info");
    }
  }

  // Fallback demo students
  allStudents = getMockStudents();
  renderStudentsTable(allStudents);
}

/**
 * Render students into the table
 */
function renderStudentsTable(students) {
  const tableBody = document.getElementById('students-table-body');
  if (!tableBody) return;

  if (!students || students.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <h4 class="empty-state-title">No students found</h4>
            <p class="empty-state-text">No students matched the active search and filter criteria.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = students.map(student => {
    // Extract active batches
    const enrolledBatches = (student.student_batches || [])
      .filter(sb => sb.status === 'active' && sb.batches)
      .map(sb => sb.batches.batch_name)
      .join(', ') || 'Not Enrolled';

    const photoUrl = student.profile_photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

    return `
      <tr>
        <td><code>${escapeHTML(student.student_id)}</code></td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="${escapeHTML(photoUrl)}" alt="" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border);" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(student.full_name)}&background=4f46e5&color=fff'">
            <div>
              <strong>${escapeHTML(student.full_name)}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${student.email ? escapeHTML(student.email) : 'No email'}</div>
            </div>
          </div>
        </td>
        <td>
          <div>📞 ${escapeHTML(student.phone)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Parent: ${escapeHTML(student.parent_name)} (${escapeHTML(student.parent_phone)})</div>
        </td>
        <td><span class="badge badge-neutral" title="${escapeHTML(enrolledBatches)}">${escapeHTML(enrolledBatches.substring(0, 24))}${enrolledBatches.length > 24 ? '...' : ''}</span></td>
        <td><strong>${formatCurrency(student.monthly_fee)}</strong></td>
        <td>${renderBadge(student.status)}</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <a href="student-details.html?id=${student.id}" class="btn btn-secondary btn-sm" title="View Full Profile">Profile</a>
            <button class="btn btn-secondary btn-sm" onclick="openEditStudentModal('${student.id}')" title="Edit Student">Edit</button>
            ${student.status !== 'archived' ? `
              <button class="btn btn-secondary btn-sm" onclick="archiveStudent('${student.id}')" title="Archive Student" style="color: var(--danger);">Archive</button>
            ` : `
              <button class="btn btn-secondary btn-sm" onclick="restoreStudent('${student.id}')" title="Restore Student" style="color: var(--success);">Restore</button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Filter and Search logic
 */
function filterStudents() {
  const searchTerm = (document.getElementById('search-student').value || '').toLowerCase().trim();
  const batchFilter = document.getElementById('filter-batch').value;
  const statusFilter = document.getElementById('filter-status').value;

  const filtered = allStudents.filter(student => {
    const matchesSearch = 
      student.full_name.toLowerCase().includes(searchTerm) ||
      student.student_id.toLowerCase().includes(searchTerm) ||
      (student.phone && student.phone.includes(searchTerm)) ||
      (student.parent_name && student.parent_name.toLowerCase().includes(searchTerm));

    let matchesBatch = true;
    if (batchFilter) {
      matchesBatch = (student.student_batches || []).some(
        sb => sb.batches && sb.batches.id === batchFilter && sb.status === 'active'
      );
    }

    let matchesStatus = true;
    if (statusFilter) {
      matchesStatus = student.status === statusFilter;
    }

    return matchesSearch && matchesBatch && matchesStatus;
  });

  renderStudentsTable(filtered);
}

/**
 * Event Listeners initialization
 */
function initStudentEventListeners() {
  document.getElementById('search-student')?.addEventListener('input', filterStudents);
  document.getElementById('filter-batch')?.addEventListener('change', filterStudents);
  document.getElementById('filter-status')?.addEventListener('change', filterStudents);

  document.getElementById('add-student-btn')?.addEventListener('click', () => {
    openAddStudentModal();
  });

  document.getElementById('student-form')?.addEventListener('submit', handleStudentFormSubmit);

  document.getElementById('export-students-csv')?.addEventListener('click', () => {
    const headers = ['Student ID', 'Full Name', 'Phone', 'Parent Name', 'Parent Phone', 'Email', 'Admission Date', 'Monthly Fee', 'Status'];
    const rows = allStudents.map(s => [
      s.student_id,
      s.full_name,
      s.phone,
      s.parent_name,
      s.parent_phone,
      s.email || '',
      s.admission_date,
      s.monthly_fee,
      s.status
    ]);
    exportToCSV('Students_Report', headers, rows);
  });
}

/**
 * Open Modal to Add Student
 */
function openAddStudentModal() {
  document.getElementById('student-modal-title').textContent = 'Add New Student';
  document.getElementById('student-form').reset();
  document.getElementById('student-db-id').value = '';
  document.getElementById('student-id-field').value = generateStudentID();
  document.getElementById('student-admission-date').value = new Date().toISOString().slice(0, 10);
  openModal('student-form-modal');
}

/**
 * Open Modal to Edit Student
 */
function openEditStudentModal(id) {
  const student = allStudents.find(s => s.id === id);
  if (!student) return;

  document.getElementById('student-modal-title').textContent = 'Edit Student Details';
  document.getElementById('student-db-id').value = student.id;
  document.getElementById('student-id-field').value = student.student_id;
  document.getElementById('student-fullname').value = student.full_name;
  document.getElementById('student-photo').value = student.profile_photo_url || '';
  document.getElementById('student-dob').value = student.date_of_birth;
  document.getElementById('student-gender').value = student.gender || 'male';
  document.getElementById('student-phone').value = student.phone;
  document.getElementById('student-parent-name').value = student.parent_name;
  document.getElementById('student-parent-phone').value = student.parent_phone;
  document.getElementById('student-email').value = student.email || '';
  document.getElementById('student-address').value = student.address || '';
  document.getElementById('student-admission-date').value = student.admission_date;
  document.getElementById('student-monthly-fee').value = student.monthly_fee;
  document.getElementById('student-status').value = student.status;

  // Active batch selection
  const activeBatch = (student.student_batches || []).find(sb => sb.status === 'active');
  document.getElementById('student-batch-select').value = activeBatch && activeBatch.batches ? activeBatch.batches.id : '';

  openModal('student-form-modal');
}

/**
 * Handle Add/Edit Form Submission
 */
async function handleStudentFormSubmit(e) {
  e.preventDefault();

  const dbId = document.getElementById('student-db-id').value;
  const studentId = document.getElementById('student-id-field').value.trim();
  const fullName = document.getElementById('student-fullname').value.trim();
  const photoUrl = document.getElementById('student-photo').value.trim();
  const dob = document.getElementById('student-dob').value;
  const gender = document.getElementById('student-gender').value;
  const phone = document.getElementById('student-phone').value.trim();
  const parentName = document.getElementById('student-parent-name').value.trim();
  const parentPhone = document.getElementById('student-parent-phone').value.trim();
  const email = document.getElementById('student-email').value.trim() || null;
  const address = document.getElementById('student-address').value.trim() || null;
  const admissionDate = document.getElementById('student-admission-date').value;
  const monthlyFee = parseFloat(document.getElementById('student-monthly-fee').value || 0);
  const status = document.getElementById('student-status').value;
  const selectedBatchId = document.getElementById('student-batch-select').value;

  if (!fullName || !phone || !parentName || !parentPhone || !dob) {
    showToast('Please complete all mandatory required fields.', 'error');
    return;
  }

  const payload = {
    student_id: studentId,
    full_name: fullName,
    profile_photo_url: photoUrl || null,
    date_of_birth: dob,
    gender: gender,
    phone: phone,
    parent_name: parentName,
    parent_phone: parentPhone,
    email: email,
    address: address,
    admission_date: admissionDate,
    monthly_fee: monthlyFee,
    status: status
  };

  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  try {
    if (sb && window.isSupabaseConfigured) {
      let savedStudentId = dbId;
      if (dbId) {
        // Update existing student
        const { error } = await sb.from('students').update(payload).eq('id', dbId);
        if (error) throw error;
      } else {
        // Insert new student
        const { data, error } = await sb.from('students').insert(payload).select().single();
        if (error) throw error;
        savedStudentId = data.id;
      }

      // Handle batch enrollment if selected
      if (selectedBatchId && savedStudentId) {
        const { error: batchErr } = await sb
          .from('student_batches')
          .upsert({
            student_id: savedStudentId,
            batch_id: selectedBatchId,
            status: 'active'
          }, { onConflict: 'student_id,batch_id,status' });
        if (batchErr) console.warn("Batch enrollment notice:", batchErr.message);
      }

      showToast(dbId ? 'Student updated successfully' : 'Student registered successfully', 'success');
      closeModal('student-form-modal');
      await loadStudents();
      return;
    }

    // Mock mode update
    if (dbId) {
      const idx = allStudents.findIndex(s => s.id === dbId);
      if (idx !== -1) {
        allStudents[idx] = { ...allStudents[idx], ...payload };
      }
    } else {
      payload.id = 'demo-stu-' + Date.now();
      payload.student_batches = selectedBatchId ? [{ status: 'active', batches: allBatches.find(b => b.id === selectedBatchId) }] : [];
      allStudents.unshift(payload);
    }

    showToast('Saved successfully (Demo mode)', 'success');
    closeModal('student-form-modal');
    renderStudentsTable(allStudents);
  } catch (err) {
    showToast(err.message || 'Operation failed', 'error');
  }
}

/**
 * Archive student
 */
async function archiveStudent(id) {
  const confirmed = await confirmDialog(
    'Archive Student',
    'Are you sure you want to archive this student? Their historical records will remain safe.',
    'Archive',
    true
  );
  if (!confirmed) return;

  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  if (sb && window.isSupabaseConfigured) {
    try {
      const { error } = await sb.from('students').update({ status: 'archived' }).eq('id', id);
      if (error) throw error;
      showToast('Student archived successfully', 'success');
      await loadStudents();
      return;
    } catch (e) {
      showToast(e.message, 'error');
      return;
    }
  }

  // Mock
  const s = allStudents.find(s => s.id === id);
  if (s) s.status = 'archived';
  showToast('Student archived (Demo mode)', 'success');
  renderStudentsTable(allStudents);
}

/**
 * Restore student
 */
async function restoreStudent(id) {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  if (sb && window.isSupabaseConfigured) {
    try {
      const { error } = await sb.from('students').update({ status: 'active' }).eq('id', id);
      if (error) throw error;
      showToast('Student restored to active', 'success');
      await loadStudents();
      return;
    } catch (e) {
      showToast(e.message, 'error');
      return;
    }
  }

  const s = allStudents.find(s => s.id === id);
  if (s) s.status = 'active';
  showToast('Student restored', 'success');
  renderStudentsTable(allStudents);
}

/**
 * Mock students generator
 */
function getMockStudents() {
  return [
    {
      id: '33333333-3333-3333-3333-333333333301',
      student_id: 'STU-2026-0001',
      full_name: 'Aarav Patel',
      profile_photo_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
      date_of_birth: '2010-05-14',
      gender: 'male',
      phone: '+91 91234 56789',
      parent_name: 'Kishore Patel',
      parent_phone: '+91 98220 12345',
      email: 'aarav.patel@student.com',
      address: '14 Sunrise Enclave, City',
      admission_date: '2026-01-05',
      monthly_fee: 2500,
      status: 'active',
      student_batches: [
        { status: 'active', batches: { id: 'b1', batch_name: 'Grade 10 - Advanced Physics', grade: 'Grade 10' } }
      ]
    },
    {
      id: '33333333-3333-3333-3333-333333333302',
      student_id: 'STU-2026-0002',
      full_name: 'Diya Kulkarni',
      profile_photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      date_of_birth: '2008-09-22',
      gender: 'female',
      phone: '+91 91234 56790',
      parent_name: 'Sunil Kulkarni',
      parent_phone: '+91 98220 12346',
      email: 'diya.k@student.com',
      address: '28 Green Valley, City',
      admission_date: '2026-01-08',
      monthly_fee: 3000,
      status: 'active',
      student_batches: [
        { status: 'active', batches: { id: 'b2', batch_name: 'Grade 12 - Organic Chemistry', grade: 'Grade 12' } }
      ]
    },
    {
      id: '33333333-3333-3333-3333-333333333303',
      student_id: 'STU-2026-0003',
      full_name: 'Rohan Gupta',
      profile_photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      date_of_birth: '2010-11-03',
      gender: 'male',
      phone: '+91 91234 56791',
      parent_name: 'Manoj Gupta',
      parent_phone: '+91 98220 12347',
      email: 'rohan.g@student.com',
      address: '88 Hill View Road',
      admission_date: '2026-01-10',
      monthly_fee: 2500,
      status: 'active',
      student_batches: [
        { status: 'active', batches: { id: 'b1', batch_name: 'Grade 10 - Advanced Physics', grade: 'Grade 10' } }
      ]
    },
    {
      id: '33333333-3333-3333-3333-333333333304',
      student_id: 'STU-2026-0004',
      full_name: 'Sneha Roy',
      profile_photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      date_of_birth: '2011-03-18',
      gender: 'female',
      phone: '+91 91234 56792',
      parent_name: 'Debashis Roy',
      parent_phone: '+91 98220 12348',
      email: 'sneha.roy@student.com',
      address: '102 Royal Palm Gardens',
      admission_date: '2026-01-15',
      monthly_fee: 2200,
      status: 'active',
      student_batches: [
        { status: 'active', batches: { id: 'b3', batch_name: 'Grade 9 - English Grammar', grade: 'Grade 9' } }
      ]
    },
    {
      id: '33333333-3333-3333-3333-333333333305',
      student_id: 'STU-2026-0005',
      full_name: 'Karan Verma',
      profile_photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      date_of_birth: '2008-12-07',
      gender: 'male',
      phone: '+91 91234 56793',
      parent_name: 'Prakash Verma',
      parent_phone: '+91 98220 12349',
      email: 'karan.v@student.com',
      address: '54 Blossom Avenue',
      admission_date: '2026-01-20',
      monthly_fee: 3000,
      status: 'active',
      student_batches: [
        { status: 'active', batches: { id: 'b2', batch_name: 'Grade 12 - Organic Chemistry', grade: 'Grade 12' } }
      ]
    }
  ];
}
