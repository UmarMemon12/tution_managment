# Apex Academy — Tuition Management System (TMS)

A complete, responsive, database-driven **Tuition Management System** built exclusively with **Vanilla HTML5, CSS3, and modern ES6+ JavaScript** on the frontend, connected directly to **Supabase** (PostgreSQL, Supabase Auth, Row Level Security, and Database Functions).

---

## 1. Technology Stack

* **Frontend:** HTML5, Modern CSS3 (Vanilla CSS with design system custom properties, no framework dependencies), Plain ES6+ JavaScript.
* **Backend & Database:** Supabase PostgreSQL Database, Supabase Authentication, Row Level Security (RLS) policies, PL/pgSQL database functions & triggers.
* **Client Library:** Official `@supabase/supabase-js` v2 loaded via CDN.
* **Visualizations:** `Chart.js` for attendance ratios and revenue trends.

---

## 2. System Architecture & Features

### 👤 Role-Based Authorization & Security
* **Administrator:** Complete, unrestricted access to students, teachers, batches, timetables, attendance, fee transactions, examinations, and reports.
* **Teacher:** Access restricted to their assigned batches, student rosters, daily attendance register, and examination result scoring. Financial fee records are strictly hidden from teachers for privacy.
* **Receptionist:** Access to student admissions, batch enrollments, fee obligations, payments recording, receipt generation, and viewing timetables.
* **Row Level Security (RLS):** True multi-tenant data protection enforced at the PostgreSQL database level using `auth.uid()` and `public.profiles`. Changing IDs in client requests cannot bypass security.

### 📊 Modern Dashboard (`dashboard.html`)
* Live statistics loaded directly from Supabase: Total Students, Total Faculty Teachers, Active Batches, Present Today, Absent Today, Fees Collected this Month, and Total Outstanding Fees.
* Interactive Chart.js donut chart for today's attendance ratio and 6-month fee revenue bar chart.
* Quick lists of upcoming exams, recent fee receipts, and recent student admissions.

### 🎓 Student Management (`students.html`, `student-details.html`)
* Add, edit, view, search (by name, student ID, parent name, phone), and filter by batch/status.
* Auto-generated formatted student IDs (`STU-YYYY-XXXX`).
* Non-destructive student archiving (`status = 'archived'`).
* **Individual Student Profile:** Complete breakdown of personal details, guardian contact, enrolled batches, attendance history with attendance % calculation, fee obligations & receipts ledger, and academic exam results.
* CSV Export for student records.

### 🧑‍🏫 Teacher Management (`teachers.html`)
* Teacher profiles with specialization, phone, email, joining date, and status.
* View batches assigned to each teacher with student counts.
* Role-protected: Only administrators can add or edit teacher profiles.

### 👥 Batch Management (`batches.html`)
* Multi-batch support with grade, subject, teacher assignment, timing, and capacity tracking.
* Visual capacity progress bar (`e.g. 15 / 30 Enrolled`).
* Separate `student_batches` enrollment mapping table allowing students to join multiple batches.
* Non-destructive student removal (`status = 'dropped'`) preserving historical attendance and financial ledgers.

### 📅 Attendance Management (`attendance.html`)
* Batch and date selection.
* Teacher restriction: teachers automatically see only their assigned batches.
* Mark students as **Present**, **Absent**, or **Late**.
* **Shortcut:** "Mark All Present" button.
* Duplicate prevention: unique constraint on `(student_id, batch_id, date)` with upsert handling.
* Live summary indicators (Present count, Absent count, Late count, Attendance percentage).
* Student attendance history modal with percentage calculation.

### 💰 Fee & Financial Management (`fees.html`)
* Configure student fee obligations (title, billing month, due date, amount).
* Record full or partial payments across methods: Cash, UPI / QR, Bank Transfer (NEFT/IMPS), Cheque, Card.
* Financial metrics: Total Due, Total Collected, Outstanding Balance (`amount_due - valid_payments`).
* Auto-generated receipt numbers (`REC-YYYYMM-XXXX`).
* **Reversal / Correction Process:** Audited reversal requiring authorized justification note (financial payments are never silently deleted).
* **Printable Fee Receipt:** Clean printable modal with institute branding and authorized signature lines.

### ⏱️ Timetable Management (`timetable.html`)
* Weekly schedule grid (Monday to Sunday, hourly time slots).
* Filter by batch.
* **Conflict Detection:** Database and client validation preventing double-booking of the same batch or the same teacher in overlapping time slots.

### 📝 Examinations & Results (`examinations.html`, `results.html`)
* Schedule exams per batch with date, maximum marks, passing marks, and syllabus description.
* Marks entry with real-time validation: `0 <= marks <= max_marks`.
* Auto-calculation of percentage and letter grade (A+, A, B, C, D, F).
* Auto-assignment of Pass/Fail status based on passing marks threshold.
* **Printable Academic Report Card:** Formatted report card layout ready for printing or PDF export.

### 📈 Reports & Data Export (`reports.html`)
* 8 complete report modules:
  1. Student List Report
  2. Batch-wise Student Report
  3. Daily Attendance Report
  4. Monthly Attendance Aggregate Report
  5. Fee Collection Ledger
  6. Outstanding Fees Report
  7. Student Payment History
  8. Master Examination Results
* Date range filters and batch/student dropdown selectors.
* Print-friendly layout (`@media print`) and CSV export functionality for all reports.

---

## 3. Project Folder Structure

```
tuition-management-system/
├── index.html                # App entry point (redirects to dashboard/login)
├── login.html                # Secure Supabase Auth & quick role test switcher
├── dashboard.html            # Analytics dashboard with live cards and charts
├── students.html             # Student directory, search, filter, and registration
├── student-details.html      # Comprehensive individual student profile
├── teachers.html             # Teacher profiles and assigned batch inspector
├── batches.html              # Batch management, capacity tracking, enrollments
├── attendance.html           # Attendance register with duplicate prevention
├── fees.html                 # Financial ledger, obligations, receipts, reversals
├── timetable.html            # Weekly timetable grid with conflict detection
├── examinations.html         # Test scheduling and batch exam lists
├── results.html              # Marks entry, automatic grading, and report cards
├── reports.html              # 8 report types with print layout and CSV export
├── css/
│   ├── style.css             # Main stylesheet & custom design tokens
│   └── responsive.css        # Responsive layouts, mobile drawer, print styles
├── js/
│   ├── supabase-client.js    # Supabase client, configuration, connectivity test
│   ├── auth.js               # Supabase Auth, session check, role authorization
│   ├── dashboard.js          # Dashboard metric calculations & charts
│   ├── students.js           # Student management & batch enrollments
│   ├── student-details.js    # Student profile tabs & historical data
│   ├── teachers.js           # Faculty management & permissions
│   ├── batches.js            # Batch CRUD & student enrollment mapping
│   ├── attendance.js         # Daily attendance register & history
│   ├── fees.js               # Fee transactions, receipts, and reversals
│   ├── timetable.js          # Weekly schedule grid & conflict checking
│   ├── examinations.js       # Exam scheduling
│   ├── results.js            # Marks input, grade computation, report card
│   ├── reports.js            # Master reports generator & CSV export
│   └── common.js             # Toast notifications, modals, receipt printing
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql      # 11 core tables, indexes, constraints
        ├── 002_security_policies.sql   # Complete Row Level Security policies
        ├── 003_database_functions.sql  # Triggers, RPCs, payment transactions
        └── 004_seed_data.sql           # Realistic demo institute seed data
```

---

## 4. Database Setup & Supabase Migrations

### Step 1: Create a Supabase Project
1. Log into your [Supabase Dashboard](https://supabase.com).
2. Click **New Project**, choose an organization, give it a name (e.g., `apex-academy-tms`), set a database password, and select your region.

### Step 2: Run the SQL Migrations
In your Supabase project dashboard, navigate to the **SQL Editor** on the left menu, and run the following migration scripts located in `supabase/migrations/` in order:

1. **`001_initial_schema.sql`**: Creates all 11 tables (`profiles`, `teachers`, `students`, `batches`, `student_batches`, `attendance`, `fee_obligations`, `fee_payments`, `class_schedules`, `examinations`, `exam_results`), foreign keys, check constraints, and performance indexes.
2. **`002_security_policies.sql`**: Enables Row Level Security (RLS) on all tables and creates secure helper functions (`is_admin()`, `is_teacher()`, `is_receptionist()`) and role policies.
3. **`003_database_functions.sql`**: Creates the `handle_new_user()` trigger for automated profile creation upon signup, the financial `record_fee_payment()` and `reverse_fee_payment()` transactional functions, schedule conflict detection, and `get_dashboard_summary()`.
4. **`004_seed_data.sql`** *(Optional but recommended)*: Inserts realistic demonstration teachers, batches, students, fee obligations, attendance records, and exams.

### Step 3: Configure Authentication
1. In Supabase, navigate to **Authentication > Providers > Email**.
2. Ensure **Email provider** is enabled.
3. For local development or instant testing, you can uncheck **"Confirm email"** under **Authentication > Email Templates** so users can sign in immediately upon registration.

### Step 4: Create the First Administrator Securely
In the Supabase **SQL Editor**, run the following snippet to create your first Administrator (or sign up via Auth and promote the role):

```sql
-- Replace with your admin email and secure password
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@apexacademy.edu',
  crypt('AdminSecurePass2026!', gen_salt('bf')),
  now(),
  '{"full_name": "Super Administrator", "role": "admin"}'::jsonb,
  now(),
  now()
);
```

*(Note: The database trigger in `003_database_functions.sql` will automatically insert a corresponding record in `public.profiles` with role `'admin'`.)*

### Step 5: Adding Teachers and Receptionists
You can add users via the Supabase Auth Dashboard and set their metadata:
* **Teacher:** Metadata: `{"full_name": "Dr. Rajesh Sharma", "role": "teacher"}`
* **Receptionist:** Metadata: `{"full_name": "Pooja Verma", "role": "receptionist"}`

Alternatively, an Administrator can update roles in `public.profiles`:
```sql
UPDATE public.profiles SET role = 'teacher' WHERE email = 'teacher@example.com';
```

---

## 5. Frontend Configuration & Running Locally

### Step 1: Configure Supabase Credentials
You can set your Supabase Project URL and Anon Public Key in either of two ways:

#### Option A: In the browser UI (Recommended & Instant)
Open any page of the application, click the **⚙️ Supabase API** button on the top-right header (or the connection pill), paste your **Project URL** and **Anon Public Key** (from Supabase Dashboard > Project Settings > API), and click **Save & Reconnect**. The configuration will be stored safely in your browser's `localStorage`.

#### Option B: In `js/supabase-client.js`
Open `js/supabase-client.js` and edit lines 6-7:
```javascript
const DEFAULT_SUPABASE_URL = "https://your-project-id.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key";
```

### Step 2: Run Using a Local Static Server
Since vanilla ES modules and HTTP requests run best under an HTTP server (to prevent CORS restrictions on `file:///`), start any static server in the project folder:

**Using Python:**
```bash
python -m http.server 3000
```

**Using Node.js / npx:**
```bash
npx serve .
```

Then open `http://localhost:3000` in your web browser.

---

## 6. Testing Instructions & Quick Demo Switcher

The login page (`login.html`) includes **Quick Demo Login** buttons:
* **👑 Admin:** Grants full access to all 11 modules and configuration controls.
* **🧑‍🏫 Teacher:** Restricted to assigned batches, attendance register, and entering exam marks. Fee management is hidden.
* **💼 Reception:** Access to student admissions, batch enrollments, recording payments, and receipts.

### Verifying Permissions:
1. Log in as **Teacher** and observe that the "Fee Management" navigation item is automatically hidden.
2. Attempting to access `fees.html` directly will show an access denial alert and redirect to the dashboard.
3. Test recording attendance: mark students present/absent and save. Reload to verify persistence.
4. Test recording a fee payment: enter receipt number and amount. Click "Print Receipt" to view the formatted receipt.
5. Test timetable conflict detection: try scheduling two classes for the same batch at overlapping hours to verify that the conflict warning triggers.

---

## 7. Deployment to Static Hosting

Because this project is built entirely with static HTML, CSS, and vanilla JavaScript communicating with Supabase via client-side REST/WebSockets, it can be hosted on any static hosting service with zero build configuration:

* **Vercel / Netlify:** Drag-and-drop the `tuition-management-system/` folder or link a GitHub repository. Set the publish directory to `.` (root).
* **GitHub Pages:** Push the codebase to a repository, go to **Settings > Pages**, choose the `main` branch root `/`, and click Save.
* **Cloudflare Pages:** Connect repository, select root directory, framework preset "None", and deploy.
