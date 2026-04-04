-- ============================================================
-- AdviSync Supabase Migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Add missing columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS cleared_by UUID REFERENCES profiles(id);

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- 3. Create dashboard_stats view
DROP VIEW IF EXISTS dashboard_stats;
CREATE VIEW dashboard_stats AS
SELECT
    COUNT(*) AS total_students,
    COUNT(*) FILTER (WHERE is_cleared = true) AS cleared,
    COUNT(*) FILTER (WHERE is_cleared = false) AS not_cleared,
    COUNT(*) FILTER (WHERE failed_units >= 15) AS at_risk
FROM students;

-- 4. Create faculty_workload view
DROP VIEW IF EXISTS faculty_workload;
CREATE VIEW faculty_workload AS
SELECT
    p.id,
    p.first_name,
    p.last_name,
    pr.department,
    COUNT(DISTINCT s.id) AS total_advisees,
    COUNT(DISTINCT sp.id) FILTER (WHERE sp.status = 'approved') AS plans_reviewed
FROM profiles p
JOIN professors pr ON pr.id = p.id
LEFT JOIN students s ON s.adviser_id = p.id
LEFT JOIN study_plans sp ON sp.student_id = s.id
GROUP BY p.id, p.first_name, p.last_name, pr.department;

-- 5. Create get_email_by_school_id RPC function
CREATE OR REPLACE FUNCTION get_email_by_school_id(p_school_id TEXT)
RETURNS TEXT AS $$
    SELECT email FROM profiles WHERE school_id = p_school_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 6. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_students_adviser ON students(adviser_id);
CREATE INDEX IF NOT EXISTS idx_students_program ON students(program);
CREATE INDEX IF NOT EXISTS idx_concerns_adviser ON concerns(adviser_id);
CREATE INDEX IF NOT EXISTS idx_concerns_student ON concerns(student_id);
CREATE INDEX IF NOT EXISTS idx_appointments_adviser ON appointments(adviser_id);
CREATE INDEX IF NOT EXISTS idx_appointments_student ON appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_advising_forms_adviser ON advising_forms(adviser_id);
CREATE INDEX IF NOT EXISTS idx_advising_forms_student ON advising_forms(student_id);
CREATE INDEX IF NOT EXISTS idx_academic_records_student ON academic_records(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);

-- 7. Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisees ENABLE ROW LEVEL SECURITY;
ALTER TABLE concerns ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE advising_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_student_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: check if current user is adviser
CREATE OR REPLACE FUNCTION is_adviser()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'adviser'
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- ── profiles ──
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles" ON profiles FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles" ON profiles FOR DELETE USING (is_admin());
DROP POLICY IF EXISTS "Advisers can view advisee profiles" ON profiles;
CREATE POLICY "Advisers can view advisee profiles" ON profiles FOR SELECT USING (
    is_adviser() AND (
        id IN (SELECT id FROM students WHERE adviser_id = auth.uid())
        OR id IN (SELECT student_id FROM advisees WHERE adviser_id = auth.uid())
    )
);

-- ── students ──
DROP POLICY IF EXISTS "Students can view own record" ON students;
CREATE POLICY "Students can view own record" ON students FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Advisers can view assigned students" ON students;
CREATE POLICY "Advisers can view assigned students" ON students FOR SELECT USING (
    is_adviser() AND adviser_id = auth.uid()
);
DROP POLICY IF EXISTS "Admins can manage students" ON students;
CREATE POLICY "Admins can manage students" ON students FOR ALL USING (is_admin());

-- ── professors ──
DROP POLICY IF EXISTS "Professors can view own record" ON professors;
CREATE POLICY "Professors can view own record" ON professors FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can manage professors" ON professors;
CREATE POLICY "Admins can manage professors" ON professors FOR ALL USING (is_admin());

-- ── advisees ──
DROP POLICY IF EXISTS "Advisers can view own advisees" ON advisees;
CREATE POLICY "Advisers can view own advisees" ON advisees FOR SELECT USING (adviser_id = auth.uid());
DROP POLICY IF EXISTS "Students can view own assignment" ON advisees;
CREATE POLICY "Students can view own assignment" ON advisees FOR SELECT USING (student_id = auth.uid());
DROP POLICY IF EXISTS "Admins can manage advisees" ON advisees;
CREATE POLICY "Admins can manage advisees" ON advisees FOR ALL USING (is_admin());

-- ── concerns ──
DROP POLICY IF EXISTS "Students can insert own concerns" ON concerns;
CREATE POLICY "Students can insert own concerns" ON concerns FOR INSERT WITH CHECK (auth.uid() = student_id);
DROP POLICY IF EXISTS "Students can view own concerns" ON concerns;
CREATE POLICY "Students can view own concerns" ON concerns FOR SELECT USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Advisers can view assigned concerns" ON concerns;
CREATE POLICY "Advisers can view assigned concerns" ON concerns FOR SELECT USING (auth.uid() = adviser_id);
DROP POLICY IF EXISTS "Advisers can update assigned concerns" ON concerns;
CREATE POLICY "Advisers can update assigned concerns" ON concerns FOR UPDATE USING (auth.uid() = adviser_id);
DROP POLICY IF EXISTS "Admins can manage concerns" ON concerns;
CREATE POLICY "Admins can manage concerns" ON concerns FOR ALL USING (is_admin());

-- ── appointments ──
DROP POLICY IF EXISTS "Students can insert own appointments" ON appointments;
CREATE POLICY "Students can insert own appointments" ON appointments FOR INSERT WITH CHECK (auth.uid() = student_id);
DROP POLICY IF EXISTS "Students can view own appointments" ON appointments;
CREATE POLICY "Students can view own appointments" ON appointments FOR SELECT USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Students can update own appointments" ON appointments;
CREATE POLICY "Students can update own appointments" ON appointments FOR UPDATE USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Advisers can view assigned appointments" ON appointments;
CREATE POLICY "Advisers can view assigned appointments" ON appointments FOR SELECT USING (auth.uid() = adviser_id);
DROP POLICY IF EXISTS "Advisers can update assigned appointments" ON appointments;
CREATE POLICY "Advisers can update assigned appointments" ON appointments FOR UPDATE USING (auth.uid() = adviser_id);
DROP POLICY IF EXISTS "Admins can manage appointments" ON appointments;
CREATE POLICY "Admins can manage appointments" ON appointments FOR ALL USING (is_admin());

-- ── advising_forms ──
DROP POLICY IF EXISTS "Students can insert own forms" ON advising_forms;
CREATE POLICY "Students can insert own forms" ON advising_forms FOR INSERT WITH CHECK (auth.uid() = student_id);
DROP POLICY IF EXISTS "Students can view own forms" ON advising_forms;
CREATE POLICY "Students can view own forms" ON advising_forms FOR SELECT USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Advisers can view assigned forms" ON advising_forms;
CREATE POLICY "Advisers can view assigned forms" ON advising_forms FOR SELECT USING (auth.uid() = adviser_id);
DROP POLICY IF EXISTS "Advisers can update assigned forms" ON advising_forms;
CREATE POLICY "Advisers can update assigned forms" ON advising_forms FOR UPDATE USING (auth.uid() = adviser_id);
DROP POLICY IF EXISTS "Admins can manage forms" ON advising_forms;
CREATE POLICY "Admins can manage forms" ON advising_forms FOR ALL USING (is_admin());

-- ── academic_records ──
DROP POLICY IF EXISTS "Students can view own records" ON academic_records;
CREATE POLICY "Students can view own records" ON academic_records FOR SELECT USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Advisers can view assigned student records" ON academic_records;
CREATE POLICY "Advisers can view assigned student records" ON academic_records FOR SELECT USING (
    is_adviser() AND student_id IN (SELECT id FROM students WHERE adviser_id = auth.uid())
);
DROP POLICY IF EXISTS "Admins can manage records" ON academic_records;
CREATE POLICY "Admins can manage records" ON academic_records FOR ALL USING (is_admin());

-- ── courses (read for all authenticated) ──
DROP POLICY IF EXISTS "Authenticated users can view courses" ON courses;
CREATE POLICY "Authenticated users can view courses" ON courses FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
CREATE POLICY "Admins can manage courses" ON courses FOR ALL USING (is_admin());

-- ── terms (read for all authenticated) ──
DROP POLICY IF EXISTS "Authenticated users can view terms" ON terms;
CREATE POLICY "Authenticated users can view terms" ON terms FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admins can manage terms" ON terms;
CREATE POLICY "Admins can manage terms" ON terms FOR ALL USING (is_admin());

-- ── programs (read for all authenticated) ──
DROP POLICY IF EXISTS "Authenticated users can view programs" ON programs;
CREATE POLICY "Authenticated users can view programs" ON programs FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admins can manage programs" ON programs;
CREATE POLICY "Admins can manage programs" ON programs FOR ALL USING (is_admin());

-- ── prerequisites (read for all authenticated) ──
DROP POLICY IF EXISTS "Authenticated users can view prerequisites" ON prerequisites;
CREATE POLICY "Authenticated users can view prerequisites" ON prerequisites FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admins can manage prerequisites" ON prerequisites;
CREATE POLICY "Admins can manage prerequisites" ON prerequisites FOR ALL USING (is_admin());

-- ── study_plans ──
DROP POLICY IF EXISTS "Students can manage own plans" ON study_plans;
CREATE POLICY "Students can manage own plans" ON study_plans FOR ALL USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Advisers can view assigned plans" ON study_plans;
CREATE POLICY "Advisers can view assigned plans" ON study_plans FOR SELECT USING (
    is_adviser() AND student_id IN (SELECT id FROM students WHERE adviser_id = auth.uid())
);
DROP POLICY IF EXISTS "Admins can manage plans" ON study_plans;
CREATE POLICY "Admins can manage plans" ON study_plans FOR ALL USING (is_admin());

-- ── study_plan_courses ──
DROP POLICY IF EXISTS "Students can manage own plan courses" ON study_plan_courses;
CREATE POLICY "Students can manage own plan courses" ON study_plan_courses FOR ALL USING (
    plan_id IN (SELECT id FROM study_plans WHERE student_id = auth.uid())
);
DROP POLICY IF EXISTS "Admins can manage plan courses" ON study_plan_courses;
CREATE POLICY "Admins can manage plan courses" ON study_plan_courses FOR ALL USING (is_admin());

-- ── program_student_checklists (read for all authenticated) ──
DROP POLICY IF EXISTS "Authenticated users can view checklists" ON program_student_checklists;
CREATE POLICY "Authenticated users can view checklists" ON program_student_checklists FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admins can manage checklists" ON program_student_checklists;
CREATE POLICY "Admins can manage checklists" ON program_student_checklists FOR ALL USING (is_admin());

-- ── clearance_log ──
DROP POLICY IF EXISTS "Admins can manage clearance log" ON clearance_log;
CREATE POLICY "Admins can manage clearance log" ON clearance_log FOR ALL USING (is_admin());

-- ── email_log ──
DROP POLICY IF EXISTS "Admins can manage email log" ON email_log;
CREATE POLICY "Admins can manage email log" ON email_log FOR ALL USING (is_admin());

-- ── notifications ──
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can manage notifications" ON notifications;
CREATE POLICY "Admins can manage notifications" ON notifications FOR ALL USING (is_admin());

-- ============================================================
-- Availability Slots (for adviser-set scheduling)
-- ============================================================
CREATE TABLE IF NOT EXISTS availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adviser_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_type TEXT NOT NULL DEFAULT 'zoom' CHECK (slot_type IN ('zoom', 'in-person')),
    is_booked BOOLEAN DEFAULT false,
    booked_by UUID REFERENCES profiles(id),
    appointment_id UUID REFERENCES appointments(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_availability_slots_adviser ON availability_slots(adviser_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_availability_slots_date ON availability_slots(slot_date, is_booked);

ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- Advisers can manage their own slots
DROP POLICY IF EXISTS "Advisers can insert own slots" ON availability_slots;
CREATE POLICY "Advisers can insert own slots" ON availability_slots FOR INSERT WITH CHECK (auth.uid() = adviser_id);
DROP POLICY IF EXISTS "Advisers can view own slots" ON availability_slots;
CREATE POLICY "Advisers can view own slots" ON availability_slots FOR SELECT USING (auth.uid() = adviser_id);
DROP POLICY IF EXISTS "Advisers can update own slots" ON availability_slots;
CREATE POLICY "Advisers can update own slots" ON availability_slots FOR UPDATE USING (auth.uid() = adviser_id);
DROP POLICY IF EXISTS "Advisers can delete own slots" ON availability_slots;
CREATE POLICY "Advisers can delete own slots" ON availability_slots FOR DELETE USING (auth.uid() = adviser_id);

-- Students can view their assigned adviser's available slots
DROP POLICY IF EXISTS "Students can view adviser slots" ON availability_slots;
CREATE POLICY "Students can view adviser slots" ON availability_slots FOR SELECT USING (
    adviser_id IN (SELECT adviser_id FROM students WHERE id = auth.uid())
);

-- Students can update slots when booking (set is_booked, booked_by)
DROP POLICY IF EXISTS "Students can book adviser slots" ON availability_slots;
CREATE POLICY "Students can book adviser slots" ON availability_slots FOR UPDATE USING (
    adviser_id IN (SELECT adviser_id FROM students WHERE id = auth.uid())
) WITH CHECK (
    adviser_id IN (SELECT adviser_id FROM students WHERE id = auth.uid())
);

-- Admins can manage all slots
DROP POLICY IF EXISTS "Admins can manage availability slots" ON availability_slots;
CREATE POLICY "Admins can manage availability slots" ON availability_slots FOR ALL USING (is_admin());

-- ═══════════════════════════════════════════════════════════════════
-- 10. Update concerns status constraint + Concern Replies Table
-- ═══════════════════════════════════════════════════════════════════

-- Update status check to include 'active' and 'resolved'
ALTER TABLE concerns DROP CONSTRAINT IF EXISTS concerns_status_check;
ALTER TABLE concerns ADD CONSTRAINT concerns_status_check
    CHECK (status IN ('new', 'read', 'replied', 'active', 'resolved'));

CREATE TABLE IF NOT EXISTS concern_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concern_id UUID NOT NULL REFERENCES concerns(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id),
    sender_role TEXT NOT NULL CHECK (sender_role IN ('student', 'adviser')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concern_replies_concern ON concern_replies(concern_id);
CREATE INDEX IF NOT EXISTS idx_concern_replies_created ON concern_replies(concern_id, created_at);

ALTER TABLE concern_replies ENABLE ROW LEVEL SECURITY;

-- Students can insert replies on their own concerns
DROP POLICY IF EXISTS "Students can insert replies on own concerns" ON concern_replies;
CREATE POLICY "Students can insert replies on own concerns" ON concern_replies
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (SELECT 1 FROM concerns WHERE concerns.id = concern_id AND concerns.student_id = auth.uid())
    );

-- Students can view replies on their own concerns
DROP POLICY IF EXISTS "Students can view replies on own concerns" ON concern_replies;
CREATE POLICY "Students can view replies on own concerns" ON concern_replies
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM concerns WHERE concerns.id = concern_id AND concerns.student_id = auth.uid())
    );

-- Advisers can insert replies on their assigned concerns
DROP POLICY IF EXISTS "Advisers can insert replies on assigned concerns" ON concern_replies;
CREATE POLICY "Advisers can insert replies on assigned concerns" ON concern_replies
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (SELECT 1 FROM concerns WHERE concerns.id = concern_id AND concerns.adviser_id = auth.uid())
    );

-- Advisers can view replies on their assigned concerns
DROP POLICY IF EXISTS "Advisers can view replies on assigned concerns" ON concern_replies;
CREATE POLICY "Advisers can view replies on assigned concerns" ON concern_replies
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM concerns WHERE concerns.id = concern_id AND concerns.adviser_id = auth.uid())
    );

-- Admins can manage all replies
DROP POLICY IF EXISTS "Admins can manage concern replies" ON concern_replies;
CREATE POLICY "Admins can manage concern replies" ON concern_replies FOR ALL USING (is_admin());

-- Allow students to update their own concerns (to mark as resolved)
DROP POLICY IF EXISTS "Students can update own concerns" ON concerns;
CREATE POLICY "Students can update own concerns" ON concerns FOR UPDATE USING (auth.uid() = student_id);
