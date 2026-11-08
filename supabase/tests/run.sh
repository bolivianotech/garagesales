#!/usr/bin/env bash
# Ejecuta las pruebas SQL contra un Postgres temporal (sin Supabase).
# Uso: supabase/tests/run.sh   (necesita binarios de PostgreSQL; en CI usa el servicio postgres)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"

if [[ -n "${DATABASE_URL:-}" ]]; then
  psql_cmd=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1)
  cleanup() { :; }
else
  pgbin="$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)"
  data="$(mktemp -d)"
  if [[ $EUID -eq 0 ]]; then chown postgres "$data"; fi
  port=54329
  run_pg() { if [[ $EUID -eq 0 ]]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
  run_pg "$pgbin/initdb -D $data -A trust >/dev/null"
  run_pg "$pgbin/pg_ctl -D $data -o '-p $port -k /tmp' -l $data/log -w start >/dev/null"
  cleanup() { run_pg "$pgbin/pg_ctl -D $data -m immediate stop >/dev/null" || true; rm -rf "$data"; }
  trap cleanup EXIT
  psql_cmd=(psql -h /tmp -p "$port" -U postgres -d postgres -v ON_ERROR_STOP=1)
  [[ $EUID -eq 0 ]] || psql_cmd=(psql -h /tmp -p "$port" -d postgres -v ON_ERROR_STOP=1)
fi

"${psql_cmd[@]}" -q -f "$here/00_mock_supabase.sql"
for f in "$root"/supabase/migrations/*.sql; do "${psql_cmd[@]}" -q -f "$f"; done
for t in "$here"/[0-9][0-9][0-9]_*.sql; do
  echo "== $(basename "$t")"
  "${psql_cmd[@]}" -f "$t" 2>&1 | grep -E "NOTICE|ERROR|PASARON|FALL" | sed 's/^psql:[^ ]* //'
done

# ---- 004: concurrencia real (NFR-004): 20 conexiones simultáneas por la última unidad
echo "== 004_concurrency"
"${psql_cmd[@]}" -q -f "$here/concurrency_setup.sql"
tmpres="$(mktemp -d)"
for i in $(seq 1 20); do
  "${psql_cmd[@]}" -qAt -c "select public.confirm_payment(o.id, 'CQR-$i', o.total_cents, 'PAGADOR $i', '1016', '***', now(), '{}'::jsonb) from public.orders o join public.payments p on p.order_id = o.id where p.bank_qr_id = 'CQR-$i'" > "$tmpres/r$i" 2>&1 &
done
wait
paid=$(cat "$tmpres"/r* | grep -c '^paid$' || true)
review=$(cat "$tmpres"/r* | grep -c '^review$' || true)
stock=$("${psql_cmd[@]}" -qAt -c "select stock from public.products where title = 'Última unidad'")
orders_paid=$("${psql_cmd[@]}" -qAt -c "select count(*) from public.orders o join public.payments p on p.order_id = o.id where p.bank_qr_id like 'CQR-%' and o.status = 'paid'")
pickups=$("${psql_cmd[@]}" -qAt -c "select count(*) from public.pickups p join public.orders o on o.id = p.order_id where o.buyer_id::text like '00000000-0000-0000-0000-0000000e0%'")
rm -rf "$tmpres"
ok=1
check() { if [[ "$2" == "$3" ]]; then echo "NOTICE:  OK   $1"; else echo "ERROR:  FALLÓ $1: esperado $3, obtenido $2"; ok=0; fi; }
check "TC-004-01 NFR-004 de 20 pagos simultáneos por 1 unidad, exactamente 1 queda pagado" "$paid" 1
check "TC-004-02 NFR-004 los otros 19 pagos quedan en revisión" "$review" 19
check "TC-004-03 NFR-004 el stock termina en 0, nunca negativo" "$stock" 0
check "TC-004-04 NFR-004 solo 1 pedido queda en estado pagado" "$orders_paid" 1
check "TC-004-05 NFR-004 se crea 1 solo retiro" "$pickups" 1
if [[ $ok -eq 1 ]]; then echo "TODAS LAS PRUEBAS PASARON"; else exit 1; fi
