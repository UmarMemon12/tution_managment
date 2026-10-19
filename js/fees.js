/**
 * Tuition Management System - Fee Management Controller
 */

let allPayments = [];
let allObligations = [];
let allStudents = [];
let activeReceiptData = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth(['admin', 'receptionist']);
  await loadFeeStudentsDropdown();
  await loadFeeObligations();
  await loadFeePayments();
  initFeeEventListeners();
});

/**
 * Load Students for payment modal & filter
 */
async function loadFeeStudentsDropdown() {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  if (sb && window.isSupabaseConfigured) {
    try {
      const { data } = await sb.from('students').select('id, student_id, full_name, monthly_fee').neq('status', 'archived');
      allStudents = data || [];
    } catch (e) {
      console.warn("Could not load fee students:", e);
    }
  } else {
    allStudents = [
      { id: '33333333-3333-3333-3333-333333333301', student_id: 'STU-2026-0001', full_name: 'Aarav Patel', monthly_fee: 2500 },
      { id: '33333333-3333-3333-3333-333333333302', student_id: 'STU-2026-0002', full_name: 'Diya Kulkarni', monthly_fee: 3000 },
      { id: '33333333-3333-3333-3333-333333333303', student_id: 'STU-2026-0003', full_name: 'Rohan Gupta', monthly_fee: 2500 },
      { id: '33333333-3333-3333-3333-333333333304', student_id: 'STU-2026-0004', full_name: 'Sneha Roy', monthly_fee: 2200 },
      { id: '33333333-3333-3333-3333-333333333305', student_id: 'STU-2026-0005', full_name: 'Karan Verma', monthly_fee: 3000 }
    ];
  }

  const payStudentSelect = document.getElementById('payment-student-select');
  const oblStudentSelect = document.getElementById('obligation-student-select');

  const options = allStudents.map(s => `<option value="${s.id}">${escapeHTML(s.student_id)} - ${escapeHTML(s.full_name)}</option>`).join('');

  if (payStudentSelect) {
    payStudentSelect.innerHTML = `<option value="">-- Choose Student --</option>` + options;
  }
  if (oblStudentSelect) {
    oblStudentSelect.innerHTML = `<option value="">-- Choose Student --</option>` + options;
  }
}

/**
 * Load Fee Obligations
 */
async function loadFeeObligations() {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  if (sb && window.isSupabaseConfigured) {
    try {
      const { data, error } = await sb
        .from('fee_obligations')
        .select(`*, students (id, student_id, full_name)`)
        .order('due_date', { ascending: false });

      if (error) throw error;
      allObligations = data || [];
    } catch (e) {
      console.warn("Could not load obligations from Supabase:", e);
    }
  } else {
    allObligations = [
      { id: 'ob-1', student_id: '33333333-3333-3333-3333-333333333301', title: 'Tuition Fee - October 2026', billing_month: '2026-10', amount_due: 2500, due_date: '2026-10-10', status: 'paid', students: { student_id: 'STU-2026-0001', full_name: 'Aarav Patel' } },
      { id: 'ob-2', student_id: '33333333-3333-3333-3333-333333333302', title: 'Tuition Fee - October 2026', billing_month: '2026-10', amount_due: 3000, due_date: '2026-10-10', status: 'partially_paid', students: { student_id: 'STU-2026-0002', full_name: 'Diya Kulkarni' } },
      { id: 'ob-3', student_id: '33333333-3333-3333-3333-333333333303', title: 'Tuition Fee - October 2026', billing_month: '2026-10', amount_due: 2500, due_date: '2026-10-10', status: 'unpaid', students: { student_id: 'STU-2026-0003', full_name: 'Rohan Gupta' } }
    ];
  }

  renderObligationsTable(allObligations);
}

/**
 * Load Fee Payments
 */
async function loadFeePayments() {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));
  const tableBody = document.getElementById('payments-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem;"><span class="spinner"></span> Loading payment logs...</td></tr>`;

  if (sb && window.isSupabaseConfigured) {
    try {
      const { data, error } = await sb
        .from('fee_payments')
        .select(`
          *,
          students (id, student_id, full_name, phone),
          fee_obligations (id, title, billing_month, amount_due)
        `)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      allPayments = data || [];
      renderPaymentsTable(allPayments);
      updateFeeFinancialStats();
      return;
    } catch (err) {
      console.warn("Could not load fee payments:", err);
      showToast("Loading offline demo fee payments", "info");
    }
  }

  // Demo fallback
  allPayments = [
    {
      id: 'pay-1',
      receipt_number: 'REC-202610-0001',
      obligation_id: 'ob-1',
      student_id: '33333333-3333-3333-3333-333333333301',
      amount_paid: 2500,
      payment_date: '2026-10-05T10:30:00Z',
      payment_method: 'upi',
      status: 'valid',
      notes: 'GPay Ref: 98127391823',
      students: { id: '33333333-3333-3333-3333-333333333301', student_id: 'STU-2026-0001', full_name: 'Aarav Patel', phone: '+91 91234 56789' },
      fee_obligations: { title: 'Tuition Fee - October 2026', billing_month: '2026-10', amount_due: 2500 }
    },
    {
      id: 'pay-2',
      receipt_number: 'REC-202610-0002',
      obligation_id: 'ob-2',
      student_id: '33333333-3333-3333-3333-333333333302',
      amount_paid: 1500,
      payment_date: '2026-10-07T14:15:00Z',
      payment_method: 'cash',
      status: 'valid',
      notes: 'Part payment at desk',
      students: { id: '33333333-3333-3333-3333-333333333302', student_id: 'STU-2026-0002', full_name: 'Diya Kulkarni', phone: '+91 91234 56790' },
      fee_obligations: { title: 'Tuition Fee - October 2026', billing_month: '2026-10', amount_due: 3000 }
    }
  ];

  renderPaymentsTable(allPayments);
  updateFeeFinancialStats();
}

/**
 * Render Payments Table
 */
function renderPaymentsTable(payments) {
  const tableBody = document.getElementById('payments-table-body');
  if (!tableBody) return;

  if (!payments || payments.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <h4 class="empty-state-title">No fee payments recorded</h4>
            <p class="empty-state-text">Use the "Record Payment" button to log student fee receipts.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = payments.map(p => {
    const student = p.students || { full_name: 'Unknown', student_id: '-' };
    const obligation = p.fee_obligations || { title: 'Tuition Fee' };
    const isReversed = p.status === 'reversed';

    return `
      <tr>
        <td><code>${escapeHTML(p.receipt_number)}</code></td>
        <td>
          <strong>${escapeHTML(student.full_name)}</strong>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHTML(student.student_id)}</div>
        </td>
        <td>${escapeHTML(obligation.title)}</td>
        <td><strong style="color: ${isReversed ? 'var(--danger)' : 'var(--text-primary)'};">${formatCurrency(p.amount_paid)}</strong></td>
        <td><span class="badge badge-neutral">${escapeHTML(p.payment_method)}</span></td>
        <td>${formatDate(p.payment_date)}</td>
        <td>${renderBadge(p.status)}</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-secondary btn-sm" onclick="openPrintReceiptModal('${p.id}')">Receipt</button>
            ${!isReversed ? `
              <button class="btn btn-secondary btn-sm" onclick="openReversePaymentModal('${p.id}')" style="color: var(--danger);">Reverse</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Render Obligations Table
 */
function renderObligationsTable(obligations) {
  const tableBody = document.getElementById('obligations-table-body');
  if (!tableBody) return;

  if (!obligations || obligations.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No fee obligations found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = obligations.map(o => `
    <tr>
      <td><strong>${escapeHTML(o.students ? o.students.full_name : 'Student')}</strong></td>
      <td>${escapeHTML(o.title)}</td>
      <td>${escapeHTML(o.billing_month)}</td>
      <td><strong>${formatCurrency(o.amount_due)}</strong></td>
      <td>${formatDate(o.due_date)}</td>
      <td>${renderBadge(o.status)}</td>
    </tr>
  `).join('');
}

/**
 * Update Total Due, Collected, and Outstanding balances
 */
function updateFeeFinancialStats() {
  const totalDue = allObligations
    .filter(o => o.status !== 'waived')
    .reduce((sum, o) => sum + parseFloat(o.amount_due || 0), 0);

  const totalCollected = allPayments
    .filter(p => p.status === 'valid')
    .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);

  const outstanding = Math.max(0, totalDue - totalCollected);

  document.getElementById('fees-stat-total-due').textContent = formatCurrency(totalDue);
  document.getElementById('fees-stat-collected').textContent = formatCurrency(totalCollected);
  document.getElementById('fees-stat-outstanding').textContent = formatCurrency(outstanding);
}

/**
 * Event Listeners
 */
function initFeeEventListeners() {
  document.getElementById('record-payment-btn')?.addEventListener('click', openRecordPaymentModal);
  document.getElementById('add-obligation-btn')?.addEventListener('click', openAddObligationModal);
  document.getElementById('payment-form')?.addEventListener('submit', handlePaymentSubmit);
  document.getElementById('obligation-form')?.addEventListener('submit', handleObligationSubmit);
  document.getElementById('search-payment')?.addEventListener('input', filterPayments);
  document.getElementById('filter-payment-method')?.addEventListener('change', filterPayments);
  document.getElementById('payment-student-select')?.addEventListener('change', onPaymentStudentChanged);

  // Print receipt trigger
  document.getElementById('print-receipt-btn')?.addEventListener('click', () => {
    window.print();
  });
}

/**
 * Populate obligations when student is selected in Payment Modal
 */
function onPaymentStudentChanged(e) {
  const studentId = e.target.value;
  const select = document.getElementById('payment-obligation-select');
  const amountField = document.getElementById('payment-amount-field');

  if (!studentId) {
    select.innerHTML = `<option value="">-- Select Student First --</option>`;
    return;
  }

  const studentObligations = allObligations.filter(o => o.student_id === studentId && o.status !== 'paid');

  if (studentObligations.length === 0) {
    select.innerHTML = `<option value="">No unpaid obligations found (General Fee)</option>`;
    const s = allStudents.find(item => item.id === studentId);
    if (s && s.monthly_fee) amountField.value = s.monthly_fee;
  } else {
    select.innerHTML = `<option value="">-- Choose Obligation --</option>` +
      studentObligations.map(o => `<option value="${o.id}">${escapeHTML(o.title)} (Due: ${formatCurrency(o.amount_due)})</option>`).join('');

    amountField.value = studentObligations[0].amount_due;
  }
}

/**
 * Filter payments
 */
function filterPayments() {
  const term = (document.getElementById('search-payment').value || '').toLowerCase().trim();
  const method = document.getElementById('filter-payment-method').value;

  const filtered = allPayments.filter(p => {
    const student = p.students || {};
    const matchesSearch = 
      p.receipt_number.toLowerCase().includes(term) ||
      (student.full_name && student.full_name.toLowerCase().includes(term)) ||
      (student.student_id && student.student_id.toLowerCase().includes(term));

    const matchesMethod = method ? p.payment_method === method : true;
    return matchesSearch && matchesMethod;
  });

  renderPaymentsTable(filtered);
}

/**
 * Open Record Payment Modal
 */
function openRecordPaymentModal() {
  document.getElementById('payment-form').reset();
  document.getElementById('payment-receipt-field').value = generateReceiptNumber();
  openModal('record-payment-modal');
}

/**
 * Open Add Obligation Modal
 */
function openAddObligationModal() {
  document.getElementById('obligation-form').reset();
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('obligation-month').value = `${yyyy}-${mm}`;
  document.getElementById('obligation-due-date').value = new Date(now.getFullYear(), now.getMonth(), 10).toISOString().slice(0, 10);
  openModal('create-obligation-modal');
}

/**
 * Handle Payment Form Submit
 */
async function handlePaymentSubmit(e) {
  e.preventDefault();

  const studentId = document.getElementById('payment-student-select').value;
  const obligationId = document.getElementById('payment-obligation-select').value || null;
  const receiptNumber = document.getElementById('payment-receipt-field').value.trim();
  const amountPaid = parseFloat(document.getElementById('payment-amount-field').value || 0);
  const method = document.getElementById('payment-method-select').value;
  const notes = document.getElementById('payment-notes').value.trim() || null;

  if (!studentId || !receiptNumber || amountPaid <= 0 || !method) {
    showToast('Please specify student, valid receipt number, and payment amount.', 'error');
    return;
  }

  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  try {
    if (sb && window.isSupabaseConfigured) {
      // Use transactional database function record_fee_payment
      const { data, error } = await sb.rpc('record_fee_payment', {
        p_obligation_id: obligationId,
        p_student_id: studentId,
        p_amount_paid: amountPaid,
        p_payment_method: method,
        p_receipt_number: receiptNumber,
        p_notes: notes
      });

      if (error) {
        // Fallback to direct insert if RPC not executed
        console.warn("RPC failed, falling back to direct table insert:", error);
        const { error: insErr } = await sb.from('fee_payments').insert({
          receipt_number: receiptNumber,
          obligation_id: obligationId,
          student_id: studentId,
          amount_paid: amountPaid,
          payment_method: method,
          status: 'valid',
          notes: notes
        });
        if (insErr) throw insErr;
      }

      showToast(`Payment of ${formatCurrency(amountPaid)} recorded with receipt ${receiptNumber}!`, 'success');
      closeModal('record-payment-modal');
      await loadFeeObligations();
      await loadFeePayments();
      return;
    }

    // Mock
    const newPay = {
      id: 'demo-pay-' + Date.now(),
      receipt_number: receiptNumber,
      amount_paid: amountPaid,
      payment_date: new Date().toISOString(),
      payment_method: method,
      status: 'valid',
      notes: notes,
      students: allStudents.find(s => s.id === studentId),
      fee_obligations: allObligations.find(o => o.id === obligationId) || { title: 'Tuition Fee' }
    };
    allPayments.unshift(newPay);
    showToast(`Payment recorded (Demo Mode)`, 'success');
    closeModal('record-payment-modal');
    renderPaymentsTable(allPayments);
    updateFeeFinancialStats();
  } catch (err) {
    showToast(err.message || 'Payment processing failed', 'error');
  }
}

/**
 * Handle Obligation Form Submit
 */
async function handleObligationSubmit(e) {
  e.preventDefault();

  const studentId = document.getElementById('obligation-student-select').value;
  const title = document.getElementById('obligation-title').value.trim();
  const month = document.getElementById('obligation-month').value.trim();
  const amount = parseFloat(document.getElementById('obligation-amount').value || 0);
  const dueDate = document.getElementById('obligation-due-date').value;

  if (!studentId || !title || !month || amount <= 0 || !dueDate) {
    showToast('Please complete all obligation fields.', 'error');
    return;
  }

  const payload = {
    student_id: studentId,
    title: title,
    billing_month: month,
    amount_due: amount,
    due_date: dueDate,
    status: 'unpaid'
  };

  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  try {
    if (sb && window.isSupabaseConfigured) {
      const { error } = await sb.from('fee_obligations').insert(payload);
      if (error) throw error;
      showToast('Fee obligation generated successfully', 'success');
      closeModal('create-obligation-modal');
      await loadFeeObligations();
      updateFeeFinancialStats();
      return;
    }

    payload.id = 'demo-ob-' + Date.now();
    payload.students = allStudents.find(s => s.id === studentId);
    allObligations.unshift(payload);
    showToast('Obligation created (Demo Mode)', 'success');
    closeModal('create-obligation-modal');
    renderObligationsTable(allObligations);
    updateFeeFinancialStats();
  } catch (err) {
    showToast(err.message || 'Failed to generate obligation', 'error');
  }
}

/**
 * Open Printable Receipt Modal
 */
function openPrintReceiptModal(paymentId) {
  const p = allPayments.find(item => item.id === paymentId);
  if (!p) return;
  activeReceiptData = p;

  const student = p.students || {};
  const obligation = p.fee_obligations || {};

  document.getElementById('receipt-no').textContent = p.receipt_number;
  document.getElementById('receipt-date').textContent = formatDateTime(p.payment_date);
  document.getElementById('receipt-student-name').textContent = student.full_name || 'N/A';
  document.getElementById('receipt-student-id').textContent = student.student_id || 'N/A';
  document.getElementById('receipt-fee-title').textContent = obligation.title || 'Tuition Fee';
  document.getElementById('receipt-method').textContent = (p.payment_method || 'CASH').toUpperCase();
  document.getElementById('receipt-amount').textContent = formatCurrency(p.amount_paid);
  document.getElementById('receipt-notes').textContent = p.notes || 'None';

  openModal('print-receipt-modal');
}

/**
 * Reversal / Correction process
 */
async function openReversePaymentModal(paymentId) {
  const p = allPayments.find(item => item.id === paymentId);
  if (!p) return;

  const reason = prompt(`Enter authorized reason for reversing receipt ${p.receipt_number}:`);
  if (!reason || !reason.trim()) {
    showToast('Reversal aborted: Reason is mandatory.', 'warning');
    return;
  }

  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  try {
    if (sb && window.isSupabaseConfigured) {
      const { data, error } = await sb.rpc('reverse_fee_payment', {
        p_payment_id: paymentId,
        p_reason: reason.trim()
      });

      if (error) {
        // Direct fallback update
        const { error: updErr } = await sb
          .from('fee_payments')
          .update({
            status: 'reversed',
            reversal_reason: reason.trim(),
            reversed_at: new Date().toISOString()
          })
          .eq('id', paymentId);
        if (updErr) throw updErr;
      }

      showToast(`Receipt ${p.receipt_number} reversed with audit note`, 'info');
      await loadFeeObligations();
      await loadFeePayments();
      return;
    }

    // Mock
    p.status = 'reversed';
    p.reversal_reason = reason.trim();
    showToast(`Payment reversed (Demo Mode)`, 'info');
    renderPaymentsTable(allPayments);
    updateFeeFinancialStats();
  } catch (err) {
    showToast(err.message || 'Reversal failed', 'error');
  }
}
