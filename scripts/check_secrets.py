#!/usr/bin/env python3
"""Escáner de secretos para GarageSales.

Uso:
  python3 -I scripts/check_secrets.py            # revisa todos los archivos versionados
  python3 -I scripts/check_secrets.py --staged   # revisa solo lo que está en el área de preparación (pre-commit)
  python3 -I scripts/check_secrets.py --self-test

Código de salida 1 si encuentra algo. Nunca imprime el valor completo del hallazgo.
"""
import pathlib
import re
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP_NAMES = {"package-lock.json", "pnpm-lock.yaml", "yarn.lock", "check_secrets.py"}
SKIP_DIRS = ("docs/testing/reports/", "node_modules/", "dist/")
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic")
# Llave de EJEMPLO publicada en el manual del banco (API Market v1.3.0, sección 5). No es una credencial.
PUBLIC_EXAMPLES = {"40A318B299F245C2B697176723088629"}
PLACEHOLDER = re.compile(r"(?i)(\.\.\.|xxx|<|>|cambiar|tu-|tu_|ejemplo|example|placeholder|changeme|valor|\$\{|your)")

RULES = [
    ("llave hexadecimal de 32 o 64 caracteres", re.compile(r"(?<![0-9A-Fa-f])(?=[0-9A-Fa-f]*[A-Fa-f])(?=[0-9A-Fa-f]*\d)(?:[0-9A-Fa-f]{32}|[0-9A-Fa-f]{64})(?![0-9A-Fa-f])")),
    ("token JWT", re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}")),
    ("clave secreta de Supabase", re.compile(r"sb_secret_[A-Za-z0-9_-]{10,}")),
    ("clave privada", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----")),
]
ASSIGN = re.compile(r"""(?ix)
    \b([A-Z0-9_]*(?:SECRET|PASSWORD|PASSWD|AES_KEY|SERVICE_ROLE|API_KEY|TOKEN)[A-Z0-9_]*)\s*[=:]\s*["']?([^\s"'#]{8,})""")


def git_files(staged):
    cmd = ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"] if staged else ["git", "ls-files"]
    out = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return [f for f in out.splitlines() if f]


def mask(s):
    return s[:3] + "…" + s[-2:] if len(s) > 8 else "…"


def scan_text(name, text):
    findings = []
    for ln, line in enumerate(text.splitlines(), 1):
        for label, rx in RULES:
            for m in rx.finditer(line):
                if m.group(0).upper() in PUBLIC_EXAMPLES:
                    continue
                findings.append((name, ln, label, mask(m.group(0))))
        for m in ASSIGN.finditer(line):
            var, val = m.group(1), m.group(2)
            if var.startswith("VITE_") or PLACEHOLDER.search(val) or val.startswith("process.env") or val.startswith("Deno.env"):
                continue
            if re.fullmatch(r"[A-Za-z_]+\(.*", val) or val.endswith(("(", "{")) or val.lower() in ("true", "false", "null", "undefined", "postgres"):
                continue
            findings.append((name, ln, f"valor asignado a {var}", mask(val)))
    return findings


def scan(files):
    findings, warnings = [], []
    for f in files:
        p = ROOT / f
        if p.name in SKIP_NAMES or f.startswith(SKIP_DIRS) or not p.is_file():
            continue
        if f.lower().endswith(IMAGE_EXT):
            warnings.append(f"imagen versionada: {f} (verifica a mano que no muestre llaves ni contraseñas)")
            continue
        if p.stat().st_size > 2_000_000:
            continue
        try:
            data = p.read_bytes()
        except OSError:
            continue
        if b"\x00" in data:
            warnings.append(f"archivo binario versionado: {f} (verifica su contenido a mano)")
            continue
        findings += scan_text(f, data.decode("utf-8", "replace"))
    return findings, warnings


def self_test():
    fake = {
        "a.env": "BANCO_ECONOMICO_AES_KEY=" + "A1" * 16 + "\n",
        "b.txt": "token eyJhbGciOiJIUzI1NiJ9abcd.eyJzdWIiOiIxMjM0NTY3ODkwIn0abcd.SflKxwRJSMeKKF2QT4fw\n",
        "c.env": "SUPABASE_SERVICE_ROLE_KEY=abcdefghijk12345\n",
        "d.env": "VITE_SUPABASE_ANON_KEY=sb_publishable_abcdefghijklmn\n",
        "e.env": "BANCO_ECONOMICO_PASSWORD=\n",
        "f.md": "Ejemplo: BANCO_ECONOMICO_AES_KEY=<tu llave>\n",
        "g.txt": "-----BEGIN PRIVATE KEY-----\n",
        "h.md": "ejemplo público del manual: 40A318B299F245C2B697176723088629\n",
        "i.md": "otra llave: 40A318B299F245C2B697176723088630\n",
    }
    expect_hits = {"a.env", "b.txt", "c.env", "g.txt", "i.md"}
    got = set()
    for name, text in fake.items():
        if scan_text(name, text):
            got.add(name)
    ok = got == expect_hits
    print("autoprueba:", "OK" if ok else f"FALLA (esperado {sorted(expect_hits)}, obtenido {sorted(got)})")
    return 0 if ok else 1


def main():
    if "--self-test" in sys.argv:
        return self_test()
    staged = "--staged" in sys.argv
    findings, warnings = scan(git_files(staged))
    for w in warnings:
        print("AVISO:", w)
    import os
    if staged and warnings and os.environ.get("ALLOW_BINARIES") != "1":
        print("\nBLOQUEADO: hay imágenes o archivos binarios nuevos. Ábrelos y confirma que NO muestran llaves, contraseñas ni datos personales.")
        print("Si están limpios: ALLOW_BINARIES=1 git commit ...")
        return 1
    if findings:
        print("\nPOSIBLES SECRETOS ENCONTRADOS (no se imprimen completos):")
        for name, ln, label, shown in findings:
            print(f"  {name}:{ln}  {label}  [{shown}]")
        print("\nNo hagas commit. Si es un falso positivo, cambia el texto; si es real, rota la credencial.")
        return 1
    print("Sin secretos detectados en", "los archivos preparados" if staged else "los archivos versionados")
    return 0


if __name__ == "__main__":
    sys.exit(main())
