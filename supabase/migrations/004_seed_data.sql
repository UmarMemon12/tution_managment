-- ============================================================================
-- Tuition Management System - Migration 004: Seed Demonstration Data
-- (Optional: Run this to test the system with realistic institute data)
-- ============================================================================

-- Clean existing demo data safely if needed (optional)
-- DELETE FROM public.exam_results;
-- DELETE FROM public.examinations;
-- DELETE FROM public.class_schedules;
-- DELETE FROM public.fee_payments;
-- DELETE FROM public.fee_obligations;
-- DELETE FROM public.attendance;
-- DELETE FROM public.student_batches;
-- DELETE FROM public.batches;
-- DELETE FROM public.students;
-- DELETE FROM public.teachers;

-- 1. Insert Sample Teachers
INSERT INTO public.teachers (id, teacher_id, full_name, email, phone, subject_specialization, address, joining_date, status)
VALUES 
    ('11111111-1111-1111-1111-111111111101', 'TCH-001', 'Dr. Rajesh Sharma', 'rajesh.sharma@example.com', '+91 98765 43210', 'Physics & Mathematics', '12 Lake View Rd, Sector 4', '2025-01-15', 'active'),
    ('11111111-1111-1111-1111-111111111102', 'TCH-002', 'Prof. Ananya Sen', 'ananya.sen@example.com', '+91 98765 43211', 'Chemistry & Biology', '45 Park Street, Apt 3B', '2025-02-01', 'active'),
    ('11111111-1111-1111-1111-111111111103', 'TCH-003', 'Vikram Malhotra', 'vikram.malhotra@example.com', '+91 98765 43212', 'English Literature & Grammar', '78 Heritage Colony', '2025-03-10', 'active')
ON CONFLICT (teacher_id) DO NOTHING;

-- 2. Insert Sample Batches
INSERT INTO public.batches (id, batch_name, subject, grade, teacher_id, start_date, class_timing, max_capacity, status)
VALUES
    ('22222222-2222-2222-2222-222222222201', 'Grade 10 - Advanced Physics', 'Physics', 'Grade 10', '11111111-1111-1111-1111-111111111101', '2026-01-10', '04:00 PM - 05:30 PM', 25, 'active'),
    ('22222222-2222-2222-2222-222222222202', 'Grade 12 - Organic Chemistry', 'Chemistry', 'Grade 12', '11111111-1111-1111-1111-111111111102', '2026-01-12', '05:45 PM - 07:15 PM', 20, 'active'),
    ('22222222-2222-2222-2222-222222222203', 'Grade 10 - Mathematics Mastery', 'Mathematics', 'Grade 10', '11111111-1111-1111-1111-111111111101', '2026-02-01', '06:00 PM - 07:30 PM', 30, 'active'),
    ('22222222-2222-2222-2222-222222222204', 'Grade 9 - English Grammar & Essay', 'English', 'Grade 9', '11111111-1111-1111-1111-111111111103', '2026-03-01', '03:30 PM - 05:00 PM', 25, 'active')
ON CONFLICT DO NOTHING;

-- 3. Insert Sample Students
INSERT INTO public.students (id, student_id, full_name, profile_photo_url, date_of_birth, gender, phone, parent_name, parent_phone, email, address, admission_date, monthly_fee, status)
VALUES
    ('33333333-3333-3333-3333-333333333301', 'STU-2026-0001', 'Aarav Patel', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', '2010-05-14', 'male', '+91 91234 56789', 'Kishore Patel', '+91 98220 12345', 'aarav.patel@student.com', '14 Sunrise Enclave, City', '2026-01-05', 2500.00, 'active'),
    ('33333333-3333-3333-3333-333333333302', 'STU-2026-0002', 'Diya Kulkarni', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', '2008-09-22', 'female', '+91 91234 56790', 'Sunil Kulkarni', '+91 98220 12346', 'diya.k@student.com', '28 Green Valley, City', '2026-01-08', 3000.00, 'active'),
    ('33333333-3333-3333-3333-333333333303', 'STU-2026-0003', 'Rohan Gupta', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '2010-11-03', 'male', '+91 91234 56791', 'Manoj Gupta', '+91 98220 12347', 'rohan.g@student.com', '88 Hill View Road', '2026-01-10', 2500.00, 'active'),
    ('33333333-3333-3333-3333-333333333304', 'STU-2026-0004', 'Sneha Roy', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', '2011-03-18', 'female', '+91 91234 56792', 'Debashis Roy', '+91 98220 12348', 'sneha.roy@student.com', '102 Royal Palm Gardens', '2026-01-15', 2200.00, 'active'),
    ('33333333-3333-3333-3333-333333333305', 'STU-2026-0005', 'Karan Verma', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', '2008-12-07', 'male', '+91 91234 56793', 'Prakash Verma', '+91 98220 12349', 'karan.v@student.com', '54 Blossom Avenue', '2026-01-20', 3000.00, 'active')
ON CONFLICT (student_id) DO NOTHING;

-- 4. Enroll Students into Batches
INSERT INTO public.student_batches (student_id, batch_id, enrolled_date, status)
VALUES
    ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', '2026-01-10', 'active'),
    ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222203', '2026-02-01', 'active'),
    ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202', '2026-01-12', 'active'),
    ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222201', '2026-01-15', 'active'),
    ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222203', '2026-02-01', 'active'),
    ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222204', '2026-03-01', 'active'),
    ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222202', '2026-01-20', 'active')
ON CONFLICT DO NOTHING;

-- 5. Class Schedules (Timetable)
INSERT INTO public.class_schedules (batch_id, teacher_id, day_of_week, start_time, end_time, room_number)
VALUES
    ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'Monday', '16:00', '17:30', 'Room 101'),
    ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'Wednesday', '16:00', '17:30', 'Room 101'),
    ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'Friday', '16:00', '17:30', 'Room 101'),
    ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 'Tuesday', '17:45', '19:15', 'Lab B'),
    ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 'Thursday', '17:45', '19:15', 'Lab B'),
    ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111101', 'Tuesday', '18:00', '19:30', 'Room 102'),
    ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111101', 'Saturday', '10:00', '11:30', 'Room 102'),
    ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111103', 'Saturday', '15:30', '17:00', 'Room 201')
ON CONFLICT DO NOTHING;

-- 6. Fee Obligations
INSERT INTO public.fee_obligations (id, student_id, batch_id, title, billing_month, amount_due, due_date, status)
VALUES
    ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'Tuition Fee - October 2026', '2026-10', 2500.00, '2026-10-10', 'paid'),
    ('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202', 'Tuition Fee - October 2026', '2026-10', 3000.00, '2026-10-10', 'partially_paid'),
    ('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222201', 'Tuition Fee - October 2026', '2026-10', 2500.00, '2026-10-10', 'unpaid'),
    ('44444444-4444-4444-4444-444444444404', '33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222204', 'Tuition Fee - October 2026', '2026-10', 2200.00, '2026-10-10', 'paid'),
    ('44444444-4444-4444-4444-444444444405', '33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222202', 'Tuition Fee - October 2026', '2026-10', 3000.00, '2026-10-10', 'unpaid')
ON CONFLICT DO NOTHING;

-- 7. Fee Payments
INSERT INTO public.fee_payments (id, receipt_number, obligation_id, student_id, amount_paid, payment_date, payment_method, status, notes)
VALUES
    ('55555555-5555-5555-5555-555555555501', 'REC-202610-0001', '44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', 2500.00, '2026-10-05 10:30:00+00', 'upi', 'valid', 'Paid via GooglePay - Ref: 98127391823'),
    ('55555555-5555-5555-5555-555555555502', 'REC-202610-0002', '44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333302', 1500.00, '2026-10-07 14:15:00+00', 'cash', 'valid', 'Part payment received at reception desk'),
    ('55555555-5555-5555-5555-555555555503', 'REC-202610-0003', '44444444-4444-4444-4444-444444444404', '33333333-3333-3333-3333-333333333304', 2200.00, '2026-10-08 11:00:00+00', 'bank_transfer', 'valid', 'NEFT Transfer - HDFC Bank Ref: 4810294')
ON CONFLICT (receipt_number) DO NOTHING;

-- 8. Attendance Records (Sample for current date)
INSERT INTO public.attendance (student_id, batch_id, date, status, remarks)
VALUES
    ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', CURRENT_DATE, 'present', 'On time'),
    ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222201', CURRENT_DATE, 'late', '10 mins late with bus delay'),
    ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202', CURRENT_DATE, 'present', 'Active in discussion'),
    ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222202', CURRENT_DATE, 'absent', 'Medical leave reported by parent')
ON CONFLICT DO NOTHING;

-- 9. Examinations
INSERT INTO public.examinations (id, exam_name, batch_id, exam_date, max_marks, pass_marks, description)
VALUES
    ('66666666-6666-6666-6666-666666666601', 'Mid-Term Mechanics & Motion Test', '22222222-2222-2222-2222-222222222201', '2026-09-25', 100.00, 40.00, 'Covers kinematics, dynamics, and energy conservation.'),
    ('66666666-6666-6666-6666-666666666602', 'Hydrocarbons & Isomerism Assessment', '22222222-2222-2222-2222-222222222202', '2026-09-28', 50.00, 20.00, 'Unit 3 & 4 Organic Chemistry'),
    ('66666666-6666-6666-6666-666666666603', 'Algebra & Quadratic Equations Quiz', '22222222-2222-2222-2222-222222222203', '2026-10-25', 50.00, 20.00, 'Upcoming monthly revision quiz')
ON CONFLICT DO NOTHING;

-- 10. Exam Results
INSERT INTO public.exam_results (exam_id, student_id, marks_obtained, grade, status, remarks)
VALUES
    ('66666666-6666-6666-6666-666666666601', '33333333-3333-3333-3333-333333333301', 92.50, 'A+', 'passed', 'Outstanding performance in numerical problems.'),
    ('66666666-6666-6666-6666-666666666601', '33333333-3333-3333-3333-333333333303', 74.00, 'B', 'passed', 'Good effort; needs more revision in circular motion.'),
    ('66666666-6666-6666-6666-666666666602', '33333333-3333-3333-3333-333333333302', 46.00, 'A', 'passed', 'Clear understanding of reaction mechanisms.'),
    ('66666666-6666-6666-6666-666666666602', '33333333-3333-3333-3333-333333333305', 31.50, 'C', 'passed', 'Pass. Needs more practice with IUPAC nomenclature.')
ON CONFLICT DO NOTHING;
