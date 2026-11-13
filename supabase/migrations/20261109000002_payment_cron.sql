-- Fase 4 · Spec 004: tareas programadas del cobro (FR-032, FR-039b). Llaman cada minuto a las Edge Functions
-- `check-payments` (camino 3: lista de pagados del banco) y `expire-orders` (vence pedidos y anula su QR).
--
-- El secreto NO está en este archivo. Se entrega una sola vez desde el SQL Editor de Supabase:
--   select public.setup_payment_cron('https://<ref>.supabase.co', '<el mismo CRON_SECRET de supabase secrets>');
-- La función lo guarda en Supabase Vault (cifrado) y programa los dos trabajos. Es idempotente: se puede repetir.

do $$ begin
  create extension if not exists pg_cron;
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_cron/pg_net no están disponibles aquí (entorno local): setup_payment_cron solo funcionará en Supabase.';
end $$;

create or replace function public.setup_payment_cron(p_project_url text, p_cron_secret text)
returns text language plpgsql security definer set search_path = public as $$
declare base text := regexp_replace(coalesce(p_project_url, ''), '/+$', '');
begin
  if base !~ '^https://[a-z0-9-]+\.supabase\.co$' then raise exception 'La URL debe ser https://<ref>.supabase.co'; end if;
  if char_length(coalesce(p_cron_secret, '')) < 16 then raise exception 'El secreto es demasiado corto'; end if;

  -- Vault: guarda el secreto y la URL cifrados (se reemplazan si ya existían)
  delete from vault.secrets where name in ('cobro_cron_secret', 'cobro_project_url');
  perform vault.create_secret(p_cron_secret, 'cobro_cron_secret');
  perform vault.create_secret(base, 'cobro_project_url');

  perform cron.unschedule(jobname) from cron.job where jobname in ('cobro-check-payments', 'cobro-expire-orders');
  perform cron.schedule('cobro-check-payments', '* * * * *', $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'cobro_project_url') || '/functions/v1/check-payments',
      headers := jsonb_build_object('x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cobro_cron_secret'), 'Content-Type', 'application/json'),
      body := '{}'::jsonb, timeout_milliseconds := 50000) $job$);
  perform cron.schedule('cobro-expire-orders', '* * * * *', $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'cobro_project_url') || '/functions/v1/expire-orders',
      headers := jsonb_build_object('x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cobro_cron_secret'), 'Content-Type', 'application/json'),
      body := '{}'::jsonb, timeout_milliseconds := 50000) $job$);
  return 'Programado: check-payments y expire-orders cada minuto';
end $$;

revoke all on function public.setup_payment_cron(text, text) from public, anon, authenticated;
