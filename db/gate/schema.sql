-- ============================================================================
-- GATE Mock Test Platform — Postgres Schema (gate.*)
-- Version: 1.0.0
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS gate;

-- ENUM TYPES
CREATE TYPE gate.question_type AS ENUM ('MCQ', 'MSQ', 'NAT');
CREATE TYPE gate.difficulty_level AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE gate.question_status AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE gate.attempt_status AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'INVALIDATED');
CREATE TYPE gate.attempt_mode AS ENUM ('RANKED', 'PRACTICE', 'DEMO');
CREATE TYPE gate.gate_role AS ENUM ('STUDENT', 'SME', 'ADMIN');
CREATE TYPE gate.subscription_status AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');
CREATE TYPE gate.import_batch_status AS ENUM ('PENDING', 'VALIDATING', 'FAILED', 'COMPLETED');
CREATE TYPE gate.errata_status AS ENUM ('OPEN', 'ACCEPTED', 'REJECTED', 'PUBLISHED');
CREATE TYPE gate.deletion_status AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');
CREATE TYPE gate.section_type AS ENUM ('GA', 'CORE');

-- ============================================================================
-- 1. IDENTITY / ROLES
-- ============================================================================

CREATE TABLE gate.memberships (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       gate.gate_role NOT NULL DEFAULT 'STUDENT',
  sme_tags   text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memberships_pkey PRIMARY KEY (user_id)
);
CREATE INDEX idx_memberships_role ON gate.memberships(role);

-- ============================================================================
-- 2. CONTENT: QUESTIONS
-- ============================================================================

CREATE TABLE gate.subjects (
  id   uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  CONSTRAINT subjects_pkey PRIMARY KEY (id)
);

CREATE TABLE gate.topics (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES gate.subjects(id),
  name       text NOT NULL,
  CONSTRAINT topics_pkey PRIMARY KEY (id),
  CONSTRAINT topics_subject_name_uq UNIQUE (subject_id, name)
);

CREATE TABLE gate.questions (
  id                  uuid NOT NULL DEFAULT gen_random_uuid(),
  year                integer,
  subject_id          uuid NOT NULL REFERENCES gate.subjects(id),
  topic_id            uuid REFERENCES gate.topics(id),
  sub_topic           text,
  difficulty          gate.difficulty_level NOT NULL DEFAULT 'MEDIUM',
  type                gate.question_type NOT NULL,
  marks               integer NOT NULL CHECK (marks IN (1, 2)),
  active_usage_count  integer NOT NULL DEFAULT 0 CHECK (active_usage_count >= 0),
  creator_id          uuid NOT NULL REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT questions_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_questions_subject ON gate.questions(subject_id);
CREATE INDEX idx_questions_type ON gate.questions(type);
CREATE INDEX idx_questions_difficulty ON gate.questions(difficulty);
CREATE INDEX idx_questions_creator ON gate.questions(creator_id);

CREATE TABLE gate.question_versions (
  id                            uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id                   uuid NOT NULL REFERENCES gate.questions(id) ON DELETE CASCADE,
  version                       integer NOT NULL DEFAULT 1,
  status                        gate.question_status NOT NULL DEFAULT 'DRAFT',
  question_text_markdown        text NOT NULL,
  solution_explanation_markdown  text,
  nat_lower_bound               numeric,
  nat_upper_bound               numeric,
  nat_precision                 integer CHECK (nat_precision IS NULL OR nat_precision >= 0),
  creator_id                    uuid NOT NULL REFERENCES auth.users(id),
  approver_id                   uuid REFERENCES auth.users(id),
  approved_at                   timestamptz,
  reject_comment                text,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_versions_pkey PRIMARY KEY (id),
  CONSTRAINT question_versions_question_version_uq UNIQUE (question_id, version),
  CONSTRAINT question_versions_nat_check CHECK (
    (nat_lower_bound IS NULL AND nat_upper_bound IS NULL AND nat_precision IS NULL)
    OR (nat_lower_bound IS NOT NULL AND nat_upper_bound IS NOT NULL AND nat_precision IS NOT NULL
        AND nat_lower_bound <= nat_upper_bound)
  ),
  CONSTRAINT question_versions_maker_checker CHECK (approver_id IS NULL OR creator_id != approver_id)
);
CREATE INDEX idx_qv_question ON gate.question_versions(question_id);
CREATE INDEX idx_qv_status ON gate.question_versions(status);

CREATE TABLE gate.question_options (
  id                  uuid NOT NULL DEFAULT gen_random_uuid(),
  question_version_id uuid NOT NULL REFERENCES gate.question_versions(id) ON DELETE CASCADE,
  option_index        integer NOT NULL,
  option_text         text NOT NULL,
  CONSTRAINT question_options_pkey PRIMARY KEY (id),
  CONSTRAINT question_options_version_index_uq UNIQUE (question_version_id, option_index)
);

CREATE TABLE gate.question_correct_options (
  question_version_id uuid NOT NULL REFERENCES gate.question_versions(id) ON DELETE CASCADE,
  option_id           uuid NOT NULL REFERENCES gate.question_options(id) ON DELETE CASCADE,
  CONSTRAINT question_correct_options_pkey PRIMARY KEY (question_version_id, option_id)
);

CREATE TABLE gate.question_assets (
  id                  uuid NOT NULL DEFAULT gen_random_uuid(),
  question_version_id uuid NOT NULL REFERENCES gate.question_versions(id) ON DELETE CASCADE,
  s3_key              text NOT NULL,
  content_type        text NOT NULL,
  file_size_bytes     integer NOT NULL CHECK (file_size_bytes > 0),
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_assets_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 3. BLUEPRINTS + TEST VERSIONS
-- ============================================================================

CREATE TABLE gate.blueprint_profiles (
  id                    uuid NOT NULL DEFAULT gen_random_uuid(),
  name                  text NOT NULL UNIQUE,
  paper_code            text NOT NULL,
  total_questions       integer NOT NULL,
  total_marks           integer NOT NULL,
  ga_questions          integer NOT NULL,
  ga_marks              integer NOT NULL,
  ga_1mark_count        integer NOT NULL,
  ga_2mark_count        integer NOT NULL,
  core_questions        integer NOT NULL,
  core_marks            integer NOT NULL,
  core_1mark_count      integer NOT NULL,
  core_2mark_count      integer NOT NULL,
  core_mcq_min          integer NOT NULL,
  core_mcq_max          integer NOT NULL,
  core_msq_min          integer NOT NULL,
  core_msq_max          integer NOT NULL,
  core_nat_min          integer NOT NULL,
  core_nat_max          integer NOT NULL,
  difficulty_easy_pct   integer NOT NULL DEFAULT 30,
  difficulty_medium_pct integer NOT NULL DEFAULT 50,
  difficulty_hard_pct   integer NOT NULL DEFAULT 20,
  duration_seconds      integer NOT NULL DEFAULT 10800,
  pass_percent          numeric NOT NULL DEFAULT 25.00,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blueprint_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT blueprint_difficulty_sum CHECK (difficulty_easy_pct + difficulty_medium_pct + difficulty_hard_pct = 100),
  CONSTRAINT blueprint_ga_marks CHECK (ga_1mark_count * 1 + ga_2mark_count * 2 = ga_marks),
  CONSTRAINT blueprint_core_marks CHECK (core_1mark_count * 1 + core_2mark_count * 2 = core_marks),
  CONSTRAINT blueprint_total CHECK (ga_questions + core_questions = total_questions),
  CONSTRAINT blueprint_total_marks CHECK (ga_marks + core_marks = total_marks)
);

CREATE TABLE gate.test_versions (
  id                        uuid NOT NULL DEFAULT gen_random_uuid(),
  blueprint_profile_id      uuid NOT NULL REFERENCES gate.blueprint_profiles(id),
  title                     text NOT NULL,
  description               text,
  is_demo                   boolean NOT NULL DEFAULT false,
  is_active                 boolean NOT NULL DEFAULT true,
  chosen_core_mcq_count     integer NOT NULL,
  chosen_core_msq_count     integer NOT NULL,
  chosen_core_nat_count     integer NOT NULL,
  difficulty_easy_count     integer NOT NULL,
  difficulty_medium_count   integer NOT NULL,
  difficulty_hard_count     integer NOT NULL,
  starts_at                 timestamptz,
  ends_at                   timestamptz,
  show_score_to_student     boolean NOT NULL DEFAULT true,
  show_correct_after_submit boolean NOT NULL DEFAULT false,
  created_by                uuid NOT NULL REFERENCES auth.users(id),
  created_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT test_versions_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_tv_active ON gate.test_versions(is_active) WHERE is_active = true;

CREATE TABLE gate.test_version_questions (
  test_version_id     uuid NOT NULL REFERENCES gate.test_versions(id) ON DELETE CASCADE,
  question_version_id uuid NOT NULL REFERENCES gate.question_versions(id),
  section             gate.section_type NOT NULL,
  question_order      integer NOT NULL,
  CONSTRAINT tvq_pkey PRIMARY KEY (test_version_id, question_version_id),
  CONSTRAINT tvq_order_uq UNIQUE (test_version_id, question_order)
);

-- ============================================================================
-- 4. ATTEMPTS
-- ============================================================================

CREATE TABLE gate.attempts (
  id                    uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES auth.users(id),
  guest_token           text,
  test_version_id       uuid NOT NULL REFERENCES gate.test_versions(id),
  mode                  gate.attempt_mode NOT NULL,
  status                gate.attempt_status NOT NULL DEFAULT 'IN_PROGRESS',
  started_at            timestamptz NOT NULL DEFAULT now(),
  ends_at               timestamptz NOT NULL,
  submitted_at          timestamptz,
  invalidated_at        timestamptz,
  invalidation_reason   text,
  expires_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attempts_pkey PRIMARY KEY (id),
  CONSTRAINT attempts_identity_check CHECK (
    (mode = 'DEMO' AND (guest_token IS NOT NULL OR user_id IS NOT NULL))
    OR (mode != 'DEMO' AND user_id IS NOT NULL)
  )
);

-- Exactly 1 active attempt per authenticated user
CREATE UNIQUE INDEX idx_attempts_one_active_per_user
  ON gate.attempts(user_id)
  WHERE user_id IS NOT NULL AND status = 'IN_PROGRESS';

CREATE INDEX idx_attempts_user ON gate.attempts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_attempts_status ON gate.attempts(status);
CREATE INDEX idx_attempts_demo_cleanup ON gate.attempts(expires_at)
  WHERE mode = 'DEMO' AND expires_at IS NOT NULL;
CREATE INDEX idx_attempts_orphan ON gate.attempts(ends_at)
  WHERE status = 'IN_PROGRESS';

CREATE TABLE gate.attempt_metadata (
  attempt_id            uuid NOT NULL REFERENCES gate.attempts(id) ON DELETE CASCADE,
  shuffle_seed          text NOT NULL,
  question_order_hash   text NOT NULL,
  client_ua             text,
  client_ip             inet,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attempt_metadata_pkey PRIMARY KEY (attempt_id)
);

CREATE TABLE gate.attempt_answers (
  attempt_id            uuid NOT NULL REFERENCES gate.attempts(id) ON DELETE CASCADE,
  question_version_id   uuid NOT NULL REFERENCES gate.question_versions(id),
  selected_option_ids   uuid[],
  nat_value_raw         text,
  nat_value_normalized  numeric,
  saved_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attempt_answers_pkey PRIMARY KEY (attempt_id, question_version_id)
);

CREATE TABLE gate.attempt_question_scores (
  attempt_id            uuid NOT NULL REFERENCES gate.attempts(id) ON DELETE CASCADE,
  question_version_id   uuid NOT NULL REFERENCES gate.question_versions(id),
  earned_marks          numeric NOT NULL,
  max_marks             numeric NOT NULL,
  correct               boolean NOT NULL,
  CONSTRAINT attempt_question_scores_pkey PRIMARY KEY (attempt_id, question_version_id)
);

CREATE TABLE gate.attempt_results (
  attempt_id             uuid NOT NULL REFERENCES gate.attempts(id) ON DELETE CASCADE,
  score                  numeric NOT NULL,
  max_score              numeric NOT NULL,
  percent                numeric NOT NULL,
  passed                 boolean NOT NULL,
  adjusted_score         numeric,
  errata_applied_at      timestamptz,
  errata_version_used    text,
  percentile             numeric,
  percentile_computed_at timestamptz,
  graded_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attempt_results_pkey PRIMARY KEY (attempt_id)
);

-- ============================================================================
-- 5. SME IMPORT PIPELINE
-- ============================================================================

CREATE TABLE gate.import_batches (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  uploaded_by  uuid NOT NULL REFERENCES auth.users(id),
  file_name    text NOT NULL,
  file_format  text NOT NULL DEFAULT 'CSV',
  status       gate.import_batch_status NOT NULL DEFAULT 'PENDING',
  total_rows   integer,
  valid_rows   integer,
  error_rows   integer,
  error_detail jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT import_batches_pkey PRIMARY KEY (id)
);

CREATE TABLE gate.import_rows (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_id     uuid NOT NULL REFERENCES gate.import_batches(id) ON DELETE CASCADE,
  row_number   integer NOT NULL,
  raw_data     jsonb NOT NULL,
  question_id  uuid REFERENCES gate.questions(id),
  is_valid     boolean,
  errors       jsonb,
  CONSTRAINT import_rows_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 6. ERRATA
-- ============================================================================

CREATE TABLE gate.errata_reports (
  id                    uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id           uuid NOT NULL REFERENCES gate.questions(id),
  question_version_id   uuid NOT NULL REFERENCES gate.question_versions(id),
  reported_by           uuid NOT NULL REFERENCES auth.users(id),
  attempt_id            uuid REFERENCES gate.attempts(id),
  reason                text NOT NULL,
  status                gate.errata_status NOT NULL DEFAULT 'OPEN',
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT errata_reports_pkey PRIMARY KEY (id)
);

CREATE TABLE gate.errata_events (
  id                    uuid NOT NULL DEFAULT gen_random_uuid(),
  errata_report_id      uuid NOT NULL REFERENCES gate.errata_reports(id),
  question_id           uuid NOT NULL REFERENCES gate.questions(id),
  from_version_id       uuid NOT NULL REFERENCES gate.question_versions(id),
  to_version_id         uuid NOT NULL REFERENCES gate.question_versions(id),
  approved_by           uuid NOT NULL REFERENCES auth.users(id),
  published_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT errata_events_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 7. COMMERCE
-- ============================================================================

CREATE TABLE gate.subscriptions (
  id                          uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider                    text NOT NULL DEFAULT 'razorpay',
  provider_subscription_id    text UNIQUE,
  status                      gate.subscription_status NOT NULL DEFAULT 'ACTIVE',
  plan_id                     text,
  current_period_start        timestamptz,
  current_period_end          timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_subscriptions_user ON gate.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON gate.subscriptions(status);

CREATE TABLE gate.payment_events (
  id                    uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_event_id     text NOT NULL,
  event_type            text NOT NULL,
  raw_json              jsonb NOT NULL,
  status                text NOT NULL DEFAULT 'RECEIVED',
  received_at           timestamptz NOT NULL DEFAULT now(),
  processed_at          timestamptz,
  CONSTRAINT payment_events_pkey PRIMARY KEY (id),
  CONSTRAINT payment_events_provider_event_uq UNIQUE (provider_event_id)
);

-- ============================================================================
-- 8. AUDIT / SECURITY
-- ============================================================================

CREATE TABLE gate.audit_log (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id),
  action       text NOT NULL,
  resource     text,
  detail       jsonb,
  ip_address   inet,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_audit_log_user ON gate.audit_log(user_id);
CREATE INDEX idx_audit_log_created ON gate.audit_log(created_at);

CREATE TABLE gate.abuse_flags (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id),
  flag_type    text NOT NULL,
  detail       jsonb,
  resolved     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz,
  CONSTRAINT abuse_flags_pkey PRIMARY KEY (id)
);

CREATE TABLE gate.deletion_queue (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id),
  scheduled_for timestamptz NOT NULL,
  status        gate.deletion_status NOT NULL DEFAULT 'PENDING',
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  CONSTRAINT deletion_queue_pkey PRIMARY KEY (id)
);
