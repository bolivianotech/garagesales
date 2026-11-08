// Pruebas de scripts/cleanup-storage.mjs contra un servidor Storage simulado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'cleanup-storage.mjs');

function startMock(initial) {
  const files = new Set(initial);
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const j = body ? JSON.parse(body) : {};
      if (req.headers.authorization !== 'Bearer test-key') { res.writeHead(401).end('{}'); return; }
      if (req.method === 'POST' && req.url.startsWith('/storage/v1/object/list/')) {
        const prefix = j.prefix ? j.prefix + '/' : '';
        const seen = new Map();
        for (const f of files) {
          if (!f.startsWith(prefix)) continue;
          const rest = f.slice(prefix.length).split('/');
          if (rest.length === 1) seen.set(rest[0], { name: rest[0], id: 'id-' + f });
          else seen.set(rest[0], { name: rest[0], id: null });
        }
        const all = [...seen.values()];
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(all.slice(j.offset, j.offset + j.limit)));
      } else if (req.method === 'DELETE' && req.url.startsWith('/storage/v1/object/')) {
        for (const p of j.prefixes) files.delete(p);
        res.writeHead(200, { 'Content-Type': 'application/json' }).end('[]');
      } else res.writeHead(404).end('{}');
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, files, url: `http://127.0.0.1:${server.address().port}` })));
}

function run(url, extra = [], key = 'test-key') {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [script, ...extra], { env: { ...process.env, SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => resolve({ code, out }));
  });
}

const sample = ['s1/p1/a.webp', 's1/p1/b.webp', 's1/p2/a.webp', 's2/p3/a.jpg', 'raiz.webp'];

test('TC-SCR-01 sin --confirm solo simula y no borra nada', async () => {
  const m = await startMock(sample);
  const r = await run(m.url);
  assert.equal(r.code, 0);
  assert.match(r.out, /5 archivo/);
  assert.equal(m.files.size, 5);
  m.server.close();
});

test('TC-SCR-02 con la frase correcta borra todos los archivos, incluidas las carpetas anidadas', async () => {
  const m = await startMock(sample);
  const r = await run(m.url, ['--confirm', 'BORRAR-IMAGENES']);
  assert.equal(r.code, 0);
  assert.equal(m.files.size, 0);
  m.server.close();
});

test('TC-SCR-03 con una frase incorrecta se rechaza y no borra', async () => {
  const m = await startMock(sample);
  const r = await run(m.url, ['--confirm', 'borrar']);
  assert.equal(r.code, 2);
  assert.equal(m.files.size, 5);
  m.server.close();
});

test('TC-SCR-04 sin credenciales en el entorno no hace nada', async () => {
  const m = await startMock(sample);
  const r = await run('', [], '');
  assert.equal(r.code, 2);
  assert.equal(m.files.size, 5);
  m.server.close();
});

test('TC-SCR-05 con una clave inválida falla sin borrar', async () => {
  const m = await startMock(sample);
  const r = await run(m.url, ['--confirm', 'BORRAR-IMAGENES'], 'otra-clave');
  assert.notEqual(r.code, 0);
  assert.equal(m.files.size, 5);
  m.server.close();
});

test('TC-SCR-06 maneja más de 100 archivos (paginación y borrado por lotes)', async () => {
  const many = Array.from({ length: 250 }, (_, i) => `s1/p${i}.webp`);
  const m = await startMock(many);
  const r = await run(m.url, ['--confirm', 'BORRAR-IMAGENES']);
  assert.equal(r.code, 0);
  assert.equal(m.files.size, 0);
  m.server.close();
});
