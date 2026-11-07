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
"${psql_cmd[@]}" -f "$here/001_rls.sql" 2>&1 | grep -E "NOTICE|ERROR|PASARON|FALL" | sed 's/^psql:[^ ]* //'
