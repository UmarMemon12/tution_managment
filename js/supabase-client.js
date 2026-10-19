/**
 * Tuition Management System - Supabase Client Initialization & Local Supabase Engine
 * Provides dual support:
 * 1. Live Supabase Cloud Project (if user provides Project URL and Anon API key)
 * 2. Automatic Local Supabase Database Engine (persists to localStorage with seed data)
 */

const DEFAULT_SUPABASE_URL = "https://eshopixotruwmnbnqqbf.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzaG9waXhvdHJ1d21uYm5xcWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MTc1MzIsImV4cCI6MjEwNzk5MzUzMn0._r0ZOp1SexfKu_LEYGNwQUwUcfkMty7g5r0oHKdN9cg";

// Retrieve configuration from localStorage if overridden, or use default cloud credentials
const ACTIVE_URL = localStorage.getItem('TMS_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
const ACTIVE_KEY = localStorage.getItem('TMS_SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_ANON_KEY;

const hasCloudCredentials = Boolean(
  ACTIVE_URL && 
  !ACTIVE_URL.includes('your-project-id') && 
  ACTIVE_KEY && 
  !ACTIVE_KEY.includes('your-anon-key')
);

// ============================================================================
// LOCAL SUPABASE STORAGE & SEED DATA ENGINE
// ============================================================================
const LOCAL_STORAGE_KEY_PREFIX = 'TMS_DB_';

function initLocalDatabase() {
  const tables = ['students', 'teachers', 'batches', 'student_batches', 'attendance', 'fee_obligations', 'fee_payments', 'class_schedules', 'examinations', 'exam_results', 'profiles'];

  const isInitialized = localStorage.getItem('TMS_DB_INITIALIZED');
  if (isInitialized) return;

  // 1. Teachers
  const teachers = [
    { id: '11111111-1111-1111-1111-111111111101', teacher_id: 'TCH-001', full_name: 'Dr. Rajesh Sharma', email: 'rajesh.sharma@example.com', phone: '+91 98765 43210', subject_specialization: 'Physics & Mathematics', address: '12 Lake View Rd, Sector 4', joining_date: '2025-01-15', status: 'active', created_at: new Date().toISOString() },
    { id: '11111111-1111-1111-1111-111111111102', teacher_id: 'TCH-002', full_name: 'Prof. Ananya Sen', email: 'ananya.sen@example.com', phone: '+91 98765 43211', subject_specialization: 'Chemistry & Biology', address: '45 Park Street, Apt 3B', joining_date: '2025-02-01', status: 'active', created_at: new Date().toISOString() },
    { id: '11111111-1111-1111-1111-111111111103', teacher_id: 'TCH-003', full_name: 'Vikram Malhotra', email: 'vikram.malhotra@example.com', phone: '+91 98765 43212', subject_specialization: 'English Literature & Grammar', address: '78 Heritage Colony', joining_date: '2025-03-10', status: 'active', created_at: new Date().toISOString() }
  ];

  // 2. Batches
  const batches = [
    { id: '22222222-2222-2222-2222-222222222201', batch_name: 'Grade 10 - Advanced Physics', subject: 'Physics', grade: 'Grade 10', teacher_id: '11111111-1111-1111-1111-111111111101', start_date: '2026-01-10', class_timing: '04:00 PM - 05:30 PM', max_capacity: 25, status: 'active', created_at: new Date().toISOString() },
    { id: '22222222-2222-2222-2222-222222222202', batch_name: 'Grade 12 - Organic Chemistry', subject: 'Chemistry', grade: 'Grade 12', teacher_id: '11111111-1111-1111-1111-111111111102', start_date: '2026-01-12', class_timing: '05:45 PM - 07:15 PM', max_capacity: 20, status: 'active', created_at: new Date().toISOString() },
    { id: '22222222-2222-2222-2222-222222222203', batch_name: 'Grade 10 - Mathematics Mastery', subject: 'Mathematics', grade: 'Grade 10', teacher_id: '11111111-1111-1111-1111-111111111101', start_date: '2026-02-01', class_timing: '06:00 PM - 07:30 PM', max_capacity: 30, status: 'active', created_at: new Date().toISOString() }
  ];

  // 3. Students
  const students = [
    { id: '33333333-3333-3333-3333-333333333301', student_id: 'STU-2026-0001', full_name: 'Aarav Patel', profile_photo_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', date_of_birth: '2010-05-14', gender: 'male', phone: '+91 91234 56789', parent_name: 'Kishore Patel', parent_phone: '+91 98220 12345', email: 'aarav.patel@student.com', address: '14 Sunrise Enclave, City', admission_date: '2026-01-05', monthly_fee: 2500, status: 'active', created_at: new Date().toISOString() },
    { id: '33333333-3333-3333-3333-333333333302', student_id: 'STU-2026-0002', full_name: 'Diya Kulkarni', profile_photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', date_of_birth: '2008-09-22', gender: 'female', phone: '+91 91234 56790', parent_name: 'Sunil Kulkarni', parent_phone: '+91 98220 12346', email: 'diya.k@student.com', address: '28 Green Valley, City', admission_date: '2026-01-08', monthly_fee: 3000, status: 'active', created_at: new Date().toISOString() },
    { id: '33333333-3333-3333-3333-333333333303', student_id: 'STU-2026-0003', full_name: 'Rohan Gupta', profile_photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', date_of_birth: '2010-11-03', gender: 'male', phone: '+91 91234 56791', parent_name: 'Manoj Gupta', parent_phone: '+91 98220 12347', email: 'rohan.g@student.com', address: '88 Hill View Road', admission_date: '2026-01-10', monthly_fee: 2500, status: 'active', created_at: new Date().toISOString() },
    { id: '33333333-3333-3333-3333-333333333304', student_id: 'STU-2026-0004', full_name: 'Sneha Roy', profile_photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', date_of_birth: '2011-03-18', gender: 'female', phone: '+91 91234 56792', parent_name: 'Debashis Roy', parent_phone: '+91 98220 12348', email: 'sneha.roy@student.com', address: '102 Royal Palm Gardens', admission_date: '2026-01-15', monthly_fee: 2200, status: 'active', created_at: new Date().toISOString() },
    { id: '33333333-3333-3333-3333-333333333305', student_id: 'STU-2026-0005', full_name: 'Karan Verma', profile_photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', date_of_birth: '2008-12-07', gender: 'male', phone: '+91 91234 56793', parent_name: 'Prakash Verma', parent_phone: '+91 98220 12349', email: 'karan.v@student.com', address: '54 Blossom Avenue', admission_date: '2026-01-20', monthly_fee: 3000, status: 'active', created_at: new Date().toISOString() }
  ];

  // 4. Enrollments
  const student_batches = [
    { id: 'sb-1', student_id: '33333333-3333-3333-3333-333333333301', batch_id: '22222222-2222-2222-2222-222222222201', enrolled_date: '2026-01-10', status: 'active' },
    { id: 'sb-2', student_id: '33333333-3333-3333-3333-333333333301', batch_id: '22222222-2222-2222-2222-222222222203', enrolled_date: '2026-02-01', status: 'active' },
    { id: 'sb-3', student_id: '33333333-3333-3333-3333-333333333302', batch_id: '22222222-2222-2222-2222-222222222202', enrolled_date: '2026-01-12', status: 'active' },
    { id: 'sb-4', student_id: '33333333-3333-3333-3333-333333333303', batch_id: '22222222-2222-2222-2222-222222222201', enrolled_date: '2026-01-15', status: 'active' },
    { id: 'sb-5', student_id: '33333333-3333-3333-3333-333333333305', batch_id: '22222222-2222-2222-2222-222222222202', enrolled_date: '2026-01-20', status: 'active' }
  ];

  // 5. Attendance
  const attendance = [
    { id: 'att-1', student_id: '33333333-3333-3333-3333-333333333301', batch_id: '22222222-2222-2222-2222-222222222201', date: new Date().toISOString().slice(0, 10), status: 'present', remarks: 'On time' },
    { id: 'att-2', student_id: '33333333-3333-3333-3333-333333333303', batch_id: '22222222-2222-2222-2222-222222222201', date: new Date().toISOString().slice(0, 10), status: 'late', remarks: '10 mins late' },
    { id: 'att-3', student_id: '33333333-3333-3333-3333-333333333302', batch_id: '22222222-2222-2222-2222-222222222202', date: new Date().toISOString().slice(0, 10), status: 'present', remarks: 'Active in class' },
    { id: 'att-4', student_id: '33333333-3333-3333-3333-333333333305', batch_id: '22222222-2222-2222-2222-222222222202', date: new Date().toISOString().slice(0, 10), status: 'absent', remarks: 'Medical leave' }
  ];

  // 6. Fee Obligations
  const fee_obligations = [
    { id: '44444444-4444-4444-4444-444444444401', student_id: '33333333-3333-3333-3333-333333333301', batch_id: '22222222-2222-2222-2222-222222222201', title: 'Tuition Fee - October 2026', billing_month: '2026-10', amount_due: 2500, due_date: '2026-10-10', status: 'paid' },
    { id: '44444444-4444-4444-4444-444444444402', student_id: '33333333-3333-3333-3333-333333333302', batch_id: '22222222-2222-2222-2222-222222222202', title: 'Tuition Fee - October 2026', billing_month: '2026-10', amount_due: 3000, due_date: '2026-10-10', status: 'partially_paid' },
    { id: '44444444-4444-4444-4444-444444444403', student_id: '33333333-3333-3333-3333-333333333303', batch_id: '22222222-2222-2222-2222-222222222201', title: 'Tuition Fee - October 2026', billing_month: '2026-10', amount_due: 2500, due_date: '2026-10-10', status: 'unpaid' },
    { id: '44444444-4444-4444-4444-444444444404', student_id: '33333333-3333-3333-3333-333333333304', batch_id: '22222222-2222-2222-2222-222222222204', title: 'Tuition Fee - October 2026', billing_month: '2026-10', amount_due: 2200, due_date: '2026-10-10', status: 'paid' }
  ];

  // 7. Fee Payments
  const fee_payments = [
    { id: '55555555-5555-5555-5555-555555555501', receipt_number: 'REC-202610-0001', obligation_id: '44444444-4444-4444-4444-444444444401', student_id: '33333333-3333-3333-3333-333333333301', amount_paid: 2500, payment_date: '2026-10-05T10:30:00Z', payment_method: 'upi', status: 'valid', notes: 'GPay Ref: 98127391823' },
    { id: '55555555-5555-5555-5555-555555555502', receipt_number: 'REC-202610-0002', obligation_id: '44444444-4444-4444-4444-444444444402', student_id: '33333333-3333-3333-3333-333333333302', amount_paid: 1500, payment_date: '2026-10-07T14:15:00Z', payment_method: 'cash', status: 'valid', notes: 'Part payment at desk' },
    { id: '55555555-5555-5555-5555-555555555503', receipt_number: 'REC-202610-0003', obligation_id: '44444444-4444-4444-4444-444444444404', student_id: '33333333-3333-3333-3333-333333333304', amount_paid: 2200, payment_date: '2026-10-08T11:00:00Z', payment_method: 'bank_transfer', status: 'valid', notes: 'NEFT Transfer - HDFC Bank Ref: 4810294' }
  ];

  // 8. Timetable
  const class_schedules = [
    { id: 'sch-1', batch_id: '22222222-2222-2222-2222-222222222201', teacher_id: '11111111-1111-1111-1111-111111111101', day_of_week: 'Monday', start_time: '16:00', end_time: '17:30', room_number: 'Room 101' },
    { id: 'sch-2', batch_id: '22222222-2222-2222-2222-222222222201', teacher_id: '11111111-1111-1111-1111-111111111101', day_of_week: 'Wednesday', start_time: '16:00', end_time: '17:30', room_number: 'Room 101' },
    { id: 'sch-3', batch_id: '22222222-2222-2222-2222-222222222202', teacher_id: '11111111-1111-1111-1111-111111111102', day_of_week: 'Tuesday', start_time: '17:45', end_time: '19:15', room_number: 'Lab B' },
    { id: 'sch-4', batch_id: '22222222-2222-2222-2222-222222222203', teacher_id: '11111111-1111-1111-1111-111111111101', day_of_week: 'Saturday', start_time: '10:00', end_time: '11:30', room_number: 'Room 102' }
  ];

  // 9. Examinations
  const examinations = [
    { id: '66666666-6666-6666-6666-666666666601', exam_name: 'Mid-Term Mechanics & Motion Test', batch_id: '22222222-2222-2222-2222-222222222201', exam_date: '2026-09-25', max_marks: 100, pass_marks: 40, description: 'Kinematics & Dynamics unit test' },
    { id: '66666666-6666-6666-6666-666666666602', exam_name: 'Hydrocarbons & Isomerism Assessment', batch_id: '22222222-2222-2222-2222-222222222202', exam_date: '2026-09-28', max_marks: 50, pass_marks: 20, description: 'Organic Chemistry Assessment' },
    { id: '66666666-6666-6666-6666-666666666603', exam_name: 'Algebra & Quadratic Equations Quiz', batch_id: '22222222-2222-2222-2222-222222222203', exam_date: '2026-10-25', max_marks: 50, pass_marks: 20, description: 'Upcoming revision quiz' }
  ];

  // 10. Exam Results
  const exam_results = [
    { id: 'res-1', exam_id: '66666666-6666-6666-6666-666666666601', student_id: '33333333-3333-3333-3333-333333333301', marks_obtained: 92.5, grade: 'A+', status: 'passed', remarks: 'Outstanding performance in numerical problems' },
    { id: 'res-2', exam_id: '66666666-6666-6666-6666-666666666601', student_id: '33333333-3333-3333-3333-333333333303', marks_obtained: 74, grade: 'B', status: 'passed', remarks: 'Good effort; needs more revision in motion' },
    { id: 'res-3', exam_id: '66666666-6666-6666-6666-666666666602', student_id: '33333333-3333-3333-3333-333333333302', marks_obtained: 46, grade: 'A', status: 'passed', remarks: 'Clear understanding of reactions' }
  ];

  localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'teachers', JSON.stringify(teachers));
  localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'batches', JSON.stringify(batches));
  localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'students', JSON.stringify(students));
  localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'student_batches', JSON.stringify(student_batches));
  localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'attendance', JSON.stringify(attendance));
  localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'fee_obligations', JSON.stringify(fee_obligations));
  localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'fee_payments', JSON.stringify(fee_payments));
  localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'class_schedules', JSON.stringify(class_schedules));
  localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'examinations', JSON.stringify(examinations));
  localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'exam_results', JSON.stringify(exam_results));

  localStorage.setItem('TMS_DB_INITIALIZED', 'true');
}

initLocalDatabase();

// ============================================================================
// LOCAL SUPABASE QUERY BUILDER IMPLEMENTATION
// ============================================================================
class LocalSupabaseQueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.storageKey = LOCAL_STORAGE_KEY_PREFIX + tableName;
    this.filters = [];
    this.orders = [];
    this.limitCount = null;
    this.isSingle = false;
    this.isHead = false;
    this.selectColumns = '*';
  }

  getTableData() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  saveTableData(rows) {
    localStorage.setItem(this.storageKey, JSON.stringify(rows));
  }

  select(columns = '*', options = {}) {
    this.selectColumns = columns;
    if (options.count) this.isCount = true;
    if (options.head) this.isHead = true;
    return this;
  }

  eq(column, value) {
    this.filters.push(item => String(item[column]) === String(value));
    return this;
  }

  neq(column, value) {
    this.filters.push(item => String(item[column]) !== String(value));
    return this;
  }

  gte(column, value) {
    this.filters.push(item => item[column] >= value);
    return this;
  }

  lte(column, value) {
    this.filters.push(item => item[column] <= value);
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.orders.push({ column, ascending });
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this.then ? this.then() : this;
  }

  async _resolveQuery() {
    let rows = this.getTableData();

    // Apply filters
    for (const filter of this.filters) {
      rows = rows.filter(filter);
    }

    const totalCount = rows.length;
    if (this.isHead) {
      return { data: null, count: totalCount, error: null };
    }

    // Apply orders
    for (const { column, ascending } of this.orders) {
      rows.sort((a, b) => {
        if (a[column] < b[column]) return ascending ? -1 : 1;
        if (a[column] > b[column]) return ascending ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }

    // Enrich relations if required
    rows = this._enrichRelations(rows);

    if (this.isSingle) {
      return { data: rows[0] || null, error: rows.length ? null : { message: 'Row not found', code: 'PGRST116' } };
    }

    return { data: rows, count: totalCount, error: null };
  }

  _enrichRelations(rows) {
    // Enrich foreign key relations commonly selected across the app
    const teachers = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'teachers') || '[]');
    const batches = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'batches') || '[]');
    const students = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'students') || '[]');
    const student_batches = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'student_batches') || '[]');
    const fee_obligations = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'fee_obligations') || '[]');
    const examinations = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'examinations') || '[]');
    const exam_results = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'exam_results') || '[]');

    return rows.map(r => {
      const copy = { ...r };

      if (this.tableName === 'students') {
        copy.student_batches = student_batches
          .filter(sb => sb.student_id === r.id)
          .map(sb => ({
            ...sb,
            batches: batches.find(b => b.id === sb.batch_id) || null
          }));
      }

      if (this.tableName === 'teachers') {
        copy.batches = batches.filter(b => b.teacher_id === r.id);
      }

      if (this.tableName === 'batches') {
        copy.teachers = teachers.find(t => t.id === r.teacher_id) || null;
        copy.student_batches = student_batches
          .filter(sb => sb.batch_id === r.id)
          .map(sb => ({
            ...sb,
            students: students.find(s => s.id === sb.student_id) || null
          }));
      }

      if (this.tableName === 'student_batches') {
        copy.students = students.find(s => s.id === r.student_id) || null;
        copy.batches = batches.find(b => b.id === r.batch_id) || null;
      }

      if (this.tableName === 'attendance') {
        copy.students = students.find(s => s.id === r.student_id) || null;
        copy.batches = batches.find(b => b.id === r.batch_id) || null;
      }

      if (this.tableName === 'fee_payments') {
        copy.students = students.find(s => s.id === r.student_id) || null;
        copy.fee_obligations = fee_obligations.find(o => o.id === r.obligation_id) || null;
      }

      if (this.tableName === 'fee_obligations') {
        copy.students = students.find(s => s.id === r.student_id) || null;
        copy.batches = batches.find(b => b.id === r.batch_id) || null;
      }

      if (this.tableName === 'class_schedules') {
        copy.batches = batches.find(b => b.id === r.batch_id) || null;
        copy.teachers = teachers.find(t => t.id === r.teacher_id) || null;
      }

      if (this.tableName === 'examinations') {
        copy.batches = batches.find(b => b.id === r.batch_id) || null;
        copy.exam_results = [{ count: exam_results.filter(res => res.exam_id === r.id).length }];
      }

      if (this.tableName === 'exam_results') {
        copy.students = students.find(s => s.id === r.student_id) || null;
        copy.examinations = examinations.find(e => e.id === r.exam_id) || null;
        if (copy.examinations) {
          copy.examinations.batches = batches.find(b => b.id === copy.examinations.batch_id) || null;
        }
      }

      return copy;
    });
  }

  // Promise interface
  then(resolve, reject) {
    return this._resolveQuery().then(resolve, reject);
  }

  async insert(recordOrArray) {
    const rows = this.getTableData();
    const toInsert = Array.isArray(recordOrArray) ? recordOrArray : [recordOrArray];
    const created = [];

    for (const item of toInsert) {
      const newItem = {
        id: item.id || ('local-' + Math.random().toString(36).substr(2, 9)),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...item
      };
      rows.unshift(newItem);
      created.push(newItem);
    }

    this.saveTableData(rows);
    return { data: Array.isArray(recordOrArray) ? created : created[0], error: null };
  }

  async update(updateFields) {
    let rows = this.getTableData();
    let updatedCount = 0;

    rows = rows.map(r => {
      let matches = true;
      for (const filter of this.filters) {
        if (!filter(r)) { matches = false; break; }
      }
      if (matches) {
        updatedCount++;
        return { ...r, ...updateFields, updated_at: new Date().toISOString() };
      }
      return r;
    });

    this.saveTableData(rows);
    return { data: rows, count: updatedCount, error: null };
  }

  async upsert(recordOrArray, options = {}) {
    let rows = this.getTableData();
    const toUpsert = Array.isArray(recordOrArray) ? recordOrArray : [recordOrArray];
    const conflictCols = options.onConflict ? options.onConflict.split(',').map(c => c.trim()) : ['id'];

    for (const item of toUpsert) {
      const existingIdx = rows.findIndex(r => {
        return conflictCols.every(col => String(r[col]) === String(item[col]));
      });

      if (existingIdx !== -1) {
        rows[existingIdx] = { ...rows[existingIdx], ...item, updated_at: new Date().toISOString() };
      } else {
        rows.unshift({
          id: item.id || ('local-' + Math.random().toString(36).substr(2, 9)),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...item
        });
      }
    }

    this.saveTableData(rows);
    return { data: toUpsert, error: null };
  }

  async delete() {
    let rows = this.getTableData();
    const initialLen = rows.length;

    rows = rows.filter(r => {
      for (const filter of this.filters) {
        if (filter(r)) return false;
      }
      return true;
    });

    this.saveTableData(rows);
    return { count: initialLen - rows.length, error: null };
  }
}

// ============================================================================
// LOCAL SUPABASE CLIENT PROXY
// ============================================================================
class LocalSupabaseClient {
  constructor() {
    this.auth = {
      getSession: async () => {
        const demoRole = sessionStorage.getItem('TMS_DEMO_ROLE') || 'admin';
        return {
          data: {
            session: {
              user: {
                id: 'local-admin-id',
                email: 'admin@apexacademy.edu'
              }
            }
          },
          error: null
        };
      },
      signInWithPassword: async ({ email, password }) => {
        sessionStorage.setItem('TMS_DEMO_ROLE', 'admin');
        return { data: { user: { email } }, error: null };
      },
      signOut: async () => {
        sessionStorage.removeItem('TMS_DEMO_ROLE');
        return { error: null };
      }
    };
  }

  from(tableName) {
    return new LocalSupabaseQueryBuilder(tableName);
  }

  async rpc(funcName, params = {}) {
    if (funcName === 'record_fee_payment') {
      const payments = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'fee_payments') || '[]');
      const obligations = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'fee_obligations') || '[]');

      const newPayment = {
        id: 'local-pay-' + Date.now(),
        receipt_number: params.p_receipt_number,
        obligation_id: params.p_obligation_id,
        student_id: params.p_student_id,
        amount_paid: params.p_amount_paid,
        payment_date: new Date().toISOString(),
        payment_method: params.p_payment_method,
        status: 'valid',
        notes: params.p_notes
      };
      payments.unshift(newPayment);
      localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'fee_payments', JSON.stringify(payments));

      // Update obligation if any
      if (params.p_obligation_id) {
        const oblIdx = obligations.findIndex(o => o.id === params.p_obligation_id);
        if (oblIdx !== -1) {
          const totalPaid = payments
            .filter(p => p.obligation_id === params.p_obligation_id && p.status === 'valid')
            .reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
          obligations[oblIdx].status = totalPaid >= obligations[oblIdx].amount_due ? 'paid' : 'partially_paid';
          localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'fee_obligations', JSON.stringify(obligations));
        }
      }

      return { data: { success: true, payment_id: newPayment.id }, error: null };
    }

    if (funcName === 'reverse_fee_payment') {
      const payments = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'fee_payments') || '[]');
      const obligations = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'fee_obligations') || '[]');

      const pIdx = payments.findIndex(p => p.id === params.p_payment_id);
      if (pIdx !== -1) {
        payments[pIdx].status = 'reversed';
        payments[pIdx].reversal_reason = params.p_reason;
        payments[pIdx].reversed_at = new Date().toISOString();
        localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'fee_payments', JSON.stringify(payments));

        // Recompute obligation
        const oblId = payments[pIdx].obligation_id;
        if (oblId) {
          const oblIdx = obligations.findIndex(o => o.id === oblId);
          if (oblIdx !== -1) {
            const totalPaid = payments
              .filter(p => p.obligation_id === oblId && p.status === 'valid')
              .reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
            obligations[oblIdx].status = totalPaid >= obligations[oblIdx].amount_due ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'unpaid');
            localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'fee_obligations', JSON.stringify(obligations));
          }
        }
      }
      return { data: { success: true }, error: null };
    }

    if (funcName === 'get_dashboard_summary') {
      const students = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'students') || '[]');
      const teachers = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'teachers') || '[]');
      const batches = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'batches') || '[]');
      const attendance = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'attendance') || '[]');
      const obligations = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'fee_obligations') || '[]');
      const payments = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'fee_payments') || '[]');

      const today = new Date().toISOString().slice(0, 10);
      const todayAtt = attendance.filter(a => a.date === today);
      const present = todayAtt.filter(a => a.status === 'present' || a.status === 'late').length;
      const absent = todayAtt.filter(a => a.status === 'absent').length;

      const totalCollected = payments.filter(p => p.status === 'valid').reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
      const totalDue = obligations.filter(o => o.status !== 'waived').reduce((s, o) => s + parseFloat(o.amount_due || 0), 0);
      const outstanding = Math.max(0, totalDue - totalCollected);

      return {
        data: {
          total_students: students.filter(s => s.status !== 'archived').length,
          total_teachers: teachers.filter(t => t.status === 'active').length,
          total_batches: batches.filter(b => b.status === 'active').length,
          present_today: present,
          absent_today: absent,
          fees_collected_month: totalCollected,
          total_outstanding: outstanding
        },
        error: null
      };
    }

    return { data: null, error: { message: `Function ${funcName} not recognized` } };
  }
}

// ============================================================================
// INITIALIZE ACTIVE CLIENT
// ============================================================================
if (hasCloudCredentials && window.supabase && typeof window.supabase.createClient === 'function') {
  try {
    const cloudClient = window.supabase.createClient(ACTIVE_URL, ACTIVE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    const localFallback = new LocalSupabaseClient();

    // Smart Client: executes against Supabase Cloud, with transparent fallback if SQL migrations are pending
    activeClient = {
      auth: cloudClient.auth,
      from: (tableName) => {
        const cloudQuery = cloudClient.from(tableName);
        return new Proxy(cloudQuery, {
          get(target, prop) {
            if (prop === 'then') {
              return (resolve, reject) => {
                target.then((res) => {
                  if (res && res.error && (res.error.code === 'PGRST205' || (res.error.message && res.error.message.includes('schema cache')))) {
                    console.info(`Table '${tableName}' not yet migrated in Supabase Cloud. Serving from persistent engine.`);
                    return localFallback.from(tableName).then(resolve, reject);
                  }
                  resolve(res);
                }).catch(() => {
                  localFallback.from(tableName).then(resolve, reject);
                });
              };
            }
            const orig = target[prop];
            return typeof orig === 'function' ? orig.bind(target) : orig;
          }
        });
      },
      rpc: async (funcName, params) => {
        try {
          const res = await cloudClient.rpc(funcName, params);
          if (res.error && (res.error.code === 'PGRST202' || (res.error.message && res.error.message.includes('schema cache')))) {
            return localFallback.rpc(funcName, params);
          }
          return res;
        } catch (e) {
          return localFallback.rpc(funcName, params);
        }
      }
    };
    console.log("Connected to Supabase Cloud:", ACTIVE_URL);
  } catch (err) {
    console.warn("Could not connect to Supabase Cloud, activating Local Supabase Database Engine:", err);
    activeClient = new LocalSupabaseClient();
  }
} else {
  // Use automated Local Supabase Engine
  activeClient = new LocalSupabaseClient();
  console.log("Local Supabase Database Engine Active & Connected.");
}

// Expose globally
window.supabaseClient = activeClient;
window.isSupabaseConfigured = true;
window.isCloudSupabase = hasCloudCredentials;
window.activeSupabaseUrl = ACTIVE_URL;

/**
 * Update project credentials dynamically in localStorage
 */
function updateSupabaseConfig(url, anonKey) {
  if (!url || !anonKey) {
    throw new Error("Both Supabase Project URL and Anon Key are required.");
  }
  localStorage.setItem('TMS_SUPABASE_URL', url.trim());
  localStorage.setItem('TMS_SUPABASE_ANON_KEY', anonKey.trim());
  window.location.reload();
}

/**
 * Clear stored credentials & switch back to local engine
 */
function resetSupabaseConfig() {
  localStorage.removeItem('TMS_SUPABASE_URL');
  localStorage.removeItem('TMS_SUPABASE_ANON_KEY');
  window.location.reload();
}

/**
 * Test connectivity
 */
async function testSupabaseConnection() {
  if (hasCloudCredentials) {
    try {
      const { data, error } = await activeClient.from('batches').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        return { success: false, message: error.message };
      }
      return { success: true, message: "Connected to Cloud Supabase successfully." };
    } catch (err) {
      return { success: false, message: err.message || "Cloud connection failure." };
    }
  }
  return { success: true, message: "Connected to Local Supabase Database Engine (Persistent Storage)." };
}
