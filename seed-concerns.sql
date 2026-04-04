-- ═══════════════════════════════════════════════════════════════════
-- Concerns Cleanup & Seed Script
-- Run this in Supabase SQL Editor AFTER running the migration
-- ═══════════════════════════════════════════════════════════════════

-- 1. Clean up existing concern data
DELETE FROM concern_replies;
DELETE FROM concerns;

-- 2. Create the concern_replies table if not yet created
CREATE TABLE IF NOT EXISTS concern_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concern_id UUID NOT NULL REFERENCES concerns(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id),
    sender_role TEXT NOT NULL CHECK (sender_role IN ('student', 'adviser')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2b. Update concerns status constraint to allow 'active' and 'resolved'
ALTER TABLE concerns DROP CONSTRAINT IF EXISTS concerns_status_check;
ALTER TABLE concerns ADD CONSTRAINT concerns_status_check
    CHECK (status IN ('new', 'read', 'replied', 'active', 'resolved'));

-- 3. Seed concerns for EVERY student that has an adviser assigned
-- This creates 2-3 concerns per student with varying statuses
DO $$
DECLARE
    r RECORD;
    c_id UUID;
BEGIN
    FOR r IN
        SELECT s.id AS student_id, s.adviser_id,
               p.first_name, p.last_name
        FROM students s
        JOIN profiles p ON p.id = s.id
        WHERE s.adviser_id IS NOT NULL
    LOOP
        -- Concern 1: Resolved with thread (oldest)
        INSERT INTO concerns (student_id, adviser_id, subject, message, status, created_at)
        VALUES (
            r.student_id, r.adviser_id,
            'Prerequisite Validation',
            'Hi! I want to confirm if I can take CSYSARC and EMBDSYS next term. Both require MICPROS as a prerequisite, which I just completed this term with a grade of 2.0. Could you verify my eligibility?',
            'resolved',
            NOW() - INTERVAL '45 days'
        ) RETURNING id INTO c_id;

        -- Thread replies for concern 1
        INSERT INTO concern_replies (concern_id, sender_id, sender_role, message, created_at) VALUES
        (c_id, r.adviser_id, 'adviser',
         'Hi ' || r.first_name || ', I checked your records and you are eligible for both CSYSARC and EMBDSYS. Your MICPROS grade of 2.0 meets the prerequisite. Go ahead and enlist!',
         NOW() - INTERVAL '44 days'),
        (c_id, r.student_id, 'student',
         'Thank you so much! I will enlist in both courses. Should I also consider taking DASPROG alongside them?',
         NOW() - INTERVAL '43 days'),
        (c_id, r.adviser_id, 'adviser',
         'I would recommend focusing on CSYSARC and EMBDSYS first since they are both heavy lab courses. You can take DASPROG next term. Let me know if you need anything else!',
         NOW() - INTERVAL '42 days'),
        (c_id, r.student_id, 'student',
         'Got it. Thanks for the advice!',
         NOW() - INTERVAL '42 days' + INTERVAL '2 hours');

        -- Concern 2: Active with replies (medium age)
        INSERT INTO concerns (student_id, adviser_id, subject, message, status, created_at)
        VALUES (
            r.student_id, r.adviser_id,
            'Study Plan Review',
            'I submitted my study plan for next term and included REMETHS which requires ENGDATA, GEPCOMM, and LOGDSGN. I have passed all three but the prerequisite validation has not confirmed it yet. Also, is it possible to get an overload of 1 unit since I want to take LBYCPG3 as well?',
            'active',
            NOW() - INTERVAL '10 days'
        ) RETURNING id INTO c_id;

        -- Thread replies for concern 2
        INSERT INTO concern_replies (concern_id, sender_id, sender_role, message, created_at) VALUES
        (c_id, r.adviser_id, 'adviser',
         'I can see your prerequisite records and everything checks out for REMETHS. The validation system sometimes lags — I will manually approve it. Regarding the overload, you will need to file a petition. I can endorse it if your GPA is at least 2.5.',
         NOW() - INTERVAL '9 days'),
        (c_id, r.student_id, 'student',
         'My GPA last term was 2.3. Would that qualify for the overload petition?',
         NOW() - INTERVAL '8 days');

        -- Concern 3: New/unread (recent)
        INSERT INTO concerns (student_id, adviser_id, subject, message, status, created_at)
        VALUES (
            r.student_id, r.adviser_id,
            'Course Retake Policy',
            'I failed CSMCPRO (Microprocessors) during the previous academic year. I want to ask about the retake policy and whether I should take it again this coming term or wait until I have completed more prerequisite foundation courses. I am also concerned about how the accumulated failure units will affect my standing.',
            'new',
            NOW() - INTERVAL '2 days'
        );

    END LOOP;
END $$;

-- 4. Verify seed results
SELECT
    'Concerns created' AS metric,
    COUNT(*) AS count
FROM concerns
UNION ALL
SELECT
    'Replies created',
    COUNT(*)
FROM concern_replies
UNION ALL
SELECT
    'Students with concerns',
    COUNT(DISTINCT student_id)
FROM concerns;
