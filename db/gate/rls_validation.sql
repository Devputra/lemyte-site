-- ============================================================================
-- GATE RLS Validation Queries
-- Run these to prove isolation. Each query should return 0 rows when
-- executed as the wrong user role.
-- ============================================================================

-- ============================================================================
-- TEST 1: Student cannot see other students' attempts
-- ============================================================================
-- As student_a: should see only their own attempts
-- SET LOCAL role TO 'authenticated';
-- SET LOCAL request.jwt.claims TO '{"sub": "<student_a_uuid>"}';
SELECT 'TEST 1: Student attempt isolation' AS test_name;
SELECT count(*) AS should_be_zero
FROM gate.attempts
WHERE user_id != auth.uid()
  AND auth.uid() IS NOT NULL;

-- ============================================================================
-- TEST 2: Student cannot see other students' answers
-- ============================================================================
SELECT 'TEST 2: Student answer isolation' AS test_name;
SELECT count(*) AS should_be_zero
FROM gate.attempt_answers aa
WHERE aa.attempt_id NOT IN (
  SELECT id FROM gate.attempts WHERE user_id = auth.uid()
);

-- ============================================================================
-- TEST 3: Student cannot see other students' results
-- ============================================================================
SELECT 'TEST 3: Student result isolation' AS test_name;
SELECT count(*) AS should_be_zero
FROM gate.attempt_results ar
WHERE ar.attempt_id NOT IN (
  SELECT id FROM gate.attempts WHERE user_id = auth.uid()
);

-- ============================================================================
-- TEST 4: SME cannot see other SMEs' drafts
-- ============================================================================
SELECT 'TEST 4: SME draft isolation' AS test_name;
SELECT count(*) AS should_be_zero
FROM gate.question_versions qv
WHERE qv.status = 'DRAFT'
  AND qv.creator_id != auth.uid()
  AND gate.current_user_role() = 'SME';

-- ============================================================================
-- TEST 5: Students cannot read correct options (service role only)
-- ============================================================================
SELECT 'TEST 5: Correct options hidden from students' AS test_name;
SELECT count(*) AS should_be_zero
FROM gate.question_correct_options
WHERE gate.current_user_role() = 'STUDENT';

-- ============================================================================
-- TEST 6: Audit log not accessible to non-admins
-- ============================================================================
SELECT 'TEST 6: Audit log admin-only' AS test_name;
SELECT count(*) AS should_be_zero
FROM gate.audit_log
WHERE gate.current_user_role() != 'ADMIN'
  AND gate.current_user_role() IS NOT NULL;

-- ============================================================================
-- TEST 7: SME import batches isolated to uploading user
-- ============================================================================
SELECT 'TEST 7: Import batch isolation' AS test_name;
SELECT count(*) AS should_be_zero
FROM gate.import_batches
WHERE uploaded_by != auth.uid()
  AND gate.current_user_role() = 'SME';

-- ============================================================================
-- TEST 8: Subscription data isolated to own user
-- ============================================================================
SELECT 'TEST 8: Subscription isolation' AS test_name;
SELECT count(*) AS should_be_zero
FROM gate.subscriptions
WHERE user_id != auth.uid()
  AND gate.current_user_role() = 'STUDENT';

-- ============================================================================
-- TEST 9: Partial unique index prevents multiple active attempts
-- ============================================================================
SELECT 'TEST 9: One active attempt constraint' AS test_name;
SELECT user_id, count(*) AS active_count
FROM gate.attempts
WHERE status = 'IN_PROGRESS' AND user_id IS NOT NULL
GROUP BY user_id
HAVING count(*) > 1;
-- Should return 0 rows (index enforces uniqueness)

-- ============================================================================
-- Summary
-- ============================================================================
SELECT 'All RLS validation queries completed. Each should_be_zero column must be 0.' AS summary;
