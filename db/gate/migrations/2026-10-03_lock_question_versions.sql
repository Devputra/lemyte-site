-- Questions, answer keys and worked solutions are paid content. The policy "published_pyqs_readable" let anyone
-- holding the public anon key (shipped in the browser bundle) read all published rows via the Supabase API.
-- The site reads questions only through server routes with the service role, which RLS does not restrict.
drop policy if exists published_pyqs_readable on gate.question_versions;
revoke all on gate.question_versions from anon, authenticated;
