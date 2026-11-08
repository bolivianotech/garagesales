#!/usr/bin/env python3
"""Ejecuta todas las pruebas automatizadas y genera el reporte en docs/testing/reports/.

Uso:  python3 -I scripts/test_report.py
Salida: docs/testing/reports/AAAA-MM-DD-<commit>.md  y  docs/testing/reports/latest.md
Código de salida distinto de 0 si algo falla.
"""
import datetime
import json
import pathlib
import re
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
PWA = ROOT / "apps" / "pwa"
REQ_RE = re.compile(r"\b(N?FR-\d+[a-z]?)\b")
# Specs cuya implementación aún no empieza (sus requisitos sin prueba no cuentan como falta).
NOT_IMPLEMENTED_SPECS = {"007-entregas-retiro", "008-datos-cobro-auditoria"}
# Requisitos de specs implementadas que dependen de fases posteriores.
DEFERRED = {
    "FR-013": "Fase 3 (pedidos)",
    "FR-014": "Fase 3 (ventas en el panel)",
    "FR-016": "Fase 4 (pago confirmado)",
    "NFR-003": "Fase 5 (modo sin red)",
    "FR-020": "Fase 3, interfaz (catálogo con filtros y stock en vivo)",
    "FR-021": "Fase 3, interfaz (carrito)",
    "FR-026": "Fase 3, interfaz (pantalla de pago con datos de retiro)",
}
# Requisitos que hoy se verifican solo con prueba manual (ver docs/testing/test-plan.md).
MANUAL = {"FR-001": "MT-01", "FR-015": "MT-05", "NFR-002": "MT-08"}
ID_RE = re.compile(r"^(TC-[A-Z0-9]+-\d+)\s+(.*)$")


def sh(cmd, cwd=ROOT):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def git(*args):
    return sh(["git", *args])[1].strip()


def run_sql():
    code, out = sh(["bash", "supabase/tests/run.sh"])
    suites, cur = {}, None
    for line in out.splitlines():
        if line.startswith("== "):
            cur = line[3:].strip()
            suites[cur] = {"cases": [], "errors": [], "finished": False}
        elif cur and "NOTICE:" in line and "OK" in line:
            label = line.split("OK", 1)[1].strip()
            suites[cur]["cases"].append((label, "PASS"))
        elif cur and line.startswith("ERROR:"):
            suites[cur]["errors"].append(line.strip())
        elif cur and "PASARON" in line:
            suites[cur]["finished"] = True
    return code, out, suites


def run_vitest():
    with tempfile.TemporaryDirectory() as tmp:
        outfile = pathlib.Path(tmp) / "vitest.json"
        code, out = sh(["npx", "vitest", "run", "--reporter=json", f"--outputFile={outfile}"], cwd=PWA)
        cases = []
        if outfile.exists():
            data = json.loads(outfile.read_text(encoding="utf8"))
            for tr in data["testResults"]:
                suite = pathlib.Path(tr["name"]).name
                for a in tr["assertionResults"]:
                    cases.append((a["fullName"], "PASS" if a["status"] == "passed" else "FAIL", suite))
        return code, out, cases


def parse_manual_results():
    """Lee docs/testing/manual-results.md -> {MT-xx: (etiqueta, resultado_crudo)}."""
    f = ROOT / "docs" / "testing" / "manual-results.md"
    out = {}
    if not f.exists():
        return out
    for line in f.read_text(encoding="utf8").splitlines():
        m = re.match(r"^\|\s*(MT-\d+)\s*\|([^|]*)\|([^|]*)\|", line)
        if m:
            raw = m.group(3).strip()
            low = raw.lower()
            if low.startswith("ok"):
                label = "✅ OK"
            elif low.startswith("falla"):
                label = "❌ FALLA"
            elif low.startswith("parcial"):
                label = "🟡 Parcial"
            elif low.startswith("bloque"):
                label = "⛔ Bloqueada"
            else:
                label = "⏳ Pendiente"
            out[m.group(1)] = (label, m.group(2).strip())
    return out


def parse_requirements():
    reqs = []
    for spec in sorted((ROOT / "specs").glob("*/spec.md")):
        text = spec.read_text(encoding="utf8")
        m = re.search(r"\*\*Estado:\*\*\s*([^\n·]*)", text)
        status = (m.group(1).strip() if m else "?")
        approved = status.lower().startswith("approved")
        for line in text.splitlines():
            r = re.match(r"^- \*{0,2}(N?FR-\d+[a-z]?)\*{0,2}:\s*(.*)", line)
            if r:
                reqs.append({"id": r.group(1), "spec": spec.parent.name, "approved": approved,
                             "status": status, "text": r.group(2)[:90]})
    return reqs


def main():
    now = datetime.datetime.now(datetime.timezone.utc)
    sha = git("rev-parse", "--short", "HEAD")
    branch = git("rev-parse", "--abbrev-ref", "HEAD")
    pg = sh(["bash", "-c", "ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1"])[1].strip().split("/")[-2:-1]
    node = sh(["node", "-v"])[1].strip()

    sql_code, sql_out, sql_suites = run_sql()
    ui_code, ui_out, ui_cases = run_vitest()
    tc_code, tc_out = sh(["npm", "run", "typecheck"], cwd=PWA)
    bd_code, bd_out = sh(["npm", "run", "build"], cwd=PWA)

    rows = []  # (id, requisitos, descripcion, suite, resultado)
    for suite, info in sql_suites.items():
        for label, res in info["cases"]:
            m = ID_RE.match(label)
            tid, desc = (m.group(1), m.group(2)) if m else ("SIN-ID", label)
            rows.append((tid, sorted(set(REQ_RE.findall(desc))), desc, suite, res))
        for e in info["errors"]:
            rows.append(("ERROR", [], e, suite, "FAIL"))
    for full, res, suite in ui_cases:
        m = re.search(r"(TC-UI-\d+)\s+(.*)$", full)
        tid, desc = (m.group(1), m.group(2)) if m else ("SIN-ID", full)
        reqs = sorted(set(REQ_RE.findall(full)))
        rows.append((tid, reqs, desc, suite, res))

    passed = sum(1 for r in rows if r[4] == "PASS")
    failed = sum(1 for r in rows if r[4] == "FAIL")
    no_id = sum(1 for r in rows if r[0] == "SIN-ID")
    overall_ok = (sql_code == 0 and ui_code == 0 and tc_code == 0 and bd_code == 0 and failed == 0
                  and all(s["finished"] for s in sql_suites.values()))

    reqs = parse_requirements()
    manual = parse_manual_results()
    by_req = {}
    for tid, rs, _d, _s, res in rows:
        for r in rs:
            by_req.setdefault(r, []).append((tid, res))

    L = []
    L.append("# Reporte de pruebas automatizadas")
    L.append("")
    L.append("> Generado por `scripts/test_report.py`. No editar a mano: se regenera en cada ejecución.")
    L.append("")
    L.append(f"- **Fecha (UTC):** {now:%Y-%m-%d %H:%M}")
    L.append(f"- **Commit:** `{sha}` · **Rama:** `{branch}`")
    L.append(f"- **Entorno:** PostgreSQL {''.join(pg) or 'local'} (esquema de Supabase simulado: `supabase/tests/00_mock_supabase.sql`), Node {node}")
    L.append(f"- **Resultado global:** {'✅ APROBADO' if overall_ok else '❌ CON FALLAS'}")
    L.append("")
    L.append("> **Alcance y límites:** estas pruebas validan la base de datos (RLS, reglas de negocio, auditoría) en un Postgres local y la lógica de la interfaz. **No** prueban el proyecto Supabase real, la red, ni el flujo con un navegador y fotos de celular: eso se cubre con las pruebas manuales de `docs/testing/test-plan.md`.")
    L.append("")
    L.append("## Resumen")
    L.append("")
    L.append("| Verificación | Resultado | Detalle |")
    L.append("|---|---|---|")
    for suite, info in sql_suites.items():
        ok = info["finished"] and not info["errors"]
        L.append(f"| Base de datos · `{suite}` | {'✅' if ok else '❌'} | {len(info['cases'])} casos OK |")
    ui_pass = sum(1 for c in ui_cases if c[1] == "PASS")
    L.append(f"| Interfaz · Vitest | {'✅' if ui_code == 0 else '❌'} | {ui_pass}/{len(ui_cases)} casos OK |")
    L.append(f"| Tipos · `tsc --noEmit` | {'✅' if tc_code == 0 else '❌'} | |")
    L.append(f"| Compilación · `vite build` | {'✅' if bd_code == 0 else '❌'} | |")
    L.append(f"| **Total de casos** | **{passed} OK / {failed} fallan** | {no_id} sin identificador |")
    L.append("")

    L.append("## Cobertura por requisito (specs aprobadas)")
    L.append("")
    L.append("| Requisito | Spec | Casos automatizados | Estado |")
    L.append("|---|---|---|---|")
    covered = in_scope = manual_n = deferred_n = 0
    for r in reqs:
        if not r["approved"]:
            continue
        hits = by_req.get(r["id"], [])
        if hits:
            in_scope += 1
            covered += 1
            ids = ", ".join(t for t, _ in hits)
            state = "✅ cubierto" if all(x == "PASS" for _, x in hits) else "❌ con fallas"
        elif r["id"] in DEFERRED:
            deferred_n += 1
            ids, state = "—", f"⏳ diferido a {DEFERRED[r['id']]}"
        elif r["spec"] in NOT_IMPLEMENTED_SPECS:
            deferred_n += 1
            ids, state = "—", "⏳ fase aún no implementada"
        elif r["id"] in MANUAL:
            in_scope += 1
            manual_n += 1
            mt = MANUAL[r["id"]]
            ids, state = "—", f"🖐 prueba manual {mt}: {manual.get(mt, ('⏳ Pendiente', ''))[0]}"
        else:
            in_scope += 1
            ids, state = "—", "⚠️ sin prueba"
        L.append(f"| {r['id']} | {r['spec'].split('-')[0]} | {ids} | {state} |")
    pct = (100 * covered // in_scope) if in_scope else 0
    L.append("")
    L.append(f"**En alcance de lo implementado:** {in_scope} requisitos · **con prueba automatizada:** {covered} ({pct} %) · **solo prueba manual pendiente:** {manual_n} · **sin prueba:** {in_scope - covered - manual_n}.")
    L.append(f"**Fuera de alcance por ahora:** {deferred_n} requisitos de fases futuras. Las specs en borrador (004, 005, 006) no se miden todavía.")
    L.append("")

    L.append("## Pruebas manuales (registro en `manual-results.md`)")
    L.append("")
    L.append("| ID | Prueba | Resultado |")
    L.append("|---|---|---|")
    for mt, (label, name) in manual.items():
        L.append(f"| {mt} | {name} | {label} |")
    done = sum(1 for v in manual.values() if v[0] in ("✅ OK", "❌ FALLA"))
    L.append("")
    L.append(f"**Ejecutadas:** {done}/{len(manual)} · **Parciales:** {sum(1 for v in manual.values() if v[0] == '🟡 Parcial')} · **OK:** {sum(1 for v in manual.values() if v[0] == '✅ OK')} · **Falla:** {sum(1 for v in manual.values() if v[0] == '❌ FALLA')} · **Bloqueadas:** {sum(1 for v in manual.values() if v[0] == '⛔ Bloqueada')}.")
    L.append("")
    L.append("## Detalle de casos ejecutados")
    L.append("")
    L.append("| ID | Requisitos | Descripción | Suite | Resultado |")
    L.append("|---|---|---|---|---|")
    for tid, rs, desc, suite, res in rows:
        L.append(f"| {tid} | {', '.join(rs) or '—'} | {desc.replace('|', '/')} | `{suite}` | {'✅ PASS' if res == 'PASS' else '❌ FAIL'} |")
    L.append("")
    if not overall_ok:
        L.append("## Salida de errores")
        L.append("")
        L.append("```")
        L.append("\n".join(x for x in [sql_out[-1500:] if sql_code else "", ui_out[-1500:] if ui_code else "",
                                       tc_out[-800:] if tc_code else "", bd_out[-800:] if bd_code else ""] if x))
        L.append("```")
        L.append("")

    text = "\n".join(L)
    out_dir = ROOT / "docs" / "testing" / "reports"
    out_dir.mkdir(parents=True, exist_ok=True)
    dated = out_dir / f"{now:%Y-%m-%d}-{sha}.md"
    dated.write_text(text, encoding="utf8")
    (out_dir / "latest.md").write_text(text, encoding="utf8")
    print(f"Reporte: {dated.relative_to(ROOT)}  ({passed} OK, {failed} fallan, cobertura {covered}/{in_scope} en alcance)")
    return 0 if overall_ok else 1


if __name__ == "__main__":
    sys.exit(main())
