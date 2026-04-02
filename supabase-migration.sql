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
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
    COUNT(*) AS total_students,
    COUNT(*) FILTER (WHERE is_cleared = true) AS cleared,
    COUNT(*) FILTER (WHERE is_cleared = false) AS not_cleared,
    COUNT(*) FILTER (WHERE failed_units >= 15) AS at_risk
FROM students;

-- 4. Create faculty_workload view
CREATE OR REPLACE VIEW faculty_workload AS
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
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert profiles" ON profiles FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete profiles" ON profiles FOR DELETE USING (is_admin());

-- ── students ──
CREATE POLICY "Students can view own record" ON students FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Advisers can view assigned students" ON students FOR SELECT USING (
    is_adviser() AND adviser_id = auth.uid()
);
CREATE POLICY "Admins can manage students" ON students FOR ALL USING (is_admin());

-- ── professors ──
CREATE POLICY "Professors can view own record" ON professors FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can manage professors" ON professors FOR ALL USING (is_admin());

-- ── advisees ──
CREATE POLICY "Advisers can view own advisees" ON advisees FOR SELECT USING (adviser_id = auth.uid());
CREATE POLICY "Students can view own assignment" ON advisees FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins can manage advisees" ON advisees FOR ALL USING (is_admin());

-- ── concerns ──
CREATE POLICY "Students can insert own concerns" ON concerns FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can view own concerns" ON concerns FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Advisers can view assigned concerns" ON concerns FOR SELECT USING (auth.uid() = adviser_id);
CREATE POLICY "Advisers can update assigned concerns" ON concerns FOR UPDATE USING (auth.uid() = adviser_id);
CREATE POLICY "Admins can manage concerns" ON concerns FOR ALL USING (is_admin());

-- ── appointments ──
CREATE POLICY "Students can insert own appointments" ON appointments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can view own appointments" ON appointments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can update own appointments" ON appointments FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Advisers can view assigned appointments" ON appointments FOR SELECT USING (auth.uid() = adviser_id);
CREATE POLICY "Advisers can update assigned appointments" ON appointments FOR UPDATE USING (auth.uid() = adviser_id);
CREATE POLICY "Admins can manage appointments" ON appointments FOR ALL USING (is_admin());

-- ── advising_forms ──
CREATE POLICY "Students can insert own forms" ON advising_forms FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can view own forms" ON advising_forms FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Advisers can view assigned forms" ON advising_forms FOR SELECT USING (auth.uid() = adviser_id);
CREATE POLICY "Advisers can update assigned forms" ON advising_forms FOR UPDATE USING (auth.uid() = adviser_id);
CREATE POLICY "Admins can manage forms" ON advising_forms FOR ALL USING (is_admin());

-- ── academic_records ──
CREATE POLICY "Students can view own records" ON academic_records FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Advisers can view assigned student records" ON academic_records FOR SELECT USING (
    is_adviser() AND student_id IN (SELECT id FROM students WHERE adviser_id = auth.uid())
);
CREATE POLICY "Admins can manage records" ON academic_records FOR ALL USING (is_admin());

-- ── courses (read for all authenticated) ──
CREATE POLICY "Authenticated users can view courses" ON courses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage courses" ON courses FOR ALL USING (is_admin());

-- ── terms (read for all authenticated) ──
CREATE POLICY "Authenticated users can view terms" ON terms FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage terms" ON terms FOR ALL USING (is_admin());

-- ── programs (read for all authenticated) ──
CREATE POLICY "Authenticated users can view programs" ON programs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage programs" ON programs FOR ALL USING (is_admin());

-- ── prerequisites (read for all authenticated) ──
CREATE POLICY "Authenticated users can view prerequisites" ON prerequisites FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage prerequisites" ON prerequisites FOR ALL USING (is_admin());

-- ── study_plans ──
CREATE POLICY "Students can manage own plans" ON study_plans FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Advisers can view assigned plans" ON study_plans FOR SELECT USING (
    is_adviser() AND student_id IN (SELECT id FROM students WHERE adviser_id = auth.uid())
);
CREATE POLICY "Admins can manage plans" ON study_plans FOR ALL USING (is_admin());

-- ── study_plan_courses ──
CREATE POLICY "Students can manage own plan courses" ON study_plan_courses FOR ALL USING (
    plan_id IN (SELECT id FROM study_plans WHERE student_id = auth.uid())
);
CREATE POLICY "Admins can manage plan courses" ON study_plan_courses FOR ALL USING (is_admin());

-- ── program_student_checklists (read for all authenticated) ──
CREATE POLICY "Authenticated users can view checklists" ON program_student_checklists FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage checklists" ON program_student_checklists FOR ALL USING (is_admin());

-- ── clearance_log ──
CREATE POLICY "Admins can manage clearance log" ON clearance_log FOR ALL USING (is_admin());

-- ── email_log ──
CREATE POLICY "Admins can manage email log" ON email_log FOR ALL USING (is_admin());

-- ── notifications ──
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage notifications" ON notifications FOR ALL USING (is_admin());
