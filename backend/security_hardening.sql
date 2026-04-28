-- ==========================================
-- SUPABASE SECURITY HARDENING: RLS MIGRATION
-- ==========================================
-- This script enables Row Level Security (RLS) on all tables
-- and ensures ONLY the backend (service_role) has access.
-- No policies are created for 'anon', effectively blocking public access.

-- 1. ENABLE RLS ON ALL TABLES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;

-- 2. CREATE SERVICE ROLE POLICIES
-- Supabase service_role usually bypasses RLS, but explicit policies 
-- ensure consistency and defense in depth.

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'users', 'jobs', 'applications', 'assessment_links', 
        'coding_results', 'interview_results', 'assessment_config', 
        'coding_questions', 'interview_questions'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "service_role_all_access" ON %I', t);
        EXECUTE format('CREATE POLICY "service_role_all_access" ON %I TO service_role USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- 3. ADDITIONAL HARDENING: SENSITIVE COLUMNS
-- Even though anon is blocked, we explicitly revoke password_hash access 
-- to prevent accidental exposure via generic public roles.
REVOKE SELECT (password_hash) ON users FROM public, anon, authenticated;

-- 4. VERIFICATION QUERY
-- Run this check to see RLS status of all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
