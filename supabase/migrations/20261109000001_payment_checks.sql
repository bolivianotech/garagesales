-- Fase 4 · Spec 004: apoyo a las Edge Functions de cobro (confirmación por tres caminos).
-- Requisitos: FR-032, FR-034, FR-039b, NFR-009
-- Todas son para el rol de servicio (Edge Functions); el cliente no puede ejecutarlas.

alter table public.payments add column if not exists last_checked_at timestamptz;
create index if not exists payments_check_idx on public.payments (status, last_checked_at);

-- Pagos pendientes a consultar con el banco (camino rápido). Reparte la carga: marca la hora de consulta
-- y no vuelve a entregar el mismo pago antes de p_min_age_seconds. Varias ejecuciones simultáneas no se pisan.
create or replace function public.payments_to_check(
  p_limit integer default 40, p_min_age_seconds integer default 20, p_recent_minutes integer default 20
) returns table (payment_id uuid, order_id uuid, bank_qr_id text, amount_cents integer)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  return query
  with c as (
    select p.id
      from public.payments p join public.orders o on o.id = p.order_id
     where p.status = 'pending' and o.status = 'pending'
       and p.created_at > now() - make_interval(mins => greatest(p_recent_minutes, 1))
       and (p.last_checked_at is null or p.last_checked_at < now() - make_interval(secs => greatest(p_min_age_seconds, 0)))
     order by p.last_checked_at nulls first, p.created_at
     limit greatest(least(p_limit, 200), 1)
       for update of p skip locked
  )
  update public.payments p set last_checked_at = now()
    from c where p.id = c.id
  returning p.id, p.order_id, p.bank_qr_id, p.amount_cents;
end $$;

-- Pagos aún no confirmados que corresponden a estos QR (para cruzar con la lista de "pagados del día" del banco
-- y con los avisos). Incluye pagos cancelados de pedidos vencidos hace menos de 48 h: un pago tardío se honra.
create or replace function public.payments_by_qr(p_qr_ids text[])
returns table (payment_id uuid, order_id uuid, bank_qr_id text, amount_cents integer)
language sql stable security definer set search_path = public as $$
  select p.id, p.order_id, p.bank_qr_id, p.amount_cents
    from public.payments p join public.orders o on o.id = p.order_id
   where p.bank_qr_id = any (coalesce(p_qr_ids, '{}'))
     and p.status in ('pending', 'cancelled')
     and (o.status in ('pending', 'review') or (o.status = 'expired' and o.expires_at > now() - interval '48 hours'))
$$;

-- Consulta a pedido del comprador (pantalla de pago): entrega el pago pendiente de ESE pedido, como máximo cada
-- p_min_seconds, para no saturar al banco. La propiedad del pedido la verifica la función con la sesión del comprador.
create or replace function public.claim_payment_check(p_order_id uuid, p_min_seconds integer default 3)
returns table (payment_id uuid, order_id uuid, bank_qr_id text, amount_cents integer)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  return query
  with c as (
    select p.id
      from public.payments p join public.orders o on o.id = p.order_id
     where p.order_id = p_order_id and p.status = 'pending' and o.status = 'pending'
       and (p.last_checked_at is null or p.last_checked_at < now() - make_interval(secs => greatest(p_min_seconds, 0)))
     order by p.created_at desc
     limit 1
       for update of p skip locked
  )
  update public.payments p set last_checked_at = now()
    from c where p.id = c.id
  returning p.id, p.order_id, p.bank_qr_id, p.amount_cents;
end $$;

do $$ begin
  revoke all on function public.payments_to_check(integer, integer, integer) from public, anon, authenticated;
  revoke all on function public.payments_by_qr(text[]) from public, anon, authenticated;
  revoke all on function public.claim_payment_check(uuid, integer) from public, anon, authenticated;
  if exists (select from pg_roles where rolname = 'service_role') then
    grant execute on function public.payments_to_check(integer, integer, integer) to service_role;
    grant execute on function public.payments_by_qr(text[]) to service_role;
    grant execute on function public.claim_payment_check(uuid, integer) to service_role;
  end if;
end $$;
