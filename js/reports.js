/**
 * Tuition Management System - Reports Controller
 * Supports all 8 required reports with interactive filters, print layouts, and CSV export.
 */

let activeReportType = 'student-list';
let currentReportData = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  await loadReportFilterOptions();
  initReportsEventListeners();
  await generateReport();
});

/**
 * Load Batches and Students for Report Selectors
 */
async function loadReportFilterOptions() {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  let batches = [];
  let students = [];

  if (sb && window.isSupabaseConfigured) {
    try {
      const [{ data: bData }, { data: sData }] = await Promise.all([
        sb.from('batches').select('id, batch_name, grade').eq('status', 'active'),
        sb.from('students').select('id, student_id, full_name').neq('status', 'archived')
      ]);
      batches = bData || [];
      students = sData || [];
    } catch (e) {
      console.warn("Could not load report options:", e);
    }
  } else {
    batches = [
      { id: '22222222-2222-2222-2222-222222222201', batch_name: 'Grade 10 - Advanced Physics', grade: 'Grade 10' },
      { id: '22222222-2222-2222-2222-222222222202', batch_name: 'Grade 12 - Organic Chemistry', grade: 'Grade 12' },
      { id: '22222222-2222-2222-2222-222222222203', batch_name: 'Grade 10 - Mathematics Mastery', grade: 'Grade 10' }
    ];
    students = [
      { id: '33333333-3333-3333-3333-333333333301', student_id: 'STU-2026-0001', full_name: 'Aarav Patel' },
      { id: '33333333-3333-3333-3333-333333333302', student_id: 'STU-2026-0002', full_name: 'Diya Kulkarni' },
      { id: '33333333-3333-3333-3333-333333333303', student_id: 'STU-2026-0003', full_name: 'Rohan Gupta' }
    ];
  }

  const batchSelect = document.getElementById('report-batch-filter');
  const studentSelect = document.getElementById('report-student-filter');

  if (batchSelect) {
    batchSelect.innerHTML = `<option value="">All Batches</option>` +
      batches.map(b => `<option value="${b.id}">${escapeHTML(b.batch_name)} (${escapeHTML(b.grade)})</option>`).join('');
  }

  if (studentSelect) {
    studentSelect.innerHTML = `<option value="">All Students</option>` +
      students.map(s => `<option value="${s.id}">${escapeHTML(s.student_id)} - ${escapeHTML(s.full_name)}</option>`).join('');
  }

  // Set default dates
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  document.getElementById('report-start-date').value = firstDay;
  document.getElementById('report-end-date').value = today;
}

/**
 * Event Listeners
 */
function initReportsEventListeners() {
  document.querySelectorAll('.report-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      document.querySelectorAll('.report-menu-item').forEach(m => m.classList.remove('active'));
      item.classList.add('active');
      activeReportType = item.getAttribute('data-report');
      updateFilterVisibility(activeReportType);
      generateReport();
    });
  });

  document.getElementById('apply-report-filters-btn')?.addEventListener('click', generateReport);
  document.getElementById('export-report-csv-btn')?.addEventListener('click', exportCurrentReportToCSV);
  document.getElementById('print-report-btn')?.addEventListener('click', () => window.print());
}

/**
 * Adjust filter controls based on selected report
 */
function updateFilterVisibility(type) {
  const batchFilterGroup = document.getElementById('filter-group-batch');
  const studentFilterGroup = document.getElementById('filter-group-student');
  const dateFilterGroup = document.getElementById('filter-group-date');

  batchFilterGroup.style.display = ['batch-students', 'daily-attendance', 'monthly-attendance', 'exam-results'].includes(type) ? 'block' : 'none';
  studentFilterGroup.style.display = ['student-payment-history'].includes(type) ? 'block' : 'none';
  dateFilterGroup.style.display = ['daily-attendance', 'monthly-attendance', 'fee-collection'].includes(type) ? 'flex' : 'none';
}

/**
 * Main Report Generator
 */
async function generateReport() {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));
  const container = document.getElementById('report-content-area');
  container.innerHTML = `<div style="text-align: center; padding: 3rem;"><span class="spinner"></span> Generating report...</div>`;

  const batchId = document.getElementById('report-batch-filter').value;
  const studentId = document.getElementById('report-student-filter').value;
  const startDate = document.getElementById('report-start-date').value;
  const endDate = document.getElementById('report-end-date').value;

  switch (activeReportType) {
    case 'student-list':
      await generateStudentListReport(sb, isDemo);
      break;
    case 'batch-students':
      await generateBatchStudentsReport(sb, isDemo, batchId);
      break;
    case 'daily-attendance':
      await generateDailyAttendanceReport(sb, isDemo, batchId, endDate);
      break;
    case 'monthly-attendance':
      await generateMonthlyAttendanceReport(sb, isDemo, batchId, startDate, endDate);
      break;
    case 'fee-collection':
      await generateFeeCollectionReport(sb, isDemo, startDate, endDate);
      break;
    case 'outstanding-fees':
      await generateOutstandingFeesReport(sb, isDemo);
      break;
    case 'student-payment-history':
      await generateStudentPaymentHistoryReport(sb, isDemo, studentId);
      break;
    case 'exam-results':
      await generateExamResultsReport(sb, isDemo, batchId);
      break;
    default:
      container.innerHTML = `<p>Please select a report type.</p>`;
  }
}

/**
 * 1. Student List Report
 */
async function generateStudentListReport(sb, isDemo) {
  let data = [];
  if (sb && window.isSupabaseConfigured) {
    const { data: list } = await sb.from('students').select('*').order('full_name');
    data = list || [];
  } else {
    data = [
      { student_id: 'STU-2026-0001', full_name: 'Aarav Patel', phone: '+91 91234 56789', parent_name: 'Kishore Patel', admission_date: '2026-01-05', monthly_fee: 2500, status: 'active' },
      { student_id: 'STU-2026-0002', full_name: 'Diya Kulkarni', phone: '+91 91234 56790', parent_name: 'Sunil Kulkarni', admission_date: '2026-01-08', monthly_fee: 3000, status: 'active' },
      { student_id: 'STU-2026-0003', full_name: 'Rohan Gupta', phone: '+91 91234 56791', parent_name: 'Manoj Gupta', admission_date: '2026-01-10', monthly_fee: 2500, status: 'active' }
    ];
  }

  currentReportData = data;
  document.getElementById('report-title-heading').textContent = 'Comprehensive Student Directory';
  document.getElementById('report-meta-subtitle').textContent = `Total registered students: ${data.length}`;

  const html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Student ID</th>
          <th>Full Name</th>
          <th>Phone</th>
          <th>Parent / Guardian</th>
          <th>Admission Date</th>
          <th>Monthly Fee</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(s => `
          <tr>
            <td><code>${escapeHTML(s.student_id)}</code></td>
            <td><strong>${escapeHTML(s.full_name)}</strong></td>
            <td>${escapeHTML(s.phone)}</td>
            <td>${escapeHTML(s.parent_name)}</td>
            <td>${formatDate(s.admission_date)}</td>
            <td>${formatCurrency(s.monthly_fee)}</td>
            <td>${renderBadge(s.status)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  document.getElementById('report-content-area').innerHTML = html;
}

/**
 * 2. Batch-wise Student Report
 */
async function generateBatchStudentsReport(sb, isDemo, batchId) {
  let data = [];
  if (sb && window.isSupabaseConfigured) {
    let q = sb
      .from('student_batches')
      .select(`
        id,
        enrolled_date,
        status,
        batches (id, batch_name, grade, class_timing),
        students (student_id, full_name, phone, parent_name, parent_phone)
      `);
    if (batchId) q = q.eq('batch_id', batchId);
    const { data: list } = await q;
    data = list || [];
  } else {
    data = [
      { enrolled_date: '2026-01-10', status: 'active', batches: { batch_name: 'Grade 10 - Advanced Physics' }, students: { student_id: 'STU-2026-0001', full_name: 'Aarav Patel', phone: '+91 91234 56789' } },
      { enrolled_date: '2026-01-15', status: 'active', batches: { batch_name: 'Grade 10 - Advanced Physics' }, students: { student_id: 'STU-2026-0003', full_name: 'Rohan Gupta', phone: '+91 91234 56791' } }
    ];
  }

  currentReportData = data;
  document.getElementById('report-title-heading').textContent = 'Batch-wise Student Enrolments';
  document.getElementById('report-meta-subtitle').textContent = `Total enrolled records: ${data.length}`;

  const html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Batch</th>
          <th>Student ID</th>
          <th>Student Name</th>
          <th>Contact</th>
          <th>Enrolled Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(item => `
          <tr>
            <td><strong>${escapeHTML(item.batches ? item.batches.batch_name : '-')}</strong></td>
            <td><code>${escapeHTML(item.students ? item.students.student_id : '-')}</code></td>
            <td>${escapeHTML(item.students ? item.students.full_name : '-')}</td>
            <td>${escapeHTML(item.students ? item.students.phone : '-')}</td>
            <td>${formatDate(item.enrolled_date)}</td>
            <td>${renderBadge(item.status)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  document.getElementById('report-content-area').innerHTML = html;
}

/**
 * 3. Daily Attendance Report
 */
async function generateDailyAttendanceReport(sb, isDemo, batchId, date) {
  let data = [];
  if (sb && window.isSupabaseConfigured) {
    let q = sb
      .from('attendance')
      .select(`id, date, status, remarks, batches(batch_name), students(student_id, full_name)`)
      .eq('date', date || new Date().toISOString().slice(0, 10));
    if (batchId) q = q.eq('batch_id', batchId);
    const { data: list } = await q;
    data = list || [];
  } else {
    data = [
      { date: date, status: 'present', remarks: 'On time', batches: { batch_name: 'Grade 10 - Advanced Physics' }, students: { student_id: 'STU-2026-0001', full_name: 'Aarav Patel' } },
      { date: date, status: 'late', remarks: '10m late', batches: { batch_name: 'Grade 10 - Advanced Physics' }, students: { student_id: 'STU-2026-0003', full_name: 'Rohan Gupta' } }
    ];
  }

  currentReportData = data;
  document.getElementById('report-title-heading').textContent = `Daily Attendance Summary: ${formatDate(date)}`;
  document.getElementById('report-meta-subtitle').textContent = `Total records logged: ${data.length}`;

  const html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Batch</th>
          <th>Student</th>
          <th>Attendance Status</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(a => `
          <tr>
            <td>${formatDate(a.date)}</td>
            <td>${escapeHTML(a.batches ? a.batches.batch_name : '-')}</td>
            <td><strong>${escapeHTML(a.students ? a.students.full_name : '-')}</strong></td>
            <td>${renderBadge(a.status)}</td>
            <td>${escapeHTML(a.remarks || '-')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  document.getElementById('report-content-area').innerHTML = html;
}

/**
 * 4. Monthly Attendance Report
 */
async function generateMonthlyAttendanceReport(sb, isDemo, batchId, startDate, endDate) {
  let data = [];
  if (sb && window.isSupabaseConfigured) {
    let q = sb
      .from('attendance')
      .select(`id, date, status, students(id, student_id, full_name)`)
      .gte('date', startDate)
      .lte('date', endDate);
    if (batchId) q = q.eq('batch_id', batchId);
    const { data: list } = await q;
    data = list || [];
  } else {
    data = [
      { status: 'present', students: { student_id: 'STU-2026-0001', full_name: 'Aarav Patel' } },
      { status: 'present', students: { student_id: 'STU-2026-0001', full_name: 'Aarav Patel' } },
      { status: 'late', students: { student_id: 'STU-2026-0003', full_name: 'Rohan Gupta' } },
      { status: 'absent', students: { student_id: 'STU-2026-0003', full_name: 'Rohan Gupta' } }
    ];
  }

  // Aggregate by student
  const map = {};
  data.forEach(item => {
    const sId = item.students ? item.students.student_id : 'Unknown';
    const sName = item.students ? item.students.full_name : 'Student';
    if (!map[sId]) {
      map[sId] = { student_id: sId, full_name: sName, present: 0, absent: 0, late: 0, total: 0 };
    }
    map[sId].total++;
    if (item.status === 'present') map[sId].present++;
    else if (item.status === 'absent') map[sId].absent++;
    else if (item.status === 'late') map[sId].late++;
  });

  const summary = Object.values(map);
  currentReportData = summary;

  document.getElementById('report-title-heading').textContent = `Attendance Aggregate (${formatDate(startDate)} to ${formatDate(endDate)})`;
  document.getElementById('report-meta-subtitle').textContent = `Students summarized: ${summary.length}`;

  const html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Student ID</th>
          <th>Student Name</th>
          <th>Present Sessions</th>
          <th>Late Sessions</th>
          <th>Absent Sessions</th>
          <th>Total Held</th>
          <th>Attendance %</th>
        </tr>
      </thead>
      <tbody>
        ${summary.map(item => {
          const pct = item.total > 0 ? Math.round(((item.present + item.late) / item.total) * 100) : 0;
          return `
            <tr>
              <td><code>${escapeHTML(item.student_id)}</code></td>
              <td><strong>${escapeHTML(item.full_name)}</strong></td>
              <td><span style="color: var(--success); font-weight: 700;">${item.present}</span></td>
              <td><span style="color: var(--warning); font-weight: 700;">${item.late}</span></td>
              <td><span style="color: var(--danger); font-weight: 700;">${item.absent}</span></td>
              <td>${item.total}</td>
              <td><strong>${pct}%</strong></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  document.getElementById('report-content-area').innerHTML = html;
}

/**
 * 5. Fee Collection Report
 */
async function generateFeeCollectionReport(sb, isDemo, startDate, endDate) {
  let data = [];
  if (sb && window.isSupabaseConfigured) {
    const { data: list } = await sb
      .from('fee_payments')
      .select(`
        id,
        receipt_number,
        amount_paid,
        payment_date,
        payment_method,
        status,
        students (student_id, full_name),
        fee_obligations (title)
      `)
      .gte('payment_date', startDate)
      .lte('payment_date', endDate + 'T23:59:59Z')
      .eq('status', 'valid')
      .order('payment_date', { ascending: false });
    data = list || [];
  } else {
    data = [
      { receipt_number: 'REC-202610-0001', amount_paid: 2500, payment_date: '2026-10-05T10:30:00Z', payment_method: 'upi', status: 'valid', students: { student_id: 'STU-2026-0001', full_name: 'Aarav Patel' }, fee_obligations: { title: 'Tuition Fee - October 2026' } },
      { receipt_number: 'REC-202610-0002', amount_paid: 1500, payment_date: '2026-10-07T14:15:00Z', payment_method: 'cash', status: 'valid', students: { student_id: 'STU-2026-0002', full_name: 'Diya Kulkarni' }, fee_obligations: { title: 'Tuition Fee - October 2026' } }
    ];
  }

  currentReportData = data;
  const total = data.reduce((acc, p) => acc + parseFloat(p.amount_paid || 0), 0);

  document.getElementById('report-title-heading').textContent = `Fee Collection Ledger (${formatDate(startDate)} to ${formatDate(endDate)})`;
  document.getElementById('report-meta-subtitle').textContent = `Total Revenue Collected: ${formatCurrency(total)}`;

  const html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Receipt No</th>
          <th>Student</th>
          <th>Fee Title</th>
          <th>Payment Date</th>
          <th>Method</th>
          <th>Amount Paid</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(p => `
          <tr>
            <td><code>${escapeHTML(p.receipt_number)}</code></td>
            <td><strong>${escapeHTML(p.students ? p.students.full_name : '-')}</strong></td>
            <td>${escapeHTML(p.fee_obligations ? p.fee_obligations.title : '-')}</td>
            <td>${formatDate(p.payment_date)}</td>
            <td><span class="badge badge-neutral">${escapeHTML(p.payment_method)}</span></td>
            <td><strong>${formatCurrency(p.amount_paid)}</strong></td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr style="background: var(--surface-subtle); font-weight: 700;">
          <td colspan="5" style="text-align: right;">Total Collected:</td>
          <td>${formatCurrency(total)}</td>
        </tr>
      </tfoot>
    </table>
  `;

  document.getElementById('report-content-area').innerHTML = html;
}

/**
 * 6. Outstanding Fee Report
 */
async function generateOutstandingFeesReport(sb, isDemo) {
  let obligations = [];
  let payments = [];

  if (sb && window.isSupabaseConfigured) {
    const [{ data: oData }, { data: pData }] = await Promise.all([
      sb.from('fee_obligations').select(`*, students (id, student_id, full_name, phone, parent_phone)`).neq('status', 'paid').neq('status', 'waived'),
      sb.from('fee_payments').select('obligation_id, amount_paid').eq('status', 'valid')
    ]);
    obligations = oData || [];
    payments = pData || [];
  } else {
    obligations = [
      { id: 'ob-2', title: 'Tuition Fee - October 2026', amount_due: 3000, due_date: '2026-10-10', status: 'partially_paid', students: { student_id: 'STU-2026-0002', full_name: 'Diya Kulkarni', parent_phone: '+91 98220 12346' } },
      { id: 'ob-3', title: 'Tuition Fee - October 2026', amount_due: 2500, due_date: '2026-10-10', status: 'unpaid', students: { student_id: 'STU-2026-0003', full_name: 'Rohan Gupta', parent_phone: '+91 98220 12347' } }
    ];
    payments = [{ obligation_id: 'ob-2', amount_paid: 1500 }];
  }

  // Calculate balances per obligation
  const paidMap = {};
  payments.forEach(p => {
    if (p.obligation_id) {
      paidMap[p.obligation_id] = (paidMap[p.obligation_id] || 0) + parseFloat(p.amount_paid || 0);
    }
  });

  const outstandingList = obligations.map(o => {
    const paid = paidMap[o.id] || 0;
    const balance = Math.max(0, parseFloat(o.amount_due) - paid);
    return { ...o, amount_paid: paid, balance: balance };
  }).filter(item => item.balance > 0);

  currentReportData = outstandingList;
  const totalOutstanding = outstandingList.reduce((acc, i) => acc + i.balance, 0);

  document.getElementById('report-title-heading').textContent = 'Outstanding Fee Dues Report';
  document.getElementById('report-meta-subtitle').textContent = `Total Outstanding Receivables: ${formatCurrency(totalOutstanding)}`;

  const html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Student ID</th>
          <th>Student Name</th>
          <th>Parent Phone</th>
          <th>Billing Title</th>
          <th>Amount Due</th>
          <th>Paid So Far</th>
          <th>Outstanding Balance</th>
          <th>Due Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${outstandingList.map(item => `
          <tr>
            <td><code>${escapeHTML(item.students ? item.students.student_id : '-')}</code></td>
            <td><strong>${escapeHTML(item.students ? item.students.full_name : '-')}</strong></td>
            <td>📞 ${escapeHTML(item.students ? item.students.parent_phone : '-')}</td>
            <td>${escapeHTML(item.title)}</td>
            <td>${formatCurrency(item.amount_due)}</td>
            <td>${formatCurrency(item.amount_paid)}</td>
            <td><strong style="color: var(--danger);">${formatCurrency(item.balance)}</strong></td>
            <td>${formatDate(item.due_date)}</td>
            <td>${renderBadge(item.status)}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr style="background: var(--surface-subtle); font-weight: 700;">
          <td colspan="6" style="text-align: right;">Total Outstanding:</td>
          <td colspan="3" style="color: var(--danger);">${formatCurrency(totalOutstanding)}</td>
        </tr>
      </tfoot>
    </table>
  `;

  document.getElementById('report-content-area').innerHTML = html;
}

/**
 * 7. Student Payment History
 */
async function generateStudentPaymentHistoryReport(sb, isDemo, studentId) {
  let data = [];
  if (sb && window.isSupabaseConfigured) {
    let q = sb
      .from('fee_payments')
      .select(`
        id,
        receipt_number,
        amount_paid,
        payment_date,
        payment_method,
        status,
        students (student_id, full_name),
        fee_obligations (title)
      `)
      .order('payment_date', { ascending: false });
    if (studentId) q = q.eq('student_id', studentId);
    const { data: list } = await q;
    data = list || [];
  } else {
    data = [
      { receipt_number: 'REC-202610-0001', amount_paid: 2500, payment_date: '2026-10-05T10:30:00Z', payment_method: 'upi', status: 'valid', students: { student_id: 'STU-2026-0001', full_name: 'Aarav Patel' }, fee_obligations: { title: 'Tuition Fee - October 2026' } },
      { receipt_number: 'REC-202609-0012', amount_paid: 2500, payment_date: '2026-09-08T11:15:00Z', payment_method: 'cash', status: 'valid', students: { student_id: 'STU-2026-0001', full_name: 'Aarav Patel' }, fee_obligations: { title: 'Tuition Fee - September 2026' } }
    ];
  }

  currentReportData = data;
  document.getElementById('report-title-heading').textContent = 'Student Payment Transaction History';
  document.getElementById('report-meta-subtitle').textContent = `Total transactions found: ${data.length}`;

  const html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Receipt No</th>
          <th>Student Name</th>
          <th>Fee Obligation</th>
          <th>Amount Paid</th>
          <th>Payment Date</th>
          <th>Payment Method</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(p => `
          <tr>
            <td><code>${escapeHTML(p.receipt_number)}</code></td>
            <td><strong>${escapeHTML(p.students ? p.students.full_name : '-')}</strong></td>
            <td>${escapeHTML(p.fee_obligations ? p.fee_obligations.title : '-')}</td>
            <td><strong>${formatCurrency(p.amount_paid)}</strong></td>
            <td>${formatDateTime(p.payment_date)}</td>
            <td><span class="badge badge-neutral">${escapeHTML(p.payment_method)}</span></td>
            <td>${renderBadge(p.status)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  document.getElementById('report-content-area').innerHTML = html;
}

/**
 * 8. Examination Results Report
 */
async function generateExamResultsReport(sb, isDemo, batchId) {
  let data = [];
  if (sb && window.isSupabaseConfigured) {
    let q = sb
      .from('exam_results')
      .select(`
        id,
        marks_obtained,
        grade,
        status,
        remarks,
        students (student_id, full_name),
        examinations (exam_name, exam_date, max_marks, pass_marks, batches(batch_name))
      `);
    const { data: list } = await q;
    data = list || [];
  } else {
    data = [
      { marks_obtained: 92.5, grade: 'A+', status: 'passed', remarks: 'Superb', students: { student_id: 'STU-2026-0001', full_name: 'Aarav Patel' }, examinations: { exam_name: 'Mechanics Mid-Term', exam_date: '2026-09-25', max_marks: 100, batches: { batch_name: 'Grade 10 - Physics' } } },
      { marks_obtained: 74.0, grade: 'B', status: 'passed', remarks: 'Good', students: { student_id: 'STU-2026-0003', full_name: 'Rohan Gupta' }, examinations: { exam_name: 'Mechanics Mid-Term', exam_date: '2026-09-25', max_marks: 100, batches: { batch_name: 'Grade 10 - Physics' } } }
    ];
  }

  currentReportData = data;
  document.getElementById('report-title-heading').textContent = 'Master Examination Results Report';
  document.getElementById('report-meta-subtitle').textContent = `Total evaluated records: ${data.length}`;

  const html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Exam</th>
          <th>Batch</th>
          <th>Student ID</th>
          <th>Student Name</th>
          <th>Marks Obtained</th>
          <th>Percentage</th>
          <th>Grade</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(r => {
          const ex = r.examinations || {};
          const max = ex.max_marks || 100;
          const pct = Math.round((r.marks_obtained / max) * 100);
          return `
            <tr>
              <td><strong>${escapeHTML(ex.exam_name || '-')}</strong></td>
              <td>${escapeHTML(ex.batches ? ex.batches.batch_name : '-')}</td>
              <td><code>${escapeHTML(r.students ? r.students.student_id : '-')}</code></td>
              <td>${escapeHTML(r.students ? r.students.full_name : '-')}</td>
              <td><strong>${r.marks_obtained}</strong> / ${max}</td>
              <td>${pct}%</td>
              <td><span class="badge badge-info">${escapeHTML(r.grade || '-')}</span></td>
              <td>${renderBadge(r.status)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  document.getElementById('report-content-area').innerHTML = html;
}

/**
 * Export Current Active Report to CSV
 */
function exportCurrentReportToCSV() {
  if (!currentReportData || currentReportData.length === 0) {
    showToast('No records available to export', 'warning');
    return;
  }

  let headers = [];
  let rows = [];

  switch (activeReportType) {
    case 'student-list':
      headers = ['Student ID', 'Full Name', 'Phone', 'Parent Name', 'Admission Date', 'Monthly Fee', 'Status'];
      rows = currentReportData.map(s => [s.student_id, s.full_name, s.phone, s.parent_name, s.admission_date, s.monthly_fee, s.status]);
      break;
    case 'fee-collection':
      headers = ['Receipt No', 'Student Name', 'Obligation', 'Payment Date', 'Method', 'Amount'];
      rows = currentReportData.map(p => [p.receipt_number, p.students?.full_name || '', p.fee_obligations?.title || '', p.payment_date, p.payment_method, p.amount_paid]);
      break;
    case 'outstanding-fees':
      headers = ['Student ID', 'Student Name', 'Parent Phone', 'Fee Title', 'Amount Due', 'Paid So Far', 'Balance', 'Due Date'];
      rows = currentReportData.map(o => [o.students?.student_id || '', o.students?.full_name || '', o.students?.parent_phone || '', o.title, o.amount_due, o.amount_paid, o.balance, o.due_date]);
      break;
    default:
      headers = Object.keys(currentReportData[0] || {}).filter(k => typeof currentReportData[0][k] !== 'object');
      rows = currentReportData.map(item => headers.map(h => item[h]));
  }

  exportToCSV(`Tuition_${activeReportType}`, headers, rows);
}
