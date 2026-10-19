-- ============================================================================
-- Tuition Management System - Migration 002: Security Policies (RLS)
-- ============================================================================

-- Helper functions to get current user details from JWT and public.profiles
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_receptionist()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'receptionist')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'teacher'
    );
$$;

CREATE OR REPLACE FUNCTION public.get_teacher_id_for_user()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT t.id 
    FROM public.teachers t
    JOIN public.profiles p ON (p.teacher_id = t.id OR t.user_id = auth.uid())
    WHERE p.id = auth.uid() OR t.user_id = auth.uid()
    LIMIT 1;
$$;

-- Enable Row Level Security (RLS) on all 11 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 1. PROFILES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
CREATE POLICY "Profiles read policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() OR public.is_admin() OR public.is_receptionist()
    );

DROP POLICY IF EXISTS "Profiles update self policy" ON public.profiles;
CREATE POLICY "Profiles update self policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (
        -- Regular users cannot escalate their own role
        (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Profiles insert admin policy" ON public.profiles;
CREATE POLICY "Profiles insert admin policy" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR id = auth.uid());

DROP POLICY IF EXISTS "Profiles delete admin policy" ON public.profiles;
CREATE POLICY "Profiles delete admin policy" ON public.profiles
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. TEACHERS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Teachers read policy" ON public.teachers;
CREATE POLICY "Teachers read policy" ON public.teachers
    FOR SELECT TO authenticated
    USING (true); -- Authenticated staff can view teacher directory

DROP POLICY IF EXISTS "Teachers write admin policy" ON public.teachers;
CREATE POLICY "Teachers write admin policy" ON public.teachers
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. STUDENTS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Students select policy" ON public.students;
CREATE POLICY "Students select policy" ON public.students
    FOR SELECT TO authenticated
    USING (
        public.is_receptionist() -- Admins and Receptionists
        OR (
            -- Teachers can only view students enrolled in their assigned batches
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.student_batches sb
                JOIN public.batches b ON b.id = sb.batch_id
                WHERE sb.student_id = public.students.id
                  AND b.teacher_id = public.get_teacher_id_for_user()
                  AND sb.status = 'active'
            )
        )
    );

DROP POLICY IF EXISTS "Students write policy" ON public.students;
CREATE POLICY "Students write policy" ON public.students
    FOR ALL TO authenticated
    USING (public.is_receptionist())
    WITH CHECK (public.is_receptionist());

-- ----------------------------------------------------------------------------
-- 4. BATCHES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Batches read policy" ON public.batches;
CREATE POLICY "Batches read policy" ON public.batches
    FOR SELECT TO authenticated
    USING (true); -- Staff can view batches

DROP POLICY IF EXISTS "Batches write policy" ON public.batches;
CREATE POLICY "Batches write policy" ON public.batches
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. STUDENT BATCHES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Student batches read policy" ON public.student_batches;
CREATE POLICY "Student batches read policy" ON public.student_batches
    FOR SELECT TO authenticated
    USING (
        public.is_receptionist()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.batches b 
                WHERE b.id = public.student_batches.batch_id 
                  AND b.teacher_id = public.get_teacher_id_for_user()
            )
        )
    );

DROP POLICY IF EXISTS "Student batches write policy" ON public.student_batches;
CREATE POLICY "Student batches write policy" ON public.student_batches
    FOR ALL TO authenticated
    USING (public.is_receptionist())
    WITH CHECK (public.is_receptionist());

-- ----------------------------------------------------------------------------
-- 6. ATTENDANCE POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Attendance read policy" ON public.attendance;
CREATE POLICY "Attendance read policy" ON public.attendance
    FOR SELECT TO authenticated
    USING (
        public.is_receptionist()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.batches b
                WHERE b.id = public.attendance.batch_id
                  AND b.teacher_id = public.get_teacher_id_for_user()
            )
        )
    );

DROP POLICY IF EXISTS "Attendance write policy" ON public.attendance;
CREATE POLICY "Attendance write policy" ON public.attendance
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.batches b
                WHERE b.id = public.attendance.batch_id
                  AND b.teacher_id = public.get_teacher_id_for_user()
            )
        )
    )
    WITH CHECK (
        public.is_admin()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.batches b
                WHERE b.id = public.attendance.batch_id
                  AND b.teacher_id = public.get_teacher_id_for_user()
            )
        )
    );

-- ----------------------------------------------------------------------------
-- 7. FEE OBLIGATIONS POLICIES (Admins and Receptionists only)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Fee obligations policy" ON public.fee_obligations;
CREATE POLICY "Fee obligations policy" ON public.fee_obligations
    FOR ALL TO authenticated
    USING (public.is_receptionist())
    WITH CHECK (public.is_receptionist());

-- ----------------------------------------------------------------------------
-- 8. FEE PAYMENTS POLICIES (Admins and Receptionists only)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Fee payments read policy" ON public.fee_payments;
CREATE POLICY "Fee payments read policy" ON public.fee_payments
    FOR SELECT TO authenticated
    USING (public.is_receptionist());

DROP POLICY IF EXISTS "Fee payments write policy" ON public.fee_payments;
CREATE POLICY "Fee payments write policy" ON public.fee_payments
    FOR INSERT TO authenticated
    WITH CHECK (public.is_receptionist());

DROP POLICY IF EXISTS "Fee payments update policy" ON public.fee_payments;
CREATE POLICY "Fee payments update policy" ON public.fee_payments
    FOR UPDATE TO authenticated
    USING (public.is_admin() OR public.is_receptionist())
    WITH CHECK (public.is_admin() OR public.is_receptionist());

-- Prevent silent deletions of financial records
DROP POLICY IF EXISTS "Fee payments delete policy" ON public.fee_payments;
CREATE POLICY "Fee payments delete policy" ON public.fee_payments
    FOR DELETE TO authenticated
    USING (false); -- Deletions forbidden; reversals must be used instead

-- ----------------------------------------------------------------------------
-- 9. CLASS SCHEDULES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Class schedules read policy" ON public.class_schedules;
CREATE POLICY "Class schedules read policy" ON public.class_schedules
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Class schedules write policy" ON public.class_schedules;
CREATE POLICY "Class schedules write policy" ON public.class_schedules
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 10. EXAMINATIONS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Examinations read policy" ON public.examinations;
CREATE POLICY "Examinations read policy" ON public.examinations
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Examinations write policy" ON public.examinations;
CREATE POLICY "Examinations write policy" ON public.examinations
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.batches b 
                WHERE b.id = public.examinations.batch_id
                  AND b.teacher_id = public.get_teacher_id_for_user()
            )
        )
    )
    WITH CHECK (
        public.is_admin()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.batches b 
                WHERE b.id = public.examinations.batch_id
                  AND b.teacher_id = public.get_teacher_id_for_user()
            )
        )
    );

-- ----------------------------------------------------------------------------
-- 11. EXAM RESULTS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Exam results read policy" ON public.exam_results;
CREATE POLICY "Exam results read policy" ON public.exam_results
    FOR SELECT TO authenticated
    USING (
        public.is_receptionist()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.examinations e
                JOIN public.batches b ON b.id = e.batch_id
                WHERE e.id = public.exam_results.exam_id
                  AND b.teacher_id = public.get_teacher_id_for_user()
            )
        )
    );

DROP POLICY IF EXISTS "Exam results write policy" ON public.exam_results;
CREATE POLICY "Exam results write policy" ON public.exam_results
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.examinations e
                JOIN public.batches b ON b.id = e.batch_id
                WHERE e.id = public.exam_results.exam_id
                  AND b.teacher_id = public.get_teacher_id_for_user()
            )
        )
    )
    WITH CHECK (
        public.is_admin()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.examinations e
                JOIN public.batches b ON b.id = e.batch_id
                WHERE e.id = public.exam_results.exam_id
                  AND b.teacher_id = public.get_teacher_id_for_user()
            )
        )
    );
