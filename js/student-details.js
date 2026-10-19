/**
 * Tuition Management System - Individual Student Profile Controller
 */

let currentStudentId = null;
let studentData = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  
  const urlParams = new URLSearchParams(window.location.search);
  currentStudentId = urlParams.get('id');

  if (!currentStudentId) {
    showToast('No student ID provided in URL', 'error');
    setTimeout(() => window.location.href = 'students.html', 1500);
    return;
  }

  await loadStudentProfile(currentStudentId);
  initTabSwitchers();
});

/**
 * Switch tabs in student profile
 */
function initTabSwitchers() {
  const tabs = document.querySelectorAll('.profile-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetSection = tab.getAttribute('data-tab');
      document.querySelectorAll('.tab-section').forEach(sec => {
        sec.style.display = sec.id === `section-${targetSection}` ? 'block' : 'none';
      });
    });
  });
}

/**
 * Load complete student profile details
 */
async function loadStudentProfile(id) {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  if (sb && window.isSupabaseConfigured) {
    try {
      // 1. Fetch student base record
      const { data: student, error } = await sb.from('students').select('*').eq('id', id).single();
      if (error) throw error;
      studentData = student;

      // 2. Fetch enrolled batches
      const { data: batches } = await sb
        .from('student_batches')
        .select(`
          id,
          enrolled_date,
          status,
          batches (id, batch_name, subject, grade, class_timing, teachers (full_name))
        `)
        .eq('student_id', id);

      // 3. Fetch attendance records
      const { data: attendance } = await sb
        .from('attendance')
        .select(`id, date, status, remarks, batches(batch_name)`)
        .eq('student_id', id)
        .order('date', { ascending: false });

      // 4. Fetch fee obligations and payments
      const { data: obligations } = await sb
        .from('fee_obligations')
        .select('*')
        .eq('student_id', id)
        .order('due_date', { ascending: false });

      const { data: payments } = await sb
        .from('fee_payments')
        .select('*')
        .eq('student_id', id)
        .order('payment_date', { ascending: false });

      // 5. Fetch exam results
      const { data: results } = await sb
        .from('exam_results')
        .select(`
          id,
          marks_obtained,
          grade,
          status,
          remarks,
          examinations (id, exam_name, exam_date, max_marks, pass_marks, batches(batch_name))
        `)
        .eq('student_id', id);

      renderProfileHeader(studentData);
      renderPersonalInfo(studentData);
      renderEnrolledBatches(batches || []);
      renderAttendanceSection(attendance || []);
      renderFeesSection(obligations || [], payments || []);
      renderExamResultsSection(results || []);
      return;
    } catch (err) {
      console.warn("Could not load from Supabase:", err);
      showToast("Loading offline demo profile", "info");
    }
  }

  // Fallback demo profile
  loadMockProfile();
}

/**
 * Render Header Banner
 */
function renderProfileHeader(s) {
  document.getElementById('profile-name').textContent = s.full_name;
  document.getElementById('profile-code').textContent = s.student_id;
  document.getElementById('profile-status-badge').innerHTML = renderBadge(s.status);
  
  const img = document.getElementById('profile-img');
  if (img) {
    img.src = s.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.full_name)}&background=4f46e5&color=fff`;
  }
}

/**
 * Render Personal Information Tab
 */
function renderPersonalInfo(s) {
  document.getElementById('p-dob').textContent = formatDate(s.date_of_birth);
  document.getElementById('p-gender').textContent = s.gender ? s.gender.toUpperCase() : '-';
  document.getElementById('p-phone').textContent = s.phone;
  document.getElementById('p-email').textContent = s.email || 'None';
  document.getElementById('p-parent-name').textContent = s.parent_name;
  document.getElementById('p-parent-phone').textContent = s.parent_phone;
  document.getElementById('p-address').textContent = s.address || 'None';
  document.getElementById('p-admission').textContent = formatDate(s.admission_date);
  document.getElementById('p-fee').textContent = formatCurrency(s.monthly_fee);
}

/**
 * Render Enrolled Batches Tab
 */
function renderEnrolledBatches(batches) {
  const container = document.getElementById('batches-list-body');
  if (!container) return;

  if (!batches || batches.length === 0) {
    container.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Student is currently not enrolled in any batch.</td></tr>`;
    return;
  }

  container.innerHTML = batches.map(b => `
    <tr>
      <td><strong>${escapeHTML(b.batches ? b.batches.batch_name : 'Unknown')}</strong></td>
      <td>${escapeHTML(b.batches ? b.batches.subject : '-')}</td>
      <td>${escapeHTML(b.batches ? b.batches.grade : '-')}</td>
      <td>${escapeHTML(b.batches && b.batches.teachers ? b.batches.teachers.full_name : 'Unassigned')}</td>
      <td>${escapeHTML(b.batches ? b.batches.class_timing : '-')}</td>
      <td>${renderBadge(b.status)}</td>
    </tr>
  `).join('');
}

/**
 * Render Attendance Tab with Stats
 */
function renderAttendanceSection(attendance) {
  const container = document.getElementById('attendance-list-body');
  if (!container) return;

  let present = 0, absent = 0, late = 0;
  attendance.forEach(a => {
    if (a.status === 'present') present++;
    else if (a.status === 'absent') absent++;
    else if (a.status === 'late') late++;
  });

  const total = attendance.length;
  const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  document.getElementById('att-rate-badge').textContent = `${percentage}% Attendance`;
  document.getElementById('att-present-count').textContent = present;
  document.getElementById('att-absent-count').textContent = absent;
  document.getElementById('att-late-count').textContent = late;

  if (attendance.length === 0) {
    container.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No attendance logs found for this student.</td></tr>`;
    return;
  }

  container.innerHTML = attendance.map(a => `
    <tr>
      <td>${formatDate(a.date)}</td>
      <td>${escapeHTML(a.batches ? a.batches.batch_name : 'Batch')}</td>
      <td>${renderBadge(a.status)}</td>
      <td>${escapeHTML(a.remarks || '-')}</td>
    </tr>
  `).join('');
}

/**
 * Render Fee History & Obligations
 */
function renderFeesSection(obligations, payments) {
  const oblContainer = document.getElementById('obligations-list-body');
  const payContainer = document.getElementById('payments-list-body');

  const totalDue = obligations.reduce((sum, o) => sum + parseFloat(o.amount_due || 0), 0);
  const totalPaid = payments
    .filter(p => p.status === 'valid')
    .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
  const balance = Math.max(0, totalDue - totalPaid);

  document.getElementById('fee-total-due').textContent = formatCurrency(totalDue);
  document.getElementById('fee-total-paid').textContent = formatCurrency(totalPaid);
  document.getElementById('fee-balance').textContent = formatCurrency(balance);

  if (oblContainer) {
    if (obligations.length === 0) {
      oblContainer.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No fee obligations configured.</td></tr>`;
    } else {
      oblContainer.innerHTML = obligations.map(o => `
        <tr>
          <td><strong>${escapeHTML(o.title)}</strong></td>
          <td>${escapeHTML(o.billing_month)}</td>
          <td><strong>${formatCurrency(o.amount_due)}</strong></td>
          <td>${formatDate(o.due_date)}</td>
          <td>${renderBadge(o.status)}</td>
        </tr>
      `).join('');
    }
  }

  if (payContainer) {
    if (payments.length === 0) {
      payContainer.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No payments recorded yet.</td></tr>`;
    } else {
      payContainer.innerHTML = payments.map(p => `
        <tr>
          <td><code>${escapeHTML(p.receipt_number)}</code></td>
          <td><strong>${formatCurrency(p.amount_paid)}</strong></td>
          <td>${formatDateTime(p.payment_date)}</td>
          <td><span class="badge badge-neutral">${escapeHTML(p.payment_method)}</span></td>
          <td>${renderBadge(p.status)}</td>
        </tr>
      `).join('');
    }
  }
}

/**
 * Render Exam Results Tab
 */
function renderExamResultsSection(results) {
  const container = document.getElementById('results-list-body');
  if (!container) return;

  if (!results || results.length === 0) {
    container.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No examination results recorded for this student.</td></tr>`;
    return;
  }

  container.innerHTML = results.map(r => {
    const exam = r.examinations || {};
    const pct = exam.max_marks ? Math.round((r.marks_obtained / exam.max_marks) * 100) : 0;

    return `
      <tr>
        <td><strong>${escapeHTML(exam.exam_name || 'Exam')}</strong></td>
        <td>${formatDate(exam.exam_date)}</td>
        <td><strong>${r.marks_obtained}</strong> / ${exam.max_marks}</td>
        <td><strong>${pct}%</strong></td>
        <td><span class="badge badge-info">${escapeHTML(r.grade || 'N/A')}</span></td>
        <td>${renderBadge(r.status)}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Mock Profile Data for immediate testing
 */
function loadMockProfile() {
  const mockStudent = {
    id: currentStudentId,
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
    status: 'active'
  };

  studentData = mockStudent;
  renderProfileHeader(mockStudent);
  renderPersonalInfo(mockStudent);

  renderEnrolledBatches([
    {
      status: 'active',
      batches: {
        batch_name: 'Grade 10 - Advanced Physics',
        subject: 'Physics',
        grade: 'Grade 10',
        class_timing: '04:00 PM - 05:30 PM',
        teachers: { full_name: 'Dr. Rajesh Sharma' }
      }
    },
    {
      status: 'active',
      batches: {
        batch_name: 'Grade 10 - Mathematics Mastery',
        subject: 'Mathematics',
        grade: 'Grade 10',
        class_timing: '06:00 PM - 07:30 PM',
        teachers: { full_name: 'Dr. Rajesh Sharma' }
      }
    }
  ]);

  renderAttendanceSection([
    { date: '2026-10-18', status: 'present', remarks: 'On time', batches: { batch_name: 'Grade 10 - Physics' } },
    { date: '2026-10-16', status: 'present', remarks: 'Active', batches: { batch_name: 'Grade 10 - Physics' } },
    { date: '2026-10-14', status: 'late', remarks: '5 mins late', batches: { batch_name: 'Grade 10 - Physics' } },
    { date: '2026-10-12', status: 'present', remarks: '', batches: { batch_name: 'Grade 10 - Physics' } },
    { date: '2026-10-10', status: 'absent', remarks: 'Sick leave', batches: { batch_name: 'Grade 10 - Physics' } }
  ]);

  renderFeesSection([
    { title: 'Tuition Fee - October 2026', billing_month: '2026-10', amount_due: 2500, due_date: '2026-10-10', status: 'paid' },
    { title: 'Tuition Fee - September 2026', billing_month: '2026-09', amount_due: 2500, due_date: '2026-09-10', status: 'paid' }
  ], [
    { receipt_number: 'REC-202610-0001', amount_paid: 2500, payment_date: '2026-10-05T10:30:00Z', payment_method: 'upi', status: 'valid' },
    { receipt_number: 'REC-202609-0012', amount_paid: 2500, payment_date: '2026-09-08T11:15:00Z', payment_method: 'cash', status: 'valid' }
  ]);

  renderExamResultsSection([
    {
      marks_obtained: 92.5,
      grade: 'A+',
      status: 'passed',
      examinations: {
        exam_name: 'Mid-Term Mechanics & Motion Test',
        exam_date: '2026-09-25',
        max_marks: 100,
        pass_marks: 40
      }
    }
  ]);
}
