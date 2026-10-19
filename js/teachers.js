/**
 * Tuition Management System - Teacher Management Controller
 */

let allTeachers = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  await loadTeachers();
  initTeacherEventListeners();
});

/**
 * Load Teachers from Supabase
 */
async function loadTeachers() {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));
  const tableBody = document.getElementById('teachers-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem;"><span class="spinner"></span> Loading teachers...</td></tr>`;

  if (sb && window.isSupabaseConfigured) {
    try {
      const { data, error } = await sb
        .from('teachers')
        .select(`
          *,
          batches (id, batch_name, subject, grade, status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      allTeachers = data || [];
      renderTeachersTable(allTeachers);
      return;
    } catch (err) {
      console.warn("Could not load teachers from Supabase:", err);
      showToast("Loading demonstration teachers", "info");
    }
  }

  // Fallback demo teachers
  allTeachers = getMockTeachers();
  renderTeachersTable(allTeachers);
}

/**
 * Render teachers table
 */
function renderTeachersTable(teachers) {
  const tableBody = document.getElementById('teachers-table-body');
  if (!tableBody) return;

  if (!teachers || teachers.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <h4 class="empty-state-title">No teachers found</h4>
            <p class="empty-state-text">No teacher records match the current filter.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const isAdminUser = isAdmin();

  tableBody.innerHTML = teachers.map(t => {
    const activeBatches = (t.batches || []).filter(b => b.status === 'active');
    const batchNames = activeBatches.map(b => b.batch_name).join(', ') || 'No active batches';

    return `
      <tr>
        <td><code>${escapeHTML(t.teacher_id)}</code></td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">
              ${t.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              <strong>${escapeHTML(t.full_name)}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHTML(t.email)}</div>
            </div>
          </div>
        </td>
        <td>📞 ${escapeHTML(t.phone)}</td>
        <td><span class="badge badge-info">${escapeHTML(t.subject_specialization)}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="viewTeacherBatches('${t.id}')">
            ${activeBatches.length} Batches
          </button>
        </td>
        <td>${renderBadge(t.status)}</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            ${isAdminUser ? `
              <button class="btn btn-secondary btn-sm" onclick="openEditTeacherModal('${t.id}')">Edit</button>
              <button class="btn btn-secondary btn-sm" onclick="toggleTeacherStatus('${t.id}')" style="color: ${t.status === 'active' ? 'var(--warning-text)' : 'var(--success-text)'}">
                ${t.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" onclick="viewTeacherBatches('${t.id}')">View</button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Filter teachers
 */
function filterTeachers() {
  const searchTerm = (document.getElementById('search-teacher').value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('filter-teacher-status').value;

  const filtered = allTeachers.filter(t => {
    const matchesSearch = 
      t.full_name.toLowerCase().includes(searchTerm) ||
      t.teacher_id.toLowerCase().includes(searchTerm) ||
      t.email.toLowerCase().includes(searchTerm) ||
      t.subject_specialization.toLowerCase().includes(searchTerm);

    const matchesStatus = statusFilter ? t.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  renderTeachersTable(filtered);
}

/**
 * Event Listeners
 */
function initTeacherEventListeners() {
  document.getElementById('search-teacher')?.addEventListener('input', filterTeachers);
  document.getElementById('filter-teacher-status')?.addEventListener('change', filterTeachers);

  document.getElementById('add-teacher-btn')?.addEventListener('click', () => {
    if (!isAdmin()) {
      showToast('Only administrators can add new teacher records.', 'error');
      return;
    }
    openAddTeacherModal();
  });

  document.getElementById('teacher-form')?.addEventListener('submit', handleTeacherFormSubmit);
}

/**
 * Open Modal to Add Teacher
 */
function openAddTeacherModal() {
  document.getElementById('teacher-modal-title').textContent = 'Add Teacher Profile';
  document.getElementById('teacher-form').reset();
  document.getElementById('teacher-db-id').value = '';
  document.getElementById('teacher-id-field').value = generateTeacherID();
  document.getElementById('teacher-joining-date').value = new Date().toISOString().slice(0, 10);
  openModal('teacher-form-modal');
}

/**
 * Open Modal to Edit Teacher
 */
function openEditTeacherModal(id) {
  const t = allTeachers.find(item => item.id === id);
  if (!t) return;

  document.getElementById('teacher-modal-title').textContent = 'Edit Teacher Profile';
  document.getElementById('teacher-db-id').value = t.id;
  document.getElementById('teacher-id-field').value = t.teacher_id;
  document.getElementById('teacher-fullname').value = t.full_name;
  document.getElementById('teacher-email').value = t.email;
  document.getElementById('teacher-phone').value = t.phone;
  document.getElementById('teacher-subject').value = t.subject_specialization;
  document.getElementById('teacher-address').value = t.address || '';
  document.getElementById('teacher-joining-date').value = t.joining_date;
  document.getElementById('teacher-status').value = t.status;

  openModal('teacher-form-modal');
}

/**
 * Handle Teacher Save Submit
 */
async function handleTeacherFormSubmit(e) {
  e.preventDefault();

  const dbId = document.getElementById('teacher-db-id').value;
  const teacherId = document.getElementById('teacher-id-field').value.trim();
  const fullName = document.getElementById('teacher-fullname').value.trim();
  const email = document.getElementById('teacher-email').value.trim();
  const phone = document.getElementById('teacher-phone').value.trim();
  const subject = document.getElementById('teacher-subject').value.trim();
  const address = document.getElementById('teacher-address').value.trim() || null;
  const joiningDate = document.getElementById('teacher-joining-date').value;
  const status = document.getElementById('teacher-status').value;

  if (!fullName || !email || !phone || !subject) {
    showToast('Please provide all required fields.', 'error');
    return;
  }

  const payload = {
    teacher_id: teacherId,
    full_name: fullName,
    email: email,
    phone: phone,
    subject_specialization: subject,
    address: address,
    joining_date: joiningDate,
    status: status
  };

  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  try {
    if (sb && window.isSupabaseConfigured) {
      if (dbId) {
        const { error } = await sb.from('teachers').update(payload).eq('id', dbId);
        if (error) throw error;
      } else {
        const { error } = await sb.from('teachers').insert(payload);
        if (error) throw error;
      }

      showToast(dbId ? 'Teacher updated' : 'Teacher added successfully', 'success');
      closeModal('teacher-form-modal');
      await loadTeachers();
      return;
    }

    // Mock
    if (dbId) {
      const idx = allTeachers.findIndex(t => t.id === dbId);
      if (idx !== -1) allTeachers[idx] = { ...allTeachers[idx], ...payload };
    } else {
      payload.id = 'demo-tch-' + Date.now();
      payload.batches = [];
      allTeachers.unshift(payload);
    }

    showToast('Saved (Demo Mode)', 'success');
    closeModal('teacher-form-modal');
    renderTeachersTable(allTeachers);
  } catch (err) {
    showToast(err.message || 'Operation failed', 'error');
  }
}

/**
 * View Batches Assigned to Teacher
 */
function viewTeacherBatches(teacherId) {
  const teacher = allTeachers.find(t => t.id === teacherId);
  if (!teacher) return;

  document.getElementById('view-teacher-name').textContent = teacher.full_name;
  const listEl = document.getElementById('teacher-batches-list');

  const batches = teacher.batches || [];
  if (batches.length === 0) {
    listEl.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 1.5rem;">No batches currently assigned to this teacher.</p>`;
  } else {
    listEl.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Batch Name</th>
            <th>Subject</th>
            <th>Grade</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${batches.map(b => `
            <tr>
              <td><strong>${escapeHTML(b.batch_name)}</strong></td>
              <td>${escapeHTML(b.subject)}</td>
              <td>${escapeHTML(b.grade)}</td>
              <td>${renderBadge(b.status)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  openModal('teacher-batches-modal');
}

/**
 * Toggle active/inactive
 */
async function toggleTeacherStatus(id) {
  const t = allTeachers.find(i => i.id === id);
  if (!t) return;

  const newStatus = t.status === 'active' ? 'inactive' : 'active';
  const confirmed = await confirmDialog(
    'Update Status',
    `Are you sure you want to mark ${t.full_name} as ${newStatus}?`,
    'Update',
    false
  );
  if (!confirmed) return;

  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  if (sb && window.isSupabaseConfigured) {
    try {
      const { error } = await sb.from('teachers').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      showToast(`Teacher status changed to ${newStatus}`, 'success');
      await loadTeachers();
      return;
    } catch (e) {
      showToast(e.message, 'error');
      return;
    }
  }

  t.status = newStatus;
  showToast(`Teacher status changed to ${newStatus}`, 'success');
  renderTeachersTable(allTeachers);
}

/**
 * Mock teachers
 */
function getMockTeachers() {
  return [
    {
      id: '11111111-1111-1111-1111-111111111101',
      teacher_id: 'TCH-001',
      full_name: 'Dr. Rajesh Sharma',
      email: 'rajesh.sharma@example.com',
      phone: '+91 98765 43210',
      subject_specialization: 'Physics & Mathematics',
      address: '12 Lake View Rd, Sector 4',
      joining_date: '2025-01-15',
      status: 'active',
      batches: [
        { id: 'b1', batch_name: 'Grade 10 - Advanced Physics', subject: 'Physics', grade: 'Grade 10', status: 'active' },
        { id: 'b3', batch_name: 'Grade 10 - Mathematics Mastery', subject: 'Mathematics', grade: 'Grade 10', status: 'active' }
      ]
    },
    {
      id: '11111111-1111-1111-1111-111111111102',
      teacher_id: 'TCH-002',
      full_name: 'Prof. Ananya Sen',
      email: 'ananya.sen@example.com',
      phone: '+91 98765 43211',
      subject_specialization: 'Chemistry & Biology',
      address: '45 Park Street, Apt 3B',
      joining_date: '2025-02-01',
      status: 'active',
      batches: [
        { id: 'b2', batch_name: 'Grade 12 - Organic Chemistry', subject: 'Chemistry', grade: 'Grade 12', status: 'active' }
      ]
    },
    {
      id: '11111111-1111-1111-1111-111111111103',
      teacher_id: 'TCH-003',
      full_name: 'Vikram Malhotra',
      email: 'vikram.malhotra@example.com',
      phone: '+91 98765 43212',
      subject_specialization: 'English Literature & Grammar',
      address: '78 Heritage Colony',
      joining_date: '2025-03-10',
      status: 'active',
      batches: [
        { id: 'b4', batch_name: 'Grade 9 - English Grammar', subject: 'English', grade: 'Grade 9', status: 'active' }
      ]
    }
  ];
}
