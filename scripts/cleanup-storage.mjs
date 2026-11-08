#!/usr/bin/env node
// Vacía el bucket de fotos usando la API de Storage (el SQL directo no es seguro para archivos).
//
// Uso (simulación, no borra nada):
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<clave> node scripts/cleanup-storage.mjs
// Para borrar de verdad:
//   ... node scripts/cleanup-storage.mjs --confirm BORRAR-IMAGENES
// Opciones: --bucket <nombre> (por defecto product-images)
//
// La clave service_role se pasa por variable de entorno, NUNCA en el repositorio ni en el chat.

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const bucket = opt('--bucket') || 'product-images';
const confirmed = opt('--confirm') === 'BORRAR-IMAGENES';

if (!url || !key) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(2);
}
if (opt('--confirm') !== undefined && !confirmed) {
  console.error('Frase de confirmación incorrecta. Debe ser exactamente: BORRAR-IMAGENES');
  process.exit(2);
}

const headers = { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' };

async function list(prefix) {
  const out = [];
  for (let offset = 0; ; offset += 100) {
    const res = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
      method: 'POST', headers,
      body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }),
    });
    if (!res.ok) throw new Error(`Listar "${prefix}" falló: HTTP ${res.status}`);
    const page = await res.json();
    out.push(...page);
    if (page.length < 100) break;
  }
  return out;
}

async function walk(prefix = '') {
  const files = [];
  for (const item of await list(prefix)) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null || item.id === undefined) files.push(...(await walk(path))); // carpeta
    else files.push(path);
  }
  return files;
}

async function remove(paths) {
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    const res = await fetch(`${url}/storage/v1/object/${bucket}`, {
      method: 'DELETE', headers, body: JSON.stringify({ prefixes: chunk }),
    });
    if (!res.ok) throw new Error(`Borrar falló: HTTP ${res.status}`);
  }
}

const files = await walk();
console.log(`Bucket "${bucket}": ${files.length} archivo(s).`);
files.slice(0, 5).forEach((f) => console.log('  ' + f));
if (files.length > 5) console.log(`  … y ${files.length - 5} más`);
if (!confirmed) {
  console.log('Simulación: no se borró nada. Para borrar agrega: --confirm BORRAR-IMAGENES');
} else {
  await remove(files);
  const left = await walk();
  console.log(`Borrados. Quedan ${left.length} archivo(s).`);
  if (left.length) process.exit(1);
}
