/**
 * Tuition Management System - Timetable Management Controller
 */

let allSchedules = [];
let allBatches = [];
let allTeachers = [];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
];

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  await loadFilterDropdowns();
  await loadSchedules();
  initTimetableEventListeners();
});

/**
 * Load Batches and Teachers for dropdowns
 */
async function loadFilterDropdowns() {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  if (sb && window.isSupabaseConfigured) {
    try {
      const [{ data: batches }, { data: teachers }] = await Promise.all([
        sb.from('batches').select('id, batch_name, grade, teacher_id').eq('status', 'active'),
        sb.from('teachers').select('id, full_name, subject_specialization').eq('status', 'active')
      ]);
      allBatches = batches || [];
      allTeachers = teachers || [];
    } catch (e) {
      console.warn("Could not load timetable options:", e);
    }
  } else {
    allBatches = [
      { id: '22222222-2222-2222-2222-222222222201', batch_name: 'Grade 10 - Advanced Physics', grade: 'Grade 10', teacher_id: '11111111-1111-1111-1111-111111111101' },
      { id: '22222222-2222-2222-2222-222222222202', batch_name: 'Grade 12 - Organic Chemistry', grade: 'Grade 12', teacher_id: '11111111-1111-1111-1111-111111111102' },
      { id: '22222222-2222-2222-2222-222222222203', batch_name: 'Grade 10 - Mathematics Mastery', grade: 'Grade 10', teacher_id: '11111111-1111-1111-1111-111111111101' }
    ];
    allTeachers = [
      { id: '11111111-1111-1111-1111-111111111101', full_name: 'Dr. Rajesh Sharma', subject_specialization: 'Physics' },
      { id: '11111111-1111-1111-1111-111111111102', full_name: 'Prof. Ananya Sen', subject_specialization: 'Chemistry' }
    ];
  }

  // Populate Filter Dropdowns
  const filterBatchSelect = document.getElementById('filter-schedule-batch');
  const modalBatchSelect = document.getElementById('schedule-batch-select');
  const modalTeacherSelect = document.getElementById('schedule-teacher-select');

  if (filterBatchSelect) {
    filterBatchSelect.innerHTML = `<option value="">All Batches</option>` +
      allBatches.map(b => `<option value="${b.id}">${escapeHTML(b.batch_name)}</option>`).join('');
  }
  if (modalBatchSelect) {
    modalBatchSelect.innerHTML = `<option value="">-- Choose Batch --</option>` +
      allBatches.map(b => `<option value="${b.id}">${escapeHTML(b.batch_name)} (${escapeHTML(b.grade)})</option>`).join('');
  }
  if (modalTeacherSelect) {
    modalTeacherSelect.innerHTML = `<option value="">-- Auto / Choose Teacher --</option>` +
      allTeachers.map(t => `<option value="${t.id}">${escapeHTML(t.full_name)}</option>`).join('');
  }
}

/**
 * Load Class Schedules
 */
async function loadSchedules() {
  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  if (sb && window.isSupabaseConfigured) {
    try {
      const { data, error } = await sb
        .from('class_schedules')
        .select(`
          *,
          batches (id, batch_name, grade),
          teachers (id, full_name, subject_specialization)
        `);

      if (error) throw error;
      allSchedules = data || [];
      renderWeeklyTimetableGrid(allSchedules);
      return;
    } catch (err) {
      console.warn("Could not load schedules from Supabase:", err);
      showToast("Loading offline demo timetable", "info");
    }
  }

  // Demo schedules
  allSchedules = [
    {
      id: 'sch-1',
      batch_id: '22222222-2222-2222-2222-222222222201',
      teacher_id: '11111111-1111-1111-1111-111111111101',
      day_of_week: 'Monday',
      start_time: '16:00',
      end_time: '17:30',
      room_number: 'Room 101',
      batches: { batch_name: 'Grade 10 - Advanced Physics', grade: 'Grade 10' },
      teachers: { full_name: 'Dr. Rajesh Sharma' }
    },
    {
      id: 'sch-2',
      batch_id: '22222222-2222-2222-2222-222222222201',
      teacher_id: '11111111-1111-1111-1111-111111111101',
      day_of_week: 'Wednesday',
      start_time: '16:00',
      end_time: '17:30',
      room_number: 'Room 101',
      batches: { batch_name: 'Grade 10 - Advanced Physics', grade: 'Grade 10' },
      teachers: { full_name: 'Dr. Rajesh Sharma' }
    },
    {
      id: 'sch-3',
      batch_id: '22222222-2222-2222-2222-222222222202',
      teacher_id: '11111111-1111-1111-1111-111111111102',
      day_of_week: 'Tuesday',
      start_time: '17:45',
      end_time: '19:15',
      room_number: 'Lab B',
      batches: { batch_name: 'Grade 12 - Organic Chemistry', grade: 'Grade 12' },
      teachers: { full_name: 'Prof. Ananya Sen' }
    }
  ];

  renderWeeklyTimetableGrid(allSchedules);
}

/**
 * Render Weekly Timetable Grid
 */
function renderWeeklyTimetableGrid(schedules) {
  const container = document.getElementById('timetable-container');
  if (!container) return;

  const filterBatch = document.getElementById('filter-schedule-batch')?.value;
  const filtered = filterBatch ? schedules.filter(s => s.batch_id === filterBatch) : schedules;

  let html = `
    <div class="timetable-grid">
      <div class="timetable-header-cell">Time Slot</div>
      ${DAYS_OF_WEEK.map(day => `<div class="timetable-header-cell">${day}</div>`).join('')}
  `;

  TIME_SLOTS.forEach(timeSlot => {
    const slotHour = parseInt(timeSlot.split(':')[0], 10);
    const nextSlot = `${String(slotHour + 1).padStart(2, '0')}:00`;
    const label = `${formatTime(timeSlot)}`;

    html += `<div class="timetable-time-cell">${label}</div>`;

    DAYS_OF_WEEK.forEach(day => {
      // Find classes in this day & slot
      const matches = filtered.filter(s => {
        if (s.day_of_week !== day) return false;
        const startH = parseInt(s.start_time.split(':')[0], 10);
        return startH === slotHour;
      });

      html += `<div class="timetable-slot">`;
      matches.forEach(item => {
        const batchName = item.batches ? item.batches.batch_name : 'Batch';
        const teacherName = item.teachers ? item.teachers.full_name : 'Teacher';
        const timeStr = `${formatTime(item.start_time)} - ${formatTime(item.end_time)}`;

        html += `
          <div class="schedule-card" onclick="viewScheduleDetails('${item.id}')">
            <span class="batch-name">${escapeHTML(batchName)}</span>
            <div class="teacher-name">👤 ${escapeHTML(teacherName)}</div>
            <div class="room-info">⏱️ ${timeStr} | 🚪 ${escapeHTML(item.room_number || 'Room TBD')}</div>
          </div>
        `;
      });
      html += `</div>`;
    });
  });

  html += `</div>`;
  container.innerHTML = html;
}

/**
 * Event Listeners
 */
function initTimetableEventListeners() {
  document.getElementById('filter-schedule-batch')?.addEventListener('change', () => {
    renderWeeklyTimetableGrid(allSchedules);
  });

  document.getElementById('add-schedule-btn')?.addEventListener('click', openAddScheduleModal);
  document.getElementById('schedule-form')?.addEventListener('submit', handleScheduleFormSubmit);
  document.getElementById('schedule-batch-select')?.addEventListener('change', (e) => {
    const batchId = e.target.value;
    const batch = allBatches.find(b => b.id === batchId);
    if (batch && batch.teacher_id) {
      document.getElementById('schedule-teacher-select').value = batch.teacher_id;
    }
  });
}

/**
 * Open Add Schedule Modal
 */
function openAddScheduleModal() {
  document.getElementById('schedule-modal-title').textContent = 'Add Class Schedule';
  document.getElementById('schedule-form').reset();
  document.getElementById('schedule-db-id').value = '';
  document.getElementById('schedule-conflict-warning').style.display = 'none';
  openModal('schedule-form-modal');
}

/**
 * View or Edit schedule details
 */
function viewScheduleDetails(id) {
  const sch = allSchedules.find(item => item.id === id);
  if (!sch) return;

  document.getElementById('schedule-modal-title').textContent = 'Class Schedule Slot';
  document.getElementById('schedule-db-id').value = sch.id;
  document.getElementById('schedule-batch-select').value = sch.batch_id;
  document.getElementById('schedule-teacher-select').value = sch.teacher_id || '';
  document.getElementById('schedule-day-select').value = sch.day_of_week;
  document.getElementById('schedule-start-time').value = sch.start_time.substring(0, 5);
  document.getElementById('schedule-end-time').value = sch.end_time.substring(0, 5);
  document.getElementById('schedule-room').value = sch.room_number || '';
  document.getElementById('schedule-conflict-warning').style.display = 'none';

  openModal('schedule-form-modal');
}

/**
 * Detect Schedule Conflict
 */
function checkLocalConflict(batchId, teacherId, day, startTime, endTime, excludeId = null) {
  for (const s of allSchedules) {
    if (excludeId && s.id === excludeId) continue;
    if (s.day_of_week !== day) continue;

    const sStart = s.start_time.substring(0, 5);
    const sEnd = s.end_time.substring(0, 5);

    // Overlap condition: start < other_end && end > other_start
    const hasTimeOverlap = (startTime < sEnd && endTime > sStart);

    if (hasTimeOverlap) {
      if (s.batch_id === batchId) {
        return {
          hasConflict: true,
          message: `Conflict: Batch "${s.batches ? s.batches.batch_name : 'Batch'}" is already scheduled on ${day} from ${formatTime(sStart)} to ${formatTime(sEnd)}.`
        };
      }
      if (teacherId && s.teacher_id === teacherId) {
        return {
          hasConflict: true,
          message: `Conflict: Teacher "${s.teachers ? s.teachers.full_name : 'Teacher'}" is already assigned to another batch on ${day} from ${formatTime(sStart)} to ${formatTime(sEnd)}.`
        };
      }
    }
  }
  return { hasConflict: false };
}

/**
 * Handle Schedule Form Submit
 */
async function handleScheduleFormSubmit(e) {
  e.preventDefault();

  const dbId = document.getElementById('schedule-db-id').value;
  const batchId = document.getElementById('schedule-batch-select').value;
  const teacherId = document.getElementById('schedule-teacher-select').value || null;
  const day = document.getElementById('schedule-day-select').value;
  const startTime = document.getElementById('schedule-start-time').value;
  const endTime = document.getElementById('schedule-end-time').value;
  const room = document.getElementById('schedule-room').value.trim() || null;
  const warningEl = document.getElementById('schedule-conflict-warning');

  if (!batchId || !day || !startTime || !endTime) {
    showToast('Please specify batch, day, and time slots.', 'error');
    return;
  }

  if (startTime >= endTime) {
    showToast('End time must be later than start time.', 'error');
    return;
  }

  // Conflict Check
  const conflict = checkLocalConflict(batchId, teacherId, day, startTime, endTime, dbId || null);
  if (conflict.hasConflict) {
    warningEl.style.display = 'block';
    warningEl.textContent = conflict.message;
    showToast('Scheduling conflict detected!', 'error');
    return;
  } else {
    warningEl.style.display = 'none';
  }

  const payload = {
    batch_id: batchId,
    teacher_id: teacherId,
    day_of_week: day,
    start_time: startTime,
    end_time: endTime,
    room_number: room
  };

  const sb = window.supabaseClient;
  const isDemo = Boolean(sessionStorage.getItem('TMS_DEMO_ROLE'));

  try {
    if (sb && window.isSupabaseConfigured) {
      if (dbId) {
        const { error } = await sb.from('class_schedules').update(payload).eq('id', dbId);
        if (error) throw error;
      } else {
        const { error } = await sb.from('class_schedules').insert(payload);
        if (error) throw error;
      }

      showToast(dbId ? 'Schedule updated' : 'Schedule slot added successfully', 'success');
      closeModal('schedule-form-modal');
      await loadSchedules();
      return;
    }

    // Mock
    if (dbId) {
      const idx = allSchedules.findIndex(s => s.id === dbId);
      if (idx !== -1) {
        allSchedules[idx] = {
          ...allSchedules[idx],
          ...payload,
          batches: allBatches.find(b => b.id === batchId),
          teachers: allTeachers.find(t => t.id === teacherId)
        };
      }
    } else {
      payload.id = 'demo-sch-' + Date.now();
      payload.batches = allBatches.find(b => b.id === batchId);
      payload.teachers = allTeachers.find(t => t.id === teacherId);
      allSchedules.push(payload);
    }

    showToast('Schedule saved (Demo Mode)', 'success');
    closeModal('schedule-form-modal');
    renderWeeklyTimetableGrid(allSchedules);
  } catch (err) {
    showToast(err.message || 'Failed to save schedule', 'error');
  }
}
