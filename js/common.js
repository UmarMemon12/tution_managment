/**
 * Tuition Management System - Common Utilities & UI Helpers
 */

// ----------------------------------------------------------------------------
// 1. Toast Notification System
// ----------------------------------------------------------------------------
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = {
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
  }[type] || '';

  toast.innerHTML = `
    <div style="color: inherit; flex-shrink: 0;">${iconSvg}</div>
    <div style="flex: 1; font-weight: 500;">${escapeHTML(message)}</div>
    <button style="background:none; border:none; color:inherit; opacity:0.6; cursor:pointer;" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 250ms ease';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// ----------------------------------------------------------------------------
// 2. Modal Controls & Confirm Dialog
// ----------------------------------------------------------------------------
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// Global click outside modal content to close
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

function confirmDialog(title, message, confirmText = 'Confirm', isDanger = false) {
  return new Promise((resolve) => {
    let confirmModal = document.getElementById('global-confirm-modal');
    if (!confirmModal) {
      confirmModal = document.createElement('div');
      confirmModal.id = 'global-confirm-modal';
      confirmModal.className = 'modal-backdrop';
      confirmModal.innerHTML = `
        <div class="modal" style="max-width: 420px;">
          <div class="modal-header">
            <h3 class="modal-title" id="confirm-title">Confirm Action</h3>
            <button class="modal-close" id="confirm-close-btn">✕</button>
          </div>
          <div class="modal-body">
            <p id="confirm-message" style="color: var(--text-secondary);"></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="confirm-cancel-btn">Cancel</button>
            <button class="btn" id="confirm-ok-btn">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmModal);
    }

    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const closeBtn = document.getElementById('confirm-close-btn');

    titleEl.textContent = title;
    msgEl.textContent = message;
    okBtn.textContent = confirmText;
    okBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';

    const cleanup = () => {
      confirmModal.classList.remove('open');
      okBtn.replaceWith(okBtn.cloneNode(true));
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      closeBtn.replaceWith(closeBtn.cloneNode(true));
    };

    confirmModal.classList.add('open');

    document.getElementById('confirm-ok-btn').addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    document.getElementById('confirm-close-btn').addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
  });
}

// ----------------------------------------------------------------------------
// 3. Formatting Utilities
// ----------------------------------------------------------------------------
function formatCurrency(amount) {
  const num = parseFloat(amount || 0);
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return dateInput;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateTimeInput) {
  if (!dateTimeInput) return '-';
  const d = new Date(dateTimeInput);
  if (isNaN(d.getTime())) return dateTimeInput;
  return d.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function formatTime(timeStr) {
  if (!timeStr) return '-';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    let hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  }
  return timeStr;
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ----------------------------------------------------------------------------
// 4. Code & ID Generators
// ----------------------------------------------------------------------------
function generateStudentID() {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `STU-${year}-${randomNum}`;
}

function generateReceiptNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `REC-${yyyy}${mm}-${randomNum}`;
}

function generateTeacherID() {
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `TCH-${randomNum}`;
}

// ----------------------------------------------------------------------------
// 5. CSV Export Helper
// ----------------------------------------------------------------------------
function exportToCSV(filename, headers, rows) {
  if (!rows || !rows.length) {
    showToast('No records available to export', 'warning');
    return;
  }

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast(`Exported ${rows.length} records to CSV`, 'success');
}

// ----------------------------------------------------------------------------
// 6. Status Badge Generator
// ----------------------------------------------------------------------------
function renderBadge(status, type = '') {
  const s = String(status || '').toLowerCase();
  let badgeClass = 'badge-neutral';

  if (['active', 'paid', 'present', 'passed', 'valid'].includes(s)) {
    badgeClass = 'badge-success';
  } else if (['partially_paid', 'late', 'on_leave'].includes(s)) {
    badgeClass = 'badge-warning';
  } else if (['inactive', 'archived', 'unpaid', 'absent', 'failed', 'cancelled', 'reversed'].includes(s)) {
    badgeClass = 'badge-danger';
  } else if (['completed', 'transferred'].includes(s)) {
    badgeClass = 'badge-info';
  }

  const label = s.replace(/_/g, ' ');
  return `<span class="badge ${badgeClass}">${escapeHTML(label)}</span>`;
}

// ----------------------------------------------------------------------------
// 7. Mobile Sidebar Controller
// ----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const sidebar = document.querySelector('.sidebar');
  let overlay = document.querySelector('.sidebar-overlay');

  if (!overlay && sidebar) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }

  if (mobileBtn && sidebar) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // Supabase Configuration Status & Modal setup
  initSupabaseStatusModal();
});

// ----------------------------------------------------------------------------
// 8. Supabase Live Settings Modal
// ----------------------------------------------------------------------------
function initSupabaseStatusModal() {
  const statusEl = document.getElementById('connection-status-pill');
  if (statusEl) {
    const isCloud = window.isCloudSupabase;
    statusEl.innerHTML = `
      <span class="status-dot"></span>
      <span class="status-text">${isCloud ? 'Supabase Cloud (Active)' : 'Supabase Engine (Connected)'}</span>
    `;
    statusEl.style.cursor = 'pointer';
    statusEl.title = isCloud ? 'Connected to live Supabase cloud project' : 'Running on automatic persistent Supabase Engine. Click to link a Cloud Supabase Project.';
    statusEl.addEventListener('click', openSupabaseConfigModal);
  }
}

function openSupabaseConfigModal() {
  let modal = document.getElementById('supabase-config-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'supabase-config-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="modal-title">Supabase Database Connection</h3>
          <button class="modal-close" onclick="closeModal('supabase-config-modal')">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
            Configure your Supabase project parameters below. The frontend connects directly using the Supabase JavaScript client.
          </p>
          <div class="form-group">
            <label class="form-label">Project URL <span class="required">*</span></label>
            <input type="text" id="cfg-supabase-url" class="form-control" placeholder="https://xyzcompany.supabase.co" value="${escapeHTML(localStorage.getItem('TMS_SUPABASE_URL') || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Anon / Publishable API Key <span class="required">*</span></label>
            <input type="password" id="cfg-supabase-anon" class="form-control" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." value="${escapeHTML(localStorage.getItem('TMS_SUPABASE_ANON_KEY') || '')}">
            <div class="form-help">Found in your Supabase dashboard under Project Settings &gt; API.</div>
          </div>
          <div id="cfg-test-result" style="margin-top: 1rem; font-size: 0.85rem;"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('supabase-config-modal')">Close</button>
          <button class="btn btn-primary" id="cfg-save-btn">Save & Reconnect</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('cfg-save-btn').addEventListener('click', () => {
      const url = document.getElementById('cfg-supabase-url').value.trim();
      const key = document.getElementById('cfg-supabase-anon').value.trim();
      if (!url || !key) {
        showToast('Please provide both Project URL and Anon Key', 'error');
        return;
      }
      try {
        updateSupabaseConfig(url, key);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  modal.classList.add('open');
}
