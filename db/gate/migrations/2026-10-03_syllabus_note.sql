-- A short note shown with a past question whose topic has left the current GATE syllabus,
-- e.g. "Not in the GATE 2027 syllabus: UDP". Set by scripts/gate-content/syllabus2027.py.
alter table gate.question_versions add column if not exists syllabus_note text;
