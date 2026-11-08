-- Utilidades compartidas por las pruebas (se cargan con \ir helpers.sql)
create or replace function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), false);
  execute 'set local role ' || case when p_uid is null then 'anon' else 'authenticated' end;
end $$;

create or replace function pg_temp.expect_error(p_sql text, p_label text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice 'OK   %', p_label; return;
  end;
  raise exception 'FALLÓ (debía rechazarse): %', p_label;
end $$;

create or replace function pg_temp.expect_ok(p_sql text, p_label text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise notice 'OK   %', p_label;
end $$;

create or replace function pg_temp.expect_count(p_sql text, p_expected int, p_label text) returns void language plpgsql as $$
declare n int;
begin
  execute 'select count(*) from (' || p_sql || ') q' into n;
  if n <> p_expected then raise exception 'FALLÓ %: esperado %, obtenido %', p_label, p_expected, n; end if;
  raise notice 'OK   %', p_label;
end $$;

create or replace function pg_temp.expect_affected(p_sql text, p_expected int, p_label text) returns void language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  if n <> p_expected then raise exception 'FALLÓ %: filas afectadas esperadas %, obtenidas %', p_label, p_expected, n; end if;
  raise notice 'OK   %', p_label;
end $$;
