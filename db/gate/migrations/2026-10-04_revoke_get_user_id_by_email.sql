-- public.get_user_id_by_email (left over from the old corporate-test app, unused by the site) is SECURITY DEFINER
-- and was executable by anon/authenticated: anyone with the public key could check whether an email has an
-- account and get its user id. Only the server (service_role) may call it now.
revoke execute on function public.get_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.get_user_id_by_email(text) to service_role;
