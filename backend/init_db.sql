-- Run this in your Supabase SQL Editor

create table jobs (
    id uuid primary key default gen_random_uuid(),
    created_by uuid references users(id) not null,
    title text not null,
    department text not null,
    description text not null,
    skills_required jsonb not null default '[]'::jsonb,
    experience_level text not null,
    openings integer not null default 1,
    status text not null default 'published' check (status in ('published', 'draft', 'closed')),
    config_json jsonb not null default '{}'::jsonb,
    salary text,
    created_at timestamptz default now()
);

-- Note: student_id can be null if public portal users apply without creating an account immediately
create table applications (
    id uuid primary key default gen_random_uuid(),
    job_id uuid references jobs(id) not null,
    student_id uuid references users(id), 
    full_name text not null,
    email text not null,
    phone text,
    resume_url text not null,
    linkedin text,
    github text,
    status text not null default 'applied' check (status in ('applied', 'accepted', 'rejected', 'hired')),
    ai_score integer default 0,
    ai_strengths jsonb default '[]'::jsonb,
    ai_missing jsonb default '[]'::jsonb,
    ai_recommendation text,
    applied_at timestamptz default now()
);

-- Renamed from invites for the new workflow
create table assessment_links (
    id uuid primary key default gen_random_uuid(),
    application_id uuid references applications(id) not null,
    job_id uuid references jobs(id) not null,
    email text not null,
    token text unique not null,
    status text not null default 'pending' check (status in ('pending', 'completed', 'expired')),
    expires_at timestamptz not null,
    created_at timestamptz default now()
);

create table coding_results (
    id uuid primary key default gen_random_uuid(),
    assessment_link_id uuid references assessment_links(id) not null,
    question_id uuid references coding_questions(id),
    code_submitted text,
    test_cases_passed integer default 0,
    total_test_cases integer default 0,
    efficiency_score integer default 0,
    created_at timestamptz default now()
);

create table interview_results (
    id uuid primary key default gen_random_uuid(),
    assessment_link_id uuid references assessment_links(id) not null,
    question_id uuid references interview_questions(id),
    transcript text,
    communication_score integer default 0,
    technical_score integer default 0,
    created_at timestamptz default now()
);

-- ==========================================
-- PHASE 4 EXTENSION: DYNAMIC ASSESSMENTS
-- ==========================================

create table assessment_config (
    id uuid primary key default gen_random_uuid(),
    job_id uuid references jobs(id) unique not null,
    coding_time_limit integer default 60,
    warning_limit integer default 3,
    created_at timestamptz default now()
);

create table coding_questions (
    id uuid primary key default gen_random_uuid(),
    job_id uuid references jobs(id) not null,
    title text not null,
    description text not null,
    function_signature text not null,
    difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
    technique text not null,
    public_testcases jsonb not null default '[]'::jsonb,
    hidden_testcases jsonb not null default '[]'::jsonb,
    created_at timestamptz default now()
);

create table interview_questions (
    id uuid primary key default gen_random_uuid(),
    job_id uuid references jobs(id) not null,
    question text not null,
    expected_points jsonb not null default '[]'::jsonb,
    keywords jsonb not null default '[]'::jsonb,
    difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
    created_at timestamptz default now()
);
