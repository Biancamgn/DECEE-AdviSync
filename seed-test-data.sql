-- ============================================================
-- AdviSync Test Data Seed v3
-- Run in Supabase SQL Editor AFTER supabase-migration.sql
-- All passwords: test12345
-- ============================================================

-- ═══════════════════════════════════════════════════════════════════
-- 0. CLEANUP — wipe ALL test-related rows (by UUID + by school_id/email)
--    to guarantee no duplicates on repeated runs
-- ═══════════════════════════════════════════════════════════════════
DO $$
DECLARE
    _ids uuid[] := ARRAY[
        'a0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000010',
        'a0000000-0000-0000-0000-000000000105',
        'ebf91336-366d-4464-86cf-df4dbdf4b42f',
        'c5b52365-5aa2-4479-b025-27c1db95f3e8',
        '07a507f1-418d-4efd-a35f-bee73cd2601d',
        'f0095010-898c-4f7f-87c0-febbcf52a63e',
        '9c511996-4509-47a1-9f10-e9d3e328e926'
    ];
    -- Also catch old seed UUIDs and manual signups
    _emails text[] := ARRAY[
        'renjovil_joseph_lascano@dlsu.edu.ph','christian_alado@dlsu.edu.ph',
        'erin_quiazon@dlsu.edu.ph','bianca_manganaan@dlsu.edu.ph',
        'giorgia_lubangco@dlsu.edu.ph','brendan_millares@dlsu.edu.ph',
        'vito_gandeza@dlsu.edu.ph','andrei_gyles_lim@dlsu.edu.ph',
        'admin@dlsu.edu.ph','c.alado@dlsu.edu.ph','v.gandeza@dlsu.edu.ph',
        'ag.lim@dlsu.edu.ph','e.quiazon@dlsu.edu.ph','bl.manganaan@dlsu.edu.ph',
        'g.lubangco@dlsu.edu.ph','bl.millares@dlsu.edu.ph'
    ];
    _school_ids text[] := ARRAY[
        'admin001','23456789','22318531',
        '12311588','12567890','12345678','12456789','12234567',
        'ADMIN001','2111001','2111002',
        '12210001','12310002','12210003','12510004','12110005'
    ];
    _all_ids uuid[];
BEGIN
    SELECT array_agg(DISTINCT id) INTO _all_ids
    FROM profiles
    WHERE id = ANY(_ids)
       OR school_id = ANY(_school_ids)
       OR email = ANY(_emails);

    _all_ids := COALESCE(_all_ids, ARRAY[]::uuid[]) || _ids;
    -- Also add old seed UUIDs that might linger
    _all_ids := _all_ids || ARRAY[
        'a0000000-0000-0000-0000-000000000020',
        'a0000000-0000-0000-0000-000000000101',
        'a0000000-0000-0000-0000-000000000102',
        'a0000000-0000-0000-0000-000000000103',
        'a0000000-0000-0000-0000-000000000104'
    ]::uuid[];
    SELECT array_agg(DISTINCT u) INTO _all_ids FROM unnest(_all_ids) u;

    -- ── Child tables (deepest first) ──
    DELETE FROM concern_replies    WHERE concern_id IN (SELECT id FROM concerns WHERE student_id = ANY(_all_ids) OR adviser_id = ANY(_all_ids));
    DELETE FROM concerns           WHERE student_id = ANY(_all_ids) OR adviser_id = ANY(_all_ids);
    DELETE FROM study_plan_courses WHERE plan_id IN (SELECT id FROM study_plans WHERE student_id = ANY(_all_ids));
    DELETE FROM study_plans        WHERE student_id = ANY(_all_ids);
    DELETE FROM advising_forms     WHERE student_id = ANY(_all_ids) OR adviser_id = ANY(_all_ids);
    DELETE FROM availability_slots WHERE adviser_id = ANY(_all_ids);
    DELETE FROM appointments       WHERE student_id = ANY(_all_ids) OR adviser_id = ANY(_all_ids);
    DELETE FROM academic_records   WHERE student_id = ANY(_all_ids);
    DELETE FROM notifications      WHERE user_id = ANY(_all_ids);
    DELETE FROM advisees           WHERE student_id = ANY(_all_ids) OR adviser_id = ANY(_all_ids);

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='email_log') THEN
        EXECUTE 'DELETE FROM email_log WHERE sender_id = ANY($1) OR recipient_id = ANY($1)' USING _all_ids;
    END IF;

    DELETE FROM courses WHERE id::text LIKE 'c0000000-%';

    DELETE FROM students    WHERE id = ANY(_all_ids);
    DELETE FROM professors  WHERE id = ANY(_all_ids);
    DELETE FROM profiles    WHERE id = ANY(_all_ids);

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
        EXECUTE 'DELETE FROM public.users WHERE id = ANY($1) OR id_number = ANY($2) OR email = ANY($3)'
        USING _all_ids, _school_ids, _emails;
    END IF;

    DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = ANY(_all_ids));
    DELETE FROM auth.sessions      WHERE user_id = ANY(_all_ids);
    DELETE FROM auth.identities    WHERE user_id = ANY(_all_ids);
    DELETE FROM auth.users         WHERE id = ANY(_all_ids) OR email = ANY(_emails);

    RAISE NOTICE 'Cleanup complete — purged % user IDs', array_length(_all_ids, 1);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 1. AUTH USERS (password: test12345)
-- UUIDs: real Supabase UUIDs for manually-created users, fixed for others
-- ═══════════════════════════════════════════════════════════════════

-- Matches GoTrue's internal user creation exactly.
INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change_token_current,
    email_change, email_change_confirm_status,
    phone_change, phone_change_token,
    reauthentication_token,
    raw_app_meta_data, raw_user_meta_data,
    is_sso_user, is_anonymous
) VALUES
-- Admin: Renjovil Joseph Lascano
('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','renjovil_joseph_lascano@dlsu.edu.ph',crypt('test12345',gen_salt('bf')),now(),now(),now(),'','','','','',0,'','','','{"provider":"email","providers":["email"]}','{"email_verified":true}',false,false),
-- Adviser 1: Erin M. Quiazon
('ebf91336-366d-4464-86cf-df4dbdf4b42f','00000000-0000-0000-0000-000000000000','authenticated','authenticated','erin_quiazon@dlsu.edu.ph',crypt('test12345',gen_salt('bf')),now(),now(),now(),'','','','','',0,'','','','{"provider":"email","providers":["email"]}','{"email_verified":true}',false,false),
-- Adviser 2: Christian John Alado
('a0000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000000','authenticated','authenticated','christian_alado@dlsu.edu.ph',crypt('test12345',gen_salt('bf')),now(),now(),now(),'','','','','',0,'','','','{"provider":"email","providers":["email"]}','{"email_verified":true}',false,false),
-- Student 1: Bianca Louise V. Manganaan (CpE 3rd yr, 6 failed units)
('c5b52365-5aa2-4479-b025-27c1db95f3e8','00000000-0000-0000-0000-000000000000','authenticated','authenticated','bianca_manganaan@dlsu.edu.ph',crypt('test12345',gen_salt('bf')),now(),now(),now(),'','','','','',0,'','','','{"provider":"email","providers":["email"]}','{"email_verified":true}',false,false),
-- Student 2: Giorgia Lubangco (CpE 1st yr)
('07a507f1-418d-4efd-a35f-bee73cd2601d','00000000-0000-0000-0000-000000000000','authenticated','authenticated','giorgia_lubangco@dlsu.edu.ph',crypt('test12345',gen_salt('bf')),now(),now(),now(),'','','','','',0,'','','','{"provider":"email","providers":["email"]}','{"email_verified":true}',false,false),
-- Student 3: Brendan Lou S. Millares (ECE 3rd yr)
('a0000000-0000-0000-0000-000000000105','00000000-0000-0000-0000-000000000000','authenticated','authenticated','brendan_millares@dlsu.edu.ph',crypt('test12345',gen_salt('bf')),now(),now(),now(),'','','','','',0,'','','','{"provider":"email","providers":["email"]}','{"email_verified":true}',false,false),
-- Student 4: Vito Gandeza (ECE 2nd yr)
('f0095010-898c-4f7f-87c0-febbcf52a63e','00000000-0000-0000-0000-000000000000','authenticated','authenticated','vito_gandeza@dlsu.edu.ph',crypt('test12345',gen_salt('bf')),now(),now(),now(),'','','','','',0,'','','','{"provider":"email","providers":["email"]}','{"email_verified":true}',false,false),
-- Student 5: Andrei Gyles S. Lim (ECE 4th yr)
('9c511996-4509-47a1-9f10-e9d3e328e926','00000000-0000-0000-0000-000000000000','authenticated','authenticated','andrei_gyles_lim@dlsu.edu.ph',crypt('test12345',gen_salt('bf')),now(),now(),now(),'','','','','',0,'','','','{"provider":"email","providers":["email"]}','{"email_verified":true}',false,false);

-- If public.users exists (auth trigger mirror), populate it too
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
        EXECUTE '
        INSERT INTO public.users (id, id_number, full_name, email, role, program, failed_units, current_term, is_cleared) VALUES
            (''a0000000-0000-0000-0000-000000000001'', ''admin001'',  ''Renjovil Joseph Lascano'',   ''renjovil_joseph_lascano@dlsu.edu.ph'', ''admin'',   NULL,      0, 1, false),
            (''ebf91336-366d-4464-86cf-df4dbdf4b42f'', ''22318531'',  ''Erin Quiazon'',              ''erin_quiazon@dlsu.edu.ph'',            ''adviser'', NULL,      0, 1, false),
            (''a0000000-0000-0000-0000-000000000010'', ''23456789'',  ''Christian John Alado'',      ''christian_alado@dlsu.edu.ph'',         ''adviser'', NULL,      0, 1, false),
            (''c5b52365-5aa2-4479-b025-27c1db95f3e8'', ''12311588'',  ''Bianca Louise Manganaan'',   ''bianca_manganaan@dlsu.edu.ph'',        ''student'', ''BSCpE'', 6, 7, false),
            (''07a507f1-418d-4efd-a35f-bee73cd2601d'', ''12567890'',  ''Giorgia Lubangco'',          ''giorgia_lubangco@dlsu.edu.ph'',        ''student'', ''BSCpE'', 0, 1, false),
            (''a0000000-0000-0000-0000-000000000105'', ''12345678'',  ''Brendan Lou Millares'',      ''brendan_millares@dlsu.edu.ph'',        ''student'', ''BSECE'', 0, 7, false),
            (''f0095010-898c-4f7f-87c0-febbcf52a63e'', ''12456789'',  ''Vito Gandeza'',              ''vito_gandeza@dlsu.edu.ph'',            ''student'', ''BSECE'', 0, 4, false),
            (''9c511996-4509-47a1-9f10-e9d3e328e926'', ''12234567'',  ''Andrei Gyles Lim'',          ''andrei_gyles_lim@dlsu.edu.ph'',        ''student'', ''BSECE'', 0, 10, true)
        ON CONFLICT (id) DO NOTHING';
    END IF;
END;
$$;

INSERT INTO auth.identities (id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at) VALUES
('a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',jsonb_build_object('sub','a0000000-0000-0000-0000-000000000001','email','renjovil_joseph_lascano@dlsu.edu.ph','email_verified',true,'phone_verified',false),'email',now(),now(),now()),
('ebf91336-366d-4464-86cf-df4dbdf4b42f','ebf91336-366d-4464-86cf-df4dbdf4b42f','ebf91336-366d-4464-86cf-df4dbdf4b42f',jsonb_build_object('sub','ebf91336-366d-4464-86cf-df4dbdf4b42f','email','erin_quiazon@dlsu.edu.ph','email_verified',true,'phone_verified',false),'email',now(),now(),now()),
('a0000000-0000-0000-0000-000000000010','a0000000-0000-0000-0000-000000000010','a0000000-0000-0000-0000-000000000010',jsonb_build_object('sub','a0000000-0000-0000-0000-000000000010','email','christian_alado@dlsu.edu.ph','email_verified',true,'phone_verified',false),'email',now(),now(),now()),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c5b52365-5aa2-4479-b025-27c1db95f3e8','c5b52365-5aa2-4479-b025-27c1db95f3e8',jsonb_build_object('sub','c5b52365-5aa2-4479-b025-27c1db95f3e8','email','bianca_manganaan@dlsu.edu.ph','email_verified',true,'phone_verified',false),'email',now(),now(),now()),
('07a507f1-418d-4efd-a35f-bee73cd2601d','07a507f1-418d-4efd-a35f-bee73cd2601d','07a507f1-418d-4efd-a35f-bee73cd2601d',jsonb_build_object('sub','07a507f1-418d-4efd-a35f-bee73cd2601d','email','giorgia_lubangco@dlsu.edu.ph','email_verified',true,'phone_verified',false),'email',now(),now(),now()),
('a0000000-0000-0000-0000-000000000105','a0000000-0000-0000-0000-000000000105','a0000000-0000-0000-0000-000000000105',jsonb_build_object('sub','a0000000-0000-0000-0000-000000000105','email','brendan_millares@dlsu.edu.ph','email_verified',true,'phone_verified',false),'email',now(),now(),now()),
('f0095010-898c-4f7f-87c0-febbcf52a63e','f0095010-898c-4f7f-87c0-febbcf52a63e','f0095010-898c-4f7f-87c0-febbcf52a63e',jsonb_build_object('sub','f0095010-898c-4f7f-87c0-febbcf52a63e','email','vito_gandeza@dlsu.edu.ph','email_verified',true,'phone_verified',false),'email',now(),now(),now()),
('9c511996-4509-47a1-9f10-e9d3e328e926','9c511996-4509-47a1-9f10-e9d3e328e926','9c511996-4509-47a1-9f10-e9d3e328e926',jsonb_build_object('sub','9c511996-4509-47a1-9f10-e9d3e328e926','email','andrei_gyles_lim@dlsu.edu.ph','email_verified',true,'phone_verified',false),'email',now(),now(),now())
ON CONFLICT (id) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = now();


-- ═══════════════════════════════════════════════════════════════════
-- 2. PROFILES
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO profiles (id, email, first_name, last_name, school_id, role, status) VALUES
('a0000000-0000-0000-0000-000000000001', 'renjovil_joseph_lascano@dlsu.edu.ph', 'Renjovil Joseph', 'Lascano',    'admin001',  'admin',   'active'),
('ebf91336-366d-4464-86cf-df4dbdf4b42f', 'erin_quiazon@dlsu.edu.ph',            'Erin',            'Quiazon',    '22318531',  'adviser', 'active'),
('a0000000-0000-0000-0000-000000000010', 'christian_alado@dlsu.edu.ph',          'Christian John',  'Alado',      '23456789',  'adviser', 'active'),
('c5b52365-5aa2-4479-b025-27c1db95f3e8', 'bianca_manganaan@dlsu.edu.ph',        'Bianca Louise',   'Manganaan',  '12311588',  'student', 'active'),
('07a507f1-418d-4efd-a35f-bee73cd2601d', 'giorgia_lubangco@dlsu.edu.ph',        'Giorgia',         'Lubangco',   '12567890',  'student', 'active'),
('a0000000-0000-0000-0000-000000000105', 'brendan_millares@dlsu.edu.ph',        'Brendan Lou',     'Millares',   '12345678',  'student', 'active'),
('f0095010-898c-4f7f-87c0-febbcf52a63e', 'vito_gandeza@dlsu.edu.ph',           'Vito',            'Gandeza',    '12456789',  'student', 'active'),
('9c511996-4509-47a1-9f10-e9d3e328e926', 'andrei_gyles_lim@dlsu.edu.ph',       'Andrei Gyles',    'Lim',        '12234567',  'student', 'active')
ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, school_id=EXCLUDED.school_id, role=EXCLUDED.role, status=EXCLUDED.status;


-- ═══════════════════════════════════════════════════════════════════
-- 3. PROFESSORS (advisers)
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO professors (id, department, specialization, office_location, phone_number) VALUES
('ebf91336-366d-4464-86cf-df4dbdf4b42f', 'DECEE', 'Electronics Engineering', 'Gokongwei G302', '09179876543'),
('a0000000-0000-0000-0000-000000000010', 'DECEE', 'Computer Engineering',    'Gokongwei G301', '09171234567')
ON CONFLICT (id) DO UPDATE SET department=EXCLUDED.department, specialization=EXCLUDED.specialization, office_location=EXCLUDED.office_location;


-- ═══════════════════════════════════════════════════════════════════
-- 4. STUDENTS
-- Erin advises: Bianca(CpE Y3), Giorgia(CpE Y1), Brendan(ECE Y3)
-- Alado advises: Vito(ECE Y2), Andrei(ECE Y4)
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO students (id, program, year_level, adviser_id, is_cleared, failed_units) VALUES
('c5b52365-5aa2-4479-b025-27c1db95f3e8', 'BSCpE', 3, 'ebf91336-366d-4464-86cf-df4dbdf4b42f', false, 6),
('07a507f1-418d-4efd-a35f-bee73cd2601d', 'BSCpE', 1, 'ebf91336-366d-4464-86cf-df4dbdf4b42f', false, 0),
('a0000000-0000-0000-0000-000000000105', 'BSECE', 3, 'ebf91336-366d-4464-86cf-df4dbdf4b42f', false, 0),
('f0095010-898c-4f7f-87c0-febbcf52a63e', 'BSECE', 2, 'a0000000-0000-0000-0000-000000000010', false, 0),
('9c511996-4509-47a1-9f10-e9d3e328e926', 'BSECE', 4, 'a0000000-0000-0000-0000-000000000010', true,  0)
ON CONFLICT (id) DO UPDATE SET program=EXCLUDED.program, year_level=EXCLUDED.year_level, adviser_id=EXCLUDED.adviser_id, is_cleared=EXCLUDED.is_cleared, failed_units=EXCLUDED.failed_units;


-- ═══════════════════════════════════════════════════════════════════
-- 5. ADVISEES
-- Erin advises: Bianca, Giorgia, Brendan
-- Alado advises: Vito, Andrei
-- ═══════════════════════════════════════════════════════════════════
DELETE FROM advisees WHERE adviser_id IN (
    'ebf91336-366d-4464-86cf-df4dbdf4b42f',
    'a0000000-0000-0000-0000-000000000010'
);
INSERT INTO advisees (adviser_id, student_id) VALUES
('ebf91336-366d-4464-86cf-df4dbdf4b42f', 'c5b52365-5aa2-4479-b025-27c1db95f3e8'),
('ebf91336-366d-4464-86cf-df4dbdf4b42f', '07a507f1-418d-4efd-a35f-bee73cd2601d'),
('ebf91336-366d-4464-86cf-df4dbdf4b42f', 'a0000000-0000-0000-0000-000000000105'),
('a0000000-0000-0000-0000-000000000010', 'f0095010-898c-4f7f-87c0-febbcf52a63e'),
('a0000000-0000-0000-0000-000000000010', '9c511996-4509-47a1-9f10-e9d3e328e926')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════
-- 6. TERMS  (1 AY = 3 Terms)
-- ═══════════════════════════════════════════════════════════════════
-- Deactivate ALL existing terms first to ensure only one is active
UPDATE terms SET is_active = false WHERE is_active = true;

INSERT INTO terms (id, term_name, academic_year, is_active, deadline_date) VALUES
-- AY 2022-2023 (for 4th year student Brendan's 1st year)
('e0000000-0000-0000-0000-00000000000a', 'Term 1', '2022-2023', false, NULL),
('e0000000-0000-0000-0000-00000000000b', 'Term 2', '2022-2023', false, NULL),
('e0000000-0000-0000-0000-00000000000c', 'Term 3', '2022-2023', false, NULL),
-- AY 2023-2024
('e0000000-0000-0000-0000-000000000001', 'Term 1', '2023-2024', false, '2023-09-15'),
('e0000000-0000-0000-0000-000000000002', 'Term 2', '2023-2024', false, '2024-01-15'),
('e0000000-0000-0000-0000-000000000003', 'Term 3', '2023-2024', false, '2024-05-15'),
-- AY 2024-2025
('e0000000-0000-0000-0000-000000000004', 'Term 1', '2024-2025', false, '2024-09-15'),
('e0000000-0000-0000-0000-000000000005', 'Term 2', '2024-2025', false, '2025-01-15'),
('e0000000-0000-0000-0000-000000000006', 'Term 3', '2024-2025', false, '2025-05-15'),
-- AY 2025-2026 (current)
('e0000000-0000-0000-0000-000000000007', 'Term 1', '2025-2026', false, '2025-09-15'),
('e0000000-0000-0000-0000-000000000008', 'Term 2', '2025-2026', false, '2026-01-15'),
('e0000000-0000-0000-0000-000000000009', 'Term 3', '2025-2026', true,  '2026-04-10')  -- ACTIVE
ON CONFLICT (id) DO UPDATE SET term_name=EXCLUDED.term_name, academic_year=EXCLUDED.academic_year, is_active=EXCLUDED.is_active, deadline_date=EXCLUDED.deadline_date;


-- ═══════════════════════════════════════════════════════════════════
-- 7. COURSES — BS-CpE Curriculum (from official checklist)
-- ═══════════════════════════════════════════════════════════════════
DELETE FROM courses WHERE code IN (
  SELECT code FROM courses WHERE id::text LIKE 'c0000000-%'
  UNION
  SELECT course_code FROM program_student_checklists WHERE program_code IN ('BSCpE','BSECE')
);

INSERT INTO courses (id, code, title, units, term, year_level, program_code) VALUES
-- === BSCpE COURSES ===
('c0000000-0000-0000-0000-000000000001', 'NSTP101', 'National Service Training Program-General Orientation', 0, 1, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000002', 'FNDMATH', 'Foundation in Math', 5, 1, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000003', 'BASCHEM', 'Basic Chemistry', 3, 1, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000004', 'BASPHYS', 'Basic Physics', 3, 1, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000005', 'FNDSTAT', 'Foundation in Statistics', 3, 1, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000006', 'LCC01', 'Lasallian Core Curriculum 01', 3, 1, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000007', 'NSTPCW1', 'National Service Training Program 1', 3, 2, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000008', 'LCC02', 'Lasallian Core Curriculum 02', 3, 2, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000009', 'CALENG1', 'Differential Calculus', 3, 2, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000010', 'COEDISC', 'Computer Engineering as a Discipline', 1, 2, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000011', 'PROLOGI', 'Programming Logic and Design Lecture', 2, 2, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000012', 'LBYCPA1', 'Programming Logic and Design Laboratory', 2, 2, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000013', 'LBYEC2A', 'Computer Fundamentals and Programming 1', 1, 2, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000014', 'LCC03', 'Lasallian Core Curriculum 03', 3, 2, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000015', 'LCC04', 'Lasallian Core Curriculum 04', 3, 2, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000016', 'NSTPCW2', 'National Service Training Program 2', 3, 3, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000017', 'LCLSONE', 'Lasallian Studies 1', 1, 3, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000018', 'SAS1000', 'Students Affairs Service 1000', 0, 3, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000019', 'LASARE1', 'Lasallian Recollection 1', 0, 3, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000020', 'ENGPHYS', 'Physics for Engineers', 3, 3, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000021', 'LBYPH1A', 'Physics for Engineers Laboratory', 1, 3, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000022', 'CALENG2', 'Integral Calculus', 3, 3, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000023', 'LBYEC2B', 'Computer Fundamentals and Programming 2', 1, 3, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000024', 'LBYCPEI', 'Object Oriented Programming Laboratory', 2, 3, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000025', 'LCC05', 'Lasallian Core Curriculum 05', 3, 3, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000026', 'LCC06', 'Lasallian Core Curriculum 06', 3, 3, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000027', 'LCC07', 'Lasallian Core Curriculum 07', 3, 3, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000028', 'CALENG3', 'Differential Equations', 3, 1, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000029', 'DATSRAL', 'Data Structures and Algorithms Lecture', 1, 1, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000030', 'LBYCPA2', 'Data Structures and Algorithms Laboratory', 2, 1, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000031', 'DISCRMT', 'Discrete Mathematics', 3, 1, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000032', 'FUNDCKT', 'Fundamentals of Electrical Circuits Lecture', 3, 1, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000033', 'LBYEC2M', 'Fundamentals of Electrical Circuits Lab', 1, 1, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000034', 'ENGCHEM', 'Chemistry for Engineers', 3, 1, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000035', 'LBBCH1A', 'Chemistry for Engineers Laboratory', 1, 1, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000036', 'PE1CRDO', 'Cardio Fitness', 2, 1, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000037', 'ENGDATA', 'Engineering Data Analysis', 3, 2, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000038', 'NUMMETS', 'Numerical Methods', 3, 2, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000039', 'FUNDLEC', 'Fundamentals of Electronic Circuits Lecture', 3, 2, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000040', 'LBYCPC2', 'Fundamentals of Electronic Circuits Laboratory', 1, 2, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000041', 'SOFDESG', 'Software Design Lecture', 3, 2, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000042', 'LBYCPD2', 'Software Design Laboratory', 1, 2, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000043', 'ENGENVI', 'Environmental Science and Engineering', 3, 2, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000044', 'PE2FTEX', 'Functional Exercise', 2, 2, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000045', 'SAS2000', 'Student Affairs Series 2', 0, 2, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000046', 'LCLSTWO', 'Lasallian Studies 2', 1, 3, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000047', 'LASARE2', 'Lasallian Recollection 2', 0, 3, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000048', 'MXSIGFN', 'Fundamentals of Mixed Signals and Sensors', 3, 3, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000049', 'LOGDSGN', 'Logic Circuits and Design Lecture', 3, 3, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000050', 'LBYCPG4', 'Logic Circuits and Design Laboratory', 1, 3, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000051', 'FDCNSYS', 'Feedback and Control Systems', 3, 3, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000052', 'LBYCPC3', 'Feedback and Control System Laboratory', 1, 3, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000053', 'LBYME1C', 'Computer-Aided Drafting (CAD)', 1, 3, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000054', 'LCC08', 'Lasallian Core Curriculum 08', 3, 3, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000055', 'PETHREE', 'Physical Education 3', 2, 3, 2, 'BSCpE'),
('c0000000-0000-0000-0000-000000000056', 'LCC09', 'Lasallian Core Curriculum 09', 3, 1, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000057', 'MICPROS', 'Microprocessors Lecture', 3, 1, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000058', 'LBYCPA3', 'Microprocessors Laboratory', 1, 1, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000059', 'LBYCPB3', 'Computer Engineering Drafting and Design Lab', 1, 1, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000060', 'LBYEC3B', 'Intelligent Systems for Engineering', 1, 1, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000061', 'LBYCPF2', 'Introduction to HDL Laboratory', 1, 1, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000062', 'DIGDACM', 'Data and Digital Communications', 3, 1, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000063', 'PETHFOUR', 'Physical Education 4', 2, 1, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000064', 'LBYCPG2', 'Basic Computer Systems Administration', 1, 1, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000065', 'CSYSARC', 'Computer Architecture and Organization Lecture', 3, 2, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000066', 'LBYCPD3', 'Computer Architecture and Organization Laboratory', 1, 2, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000067', 'EMBDSYS', 'Embedded Systems Lecture', 3, 2, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000068', 'LBYCPM3', 'Embedded Systems Laboratory', 1, 2, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000069', 'LBYCPG3', 'Online Technologies Laboratory', 1, 2, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000070', 'LCC10', 'Lasallian Core Curriculum 10', 3, 2, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000071', 'REMETHS', 'Methods of Research for CpE', 3, 2, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000072', 'OPESSYS', 'Operating Systems Lecture', 3, 2, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000073', 'LBYCPO1', 'Operating Systems Laboratory', 1, 2, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000074', 'LCLSTRI', 'Lasallian Studies 3', 1, 3, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000075', 'LCC11', 'Lasallian Core Curriculum 11', 3, 3, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000076', 'LASARE3', 'Lasallian Recollection 3', 0, 3, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000077', 'DSIGPRO', 'Digital Signal Processing Lecture', 3, 3, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000078', 'LBYCPA4', 'Digital Signal Processing Laboratory', 1, 3, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000079', 'OCHESAF', 'Basic Occupational Health and Safety', 3, 3, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000080', 'THSCP4A', 'CpE Practice and Design 1', 1, 3, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000081', 'CPEPRAC', 'CpE Laws and Professional Practice', 2, 3, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000082', 'CPECOG1', 'CpE Elective 1 Lecture', 2, 3, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000083', 'LBYCPF3', 'CpE Elective 1 Laboratory', 1, 3, 3, 'BSCpE'),
('c0000000-0000-0000-0000-000000000084', 'LCC12', 'Lasallian Core Curriculum 12', 3, 1, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000085', 'EMERTEC', 'Emerging Technologies in CpE', 3, 1, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000086', 'THSCP4B', 'CpE Practice and Design 2', 1, 1, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000087', 'ENGTREP', 'Technopreneurship 101', 3, 1, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000088', 'CONETSC', 'Computer Networks and Security Lecture', 3, 1, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000089', 'LBYCPB4', 'Computer Networks and Security Laboratory', 1, 1, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000090', 'CPECAPS', 'Operational Technologies', 1, 1, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000091', 'CPECOG2', 'CpE Elective 2 Lecture', 2, 1, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000092', 'LBYCPH3', 'CpE Elective 2 Laboratory', 1, 1, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000093', 'SAS3000', 'Student Affairs Series 3', 0, 1, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000094', 'PRCGECP', 'Practicum for CpE', 3, 2, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000095', 'LCC13', 'Lasallian Core Curriculum 13', 3, 3, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000096', 'LCC14', 'Lasallian Core Curriculum 14', 3, 3, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000097', 'THSCP4C', 'CpE Practice and Design 3', 1, 3, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000098', 'CPECOG3', 'CpE Elective 3 Lecture', 2, 3, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000099', 'LBYCPC4', 'CpE Elective 3 Laboratory', 1, 3, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000100', 'CPETRIP', 'Seminars and Field Trips for CpE', 1, 3, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000101', 'ECNOMIC', 'Engineering Economics for CpE', 3, 3, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000102', 'ENGMANA2', 'Engineering Management', 2, 1, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000103', 'LCC15', 'Lasallian Core Curriculum 15', 3, 3, 4, 'BSCpE'),
('c0000000-0000-0000-0000-000000000104', 'GEPCOMM', 'Purposive Communication', 3, 1, 1, 'BSCpE'),
('c0000000-0000-0000-0000-000000000105', 'ENGMANA', 'Engineering Management', 2, 3, 4, 'BSCpE'),
-- === BSECE COURSES ===
('c0000000-0000-0000-0000-000000000200', 'ENGPHS2', 'Physics 2', 3, 3, 1, 'BSECE'),
('c0000000-0000-0000-0000-000000000201', 'LBYPH1B', 'Physics 2 Laboratory', 1, 3, 1, 'BSECE'),
('c0000000-0000-0000-0000-000000000202', 'ELECEN1', 'Circuits 1', 3, 1, 2, 'BSECE'),
('c0000000-0000-0000-0000-000000000203', 'LBYEC2D', 'Circuits 1 Laboratory', 1, 1, 2, 'BSECE'),
('c0000000-0000-0000-0000-000000000204', 'DATAENG', 'Engineering Data Analysis', 3, 1, 2, 'BSECE'),
('c0000000-0000-0000-0000-000000000205', 'ELECEN2', 'Circuits 2', 3, 2, 2, 'BSECE'),
('c0000000-0000-0000-0000-000000000206', 'LBYEC2F', 'Circuits 2 Laboratory', 1, 2, 2, 'BSECE'),
('c0000000-0000-0000-0000-000000000207', 'TRONIC1', 'Electronic Devices and Circuits', 3, 2, 2, 'BSECE'),
('c0000000-0000-0000-0000-000000000208', 'LBYEC2G', 'Electronic Devices and Circuits Laboratory', 1, 2, 2, 'BSECE'),
('c0000000-0000-0000-0000-000000000209', 'MATHADV', 'Advanced Engineering Mathematics for ECE', 3, 2, 2, 'BSECE'),
('c0000000-0000-0000-0000-000000000210', 'LBYEC2H', 'Advanced Engineering Mathematics for ECE Laboratory', 1, 2, 2, 'BSECE'),
('c0000000-0000-0000-0000-000000000211', 'CIRLOGI', 'Logic Circuits and Switching Theory', 3, 3, 2, 'BSECE'),
('c0000000-0000-0000-0000-000000000212', 'LBYEC2I', 'Logic Circuits and Switching Theory Laboratory', 1, 3, 2, 'BSECE'),
('c0000000-0000-0000-0000-000000000213', 'ELECMG1', 'Electromagnetics', 4, 3, 2, 'BSECE'),
('c0000000-0000-0000-0000-000000000214', 'TRONIC2', 'Electronic Circuit Analysis and Design', 3, 3, 2, 'BSECE'),
('c0000000-0000-0000-0000-000000000215', 'LBYEC2J', 'Electronic Circuit Analysis and Design Laboratory', 1, 3, 2, 'BSECE'),
('c0000000-0000-0000-0000-000000000216', 'FEECONS', 'Feedback and Control Systems', 3, 1, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000217', 'LBYEC3F', 'Feedback and Control Systems Laboratory', 1, 1, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000218', 'COCIMIC', 'Microprocessor and Microcontrol Systems', 3, 1, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000219', 'LBYEC3L', 'Microprocessor and Microcontrol Systems Lab', 1, 1, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000220', 'COMMANA', 'Principles of Communication Systems', 3, 1, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000221', 'LBYEC3D', 'Principles of Communication Systems Lab', 1, 1, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000222', 'SIGDISC', 'Signals, Spectra and Signal Processing', 3, 1, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000223', 'LBYEC4A', 'Signals, Spectra and Signal Processing Lab', 1, 1, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000224', 'LAWSECE', 'ECE Laws, Contracts, Ethics, Standards and Safety', 3, 2, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000225', 'DIGCOMT', 'Modulation and Coding Techniques', 3, 2, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000226', 'LBYEC3E', 'Modulation and Coding Techniques Laboratory', 1, 2, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000227', 'MTTHECE', 'Methods of Research for ECE', 3, 2, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000228', 'TRONIC3', 'Electronic Systems and Design', 3, 2, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000229', 'LBYEC3K', 'Electronic System and Design Laboratory', 1, 2, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000230', 'MIXIGEL', 'Mixed Signal Electronics', 2, 2, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000231', 'LBYEC3J', 'Mixed Signal Electronics Laboratory', 1, 2, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000232', 'PETFOUR', 'Physical Education 4', 2, 2, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000233', 'LBYEC3G', 'Digital Systems Design Laboratory', 1, 3, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000234', 'LBYEC3H', 'Analog Systems Design Laboratory', 1, 3, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000235', 'TRANSIL', 'Transmission of Signals', 3, 3, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000236', 'LBYEC3I', 'Transmission of Signals Laboratory', 1, 3, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000237', 'THSCC1A', 'ECE Project 1', 1, 3, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000238', 'MACTRAN', 'Energy Conversion', 2, 3, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000239', 'LBYEC4D', 'Energy Conversion Laboratory', 1, 3, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000240', 'ECNOMCC', 'Engineering Economics for ECE', 3, 3, 3, 'BSECE'),
('c0000000-0000-0000-0000-000000000241', 'SEMSECE', 'Seminars and Colloquium for ECE', 1, 1, 4, 'BSECE'),
('c0000000-0000-0000-0000-000000000242', 'THSCC1B', 'ECE Project 2', 1, 1, 4, 'BSECE'),
('c0000000-0000-0000-0000-000000000243', 'COMMDAT', 'Data Communications', 3, 1, 4, 'BSECE'),
('c0000000-0000-0000-0000-000000000244', 'LBYEC4B', 'Data Communications Laboratory', 1, 1, 4, 'BSECE'),
('c0000000-0000-0000-0000-000000000245', 'ECECAPS', 'Electronics and Communications Systems Design', 1, 1, 4, 'BSECE'),
('c0000000-0000-0000-0000-000000000246', 'ECELCCV', 'ECE Elective', 3, 1, 4, 'BSECE'),
('c0000000-0000-0000-0000-000000000247', 'LBYEC4G', 'ECE Elective Laboratory', 1, 1, 4, 'BSECE'),
('c0000000-0000-0000-0000-000000000248', 'PRCGEEC', 'Practicum for ECE', 3, 2, 4, 'BSECE'),
('c0000000-0000-0000-0000-000000000249', 'COMWIRL', 'Wireless Communications', 2, 3, 4, 'BSECE'),
('c0000000-0000-0000-0000-000000000250', 'LBYEC4E', 'Wireless Communications Laboratory', 1, 3, 4, 'BSECE'),
('c0000000-0000-0000-0000-000000000251', 'MATSENG', 'Materials Science and Engineering', 3, 3, 4, 'BSECE'),
('c0000000-0000-0000-0000-000000000252', 'LBYEC3A', 'Intelligent Engineering Systems', 1, 3, 4, 'BSECE'),
('c0000000-0000-0000-0000-000000000253', 'THSCC1C', 'ECE Project 3', 1, 3, 4, 'BSECE'),
('c0000000-0000-0000-0000-000000000254', 'LBYEC4F', 'ECE Computational Numerical Methods Laboratory', 1, 3, 4, 'BSECE')
ON CONFLICT (code) DO UPDATE SET id=EXCLUDED.id, title=EXCLUDED.title, units=EXCLUDED.units, term=EXCLUDED.term, year_level=EXCLUDED.year_level, program_code=EXCLUDED.program_code;


-- ═══════════════════════════════════════════════════════════════════
-- 8. PROGRAM CHECKLIST — BS-CpE (full curriculum, 12 terms)
-- ═══════════════════════════════════════════════════════════════════
DELETE FROM program_student_checklists WHERE program_code IN ('BSCpE','BSECE');

INSERT INTO program_student_checklists (program_code, student_id_prefix, course_code, course_title, units, year_level, term, course_sequence, prerequisites) VALUES
-- Year 1, Term 1
('BSCpE',122,'NSTP101','National Service Training Program',0,1,'1',1,NULL),
('BSCpE',122,'FNDMATH','Foundation in Math',5,1,'1',2,NULL),
('BSCpE',122,'BASCHEM','Basic Chemistry',3,1,'1',3,NULL),
('BSCpE',122,'BASPHYS','Basic Physics',3,1,'1',4,NULL),
('BSCpE',122,'FNDSTAT','Foundation in Statistics',3,1,'1',5,NULL),
('BSCpE',122,'LCC01','Lasallian Core Curriculum 01',3,1,'1',6,NULL),
-- Year 1, Term 2
('BSCpE',122,'NSTPCW1','National Service Training Program 1',3,1,'2',1,NULL),
('BSCpE',122,'LCC02','Lasallian Core Curriculum 02',3,1,'2',2,NULL),
('BSCpE',122,'CALENG1','Differential Calculus',3,1,'2',3,'H: FNDMATH'),
('BSCpE',122,'COEDISC','Computer Engineering as a Discipline',1,1,'2',4,NULL),
('BSCpE',122,'PROLOGI','Programming Logic and Design Lecture',2,1,'2',5,NULL),
('BSCpE',122,'LBYCPA1','Programming Logic and Design Laboratory',2,1,'2',6,'C: PROLOGI'),
('BSCpE',122,'LBYEC2A','Computer Fundamentals and Programming 1',1,1,'2',7,NULL),
('BSCpE',122,'LCC03','Lasallian Core Curriculum 03',3,1,'2',8,NULL),
('BSCpE',122,'LCC04','Lasallian Core Curriculum 04',3,1,'2',9,NULL),
-- Year 1, Term 3
('BSCpE',122,'NSTPCW2','National Service Training Program 2',3,1,'3',1,'H: NSTPCW1'),
('BSCpE',122,'LCLSONE','Lasallian Studies 1',1,1,'3',2,NULL),
('BSCpE',122,'SAS1000','Students Affairs Service 1000',0,1,'3',3,NULL),
('BSCpE',122,'LASARE1','Lasallian Recollection 1',0,1,'3',4,NULL),
('BSCpE',122,'ENGPHYS','Physics for Engineers',3,1,'3',5,'S/H: CALENG1/BASPHYS'),
('BSCpE',122,'LBYPH1A','Physics for Engineers Laboratory',1,1,'3',6,'C: ENGPHYS'),
('BSCpE',122,'CALENG2','Integral Calculus',3,1,'3',7,'H: CALENG1'),
('BSCpE',122,'LBYEC2B','Computer Fundamentals and Programming 2',1,1,'3',8,'H: LBYEC2A'),
('BSCpE',122,'LBYCPEI','Object Oriented Programming Laboratory',2,1,'3',9,'H: LBYCPA1'),
('BSCpE',122,'LCC05','Lasallian Core Curriculum 05',3,1,'3',10,NULL),
('BSCpE',122,'LCC06','Lasallian Core Curriculum 06',3,1,'3',11,NULL),
('BSCpE',122,'LCC07','Lasallian Core Curriculum 07',3,1,'3',12,NULL),
-- Year 2, Term 1
('BSCpE',122,'CALENG3','Differential Equations',3,2,'1',1,'H: CALENG2'),
('BSCpE',122,'DATSRAL','Data Structures and Algorithms Lecture',1,2,'1',2,'H: LBYCPEI'),
('BSCpE',122,'LBYCPA2','Data Structures and Algorithms Laboratory',2,2,'1',3,'C: DATSRAL'),
('BSCpE',122,'DISCRMT','Discrete Mathematics',3,2,'1',4,'H: CALENG1'),
('BSCpE',122,'FUNDCKT','Fundamentals of Electrical Circuits Lecture',3,2,'1',5,'H: ENGPHYS'),
('BSCpE',122,'LBYEC2M','Fundamentals of Electrical Circuits Lab',1,2,'1',6,'C: FUNDCKT'),
('BSCpE',122,'ENGCHEM','Chemistry for Engineers',3,2,'1',7,'H: BASCHEM'),
('BSCpE',122,'LBBCH1A','Chemistry for Engineers Laboratory',1,2,'1',8,'C: ENGCHEM'),
('BSCpE',122,'PE1CRDO','Cardio Fitness',2,2,'1',9,NULL),
-- Year 2, Term 2
('BSCpE',122,'ENGDATA','Engineering Data Analysis',3,2,'2',1,'S/H: CALENG2/FNDSTAT'),
('BSCpE',122,'NUMMETS','Numerical Methods',3,2,'2',2,'H: CALENG3'),
('BSCpE',122,'FUNDLEC','Fundamentals of Electronic Circuits Lecture',3,2,'2',3,'H: FUNDCKT'),
('BSCpE',122,'LBYCPC2','Fundamentals of Electronic Circuits Lab',1,2,'2',4,'C: FUNDLEC'),
('BSCpE',122,'SOFDESG','Software Design Lecture',3,2,'2',5,'H: LBYCPA2'),
('BSCpE',122,'LBYCPD2','Software Design Laboratory',1,2,'2',6,'C: SOFDESG'),
('BSCpE',122,'ENGENVI','Environmental Science and Engineering',3,2,'2',7,'H: ENGCHEM'),
('BSCpE',122,'PE2FTEX','Functional Exercise',2,2,'2',8,'H: PE1CRDO'),
('BSCpE',122,'SAS2000','Student Affairs Series 2',0,2,'2',9,NULL),
-- Year 2, Term 3
('BSCpE',122,'LCLSTWO','Lasallian Studies 2',1,2,'3',1,NULL),
('BSCpE',122,'LASARE2','Lasallian Recollection 2',0,2,'3',2,NULL),
('BSCpE',122,'MXSIGFN','Fundamentals of Mixed Signals and Sensors',3,2,'3',3,'H: FUNDLEC'),
('BSCpE',122,'LOGDSGN','Logic Circuits and Design Lecture',3,2,'3',4,'H: FUNDLEC'),
('BSCpE',122,'LBYCPG4','Logic Circuits and Design Laboratory',1,2,'3',5,'C: LOGDSGN'),
('BSCpE',122,'FDCNSYS','Feedback and Control Systems',3,2,'3',6,'H/H: NUMMETS/FUNDCKT'),
('BSCpE',122,'LBYCPC3','Feedback and Control System Laboratory',1,2,'3',7,'C: FDCNSYS'),
('BSCpE',122,'LBYME1C','Computer-Aided Drafting (CAD)',1,2,'3',8,NULL),
('BSCpE',122,'LCC08','Lasallian Core Curriculum 08',3,2,'3',9,NULL),
('BSCpE',122,'PETHREE','Physical Education 3',2,2,'3',10,'H: PE1/PE2'),
-- Year 3, Term 1
('BSCpE',122,'LCC09','Lasallian Core Curriculum 09',3,3,'1',1,NULL),
('BSCpE',122,'MICPROS','Microprocessors Lecture',3,3,'1',2,'H: LOGDSGN'),
('BSCpE',122,'LBYCPA3','Microprocessors Laboratory',1,3,'1',3,'C: MICPROS'),
('BSCpE',122,'LBYCPB3','Computer Engineering Drafting and Design Lab',1,3,'1',4,'H: LOGDSGN'),
('BSCpE',122,'LBYEC3B','Intelligent Systems for Engineering',1,3,'1',5,'H/H: LBYEC2A/ENGDATA'),
('BSCpE',122,'LBYCPF2','Introduction to HDL Laboratory',1,3,'1',6,'H/H: LBYCPA1/FUNDLEC'),
('BSCpE',122,'DIGDACM','Data and Digital Communications',3,3,'1',7,'H: FUNDLEC'),
('BSCpE',122,'PETHFOUR','Physical Education 4',2,3,'1',8,'H: PE1/PE2/PE3'),
('BSCpE',122,'LBYCPG2','Basic Computer Systems Administration',1,3,'1',9,NULL),
-- Year 3, Term 2
('BSCpE',122,'CSYSARC','Computer Architecture and Organization',3,3,'2',1,'H: MICPROS'),
('BSCpE',122,'LBYCPD3','Computer Architecture and Organization Lab',1,3,'2',2,'C: CSYSARC'),
('BSCpE',122,'EMBDSYS','Embedded Systems Lecture',3,3,'2',3,'H: MICPROS'),
('BSCpE',122,'LBYCPM3','Embedded Systems Laboratory',1,3,'2',4,'C: EMBDSYS'),
('BSCpE',122,'LBYCPG3','Online Technologies Laboratory',1,3,'2',5,NULL),
('BSCpE',122,'LCC10','Lasallian Core Curriculum 10',3,3,'2',6,NULL),
('BSCpE',122,'REMETHS','Methods of Research for CpE',3,3,'2',7,'H/H/H: ENGDATA/GEPCOMM/LOGDSGN'),
('BSCpE',122,'OPESSYS','Operating Systems Lecture',3,3,'2',8,'H: LBYCPA2'),
('BSCpE',122,'LBYCPO1','Operating Systems Laboratory',1,3,'2',9,'C: OPESSYS'),
-- Year 3, Term 3
('BSCpE',122,'LCLSTRI','Lasallian Studies 3',1,3,'3',1,NULL),
('BSCpE',122,'LCC11','Lasallian Core Curriculum 11',3,3,'3',2,NULL),
('BSCpE',122,'LASARE3','Lasallian Recollection 3',0,3,'3',3,NULL),
('BSCpE',122,'DSIGPRO','Digital Signal Processing Lecture',3,3,'3',4,'H/S: FDCNSYS/EMBDSYS'),
('BSCpE',122,'LBYCPA4','Digital Signal Processing Laboratory',1,3,'3',5,'C: DSIGPRO'),
('BSCpE',122,'OCHESAF','Basic Occupational Health and Safety',3,3,'3',6,'H: EMBDSYS'),
('BSCpE',122,'THSCP4A','CpE Practice and Design 1',1,3,'3',7,'H/H: EMBDSYS/REMETHS'),
('BSCpE',122,'CPEPRAC','CpE Laws and Professional Practice',2,3,'3',8,'H: EMBDSYS'),
('BSCpE',122,'CPECOG1','CpE Elective 1 Lecture',2,3,'3',9,'H/C: EMBDSYS/THSCP4A'),
('BSCpE',122,'LBYCPF3','CpE Elective 1 Laboratory',1,3,'3',10,'C: CPECOG1'),
-- Year 4, Term 1
('BSCpE',122,'LCC12','Lasallian Core Curriculum 12',3,4,'1',1,NULL),
('BSCpE',122,'EMERTEC','Emerging Technologies in CpE',3,4,'1',2,'H: EMBDSYS'),
('BSCpE',122,'THSCP4B','CpE Practice and Design 2',1,4,'1',3,'H: THSCP4A'),
('BSCpE',122,'ENGTREP','Technopreneurship 101',3,4,'1',4,NULL),
('BSCpE',122,'CONETSC','Computer Networks and Security',3,4,'1',5,'H: DIGDACM'),
('BSCpE',122,'LBYCPB4','Computer Networks and Security Lab',1,4,'1',6,'C: CONETSC'),
('BSCpE',122,'CPECAPS','Operational Technologies',1,4,'1',7,'C/C: LBYCPH3/LBYCPB4'),
('BSCpE',122,'CPECOG2','CpE Elective 2 Lecture',2,4,'1',8,'S: THSCP4A'),
('BSCpE',122,'LBYCPH3','CpE Elective 2 Laboratory',1,4,'1',9,'C: CPECOG2'),
('BSCpE',122,'SAS3000','Student Affairs Series 3',0,4,'1',10,'H: SAS2000'),
-- Year 4, Term 2
('BSCpE',122,'PRCGECP','Practicum for CpE',3,4,'2',1,'H: REMETHS'),
-- Year 4, Term 3
('BSCpE',122,'LCC13','Lasallian Core Curriculum 13',3,4,'3',1,NULL),
('BSCpE',122,'LCC14','Lasallian Core Curriculum 14',3,4,'3',2,NULL),
('BSCpE',122,'THSCP4C','CpE Practice and Design 3',1,4,'3',3,'H: THSCP4B'),
('BSCpE',122,'CPECOG3','CpE Elective 3 Lecture',2,4,'3',4,'S: THSCP4A'),
('BSCpE',122,'LBYCPC4','CpE Elective 3 Laboratory',1,4,'3',5,'C: CPECOG3'),
('BSCpE',122,'CPETRIP','Seminars and Field Trips for CpE',1,4,'3',6,'H/H: EMBDSYS/CPECAPS'),
('BSCpE',122,'ECNOMIC','Engineering Economics for CpE',3,4,'3',7,'S: CALENG1'),
('BSCpE',122,'ENGMANA','Engineering Management',2,4,'3',8,'S: CALENG1'),
('BSCpE',122,'LCC15','Lasallian Core Curriculum 15',3,4,'3',9,NULL);


-- ═══════════════════════════════════════════════════════════════════
-- 9. PROGRAM CHECKLIST — BS-ECE (full curriculum, 12 terms)
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO program_student_checklists (program_code, student_id_prefix, course_code, course_title, units, year_level, term, course_sequence, prerequisites) VALUES
-- Year 1, Term 1
('BSECE',122,'NSTP101','National Service Training Program',0,1,'1',1,NULL),
('BSECE',122,'FNDMATH','Foundation in Math',5,1,'1',2,NULL),
('BSECE',122,'BASCHEM','Basic Chemistry',3,1,'1',3,NULL),
('BSECE',122,'BASPHYS','Basic Physics',3,1,'1',4,NULL),
('BSECE',122,'FNDSTAT','Foundation in Statistics',3,1,'1',5,NULL),
('BSECE',122,'LCC01','Lasallian Core Curriculum 01',3,1,'1',6,NULL),
-- Year 1, Term 2
('BSECE',122,'NSTPCW1','National Service Training Program 1',3,1,'2',1,'H: NSTP101'),
('BSECE',122,'LCC02','Lasallian Core Curriculum 02',3,1,'2',2,NULL),
('BSECE',122,'CALENG1','Differential Calculus',3,1,'2',3,'H: FNDMATH'),
('BSECE',122,'LBYME1C','Computer-Aided Drafting (CAD)',1,1,'2',4,NULL),
('BSECE',122,'LCC03','Lasallian Core Curriculum 03',3,1,'2',5,NULL),
('BSECE',122,'LCC04','Lasallian Core Curriculum 04',3,1,'2',6,NULL),
('BSECE',122,'LCC05','Lasallian Core Curriculum 05',3,1,'2',7,NULL),
('BSECE',122,'LBYEC2A','Computer Fundamentals and Programming 1',1,1,'2',8,NULL),
-- Year 1, Term 3
('BSECE',122,'NSTPCW2','National Service Training Program 2',3,1,'3',1,'H: NSTPCW1'),
('BSECE',122,'LCLSONE','Lasallian Studies 1',1,1,'3',2,NULL),
('BSECE',122,'SAS1000','Students Affairs Service 1000',0,1,'3',3,NULL),
('BSECE',122,'LCC06','Lasallian Core Curriculum 06',3,1,'3',4,NULL),
('BSECE',122,'LASARE1','Lasallian Recollection 1',0,1,'3',5,NULL),
('BSECE',122,'ENGPHYS','Physics for Engineers',3,1,'3',6,'S/H: CALENG1/BASPHYS'),
('BSECE',122,'LBYPH1A','Physics for Engineers Laboratory',1,1,'3',7,'C: ENGPHYS'),
('BSECE',122,'ENGPHS2','Physics 2',3,1,'3',8,'C: ENGPHYS'),
('BSECE',122,'LBYPH1B','Physics 2 Laboratory',1,1,'3',9,'C: ENGPHS2'),
('BSECE',122,'CALENG2','Integral Calculus',3,1,'3',10,'H: CALENG1'),
('BSECE',122,'ENGMANA','Engineering Management',2,1,'3',11,'S: CALENG1'),
('BSECE',122,'LBYEC2B','Computer Fundamentals and Programming 2',1,1,'3',12,'H: LBYEC2A'),
-- Year 2, Term 1
('BSECE',122,'LCC07','Lasallian Core Curriculum 07',3,2,'1',1,NULL),
('BSECE',122,'PE1CRDO','Cardio Fitness',2,2,'1',2,NULL),
('BSECE',122,'CALENG3','Differential Equations',3,2,'1',3,'H: CALENG2'),
('BSECE',122,'ELECEN1','Circuits 1',3,2,'1',4,'H: ENGPHS2'),
('BSECE',122,'LBYEC2D','Circuits 1 Laboratory',1,2,'1',5,'C: ELECEN1'),
('BSECE',122,'LCC08','Lasallian Core Curriculum 08',3,2,'1',6,NULL),
('BSECE',122,'DATAENG','Engineering Data Analysis',3,2,'1',7,'S/H: CALENG2/FNDSTAT'),
-- Year 2, Term 2
('BSECE',122,'LCC09','Lasallian Core Curriculum 09',3,2,'2',1,NULL),
('BSECE',122,'PE2FTEX','Functional Exercise',2,2,'2',2,'H: PE1CRDO'),
('BSECE',122,'ELECEN2','Circuits 2',3,2,'2',3,'H: ELECEN1'),
('BSECE',122,'LBYEC2F','Circuits 2 Laboratory',1,2,'2',4,'C: ELECEN2'),
('BSECE',122,'TRONIC1','Electronic Devices and Circuits',3,2,'2',5,'S: ELECEN1'),
('BSECE',122,'LBYEC2G','Electronic Devices and Circuits Lab',1,2,'2',6,'C: TRONIC1'),
('BSECE',122,'MATHADV','Advanced Engineering Math for ECE',3,2,'2',7,'H: CALENG3'),
('BSECE',122,'LBYEC2H','Advanced Engineering Math Lab',1,2,'2',8,'C: MATHADV'),
-- Year 2, Term 3
('BSECE',122,'LCLSTWO','Lasallian Studies 2',1,2,'3',1,NULL),
('BSECE',122,'LCC10','Lasallian Core Curriculum 10',3,2,'3',2,NULL),
('BSECE',122,'LCC11','Lasallian Core Curriculum 11',3,2,'3',3,NULL),
('BSECE',122,'LASARE2','Lasallian Recollection 2',0,2,'3',4,NULL),
('BSECE',122,'CIRLOGI','Logic Circuits and Switching Theory',3,2,'3',5,'H: TRONIC1'),
('BSECE',122,'LBYEC2I','Logic Circuits and Switching Theory Lab',1,2,'3',6,'C/S: CIRLOGI/LBYEC2G'),
('BSECE',122,'ELECMG1','Electromagnetics',4,2,'3',7,'H: CALENG3'),
('BSECE',122,'TRONIC2','Electronic Circuit Analysis and Design',3,2,'3',8,'H: TRONIC1'),
('BSECE',122,'LBYEC2J','Electronic Circuit Analysis and Design Lab',1,2,'3',9,'S/C: LBYEC2G/TRONIC2'),
('BSECE',122,'SAS2000','Student Affairs Series 2',0,2,'3',10,'H: SAS1000'),
-- Year 3, Term 1
('BSECE',122,'PETHREE','Physical Education 3',2,3,'1',1,'H: PE1/PE2'),
('BSECE',122,'FEECONS','Feedback and Control Systems',3,3,'1',2,'S/H: MATHADV/ELECEN2'),
('BSECE',122,'LBYEC3F','Feedback and Control Systems Lab',1,3,'1',3,'C: FEECONS'),
('BSECE',122,'COCIMIC','Microprocessor and Microcontrol Systems',3,3,'1',4,'H: CIRLOGI'),
('BSECE',122,'LBYEC3L','Microprocessor and Microcontrol Lab',1,3,'1',5,'H/C: LBYEC2I/COCIMIC'),
('BSECE',122,'COMMANA','Principles of Communication Systems',3,3,'1',6,'H/S: MATHADV/TRONIC2'),
('BSECE',122,'LBYEC3D','Principles of Communication Systems Lab',1,3,'1',7,'S/C: LBYEC2J/COMMANA'),
('BSECE',122,'SIGDISC','Signals, Spectra and Signal Processing',3,3,'1',8,'H: MATHADV'),
('BSECE',122,'LBYEC4A','Signals, Spectra and Signal Processing Lab',1,3,'1',9,'C: SIGDISC'),
-- Year 3, Term 2
('BSECE',122,'LAWSECE','ECE Laws, Contracts, Ethics',3,3,'2',1,NULL),
('BSECE',122,'DIGCOMT','Modulation and Coding Techniques',3,3,'2',2,'H: COMMANA'),
('BSECE',122,'LBYEC3E','Modulation and Coding Techniques Lab',1,3,'2',3,'H/C: LBYEC3D/DIGCOMT'),
('BSECE',122,'MTTHECE','Methods of Research for ECE',3,3,'2',4,'S: COMMANA'),
('BSECE',122,'TRONIC3','Electronic Systems and Design',3,3,'2',5,'H/S: TRONIC2/CIRLOGI'),
('BSECE',122,'LBYEC3K','Electronic System and Design Lab',1,3,'2',6,'C: TRONIC3'),
('BSECE',122,'MIXIGEL','Mixed Signal Electronics',2,3,'2',7,'H: TRONIC2'),
('BSECE',122,'LBYEC3J','Mixed Signal Electronics Lab',1,3,'2',8,'C: MIXIGEL'),
('BSECE',122,'PETFOUR','Physical Education 4',2,3,'2',9,'H: PE1/PE2/PE3'),
-- Year 3, Term 3
('BSECE',122,'LCLSTRI','Lasallian Studies 3',1,3,'3',1,NULL),
('BSECE',122,'LCC12','Lasallian Core Curriculum 12',3,3,'3',2,NULL),
('BSECE',122,'LCC13','Lasallian Core Curriculum 13',3,3,'3',3,NULL),
('BSECE',122,'LASARE3','Lasallian Recollection 3',0,3,'3',4,NULL),
('BSECE',122,'LBYEC3G','Digital Systems Design Laboratory',1,3,'3',5,'S: LBYEC3L'),
('BSECE',122,'LBYEC3H','Analog Systems Design Laboratory',1,3,'3',6,'S/C: LBYEC3K/LBYEC3J'),
('BSECE',122,'TRANSIL','Transmission of Signals',3,3,'3',7,'S/S: DIGCOMT/ELECMG1'),
('BSECE',122,'LBYEC3I','Transmission of Signals Laboratory',1,3,'3',8,'C/H: TRANSIL/LBYEC2G'),
('BSECE',122,'THSCC1A','ECE Project 1',1,3,'3',9,'S/S/H: LBYEC3K/LBYEC3E/MTTHECE'),
('BSECE',122,'MACTRAN','Energy Conversion',2,3,'3',10,'H: ELECEN2'),
('BSECE',122,'LBYEC4D','Energy Conversion Laboratory',1,3,'3',11,'C: MACTRAN'),
('BSECE',122,'ECNOMCC','Engineering Economics for ECE',3,3,'3',12,'S: CALENG1'),
-- Year 4, Term 1
('BSECE',122,'SEMSECE','Seminars and Colloquium for ECE',1,4,'1',1,NULL),
('BSECE',122,'THSCC1B','ECE Project 2',1,4,'1',2,'H: THSCC1A'),
('BSECE',122,'COMMDAT','Data Communications',3,4,'1',3,'S: DIGCOMT'),
('BSECE',122,'LBYEC4B','Data Communications Laboratory',1,4,'1',4,'C/S: COMMDAT/LBYEC3E'),
('BSECE',122,'ECECAPS','Electronics and Communications Systems Design',1,4,'1',5,'H/H: LBYEC3G/LBYEC3H'),
('BSECE',122,'ECELCCV','ECE Elective',3,4,'1',6,'H: THSCC1A'),
('BSECE',122,'LBYEC4G','ECE Elective Laboratory',1,4,'1',7,'C: ECELCCV'),
('BSECE',122,'ENGTREP','Technopreneurship 101',3,4,'1',8,NULL),
('BSECE',122,'ENGCHEM','Chemistry for Engineers',3,4,'1',9,'H: BASCHEM'),
('BSECE',122,'LBBCH1A','Chemistry for Engineers Laboratory',1,4,'1',10,'C: ENGCHEM'),
('BSECE',122,'SAS3000','Student Affairs Series 3',0,4,'1',11,'H: SAS2000'),
-- Year 4, Term 2
('BSECE',122,'PRCGEEC','Practicum for ECE',3,4,'2',1,'H: MTTHECE'),
-- Year 4, Term 3
('BSECE',122,'LCC14','Lasallian Core Curriculum 14',3,4,'3',1,NULL),
('BSECE',122,'LCC15','Lasallian Core Curriculum 15',3,4,'3',2,NULL),
('BSECE',122,'ENGENVI','Environmental Science and Engineering',3,4,'3',3,'H: ENGCHEM'),
('BSECE',122,'COMWIRL','Wireless Communications',2,4,'3',4,'S: TRANSIL'),
('BSECE',122,'LBYEC4E','Wireless Communications Laboratory',1,4,'3',5,'C: COMWIRL'),
('BSECE',122,'MATSENG','Materials Science and Engineering',3,4,'3',6,'H/S: ENGPHYS/ENGCHEM'),
('BSECE',122,'LBYEC3A','Intelligent Engineering Systems',1,4,'3',7,'H/S: LBYEC2A/DATAENG'),
('BSECE',122,'THSCC1C','ECE Project 3',1,4,'3',8,'H: THSCC1B'),
('BSECE',122,'LBYEC4F','ECE Computational Numerical Methods Lab',1,4,'3',9,'H: LBYEC2A');


-- ═══════════════════════════════════════════════════════════════════
-- 10. ACADEMIC RECORDS
-- ═══════════════════════════════════════════════════════════════════

-- === Bianca Louise Manganaan (CpE 3rd yr, 6 failed units) — completed through Y2T3, now in Y3T1 ===
-- Bianca has 6 failed units from FUNDLEC(3u) and NUMMETS(3u) in CpE courses
INSERT INTO academic_records (student_id, course_id, term_id, status, grade) VALUES
-- Y1T1 (AY 2023-2024)
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000001','passed',2.0),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000001','passed',2.5),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-000000000001','passed',2.0),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000005','e0000000-0000-0000-0000-000000000001','passed',2.5),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000006','e0000000-0000-0000-0000-000000000001','passed',3.5),
-- Y1T2
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000009','e0000000-0000-0000-0000-000000000002','passed',1.5),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000011','e0000000-0000-0000-0000-000000000002','passed',2.0),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000012','e0000000-0000-0000-0000-000000000002','passed',3.0),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000013','e0000000-0000-0000-0000-000000000002','passed',3.5),
-- Y1T3
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000020','e0000000-0000-0000-0000-000000000003','passed',2.0),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000022','e0000000-0000-0000-0000-000000000003','passed',1.5),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000024','e0000000-0000-0000-0000-000000000003','passed',2.5),
-- Y2T1 (AY 2024-2025)
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000028','e0000000-0000-0000-0000-000000000004','passed',2.0),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000029','e0000000-0000-0000-0000-000000000004','passed',2.5),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000032','e0000000-0000-0000-0000-000000000004','passed',3.0),
-- Y2T2 (2 failures: FUNDLEC 3u + NUMMETS 3u = 6 failed units)
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000037','e0000000-0000-0000-0000-000000000005','passed',2.0),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000039','e0000000-0000-0000-0000-000000000005','failed',0.0), -- FUNDLEC FAILED (3u)
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000038','e0000000-0000-0000-0000-000000000005','failed',0.0), -- NUMMETS FAILED (3u)
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000041','e0000000-0000-0000-0000-000000000005','passed',3.0),
-- Y2T3
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000049','e0000000-0000-0000-0000-000000000006','passed',2.0),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000050','e0000000-0000-0000-0000-000000000006','passed',3.0),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000051','e0000000-0000-0000-0000-000000000006','passed',2.0),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000052','e0000000-0000-0000-0000-000000000006','passed',2.5),
-- Y3T1 (ACTIVE - in progress, also retaking failed courses)
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000057','e0000000-0000-0000-0000-000000000009','in_progress',NULL),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000058','e0000000-0000-0000-0000-000000000009','in_progress',NULL),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','c0000000-0000-0000-0000-000000000062','e0000000-0000-0000-0000-000000000009','in_progress',NULL);

-- === Giorgia Lubangco (CpE 1st yr) — in term 3 ===
INSERT INTO academic_records (student_id, course_id, term_id, status, grade) VALUES
-- Y1T1 (AY 2025-2026 T1)
('07a507f1-418d-4efd-a35f-bee73cd2601d','c0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000007','passed',3.0),
('07a507f1-418d-4efd-a35f-bee73cd2601d','c0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000007','passed',3.0),
('07a507f1-418d-4efd-a35f-bee73cd2601d','c0000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-000000000007','passed',2.5),
('07a507f1-418d-4efd-a35f-bee73cd2601d','c0000000-0000-0000-0000-000000000005','e0000000-0000-0000-0000-000000000007','passed',3.0),
-- Y1T2
('07a507f1-418d-4efd-a35f-bee73cd2601d','c0000000-0000-0000-0000-000000000009','e0000000-0000-0000-0000-000000000008','passed',2.5),
('07a507f1-418d-4efd-a35f-bee73cd2601d','c0000000-0000-0000-0000-000000000011','e0000000-0000-0000-0000-000000000008','passed',3.0),
('07a507f1-418d-4efd-a35f-bee73cd2601d','c0000000-0000-0000-0000-000000000012','e0000000-0000-0000-0000-000000000008','passed',3.0),
('07a507f1-418d-4efd-a35f-bee73cd2601d','c0000000-0000-0000-0000-000000000013','e0000000-0000-0000-0000-000000000008','passed',3.5),
-- Y1T3 (ACTIVE - in progress)
('07a507f1-418d-4efd-a35f-bee73cd2601d','c0000000-0000-0000-0000-000000000020','e0000000-0000-0000-0000-000000000009','in_progress',NULL),
('07a507f1-418d-4efd-a35f-bee73cd2601d','c0000000-0000-0000-0000-000000000022','e0000000-0000-0000-0000-000000000009','in_progress',NULL),
('07a507f1-418d-4efd-a35f-bee73cd2601d','c0000000-0000-0000-0000-000000000024','e0000000-0000-0000-0000-000000000009','in_progress',NULL);

-- === Brendan Lou Millares (ECE 3rd yr) — completed through Y2T3, now in Y3T1 ===
INSERT INTO academic_records (student_id, course_id, term_id, status, grade) VALUES
-- Y1T1 (AY 2023-2024) — shared courses
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000001','passed',2.5),
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000001','passed',2.0),
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-000000000001','passed',2.5),
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000005','e0000000-0000-0000-0000-000000000001','passed',3.0),
-- Y1T2
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000009','e0000000-0000-0000-0000-000000000002','passed',2.0),
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000013','e0000000-0000-0000-0000-000000000002','passed',3.0),
-- Y1T3
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000020','e0000000-0000-0000-0000-000000000003','passed',2.0),
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000022','e0000000-0000-0000-0000-000000000003','passed',2.5),
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000200','e0000000-0000-0000-0000-000000000003','passed',2.0), -- ENGPHS2
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000201','e0000000-0000-0000-0000-000000000003','passed',2.5), -- LBYPH1B
-- Y2T1 (AY 2024-2025)
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000202','e0000000-0000-0000-0000-000000000004','passed',2.5), -- ELECEN1
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000203','e0000000-0000-0000-0000-000000000004','passed',3.0), -- LBYEC2D
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000204','e0000000-0000-0000-0000-000000000004','passed',2.5), -- DATAENG
-- Y2T2
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000205','e0000000-0000-0000-0000-000000000005','passed',2.0), -- ELECEN2
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000207','e0000000-0000-0000-0000-000000000005','passed',2.5), -- TRONIC1
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000209','e0000000-0000-0000-0000-000000000005','passed',2.0), -- MATHADV
-- Y2T3
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000211','e0000000-0000-0000-0000-000000000006','passed',2.5), -- CIRLOGI
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000213','e0000000-0000-0000-0000-000000000006','passed',2.0), -- ELECMG1
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000214','e0000000-0000-0000-0000-000000000006','passed',3.0), -- TRONIC2
-- Y3T1 (Term 1, AY 2025-2026) — completed Y3T1 ECE
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000216','e0000000-0000-0000-0000-000000000007','passed',2.5), -- FEECONS
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000218','e0000000-0000-0000-0000-000000000007','passed',2.0), -- COCIMIC
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000220','e0000000-0000-0000-0000-000000000007','passed',2.5), -- COMMANA
-- Y3T2 (Term 2, AY 2025-2026) — completed Y3T2 ECE
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000225','e0000000-0000-0000-0000-000000000008','passed',2.5), -- DIGCOMT
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000228','e0000000-0000-0000-0000-000000000008','passed',3.0), -- TRONIC3
-- Y3T3 (Term 3, AY 2025-2026, ACTIVE) — in progress
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000235','e0000000-0000-0000-0000-000000000009','in_progress',NULL), -- TRANSIL
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000237','e0000000-0000-0000-0000-000000000009','in_progress',NULL), -- THSCC1A
('a0000000-0000-0000-0000-000000000105','c0000000-0000-0000-0000-000000000240','e0000000-0000-0000-0000-000000000009','in_progress',NULL); -- ECNOMCC

-- === Vito Gandeza (ECE 2nd yr) — completed through Y1T3, now in Y2T1 ===
INSERT INTO academic_records (student_id, course_id, term_id, status, grade) VALUES
-- Y1T1 (AY 2024-2025)
('f0095010-898c-4f7f-87c0-febbcf52a63e','c0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000004','passed',3.0),
('f0095010-898c-4f7f-87c0-febbcf52a63e','c0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000004','passed',2.5),
('f0095010-898c-4f7f-87c0-febbcf52a63e','c0000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-000000000004','passed',3.0),
('f0095010-898c-4f7f-87c0-febbcf52a63e','c0000000-0000-0000-0000-000000000005','e0000000-0000-0000-0000-000000000004','passed',2.5),
-- Y1T2
('f0095010-898c-4f7f-87c0-febbcf52a63e','c0000000-0000-0000-0000-000000000009','e0000000-0000-0000-0000-000000000005','passed',2.0),
('f0095010-898c-4f7f-87c0-febbcf52a63e','c0000000-0000-0000-0000-000000000011','e0000000-0000-0000-0000-000000000005','passed',3.0),
('f0095010-898c-4f7f-87c0-febbcf52a63e','c0000000-0000-0000-0000-000000000012','e0000000-0000-0000-0000-000000000005','passed',3.0),
('f0095010-898c-4f7f-87c0-febbcf52a63e','c0000000-0000-0000-0000-000000000013','e0000000-0000-0000-0000-000000000005','passed',3.5),
-- Y1T3
('f0095010-898c-4f7f-87c0-febbcf52a63e','c0000000-0000-0000-0000-000000000020','e0000000-0000-0000-0000-000000000006','passed',2.5),
('f0095010-898c-4f7f-87c0-febbcf52a63e','c0000000-0000-0000-0000-000000000022','e0000000-0000-0000-0000-000000000006','passed',2.0),
('f0095010-898c-4f7f-87c0-febbcf52a63e','c0000000-0000-0000-0000-000000000200','e0000000-0000-0000-0000-000000000006','passed',2.0), -- ENGPHS2
('f0095010-898c-4f7f-87c0-febbcf52a63e','c0000000-0000-0000-0000-000000000201','e0000000-0000-0000-0000-000000000006','passed',2.5), -- LBYPH1B
-- Y2T1 (ACTIVE - in progress)
('f0095010-898c-4f7f-87c0-febbcf52a63e','c0000000-0000-0000-0000-000000000202','e0000000-0000-0000-0000-000000000009','in_progress',NULL), -- ELECEN1
('f0095010-898c-4f7f-87c0-febbcf52a63e','c0000000-0000-0000-0000-000000000203','e0000000-0000-0000-0000-000000000009','in_progress',NULL), -- LBYEC2D
('f0095010-898c-4f7f-87c0-febbcf52a63e','c0000000-0000-0000-0000-000000000204','e0000000-0000-0000-0000-000000000009','in_progress',NULL); -- DATAENG

-- === Andrei Gyles Lim (ECE 4th yr, cleared) — extensive history ===
INSERT INTO academic_records (student_id, course_id, term_id, status, grade) VALUES
-- Y1 (AY 2022-2023) shared courses
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-00000000000a','passed',3.0),
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-00000000000a','passed',2.5),
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-00000000000a','passed',2.5),
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000009','e0000000-0000-0000-0000-00000000000b','passed',2.0),
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000013','e0000000-0000-0000-0000-00000000000b','passed',2.5),
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000022','e0000000-0000-0000-0000-00000000000c','passed',2.0),
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000200','e0000000-0000-0000-0000-00000000000c','passed',2.5), -- ENGPHS2
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000201','e0000000-0000-0000-0000-00000000000c','passed',2.5), -- LBYPH1B
-- Y2 (AY 2023-2024) ECE courses
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000202','e0000000-0000-0000-0000-000000000001','passed',2.0), -- ELECEN1
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000204','e0000000-0000-0000-0000-000000000001','passed',2.5), -- DATAENG
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000205','e0000000-0000-0000-0000-000000000002','passed',2.0), -- ELECEN2
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000207','e0000000-0000-0000-0000-000000000002','passed',2.5), -- TRONIC1
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000209','e0000000-0000-0000-0000-000000000002','passed',2.0), -- MATHADV
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000211','e0000000-0000-0000-0000-000000000003','passed',2.5), -- CIRLOGI
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000213','e0000000-0000-0000-0000-000000000003','passed',2.0), -- ELECMG1
-- Y3 (AY 2024-2025) ECE courses
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000216','e0000000-0000-0000-0000-000000000004','passed',2.5), -- FEECONS
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000218','e0000000-0000-0000-0000-000000000004','passed',2.0), -- COCIMIC
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000220','e0000000-0000-0000-0000-000000000004','passed',2.5), -- COMMANA
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000225','e0000000-0000-0000-0000-000000000005','passed',2.5), -- DIGCOMT
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000228','e0000000-0000-0000-0000-000000000005','passed',2.0), -- TRONIC3
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000235','e0000000-0000-0000-0000-000000000006','passed',2.5), -- TRANSIL
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000237','e0000000-0000-0000-0000-000000000006','passed',3.0), -- THSCC1A
-- Y4 (AY 2025-2026) ECE courses
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000241','e0000000-0000-0000-0000-000000000007','passed',2.5), -- SEMSECE
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000242','e0000000-0000-0000-0000-000000000007','passed',2.0), -- THSCC1B
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000243','e0000000-0000-0000-0000-000000000007','passed',2.5), -- COMMDAT
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000248','e0000000-0000-0000-0000-000000000008','passed',2.5), -- PRCGEEC
-- Y4T3 (ACTIVE - in progress)
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000249','e0000000-0000-0000-0000-000000000009','in_progress',NULL), -- COMWIRL
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000253','e0000000-0000-0000-0000-000000000009','in_progress',NULL), -- THSCC1C
('9c511996-4509-47a1-9f10-e9d3e328e926','c0000000-0000-0000-0000-000000000251','e0000000-0000-0000-0000-000000000009','in_progress',NULL); -- MATSENG


-- ═══════════════════════════════════════════════════════════════════
-- 11. ADVISING FORMS
-- ═══════════════════════════════════════════════════════════════════

-- Bianca: Pending form (CpE Y3)
INSERT INTO advising_forms (id, student_id, adviser_id, term_id, year_level, status, submitted_at, meeting_preference, notes, program) VALUES
('f0000000-0000-0000-0000-000000000001','c5b52365-5aa2-4479-b025-27c1db95f3e8','ebf91336-366d-4464-86cf-df4dbdf4b42f','e0000000-0000-0000-0000-000000000009',3,'pending','2026-04-03T10:30:00Z','waive','Planning to take Year 3 Term 1 courses and retake failed subjects.','BSCpE')
ON CONFLICT DO NOTHING;

-- Brendan: Pending form (ECE Y3)
INSERT INTO advising_forms (id, student_id, adviser_id, term_id, year_level, status, submitted_at, meeting_preference, notes, program) VALUES
('f0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000105','ebf91336-366d-4464-86cf-df4dbdf4b42f','e0000000-0000-0000-0000-000000000009',3,'pending','2026-04-01T14:00:00Z','schedule','I want to continue with Year 3 ECE subjects.','BSECE')
ON CONFLICT DO NOTHING;

-- Andrei: Already approved, cleared (ECE Y4)
INSERT INTO advising_forms (id, student_id, adviser_id, term_id, year_level, status, submitted_at, reviewed_at, meeting_preference, notes, program) VALUES
('f0000000-0000-0000-0000-000000000005','9c511996-4509-47a1-9f10-e9d3e328e926','a0000000-0000-0000-0000-000000000010','e0000000-0000-0000-0000-000000000009',4,'approved','2026-03-28T09:00:00Z','2026-03-29T14:00:00Z','waive','Taking Year 4 Term 3 ECE courses.','BSECE')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════
-- 12. STUDY PLANS
-- ═══════════════════════════════════════════════════════════════════

-- Bianca: Pending plan
INSERT INTO study_plans (id, student_id, term_id, status, meeting_preference, notes) VALUES
('da000000-0000-0000-0000-000000000001','c5b52365-5aa2-4479-b025-27c1db95f3e8','e0000000-0000-0000-0000-000000000009','pending','waive','Planning to take Year 3 Term 1 courses.')
ON CONFLICT DO NOTHING;

INSERT INTO study_plan_courses (plan_id, course_id, type) VALUES
('da000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000057','current'),  -- MICPROS
('da000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000062','current'),  -- DIGDACM
('da000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000065','planned'),  -- CSYSARC
('da000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000067','planned'),  -- EMBDSYS
('da000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000038','planned')   -- NUMMETS (retake)
ON CONFLICT DO NOTHING;

-- Brendan: Pending plan (ECE Y3T3)
INSERT INTO study_plans (id, student_id, term_id, status, meeting_preference, notes) VALUES
('da000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000105','e0000000-0000-0000-0000-000000000009','pending','schedule','Continuing Year 3 ECE subjects.')
ON CONFLICT DO NOTHING;

INSERT INTO study_plan_courses (plan_id, course_id, type) VALUES
('da000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000235','planned'),  -- TRANSIL
('da000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000237','planned'),  -- THSCC1A
('da000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000240','planned')   -- ECNOMCC
ON CONFLICT DO NOTHING;

-- Andrei: Approved plan
INSERT INTO study_plans (id, student_id, term_id, status, meeting_preference, notes) VALUES
('da000000-0000-0000-0000-000000000005','9c511996-4509-47a1-9f10-e9d3e328e926','e0000000-0000-0000-0000-000000000009','approved','waive','Year 4 Term 3 final ECE courses.')
ON CONFLICT DO NOTHING;

INSERT INTO study_plan_courses (plan_id, course_id, type) VALUES
('da000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000249','planned'),  -- COMWIRL
('da000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000253','planned'),  -- THSCC1C
('da000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000251','planned')   -- MATSENG
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════
-- 13. NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO notifications (user_id, title, message, type, is_read, link) VALUES
('c5b52365-5aa2-4479-b025-27c1db95f3e8','Advising Deadline Set','The advising form deadline for Term 3, AY 2025-2026 is April 10, 2026.','warning',false,'student-academic-booklet.html'),
('c5b52365-5aa2-4479-b025-27c1db95f3e8','Form Submitted','Your academic advising form has been submitted and is awaiting review.','success',false,'student-academic-booklet.html'),
('a0000000-0000-0000-0000-000000000105','Revision Requested','Your adviser requested revisions on your academic advising form.','warning',false,'student-academic-booklet.html'),
('9c511996-4509-47a1-9f10-e9d3e328e926','Form Approved','Your academic advising form has been approved by your adviser.','success',true,'student-academic-booklet.html'),
('ebf91336-366d-4464-86cf-df4dbdf4b42f','New Form Submission','Bianca Louise Manganaan submitted an academic advising form.','info',false,'advising-forms.html'),
('ebf91336-366d-4464-86cf-df4dbdf4b42f','New Form Submission','Brendan Lou Millares submitted an academic advising form.','info',true,'advising-forms.html'),
-- Concern notifications
('ebf91336-366d-4464-86cf-df4dbdf4b42f','New Student Concern','Giorgia Lubangco submitted a concern: Summer class availability','info',false,'adviser-student-concerns.html'),
('a0000000-0000-0000-0000-000000000010','New Student Concern','Vito Gandeza submitted a concern: Shifting to BS-CpE','info',false,'adviser-student-concerns.html'),
('a0000000-0000-0000-0000-000000000105','Adviser Reply','Ma''am Quiazon replied to your concern','info',false,'student-concerns.html'),
-- Appointment notifications
('a0000000-0000-0000-0000-000000000105','Appointment Confirmed','Your appointment with Ma''am Quiazon on April 7, 2026 at 2:00 PM has been confirmed.','success',false,'student-appointments.html'),
('ebf91336-366d-4464-86cf-df4dbdf4b42f','New Appointment','Brendan Lou Millares booked an appointment on April 7, 2026 at 2:00 PM.','info',false,'advising-schedule.html');


-- ═══════════════════════════════════════════════════════════════════
-- 14. CONCERNS & CONCERN REPLIES
-- ═══════════════════════════════════════════════════════════════════

-- Bianca → Erin: resolved concern
INSERT INTO concerns (id, student_id, adviser_id, subject, message, status, created_at) VALUES
('ce000000-0000-0000-0000-000000000001','c5b52365-5aa2-4479-b025-27c1db95f3e8','ebf91336-366d-4464-86cf-df4dbdf4b42f','Overloading request','Hi Ma''am, I would like to request to overload next term with 21 units. I need to catch up on my failed subjects.','resolved','2026-03-15T08:00:00Z'),
-- Bianca → Erin: active concern (ongoing thread)
('ce000000-0000-0000-0000-000000000002','c5b52365-5aa2-4479-b025-27c1db95f3e8','ebf91336-366d-4464-86cf-df4dbdf4b42f','Retaking FUNDLEC and NUMMETS','Good day Ma''am. I failed FUNDLEC and NUMMETS last term. Should I retake both this term or spread them out?','active','2026-04-01T09:00:00Z'),
-- Brendan → Erin: active concern
('ce000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000105','ebf91336-366d-4464-86cf-df4dbdf4b42f','Course load for Y3','Hi Ma''am Quiazon, I''m worried about the workload for Year 3 ECE. Can we discuss my plan?','active','2026-03-28T10:00:00Z'),
-- Giorgia → Erin: new concern (unread)
('ce000000-0000-0000-0000-000000000004','07a507f1-418d-4efd-a35f-bee73cd2601d','ebf91336-366d-4464-86cf-df4dbdf4b42f','Summer class availability','Hi po Ma''am, will there be summer classes available for ENGPHYS? I want to get ahead on my prerequisites.','new','2026-04-04T07:15:00Z'),
-- Vito → Alado: new concern (unread)
('ce000000-0000-0000-0000-000000000005','f0095010-898c-4f7f-87c0-febbcf52a63e','a0000000-0000-0000-0000-000000000010','Shifting to BS-CpE','Good afternoon Sir. I''m considering shifting from ECE to CpE. Can we discuss the process and what courses would be credited?','new','2026-04-03T14:30:00Z'),
-- Andrei → Alado: resolved concern
('ce000000-0000-0000-0000-000000000006','9c511996-4509-47a1-9f10-e9d3e328e926','a0000000-0000-0000-0000-000000000010','Practicum clearance','Sir, I need clearance for my practicum this term. Can you sign off on my requirements?','resolved','2026-02-20T11:00:00Z')
ON CONFLICT DO NOTHING;

-- Replies for concern 1 (Bianca overloading - resolved, 3 messages)
INSERT INTO concern_replies (concern_id, sender_id, sender_role, message, created_at) VALUES
('ce000000-0000-0000-0000-000000000001','ebf91336-366d-4464-86cf-df4dbdf4b42f','adviser','Hi Bianca, overloading with 21 units is possible but you need to maintain a GPA of at least 2.5. What''s your current standing?','2026-03-15T10:00:00Z'),
('ce000000-0000-0000-0000-000000000001','c5b52365-5aa2-4479-b025-27c1db95f3e8','student','My GPA last term was 2.45 Ma''am. I''ll work harder this term to bring it up.','2026-03-15T11:30:00Z'),
('ce000000-0000-0000-0000-000000000001','ebf91336-366d-4464-86cf-df4dbdf4b42f','adviser','Noted. I''ll approve the overload request. Make sure to submit the form before the deadline. Good luck!','2026-03-16T08:00:00Z')
ON CONFLICT DO NOTHING;

-- Replies for concern 2 (Bianca retaking - active, 2 messages)
INSERT INTO concern_replies (concern_id, sender_id, sender_role, message, created_at) VALUES
('ce000000-0000-0000-0000-000000000002','ebf91336-366d-4464-86cf-df4dbdf4b42f','adviser','Bianca, I recommend retaking both FUNDLEC and NUMMETS this term since they are prerequisites for your Year 3 courses.','2026-04-01T14:00:00Z'),
('ce000000-0000-0000-0000-000000000002','c5b52365-5aa2-4479-b025-27c1db95f3e8','student','Yes Ma''am, I understand. I''ll retake both. Thank you!','2026-04-02T08:30:00Z')
ON CONFLICT DO NOTHING;

-- Replies for concern 3 (Brendan course load - active, 2 messages)
INSERT INTO concern_replies (concern_id, sender_id, sender_role, message, created_at) VALUES
('ce000000-0000-0000-0000-000000000003','ebf91336-366d-4464-86cf-df4dbdf4b42f','adviser','Brendan, Year 3 ECE is heavy. I recommend prioritizing FEECONS, COCIMIC, and COMMANA for this term.','2026-03-29T09:00:00Z'),
('ce000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000105','student','Okay Ma''am, I''ll follow that plan. Can I also take SIGDISC alongside or is that too heavy?','2026-03-30T10:00:00Z')
ON CONFLICT DO NOTHING;

-- Replies for concern 6 (Andrei practicum - resolved, 2 messages)
INSERT INTO concern_replies (concern_id, sender_id, sender_role, message, created_at) VALUES
('ce000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000010','adviser','Andrei, I''ve reviewed your records. You''re cleared for practicum. Please submit the company endorsement form to the department.','2026-02-21T09:00:00Z'),
('ce000000-0000-0000-0000-000000000006','9c511996-4509-47a1-9f10-e9d3e328e926','student','Thank you Sir! I''ll submit it this week.','2026-02-21T13:00:00Z')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════
-- 15. AVAILABILITY SLOTS & APPOINTMENTS
-- ═══════════════════════════════════════════════════════════════════

-- Appointments (past + upcoming)
INSERT INTO appointments (id, student_id, adviser_id, appointment_date, purpose, status) VALUES
-- Andrei: completed appointment (past)
('ab000000-0000-0000-0000-000000000001','9c511996-4509-47a1-9f10-e9d3e328e926','a0000000-0000-0000-0000-000000000010','2026-03-24T09:00:00+08:00','Advising form discussion - Year 4 Term 3','completed'),
-- Brendan: upcoming confirmed appointment
('ab000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000105','ebf91336-366d-4464-86cf-df4dbdf4b42f','2026-04-07T14:00:00+08:00','Discuss revision of advising form and course plan','confirmed'),
-- Bianca: cancelled appointment (history)
('ab000000-0000-0000-0000-000000000003','c5b52365-5aa2-4479-b025-27c1db95f3e8','ebf91336-366d-4464-86cf-df4dbdf4b42f','2026-03-31T10:00:00+08:00','Study plan review','cancelled')
ON CONFLICT DO NOTHING;

-- Availability slots (mix of open and booked)
INSERT INTO availability_slots (adviser_id, slot_date, start_time, end_time, slot_type, is_booked, booked_by, appointment_id) VALUES
-- Alado: April 7
('a0000000-0000-0000-0000-000000000010','2026-04-07','09:00','09:30','zoom',false,NULL,NULL),
('a0000000-0000-0000-0000-000000000010','2026-04-07','09:30','10:00','zoom',false,NULL,NULL),
('a0000000-0000-0000-0000-000000000010','2026-04-07','10:00','10:30','in-person',false,NULL,NULL),
-- Alado: April 8-9
('a0000000-0000-0000-0000-000000000010','2026-04-08','13:00','13:30','zoom',false,NULL,NULL),
('a0000000-0000-0000-0000-000000000010','2026-04-08','13:30','14:00','in-person',false,NULL,NULL),
('a0000000-0000-0000-0000-000000000010','2026-04-09','09:00','09:30','zoom',false,NULL,NULL),
('a0000000-0000-0000-0000-000000000010','2026-04-09','09:30','10:00','in-person',false,NULL,NULL),
-- Erin: April 7 (1 booked by Brendan's confirmed appt)
('ebf91336-366d-4464-86cf-df4dbdf4b42f','2026-04-07','14:00','14:30','zoom',true,'a0000000-0000-0000-0000-000000000105','ab000000-0000-0000-0000-000000000002'),
('ebf91336-366d-4464-86cf-df4dbdf4b42f','2026-04-07','14:30','15:00','zoom',false,NULL,NULL),
-- Erin: April 8-9
('ebf91336-366d-4464-86cf-df4dbdf4b42f','2026-04-08','10:00','10:30','in-person',false,NULL,NULL),
('ebf91336-366d-4464-86cf-df4dbdf4b42f','2026-04-08','10:30','11:00','zoom',false,NULL,NULL),
('ebf91336-366d-4464-86cf-df4dbdf4b42f','2026-04-09','14:00','14:30','zoom',false,NULL,NULL);


-- ═══════════════════════════════════════════════════════════════════
-- 16. PROGRAMS (safe insert)
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'programs') THEN
        EXECUTE 'INSERT INTO programs (code, name) VALUES
            (''BSCpE'', ''Bachelor of Science in Computer Engineering''),
            (''BSECE'', ''Bachelor of Science in Electronics Engineering'')
            ON CONFLICT DO NOTHING';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping programs insert: %', SQLERRM;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 17. ENSURE RLS POLICIES (safe re-run)
-- ═══════════════════════════════════════════════════════════════════
-- Ensure study_plan_courses & study_plans have adviser read policies
-- (These are in supabase-migration.sql but may not have been applied)

-- Direct policy statements (more reliable than DO block with EXECUTE)
DROP POLICY IF EXISTS "Advisers can view assigned plans" ON study_plans;
CREATE POLICY "Advisers can view assigned plans" ON study_plans FOR SELECT USING (
    is_adviser() AND student_id IN (
        SELECT id FROM students WHERE adviser_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Advisers can view assigned plan courses" ON study_plan_courses;
CREATE POLICY "Advisers can view assigned plan courses" ON study_plan_courses FOR SELECT USING (
    is_adviser() AND plan_id IN (
        SELECT id FROM study_plans WHERE student_id IN (
            SELECT id FROM students WHERE adviser_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Students can manage own plan courses" ON study_plan_courses;
CREATE POLICY "Students can manage own plan courses" ON study_plan_courses FOR ALL USING (
    plan_id IN (SELECT id FROM study_plans WHERE student_id = auth.uid())
);


-- ═══════════════════════════════════════════════════════════════════
-- 17b. RPC: upsert_course_for_student (SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════════════
-- Allows students to create a course entry when it doesn't exist
-- in the courses table (e.g. manually typed course codes).
-- Returns the course UUID (existing or newly created).

CREATE OR REPLACE FUNCTION upsert_course_for_student(
    p_code varchar,
    p_title varchar,
    p_units int
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
BEGIN
    -- Try exact match
    SELECT id INTO v_id FROM courses WHERE code = p_code LIMIT 1;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;

    -- Try case-insensitive match
    SELECT id INTO v_id FROM courses WHERE UPPER(code) = UPPER(p_code) LIMIT 1;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;

    -- Insert new course
    INSERT INTO courses (code, title, units)
    VALUES (p_code, p_title, COALESCE(p_units, 0))
    RETURNING id INTO v_id;

    RETURN v_id;
EXCEPTION
    WHEN unique_violation THEN
        -- Race condition: another request inserted it
        SELECT id INTO v_id FROM courses WHERE code = p_code LIMIT 1;
        RETURN v_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 18. RPC: get_plan_courses_for_adviser (SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════════════
-- Bypasses RLS for advisers fetching study_plan_courses.
-- The adviser already proved ownership via advising_forms query.

CREATE OR REPLACE FUNCTION get_plan_courses_for_adviser(p_plan_ids uuid[])
RETURNS TABLE (
    id uuid,
    plan_id uuid,
    course_id uuid,
    type text,
    course_code varchar,
    course_title varchar,
    course_units int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        spc.id,
        spc.plan_id,
        spc.course_id,
        spc.type,
        c.code   AS course_code,
        c.title  AS course_title,
        c.units  AS course_units
    FROM study_plan_courses spc
    JOIN courses c ON c.id = spc.course_id
    WHERE spc.plan_id = ANY(p_plan_ids);
$$;

DO $$
BEGIN
    -- study_plans: adviser SELECT
    EXECUTE 'DROP POLICY IF EXISTS "Advisers can view assigned plans" ON study_plans';
    EXECUTE 'CREATE POLICY "Advisers can view assigned plans" ON study_plans FOR SELECT USING (
        is_adviser() AND student_id IN (
            SELECT id FROM students WHERE adviser_id = auth.uid()
        )
    )';

    -- study_plan_courses: adviser SELECT
    EXECUTE 'DROP POLICY IF EXISTS "Advisers can view assigned plan courses" ON study_plan_courses';
    EXECUTE 'CREATE POLICY "Advisers can view assigned plan courses" ON study_plan_courses FOR SELECT USING (
        is_adviser() AND plan_id IN (
            SELECT id FROM study_plans WHERE student_id IN (
                SELECT id FROM students WHERE adviser_id = auth.uid()
            )
        )
    )';

    -- study_plan_courses: student manage own
    EXECUTE 'DROP POLICY IF EXISTS "Students can manage own plan courses" ON study_plan_courses';
    EXECUTE 'CREATE POLICY "Students can manage own plan courses" ON study_plan_courses FOR ALL USING (
        plan_id IN (SELECT id FROM study_plans WHERE student_id = auth.uid())
    )';

    RAISE NOTICE 'RLS policies for study_plans / study_plan_courses applied.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RLS policy creation skipped: %', SQLERRM;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════
-- TEST ACCOUNTS SUMMARY
-- ═══════════════════════════════════════════════════════════════════
-- All passwords: test12345
-- Login with School ID (not email)
--
-- | Role    | School ID  | Name                       | Program | Year | Notes                          |
-- |---------|------------|----------------------------|---------|------|--------------------------------|
-- | Admin   | admin001   | Renjovil Joseph Lascano    | —       | —    | Full admin access              |
-- | Adviser | 22318531   | Erin Quiazon               | ECE     | —    | Advises: Bianca, Giorgia, Brendan |
-- | Adviser | 23456789   | Christian John Alado       | CpE     | —    | Advises: Vito, Andrei          |
-- | Student | 12311588   | Bianca Louise Manganaan    | BS-CpE  | 3    | Pending form, 6 failed units   |
-- | Student | 12567890   | Giorgia Lubangco           | BS-CpE  | 1    | No form yet, fresh student     |
-- | Student | 12345678   | Brendan Lou Millares       | BS-ECE  | 3    | Pending form                   |
-- | Student | 12456789   | Vito Gandeza               | BS-ECE  | 2    | No form yet                    |
-- | Student | 12234567   | Andrei Gyles Lim           | BS-ECE  | 4    | Approved form, cleared         |
