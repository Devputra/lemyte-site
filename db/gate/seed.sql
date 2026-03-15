-- ============================================================================
-- GATE Seed Data: CS/IT Blueprint Profile
-- ============================================================================

-- Insert the CS/IT v1 blueprint profile (Gold Standard from PRD)
INSERT INTO gate.blueprint_profiles (
  name, paper_code,
  total_questions, total_marks,
  ga_questions, ga_marks, ga_1mark_count, ga_2mark_count,
  core_questions, core_marks, core_1mark_count, core_2mark_count,
  core_mcq_min, core_mcq_max,
  core_msq_min, core_msq_max,
  core_nat_min, core_nat_max,
  difficulty_easy_pct, difficulty_medium_pct, difficulty_hard_pct,
  duration_seconds, pass_percent
) VALUES (
  'CS_IT_V1', 'CS',
  65, 100,
  10, 15, 5, 5,
  55, 85, 25, 30,
  35, 45,
  5, 15,
  10, 20,
  30, 50, 20,
  10800, 25.00
);

-- Insert core CS/IT subjects
INSERT INTO gate.subjects (name) VALUES
  ('General Aptitude'),
  ('Engineering Mathematics'),
  ('Digital Logic'),
  ('Computer Organization and Architecture'),
  ('Programming and Data Structures'),
  ('Algorithms'),
  ('Theory of Computation'),
  ('Compiler Design'),
  ('Operating System'),
  ('Databases'),
  ('Computer Networks'),
  ('Discrete Mathematics');

-- Insert sample topics for General Aptitude
INSERT INTO gate.topics (subject_id, name)
SELECT s.id, t.name
FROM gate.subjects s
CROSS JOIN (VALUES
  ('Verbal Ability'),
  ('Numerical Ability'),
  ('Analytical Aptitude'),
  ('Spatial Aptitude')
) AS t(name)
WHERE s.name = 'General Aptitude';

-- Insert sample topics for Algorithms
INSERT INTO gate.topics (subject_id, name)
SELECT s.id, t.name
FROM gate.subjects s
CROSS JOIN (VALUES
  ('Searching and Sorting'),
  ('Graph Algorithms'),
  ('Dynamic Programming'),
  ('Greedy Algorithms'),
  ('Divide and Conquer'),
  ('Complexity Analysis')
) AS t(name)
WHERE s.name = 'Algorithms';
