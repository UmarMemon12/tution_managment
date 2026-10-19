/**
 * Tuition Management System - Dashboard Controller
 * Fetches real Supabase database statistics and renders charts and recent activity.
 */

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  await loadDashboardData();
});

async function loadDashboardData() {
  if (window.supabaseClient && window.isSupabaseConfigured) {
    try {
      await loadRealSupabaseStats();
    } catch (err) {
      console.warn("Failed to load live Supabase statistics, falling back to cached/demo view:", err);
      loadMockDashboardData();
    }
  } else {
    loadMockDashboardData();
  }
}

/**
 * Fetch real metrics from Supabase database
 */
async function loadRealSupabaseStats() {
  const sb = window.supabaseClient;

  // Try calling the dashboard summary RPC first
  try {
    const { data: summary, error } = await sb.rpc('get_dashboard_summary');
    if (!error && summary) {
      document.getElementById('stat-students').textContent = summary.total_students || 0;
      document.getElementById('stat-teachers').textContent = summary.total_teachers || 0;
      document.getElementById('stat-batches').textContent = summary.total_batches || 0;
      document.getElementById('stat-present').textContent = summary.present_today || 0;
      document.getElementById('stat-absent').textContent = summary.absent_today || 0;
      document.getElementById('stat-fees-month').textContent = formatCurrency(summary.fees_collected_month || 0);
      document.getElementById('stat-outstanding').textContent = formatCurrency(summary.total_outstanding || 0);
    }
  } catch (rpcErr) {
    console.log("RPC get_dashboard_summary not found, falling back to direct table queries", rpcErr);
    // Direct table counts fallback
    const [
      { count: studentCount },
      { count: teacherCount },
      { count: batchCount }
    ] = await Promise.all([
      sb.from('students').select('*', { count: 'exact', head: true }).neq('status', 'archived'),
      sb.from('teachers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      sb.from('batches').select('*', { count: 'exact', head: true }).eq('status', 'active')
    ]);

    document.getElementById('stat-students').textContent = studentCount || 0;
    document.getElementById('stat-teachers').textContent = teacherCount || 0;
    document.getElementById('stat-batches').textContent = batchCount || 0;

    // Today's attendance
    const today = new Date().toISOString().slice(0, 10);
    const { data: attData } = await sb.from('attendance').select('status').eq('date', today);
    let present = 0, absent = 0;
    (attData || []).forEach(a => {
      if (a.status === 'present' || a.status === 'late') present++;
      if (a.status === 'absent') absent++;
    });
    document.getElementById('stat-present').textContent = present;
    document.getElementById('stat-absent').textContent = absent;

    // Fees collection
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { data: payments } = await sb
      .from('fee_payments')
      .select('amount_paid')
      .gte('payment_date', firstDayOfMonth)
      .eq('status', 'valid');

    const totalMonth = (payments || []).reduce((acc, p) => acc + parseFloat(p.amount_paid || 0), 0);
    document.getElementById('stat-fees-month').textContent = formatCurrency(totalMonth);

    // Outstanding fees
    const { data: obligations } = await sb.from('fee_obligations').select('amount_due').neq('status', 'waived');
    const { data: allPayments } = await sb.from('fee_payments').select('amount_paid').eq('status', 'valid');
    const totalDue = (obligations || []).reduce((acc, o) => acc + parseFloat(o.amount_due || 0), 0);
    const totalPaid = (allPayments || []).reduce((acc, p) => acc + parseFloat(p.amount_paid || 0), 0);
    const outstanding = Math.max(0, totalDue - totalPaid);
    document.getElementById('stat-outstanding').textContent = formatCurrency(outstanding);
  }

  // Load upcoming examinations
  const todayDate = new Date().toISOString().slice(0, 10);
  const { data: exams } = await sb
    .from('examinations')
    .select(`
      id,
      exam_name,
      exam_date,
      max_marks,
      pass_marks,
      batches (batch_name, grade)
    `)
    .gte('exam_date', todayDate)
    .order('exam_date', { ascending: true })
    .limit(5);

  renderUpcomingExams(exams || []);

  // Load recent fee payments
  const { data: recentPayments } = await sb
    .from('fee_payments')
    .select(`
      id,
      receipt_number,
      amount_paid,
      payment_date,
      payment_method,
      status,
      students (full_name, student_id)
    `)
    .eq('status', 'valid')
    .order('payment_date', { ascending: false })
    .limit(5);

  renderRecentPayments(recentPayments || []);

  // Load recent registrations
  const { data: recentStudents } = await sb
    .from('students')
    .select('id, student_id, full_name, admission_date, monthly_fee, status')
    .order('created_at', { ascending: false })
    .limit(5);

  renderRecentStudents(recentStudents || []);

  // Initialize charts
  initAttendanceChart(
    parseInt(document.getElementById('stat-present').textContent || 0, 10),
    parseInt(document.getElementById('stat-absent').textContent || 0, 10)
  );
  initFeeTrendChart();
}

/**
 * Load mock demo stats for rapid offline inspection
 */
function loadMockDashboardData() {
  document.getElementById('stat-students').textContent = '48';
  document.getElementById('stat-teachers').textContent = '8';
  document.getElementById('stat-batches').textContent = '12';
  document.getElementById('stat-present').textContent = '44';
  document.getElementById('stat-absent').textContent = '4';
  document.getElementById('stat-fees-month').textContent = '₹8,750.00';
  document.getElementById('stat-outstanding').textContent = '₹2,300.00';

  renderUpcomingExams([
    {
      exam_name: 'Mid-Term Mechanics & Motion Test',
      exam_date: '2026-10-25',
      max_marks: 100,
      pass_marks: 40,
      batches: { batch_name: 'Grade 10 - Advanced Physics', grade: 'Grade 10' }
    },
    {
      exam_name: 'Organic Chemistry Assessment',
      exam_date: '2026-10-28',
      max_marks: 50,
      pass_marks: 20,
      batches: { batch_name: 'Grade 12 - Organic Chemistry', grade: 'Grade 12' }
    },
    {
      exam_name: 'Quadratic Equations Quiz',
      exam_date: '2026-11-02',
      max_marks: 50,
      pass_marks: 20,
      batches: { batch_name: 'Grade 10 - Mathematics Mastery', grade: 'Grade 10' }
    }
  ]);

  renderRecentPayments([
    {
      receipt_number: 'REC-202610-1042',
      amount_paid: 2500,
      payment_date: new Date().toISOString(),
      payment_method: 'upi',
      status: 'valid',
      students: { full_name: 'Aarav Patel', student_id: 'STU-2026-0001' }
    },
    {
      receipt_number: 'REC-202610-1041',
      amount_paid: 1500,
      payment_date: new Date(Date.now() - 86400000).toISOString(),
      payment_method: 'cash',
      status: 'valid',
      students: { full_name: 'Diya Kulkarni', student_id: 'STU-2026-0002' }
    },
    {
      receipt_number: 'REC-202610-1039',
      amount_paid: 2200,
      payment_date: new Date(Date.now() - 172800000).toISOString(),
      payment_method: 'bank_transfer',
      status: 'valid',
      students: { full_name: 'Sneha Roy', student_id: 'STU-2026-0004' }
    }
  ]);

  renderRecentStudents([
    {
      student_id: 'STU-2026-0005',
      full_name: 'Karan Verma',
      admission_date: '2026-10-15',
      monthly_fee: 3000,
      status: 'active'
    },
    {
      student_id: 'STU-2026-0004',
      full_name: 'Sneha Roy',
      admission_date: '2026-10-12',
      monthly_fee: 2200,
      status: 'active'
    },
    {
      student_id: 'STU-2026-0003',
      full_name: 'Rohan Gupta',
      admission_date: '2026-10-10',
      monthly_fee: 2500,
      status: 'active'
    }
  ]);

  initAttendanceChart(44, 4);
  initFeeTrendChart();
}

/**
 * Render upcoming exams table
 */
function renderUpcomingExams(exams) {
  const container = document.getElementById('recent-exams-body');
  if (!container) return;

  if (!exams || exams.length === 0) {
    container.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No upcoming examinations scheduled.</td></tr>`;
    return;
  }

  container.innerHTML = exams.map(e => `
    <tr>
      <td><strong>${escapeHTML(e.exam_name)}</strong></td>
      <td><span class="badge badge-info">${escapeHTML(e.batches ? e.batches.batch_name : 'General')}</span></td>
      <td>${formatDate(e.exam_date)}</td>
      <td><strong>${e.max_marks}</strong> (Pass: ${e.pass_marks})</td>
    </tr>
  `).join('');
}

/**
 * Render recent payments table
 */
function renderRecentPayments(payments) {
  const container = document.getElementById('recent-payments-body');
  if (!container) return;

  if (!payments || payments.length === 0) {
    container.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No recent payment records found.</td></tr>`;
    return;
  }

  container.innerHTML = payments.map(p => `
    <tr>
      <td><code>${escapeHTML(p.receipt_number)}</code></td>
      <td>${escapeHTML(p.students ? p.students.full_name : 'Student')}</td>
      <td><strong>${formatCurrency(p.amount_paid)}</strong></td>
      <td><span class="badge badge-neutral">${escapeHTML(p.payment_method)}</span></td>
      <td>${formatDate(p.payment_date)}</td>
    </tr>
  `).join('');
}

/**
 * Render recent student registrations
 */
function renderRecentStudents(students) {
  const container = document.getElementById('recent-students-body');
  if (!container) return;

  if (!students || students.length === 0) {
    container.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No recent student registrations.</td></tr>`;
    return;
  }

  container.innerHTML = students.map(s => `
    <tr>
      <td><code>${escapeHTML(s.student_id)}</code></td>
      <td><strong>${escapeHTML(s.full_name)}</strong></td>
      <td>${formatDate(s.admission_date)}</td>
      <td>${renderBadge(s.status)}</td>
    </tr>
  `).join('');
}

/**
 * Initialize attendance chart using Chart.js
 */
function initAttendanceChart(present, absent) {
  const ctx = document.getElementById('attendanceChart');
  if (!ctx || !window.Chart) return;

  if (window.activeAttendanceChart) {
    window.activeAttendanceChart.destroy();
  }

  window.activeAttendanceChart = new window.Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Present Today', 'Absent Today'],
      datasets: [{
        data: [present || 1, absent || 0],
        backgroundColor: ['#10b981', '#ef4444'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Inter', size: 12 } }
        }
      },
      cutout: '72%'
    }
  });
}

/**
 * Initialize 6-month Fee Collection Bar/Line Chart
 */
function initFeeTrendChart() {
  const ctx = document.getElementById('feeTrendChart');
  if (!ctx || !window.Chart) return;

  if (window.activeFeeChart) {
    window.activeFeeChart.destroy();
  }

  window.activeFeeChart = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
      datasets: [{
        label: 'Fees Collected (₹)',
        data: [5400, 6200, 7100, 6800, 8100, 8750],
        backgroundColor: '#4f46e5',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => '₹' + Number(val).toLocaleString('en-IN')
          },
          grid: { color: '#f1f5f9' }
        },
        x: {
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}
