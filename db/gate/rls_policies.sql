-- ============================================================================
-- GATE RLS Policies
-- ============================================================================

-- Helper function: get current user's GATE role
CREATE OR REPLACE FUNCTION gate.current_user_role()
RETURNS gate.gate_role AS $$
  SELECT role FROM gate.memberships WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- ATTEMPTS (Student isolation: own attempts only)
-- ============================================================================
ALTER TABLE gate.attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own attempts"
  ON gate.attempts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Students insert own attempts"
  ON gate.attempts FOR INSERT
  WITH CHECK (user_id = auth.uid() OR mode = 'DEMO');

CREATE POLICY "Admins read all attempts"
  ON gate.attempts FOR SELECT
  USING (gate.current_user_role() = 'ADMIN');

-- ============================================================================
-- ATTEMPT_METADATA
-- ============================================================================
ALTER TABLE gate.attempt_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own attempt_metadata"
  ON gate.attempt_metadata FOR SELECT
  USING (attempt_id IN (SELECT id FROM gate.attempts WHERE user_id = auth.uid()));

CREATE POLICY "Admins read all attempt_metadata"
  ON gate.attempt_metadata FOR SELECT
  USING (gate.current_user_role() = 'ADMIN');

-- ============================================================================
-- ATTEMPT_ANSWERS
-- ============================================================================
ALTER TABLE gate.attempt_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own answers"
  ON gate.attempt_answers FOR SELECT
  USING (attempt_id IN (SELECT id FROM gate.attempts WHERE user_id = auth.uid()));

CREATE POLICY "Admins read all answers"
  ON gate.attempt_answers FOR SELECT
  USING (gate.current_user_role() = 'ADMIN');

-- ============================================================================
-- ATTEMPT_QUESTION_SCORES
-- ============================================================================
ALTER TABLE gate.attempt_question_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own scores"
  ON gate.attempt_question_scores FOR SELECT
  USING (attempt_id IN (SELECT id FROM gate.attempts WHERE user_id = auth.uid()));

CREATE POLICY "Admins read all scores"
  ON gate.attempt_question_scores FOR SELECT
  USING (gate.current_user_role() = 'ADMIN');

-- ============================================================================
-- ATTEMPT_RESULTS
-- ============================================================================
ALTER TABLE gate.attempt_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own results"
  ON gate.attempt_results FOR SELECT
  USING (attempt_id IN (SELECT id FROM gate.attempts WHERE user_id = auth.uid()));

CREATE POLICY "Admins read all results"
  ON gate.attempt_results FOR SELECT
  USING (gate.current_user_role() = 'ADMIN');

-- ============================================================================
-- QUESTION_VERSIONS (SME isolation: own drafts + pulled review items)
-- ============================================================================
ALTER TABLE gate.question_versions ENABLE ROW LEVEL SECURITY;

-- SMEs can see their own drafts
CREATE POLICY "SMEs read own drafts"
  ON gate.question_versions FOR SELECT
  USING (
    creator_id = auth.uid()
    AND gate.current_user_role() = 'SME'
  );

-- SMEs can see items in PENDING_REVIEW (filtered by tags in app layer)
CREATE POLICY "SMEs read pending review items"
  ON gate.question_versions FOR SELECT
  USING (
    status = 'PENDING_REVIEW'
    AND gate.current_user_role() = 'SME'
  );

-- SMEs can update their own drafts
CREATE POLICY "SMEs update own drafts"
  ON gate.question_versions FOR UPDATE
  USING (
    creator_id = auth.uid()
    AND status = 'DRAFT'
    AND gate.current_user_role() = 'SME'
  );

-- SMEs can insert new versions
CREATE POLICY "SMEs insert versions"
  ON gate.question_versions FOR INSERT
  WITH CHECK (
    creator_id = auth.uid()
    AND gate.current_user_role() IN ('SME', 'ADMIN')
  );

-- Published questions readable by all authenticated users
CREATE POLICY "All read published questions"
  ON gate.question_versions FOR SELECT
  USING (status = 'PUBLISHED');

-- Admins see everything
CREATE POLICY "Admins full access to question_versions"
  ON gate.question_versions FOR ALL
  USING (gate.current_user_role() = 'ADMIN');

-- ============================================================================
-- QUESTIONS (stable identity)
-- ============================================================================
ALTER TABLE gate.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SMEs read own questions"
  ON gate.questions FOR SELECT
  USING (creator_id = auth.uid() AND gate.current_user_role() = 'SME');

CREATE POLICY "Admins full access to questions"
  ON gate.questions FOR ALL
  USING (gate.current_user_role() = 'ADMIN');

CREATE POLICY "All read questions with published versions"
  ON gate.questions FOR SELECT
  USING (
    id IN (
      SELECT question_id FROM gate.question_versions WHERE status = 'PUBLISHED'
    )
  );

-- ============================================================================
-- IMPORT_BATCHES (SME sees own imports)
-- ============================================================================
ALTER TABLE gate.import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SMEs read own imports"
  ON gate.import_batches FOR SELECT
  USING (uploaded_by = auth.uid());

CREATE POLICY "SMEs insert imports"
  ON gate.import_batches FOR INSERT
  WITH CHECK (uploaded_by = auth.uid() AND gate.current_user_role() IN ('SME', 'ADMIN'));

CREATE POLICY "Admins full access to imports"
  ON gate.import_batches FOR ALL
  USING (gate.current_user_role() = 'ADMIN');

-- ============================================================================
-- ERRATA_REPORTS
-- ============================================================================
ALTER TABLE gate.errata_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students insert errata reports"
  ON gate.errata_reports FOR INSERT
  WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Students read own errata reports"
  ON gate.errata_reports FOR SELECT
  USING (reported_by = auth.uid());

CREATE POLICY "SMEs and Admins read all errata"
  ON gate.errata_reports FOR SELECT
  USING (gate.current_user_role() IN ('SME', 'ADMIN'));

-- ============================================================================
-- SUBSCRIPTIONS (user sees own)
-- ============================================================================
ALTER TABLE gate.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscriptions"
  ON gate.subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all subscriptions"
  ON gate.subscriptions FOR SELECT
  USING (gate.current_user_role() = 'ADMIN');

-- ============================================================================
-- AUDIT_LOG (append-only, admin-read)
-- ============================================================================
ALTER TABLE gate.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit_log"
  ON gate.audit_log FOR SELECT
  USING (gate.current_user_role() = 'ADMIN');

-- No UPDATE/DELETE policies = append-only enforced

-- ============================================================================
-- Read-only tables for all authenticated users
-- ============================================================================
-- subjects, topics, blueprint_profiles, test_versions, test_version_questions
-- question_options, question_correct_options are readable by all authenticated

ALTER TABLE gate.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All read subjects" ON gate.subjects FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE gate.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All read topics" ON gate.topics FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE gate.blueprint_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All read blueprints" ON gate.blueprint_profiles FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE gate.test_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All read active test versions" ON gate.test_versions FOR SELECT USING (is_active = true);
CREATE POLICY "Admins full access test versions" ON gate.test_versions FOR ALL USING (gate.current_user_role() = 'ADMIN');

ALTER TABLE gate.test_version_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All read tvq" ON gate.test_version_questions FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE gate.question_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All read options" ON gate.question_options FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE gate.question_correct_options ENABLE ROW LEVEL SECURITY;
-- Only service role reads correct options during grading (not exposed to students)
CREATE POLICY "Admins read correct options" ON gate.question_correct_options FOR SELECT
  USING (gate.current_user_role() = 'ADMIN');
