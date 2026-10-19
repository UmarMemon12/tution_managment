-- ============================================================================
-- Tuition Management System - Migration 001: Initial Schema
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Extends Supabase auth.users with role and profile metadata)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'receptionist')) DEFAULT 'receptionist',
    teacher_id UUID, -- Optional link to teachers table if the profile is for a teacher
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TEACHERS TABLE
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    subject_specialization TEXT NOT NULL,
    address TEXT,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'on_leave')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Add foreign key constraint from profiles to teachers table if exists
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_profiles_teacher' AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT fk_profiles_teacher 
        FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    profile_photo_url TEXT,
    date_of_birth DATE NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    phone TEXT NOT NULL,
    parent_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    monthly_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (monthly_fee >= 0),
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'archived')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. BATCHES TABLE
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    class_timing TEXT NOT NULL,
    max_capacity INTEGER NOT NULL DEFAULT 30 CHECK (max_capacity > 0),
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. STUDENT BATCHES (Enrolment mapping table)
CREATE TABLE IF NOT EXISTS public.student_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    enrolled_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('active', 'transferred', 'dropped', 'completed')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_student_batch_active UNIQUE (student_id, batch_id, status)
);

-- 6. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    remarks TEXT,
    marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_attendance_student_batch_date UNIQUE (student_id, batch_id, date)
);

-- 7. FEE OBLIGATIONS TABLE
CREATE TABLE IF NOT EXISTS public.fee_obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    billing_month TEXT NOT NULL, -- e.g. '2026-10'
    amount_due NUMERIC(12, 2) NOT NULL CHECK (amount_due >= 0),
    due_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'waived')) DEFAULT 'unpaid',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. FEE PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT UNIQUE NOT NULL,
    obligation_id UUID REFERENCES public.fee_obligations(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid > 0),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other')) DEFAULT 'cash',
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('valid', 'reversed')) DEFAULT 'valid',
    reversal_reason TEXT,
    reversed_at TIMESTAMPTZ,
    reversed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. CLASS SCHEDULES (TIMETABLE)
CREATE TABLE IF NOT EXISTS public.class_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (end_time > start_time),
    room_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. EXAMINATIONS TABLE
CREATE TABLE IF NOT EXISTS public.examinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_name TEXT NOT NULL,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    exam_date DATE NOT NULL,
    max_marks NUMERIC(5, 2) NOT NULL CHECK (max_marks > 0),
    pass_marks NUMERIC(5, 2) NOT NULL CHECK (pass_marks >= 0 AND pass_marks <= max_marks),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. EXAM RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.examinations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    marks_obtained NUMERIC(5, 2) NOT NULL CHECK (marks_obtained >= 0),
    grade TEXT,
    status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'absent')) DEFAULT 'passed',
    remarks TEXT,
    evaluated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_exam_result_student UNIQUE (exam_id, student_id)
);

-- ============================================================================
-- INDEXES FOR FREQUENTLY SEARCHED FIELDS & FOREIGN KEYS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON public.teachers(email);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON public.teachers(status);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_full_name ON public.students(full_name);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_batches_teacher_id ON public.batches(teacher_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON public.batches(status);
CREATE INDEX IF NOT EXISTS idx_student_batches_student ON public.student_batches(student_id);
CREATE INDEX IF NOT EXISTS idx_student_batches_batch ON public.student_batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_student_batches_status ON public.student_batches(status);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_batch_date ON public.attendance(batch_id, date);
CREATE INDEX IF NOT EXISTS idx_fee_obligations_student ON public.fee_obligations(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_obligations_status ON public.fee_obligations(status);
CREATE INDEX IF NOT EXISTS idx_fee_obligations_due_date ON public.fee_obligations(due_date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_receipt ON public.fee_payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON public.fee_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_class_schedules_batch ON public.class_schedules(batch_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_teacher ON public.class_schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_day ON public.class_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_examinations_batch ON public.examinations(batch_id);
CREATE INDEX IF NOT EXISTS idx_examinations_date ON public.examinations(exam_date);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON public.exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON public.exam_results(student_id);
