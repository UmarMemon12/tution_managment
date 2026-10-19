-- ============================================================================
-- Tuition Management System - Migration 003: Database Functions & Triggers
-- ============================================================================

-- 1. AUTOMATIC UPDATED_AT TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Apply updated_at triggers to all tables
DO $$ 
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('profiles', 'teachers', 'students', 'batches', 'student_batches', 
                             'attendance', 'fee_obligations', 'fee_payments', 'class_schedules', 
                             'examinations', 'exam_results')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_%I_updated_at ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE TRIGGER tr_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();', tbl, tbl);
    END LOOP;
END $$;

-- 2. AUTOMATIC PROFILE CREATION ON USER SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    assigned_role TEXT;
    user_name TEXT;
BEGIN
    -- Determine role from raw_user_meta_data or default to 'receptionist'
    assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'receptionist');
    
    -- Ensure role is valid
    IF assigned_role NOT IN ('admin', 'teacher', 'receptionist') THEN
        assigned_role := 'receptionist';
    END IF;

    -- Extract full name
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, user_name, assigned_role)
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. FINANCIAL TRANSACTION: RECORD PAYMENT SAFELY
CREATE OR REPLACE FUNCTION public.record_fee_payment(
    p_obligation_id UUID,
    p_student_id UUID,
    p_amount_paid NUMERIC(12, 2),
    p_payment_method TEXT,
    p_receipt_number TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment_id UUID;
    v_total_paid NUMERIC(12, 2);
    v_amount_due NUMERIC(12, 2);
    v_new_status TEXT;
    v_result JSONB;
BEGIN
    -- Authorization check
    IF NOT public.is_receptionist() THEN
        RAISE EXCEPTION 'Access denied. Only authorized staff may record fee payments.';
    END IF;

    -- Validate payment amount
    IF p_amount_paid <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero.';
    END IF;

    -- Verify obligation exists and belongs to student
    IF p_obligation_id IS NOT NULL THEN
        SELECT amount_due INTO v_amount_due
        FROM public.fee_obligations
        WHERE id = p_obligation_id AND student_id = p_student_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Selected fee obligation does not match the student record.';
        END IF;
    END IF;

    -- Insert payment record
    INSERT INTO public.fee_payments (
        receipt_number,
        obligation_id,
        student_id,
        amount_paid,
        payment_date,
        payment_method,
        recorded_by,
        status,
        notes
    ) VALUES (
        p_receipt_number,
        p_obligation_id,
        p_student_id,
        p_amount_paid,
        timezone('utc'::text, now()),
        p_payment_method,
        auth.uid(),
        'valid',
        p_notes
    ) RETURNING id INTO v_payment_id;

    -- Update fee obligation status if obligation_id is present
    IF p_obligation_id IS NOT NULL THEN
        SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_paid
        FROM public.fee_payments
        WHERE obligation_id = p_obligation_id AND status = 'valid';

        IF v_total_paid >= v_amount_due THEN
            v_new_status := 'paid';
        ELSIF v_total_paid > 0 THEN
            v_new_status := 'partially_paid';
        ELSE
            v_new_status := 'unpaid';
        END IF;

        UPDATE public.fee_obligations
        SET status = v_new_status
        WHERE id = p_obligation_id;
    END IF;

    SELECT jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'receipt_number', p_receipt_number,
        'amount_paid', p_amount_paid,
        'obligation_status', v_new_status
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 4. FINANCIAL TRANSACTION: REVERSE PAYMENT WITH AUDIT TRAIL
CREATE OR REPLACE FUNCTION public.reverse_fee_payment(
    p_payment_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_obligation_id UUID;
    v_amount_due NUMERIC(12, 2);
    v_total_paid NUMERIC(12, 2);
    v_new_status TEXT;
    v_current_status TEXT;
BEGIN
    -- Authorization check
    IF NOT public.is_receptionist() THEN
        RAISE EXCEPTION 'Access denied. Only authorized staff may reverse fee payments.';
    END IF;

    IF TRIM(COALESCE(p_reason, '')) = '' THEN
        RAISE EXCEPTION 'A valid reversal reason must be provided.';
    END IF;

    -- Retrieve existing payment
    SELECT status, obligation_id INTO v_current_status, v_obligation_id
    FROM public.fee_payments
    WHERE id = p_payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment record not found.';
    END IF;

    IF v_current_status = 'reversed' THEN
        RAISE EXCEPTION 'This payment has already been reversed.';
    END IF;

    -- Mark payment as reversed
    UPDATE public.fee_payments
    SET status = 'reversed',
        reversal_reason = p_reason,
        reversed_at = timezone('utc'::text, now()),
        reversed_by = auth.uid()
    WHERE id = p_payment_id;

    -- Recalculate obligation status
    IF v_obligation_id IS NOT NULL THEN
        SELECT amount_due INTO v_amount_due
        FROM public.fee_obligations
        WHERE id = v_obligation_id;

        SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_paid
        FROM public.fee_payments
        WHERE obligation_id = v_obligation_id AND status = 'valid';

        IF v_total_paid >= v_amount_due THEN
            v_new_status := 'paid';
        ELSIF v_total_paid > 0 THEN
            v_new_status := 'partially_paid';
        ELSE
            v_new_status := 'unpaid';
        END IF;

        UPDATE public.fee_obligations
        SET status = v_new_status
        WHERE id = v_obligation_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'new_obligation_status', v_new_status
    );
END;
$$;

-- 5. SCHEDULE CONFLICT DETECTION
CREATE OR REPLACE FUNCTION public.check_schedule_conflict(
    p_batch_id UUID,
    p_teacher_id UUID,
    p_day_of_week TEXT,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_schedule_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_conflict_record RECORD;
BEGIN
    -- Check for batch conflict: Batch is already scheduled in this time window
    SELECT cs.id, b.batch_name, cs.day_of_week, cs.start_time, cs.end_time
    INTO v_conflict_record
    FROM public.class_schedules cs
    JOIN public.batches b ON b.id = cs.batch_id
    WHERE cs.batch_id = p_batch_id
      AND cs.day_of_week = p_day_of_week
      AND (cs.start_time < p_end_time AND cs.end_time > p_start_time)
      AND (p_exclude_schedule_id IS NULL OR cs.id != p_exclude_schedule_id)
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'has_conflict', true,
            'type', 'batch',
            'message', format('Batch "%s" is already scheduled on %s from %s to %s',
                              v_conflict_record.batch_name, v_conflict_record.day_of_week,
                              v_conflict_record.start_time, v_conflict_record.end_time)
        );
    END IF;

    -- Check for teacher conflict: Teacher is already scheduled in this time window
    IF p_teacher_id IS NOT NULL THEN
        SELECT cs.id, t.full_name, b.batch_name, cs.day_of_week, cs.start_time, cs.end_time
        INTO v_conflict_record
        FROM public.class_schedules cs
        JOIN public.teachers t ON t.id = cs.teacher_id
        JOIN public.batches b ON b.id = cs.batch_id
        WHERE cs.teacher_id = p_teacher_id
          AND cs.day_of_week = p_day_of_week
          AND (cs.start_time < p_end_time AND cs.end_time > p_start_time)
          AND (p_exclude_schedule_id IS NULL OR cs.id != p_exclude_schedule_id)
        LIMIT 1;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'has_conflict', true,
                'type', 'teacher',
                'message', format('Teacher "%s" is already scheduled for batch "%s" on %s from %s to %s',
                                  v_conflict_record.full_name, v_conflict_record.batch_name,
                                  v_conflict_record.day_of_week, v_conflict_record.start_time,
                                  v_conflict_record.end_time)
            );
        END IF;
    END IF;

    RETURN jsonb_build_object('has_conflict', false);
END;
$$;

-- 6. DASHBOARD SUMMARY STATS RPC
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_students BIGINT;
    v_total_teachers BIGINT;
    v_total_batches BIGINT;
    v_present_today BIGINT;
    v_absent_today BIGINT;
    v_fees_collected_month NUMERIC(12, 2);
    v_total_outstanding NUMERIC(12, 2);
    v_first_day_of_month TIMESTAMPTZ;
BEGIN
    v_first_day_of_month := date_trunc('month', now());

    -- Student, teacher, batch counts
    SELECT count(*) INTO v_total_students FROM public.students WHERE status != 'archived';
    SELECT count(*) INTO v_total_teachers FROM public.teachers WHERE status = 'active';
    SELECT count(*) INTO v_total_batches FROM public.batches WHERE status = 'active';

    -- Today's attendance
    SELECT count(*) INTO v_present_today 
    FROM public.attendance 
    WHERE date = CURRENT_DATE AND status IN ('present', 'late');

    SELECT count(*) INTO v_absent_today 
    FROM public.attendance 
    WHERE date = CURRENT_DATE AND status = 'absent';

    -- Fees collected this month
    SELECT COALESCE(SUM(amount_paid), 0.00) INTO v_fees_collected_month
    FROM public.fee_payments
    WHERE payment_date >= v_first_day_of_month AND status = 'valid';

    -- Outstanding fees: Total due on obligations minus sum of valid payments
    SELECT COALESCE(
        (SELECT COALESCE(SUM(amount_due), 0.00) FROM public.fee_obligations WHERE status != 'waived')
        -
        (SELECT COALESCE(SUM(amount_paid), 0.00) FROM public.fee_payments WHERE status = 'valid'),
        0.00
    ) INTO v_total_outstanding;

    IF v_total_outstanding < 0 THEN
        v_total_outstanding := 0.00;
    END IF;

    RETURN jsonb_build_object(
        'total_students', v_total_students,
        'total_teachers', v_total_teachers,
        'total_batches', v_total_batches,
        'present_today', v_present_today,
        'absent_today', v_absent_today,
        'fees_collected_month', v_fees_collected_month,
        'total_outstanding', v_total_outstanding
    );
END;
$$;
