// Genera docs/presentations/GarageSales-taller-fin-de-semana.pptx
// Uso: NODE_PATH=$(npm root -g) node docs/presentations/src/build_taller.js
const path = require('path')
const pptxgen = require('pptxgenjs')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const sharp = require('sharp')
const fa = require('react-icons/fa')
const SKILL = '/root/.claude/skills/synced/b96c5c23-71a5-49a9-8c84-400a8be1b4cc_c1aac0ef-97e1-44c6-8fa1-b08cb2867503/pptx'
const { applyTheme } = require(path.join(SKILL, 'scripts/apply_theme.js'))

// Tema oscuro: los espacios lt1/dk1 están invertidos a propósito (lt1 = fondo oscuro, dk1 = texto claro).
const THEME = {
  name: 'GarageSales Taller',
  headFontFace: 'Arial',
  bodyFontFace: 'Calibri',
  colors: {
    dk1: 'F4F1FA', lt1: '14101F', dk2: 'B9B1D0', lt2: '241C38',
    accent1: 'C6F432', accent2: 'FF5C5C', accent3: '3DD6D0', accent4: 'FFC93C', accent5: '8B5CF6', accent6: 'FF8FB1',
    hlink: '3DD6D0', folHlink: '8B5CF6',
  },
}
const HEX = THEME.colors

// Cifras tomadas del reporte automático para que la presentación no se desactualice.
const fs = require('fs')
function leerReporte() {
  const t = fs.readFileSync(path.join(__dirname, '..', '..', 'testing', 'reports', 'latest.md'), 'utf8')
  const n = (re) => { const m = t.match(re); if (!m) throw new Error('No se encontró en el reporte: ' + re); return Number(m[1]) }
  const total = n(/\*\*(\d+) OK \//), fallas = n(/\/ (\d+) fallan\*\*/)
  const db = n(/001_rls\.sql` \| ✅ \| (\d+)/) + n(/002_products\.sql` \| ✅ \| (\d+)/) + n(/003_orders\.sql` \| ✅ \| (\d+)/)
  const conc = n(/004_concurrency` \| ✅ \| (\d+)/), limpieza = n(/005_cleanup` \| ✅ \| (\d+)/)
  const basicas = n(/Vitest \| ✅ \| (\d+)\//) + n(/node --test\) \| ✅ \| (\d+)\//) + n(/escáner de secretos \| ✅ \| (\d+)\//) + n(/banco simulado\) \| ✅ \| (\d+)\//)
  return { total, fallas, db, conc, limpieza, basicas }
}
const R = leerReporte()

const pres = new pptxgen()
pres.layout = 'LAYOUT_WIDE' // 13.33 x 7.5 pulgadas
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace }
pres.title = 'De cero a una tienda con pago QR en un fin de semana'
pres.author = 'GarageSales'
const C = pres.SchemeColor

async function icon(name, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(fa[name], { color: '#' + color, size: String(size) }))
  const buf = await sharp(Buffer.from(svg)).png().toBuffer()
  return 'image/png;base64,' + buf.toString('base64')
}

// ---- Patrón tipo QR para las portadas (decorativo; se cubre al insertar una foto)
function qrShapes(x0, y0, size) {
  const n = 11, cell = size / n, out = []
  const finder = (cx, cy) => {
    out.push({ rect: { x: x0 + cx * cell, y: y0 + cy * cell, w: 3 * cell, h: 3 * cell, fill: { color: C.accent1 } } })
    out.push({ rect: { x: x0 + (cx + 0.6) * cell, y: y0 + (cy + 0.6) * cell, w: 1.8 * cell, h: 1.8 * cell, fill: { color: C.background1 } } })
    out.push({ rect: { x: x0 + (cx + 1) * cell, y: y0 + (cy + 1) * cell, w: cell, h: cell, fill: { color: C.accent1 } } })
  }
  finder(0, 0); finder(n - 3, 0); finder(0, n - 3)
  let seed = 7
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const inFinder = (r < 4 && c < 4) || (r < 4 && c > n - 5) || (r > n - 5 && c < 4)
    if (inFinder) continue
    if (rnd() > 0.52) out.push({ rect: { x: x0 + c * cell + cell * 0.08, y: y0 + r * cell + cell * 0.08, w: cell * 0.84, h: cell * 0.84, fill: { color: rnd() > 0.8 ? C.accent2 : rnd() > 0.5 ? C.accent3 : C.text1 } } })
  }
  return out
}

const seen = new Set()
function ns(master, section) {
  if (section && !seen.has(section)) { seen.add(section); pres.addSection({ title: section }) }
  return pres.addSlide(section ? { masterName: master, sectionTitle: section } : { masterName: master })
}

const baseText = { color: C.text1, fontFace: THEME.headFontFace }
const footer = [{ text: 'GarageSales · de cero a QR en un fin de semana', options: { x: 0.6, y: 7.0, w: 8, h: 0.3, fontSize: 11, color: C.text2, fontFace: THEME.bodyFontFace } }]
const slideNum = { x: 12.2, y: 7.0, w: 0.6, h: 0.3, fontSize: 11, color: C.text2, fontFace: THEME.bodyFontFace, align: 'right' }

pres.defineSlideMaster({
  title: 'TITULO',
  background: { color: C.background1 },
  objects: [
    ...qrShapes(8.2, 1.5, 4.4),
    { placeholder: { options: { name: 'foto', type: 'pic', x: 7.9, y: 0.7, w: 4.9, h: 6.1 }, text: '' } },
    { placeholder: { options: { name: 'title', type: 'title', x: 0.7, y: 1.6, w: 6.9, h: 2.9, fontSize: 48, bold: true, color: C.text1, fontFace: THEME.headFontFace, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    { placeholder: { options: { name: 'body', type: 'body', x: 0.7, y: 4.7, w: 6.6, h: 1.4, fontSize: 20, color: C.text2, fontFace: THEME.bodyFontFace, valign: 'top', margin: 0 }, text: '' } },
  ],
})
pres.defineSlideMaster({
  title: 'CONTENIDO',
  background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.4, w: 12.1, h: 1.0, fontSize: 36, bold: true, color: C.text1, fontFace: THEME.headFontFace, valign: 'middle', align: 'left', margin: 0 }, text: '' } },
    ...footer,
  ],
  slideNumber: slideNum,
})
pres.defineSlideMaster({
  title: 'CIERRE',
  background: { color: C.background1 },
  objects: [
    ...qrShapes(8.2, 1.5, 4.4),
    { placeholder: { options: { name: 'foto', type: 'pic', x: 7.9, y: 0.7, w: 4.9, h: 6.1 }, text: '' } },
    { placeholder: { options: { name: 'title', type: 'title', x: 0.7, y: 1.4, w: 6.9, h: 2.6, fontSize: 44, bold: true, color: C.text1, fontFace: THEME.headFontFace, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    { placeholder: { options: { name: 'body', type: 'body', x: 0.7, y: 4.2, w: 6.6, h: 2.2, fontSize: 20, color: C.text2, fontFace: THEME.bodyFontFace, valign: 'top', margin: 0 }, text: '' } },
  ],
})

function card(s, x, y, w, h, name) {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.15, fill: { color: C.background2 }, line: { color: C.background2, width: 0 }, objectName: name })
}
function iconCircle(s, x, y, d, color, name) {
  s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color }, line: { color, width: 0 }, objectName: name })
}
function text(s, t, o) {
  s.addText(t, { isTextBox: true, fontFace: THEME.bodyFontFace, color: C.text1, margin: 0, ...o })
}

async function build() {
  // 1. Portada
  let s = ns('TITULO')
  s.addText('De cero a una tienda con pago QR', { placeholder: 'title' })
  s.addText('en un fin de semana: Spec Driven Development, PWA, Supabase y QR bancario', { placeholder: 'body' })
  s.addNotes('Abre con la pregunta: ¿cuántos de ustedes han visto a alguien vender por TikTok Live y cobrar por QR? Hoy veremos cómo se construye eso. FOTO SUGERIDA para el recuadro de la derecha (clic en el recuadro, "Insertar imagen"): una persona joven mostrando su celular con un QR de pago frente a un puesto o una mesa de ropa. Si no insertas foto, se muestra el patrón QR decorativo.')

  // 2. Cifras
  s = ns('CONTENIDO', 'Punto de partida')
  s.addText('Dos días, un sistema completo', { placeholder: 'title' })
  const stats = [
    ['≈18 h', 'de trabajo efectivo (estimado) entre el 6 y el 8 de noviembre de 2026', HEX.accent1],
    [String(R.total), `pruebas automáticas, ${R.fallas} fallas`, HEX.accent3],
    ['8', 'specs con requisitos numerados y aprobados por el dueño', HEX.accent4],
  ]
  stats.forEach(([n, l, col], i) => {
    const x = 0.6 + i * 4.1
    card(s, x, 1.9, 3.9, 4.4, `Cifra ${i + 1}`)
    text(s, n, { x: x + 0.3, y: 2.3, w: 3.3, h: 1.6, fontSize: 72, bold: true, color: col, fontFace: THEME.headFontFace, valign: 'middle' })
    text(s, l, { x: x + 0.3, y: 4.1, w: 3.3, h: 1.8, fontSize: 20, color: C.text1, valign: 'top' })
  })
  s.addNotes(`Sé honesto con las cifras: las 18 horas son una estimación del trabajo efectivo según el volumen de cada entrega; el historial de git solo registra cuándo se hizo cada commit. Las ${R.total} pruebas salen del reporte generado automáticamente (docs/testing/reports/latest.md).`)

  // 3. Flujo de compra
  s = ns('CONTENIDO', 'Qué construimos')
  s.addText('Del catálogo al retiro con código', { placeholder: 'title' })
  const flow = [
    ['FaStore', 'Catálogo', 'Fotos, precio y cantidad', HEX.accent1],
    ['FaShoppingCart', 'Pedido', 'El servidor calcula el total', HEX.accent3],
    ['FaQrcode', 'QR de pago', 'Uno por pedido, monto exacto', HEX.accent4],
    ['FaCheckCircle', 'Pago confirmado', 'Lo confirma el banco', HEX.accent2],
    ['FaBoxOpen', 'Retiro', 'Código de 6 caracteres', HEX.accent6],
  ]
  for (let i = 0; i < flow.length; i++) {
    const [ic, t1, t2, col] = flow[i]
    const x = 0.6 + i * 2.5
    iconCircle(s, x + 0.55, 2.3, 1.3, col, `Círculo ${t1}`)
    s.addImage({ data: await icon(ic, HEX.lt1), x: x + 0.9, y: 2.65, w: 0.6, h: 0.6, altText: t1, objectName: `Ícono ${t1}` })
    text(s, t1, { x, y: 3.85, w: 2.4, h: 0.5, fontSize: 22, bold: true, align: 'center', fontFace: THEME.headFontFace })
    text(s, t2, { x, y: 4.4, w: 2.4, h: 0.9, fontSize: 16, color: C.text2, align: 'center', valign: 'top' })
    if (i < flow.length - 1) text(s, '›', { x: x + 2.0, y: 2.55, w: 0.5, h: 0.8, fontSize: 40, color: C.text2, align: 'center', valign: 'middle' })
  }
  text(s, 'Sin reservas: gana quien paga primero.', { x: 0.6, y: 5.9, w: 12.1, h: 0.6, fontSize: 24, bold: true, color: C.accent1, align: 'center', fontFace: THEME.headFontFace })
  s.addNotes('Este es el flujo objetivo. Hoy están hechos y probados el catálogo, los pedidos, la confirmación de pago en la base de datos, el comprobante y los retiros. Falta la integración con el banco y varias pantallas (ver diapositiva 15).')

  // 4. Método
  s = ns('CONTENIDO', 'El método')
  s.addText('Primero la spec, después el código', { placeholder: 'title' })
  const steps = ['Spec', 'Plan', 'Tareas', 'Código + pruebas', 'Reporte']
  const sdesc = ['Qué y por qué', 'Cómo (diseño)', 'Pasos de 1–4 h', 'Con ID por prueba', 'Requisito → prueba → resultado']
  steps.forEach((t, i) => {
    const x = 0.6 + i * 2.45
    iconCircle(s, x + 0.9, 2.1, 0.8, [HEX.accent1, HEX.accent3, HEX.accent4, HEX.accent2, HEX.accent6][i], `Paso ${i + 1}`)
    text(s, String(i + 1), { x: x + 0.9, y: 2.1, w: 0.8, h: 0.8, fontSize: 28, bold: true, color: C.background1, align: 'center', valign: 'middle', fontFace: THEME.headFontFace })
    text(s, t, { x, y: 3.1, w: 2.4, h: 0.6, fontSize: 22, bold: true, align: 'center', fontFace: THEME.headFontFace })
    text(s, sdesc[i], { x, y: 3.7, w: 2.4, h: 0.9, fontSize: 16, color: C.text2, align: 'center', valign: 'top' })
  })
  card(s, 0.6, 5.0, 12.1, 1.5, 'Regla')
  text(s, 'Sin spec aprobada no se programa. Sin prueba no está terminado.', { x: 0.9, y: 5.0, w: 11.5, h: 1.5, fontSize: 28, bold: true, color: C.accent1, valign: 'middle', align: 'center', fontFace: THEME.headFontFace })
  s.addNotes('SDD en una frase. La IA escribe mucho código rápido; la spec evita que escriba lo equivocado rápido. Muestra el repositorio: carpeta specs/ y docs/templates/.')

  // 5. Spec por dentro
  s = ns('CONTENIDO', 'El método')
  s.addText('Una spec por dentro', { placeholder: 'title' })
  card(s, 0.6, 1.8, 7.2, 4.8, 'Tarjeta de código')
  const code = [
    { text: 'FR-023a  Gana quien paga primero', options: { color: C.accent1, bold: true, breakLine: true } },
    { text: '', options: { breakLine: true } },
    { text: 'Dado     1 unidad y dos pedidos', options: { breakLine: true } },
    { text: 'Cuando   ambos pagan', options: { breakLine: true } },
    { text: 'Entonces solo el primer pago se queda con', options: { breakLine: true } },
    { text: '         el producto; el otro va a revisión', options: {} },
  ]
  s.addText(code, { isTextBox: true, x: 0.95, y: 2.1, w: 6.6, h: 4.2, fontSize: 18, fontFace: 'Courier New', color: C.text1, margin: 0, valign: 'top', paraSpaceAfter: 6 })
  text(s, 'se convierte en pruebas', { x: 8.2, y: 1.9, w: 4.5, h: 0.5, fontSize: 18, color: C.text2, fontFace: THEME.headFontFace })
  ;[['TC-003-33', 'El segundo pago queda en revisión'], ['TC-003-34', 'El stock nunca queda negativo'], ['TC-004-01', '20 pagos simultáneos, 1 unidad: 1 gana']].forEach(([id, d], i) => {
    const y = 2.5 + i * 1.35
    card(s, 8.2, y, 4.5, 1.15, `Prueba ${id}`)
    text(s, id + '  ✓', { x: 8.45, y: y + 0.12, w: 4.0, h: 0.4, fontSize: 18, bold: true, color: C.accent3, fontFace: 'Courier New' })
    text(s, d, { x: 8.45, y: y + 0.55, w: 4.0, h: 0.5, fontSize: 15, color: C.text1, valign: 'top' })
  })
  s.addNotes('Cada requisito tiene un ID que nunca se reutiliza. Cada criterio Dado/Cuando/Entonces se vuelve una prueba con su propio ID. El script scripts/test_report.py cruza requisitos y pruebas y avisa si alguno no tiene prueba.')

  // 6. Herramientas
  s = ns('CONTENIDO', 'Las herramientas')
  s.addText('Todo con herramientas gratuitas', { placeholder: 'title' })
  const tools = [
    ['FaGithub', 'GitHub', 'Código, PR y pruebas automáticas', HEX.accent1],
    ['FaDatabase', 'Supabase', 'Usuarios, base de datos y fotos', HEX.accent3],
    ['FaCloud', 'Cloudflare', 'Publica tu app en internet', HEX.accent4],
    ['FaRobot', 'Claude', 'Escribe contigo specs y código', HEX.accent2],
    ['FaFlask', 'Playwright', 'Prueba en un navegador real', HEX.accent6],
  ]
  for (let i = 0; i < tools.length; i++) {
    const [ic, t1, t2, col] = tools[i]
    const x = 0.6 + i * 2.48
    card(s, x, 2.0, 2.3, 4.2, `Herramienta ${t1}`)
    iconCircle(s, x + 0.6, 2.35, 1.1, col, `Círculo ${t1}`)
    s.addImage({ data: await icon(ic, HEX.lt1), x: x + 0.9, y: 2.65, w: 0.5, h: 0.5, altText: t1, objectName: `Ícono ${t1}` })
    text(s, t1, { x: x + 0.15, y: 3.7, w: 2.0, h: 0.5, fontSize: 22, bold: true, align: 'center', fontFace: THEME.headFontFace })
    text(s, t2, { x: x + 0.2, y: 4.3, w: 1.9, h: 1.6, fontSize: 16, color: C.text2, align: 'center', valign: 'top' })
  }
  s.addNotes('Verifica los límites de los planes gratuitos antes del lanzamiento: almacenamiento de Supabase y, sobre todo, el envío de correos de confirmación, que en el servicio por defecto es muy limitado.')

  // 7. Arquitectura
  s = ns('CONTENIDO', 'Cómo funciona')
  s.addText('Arquitectura en una imagen', { placeholder: 'title' })
  const boxes = [
    [0.6, 'FaMobileAlt', 'PWA', 'React + Vite en Cloudflare\nTu celular o tu computador', HEX.accent1],
    [5.0, 'FaDatabase', 'Supabase', 'Usuarios · Base de datos con reglas (RLS)\nFotos · Funciones del servidor', HEX.accent3],
    [9.4, 'FaQrcode', 'Banco', 'QR Conecta / API Market\nGenera QR y confirma pagos', HEX.accent4],
  ]
  for (let i = 0; i < boxes.length; i++) {
    const [x, ic, t1, t2, col] = boxes[i]
    card(s, x, 2.0, 3.3, 3.6, `Caja ${t1}`)
    iconCircle(s, x + 1.1, 2.3, 1.1, col, `Círculo ${t1}`)
    s.addImage({ data: await icon(ic, HEX.lt1), x: x + 1.4, y: 2.6, w: 0.5, h: 0.5, altText: t1, objectName: `Ícono ${t1}` })
    text(s, t1, { x: x + 0.15, y: 3.55, w: 3.0, h: 0.5, fontSize: 24, bold: true, align: 'center', fontFace: THEME.headFontFace })
    text(s, t2, { x: x + 0.2, y: 4.2, w: 2.9, h: 1.2, fontSize: 15, color: C.text2, align: 'center', valign: 'top' })
  }
  text(s, '⇄', { x: 3.9, y: 3.4, w: 1.1, h: 0.8, fontSize: 40, color: C.text1, align: 'center', valign: 'middle' })
  text(s, '⇄', { x: 8.3, y: 3.4, w: 1.1, h: 0.8, fontSize: 40, color: C.text1, align: 'center', valign: 'middle' })
  text(s, 'Regla: la pantalla nunca confirma un pago ni guarda secretos.', { x: 0.6, y: 6.0, w: 12.1, h: 0.6, fontSize: 22, bold: true, color: C.accent1, align: 'center', fontFace: THEME.headFontFace })
  s.addNotes('La seguridad vive en la base de datos, no en la pantalla. Lo que esconde la interfaz es comodidad; lo que impide la base de datos es seguridad.')

  // 8. Roles / RLS
  s = ns('CONTENIDO', 'Cómo funciona')
  s.addText('Cada rol ve solo lo suyo', { placeholder: 'title' })
  const roles = [
    ['FaUser', 'Comprador', 'Ve el catálogo y sus propios pedidos', HEX.accent1],
    ['FaStore', 'Vendedor', 'Solo sus productos y sus ventas; lo aprueba el admin', HEX.accent3],
    ['FaUserShield', 'Administrador', 'Aprueba vendedores, modera y ve reportes', HEX.accent4],
    ['FaMoneyBillWave', 'Finanzas', 'Dinero, comisión del 1 % y liquidaciones', HEX.accent2],
  ]
  for (let i = 0; i < roles.length; i++) {
    const [ic, t1, t2, col] = roles[i]
    const x = 0.6 + (i % 2) * 6.15, y = 1.85 + Math.floor(i / 2) * 2.4
    card(s, x, y, 5.95, 2.2, `Rol ${t1}`)
    iconCircle(s, x + 0.35, y + 0.55, 1.1, col, `Círculo ${t1}`)
    s.addImage({ data: await icon(ic, HEX.lt1), x: x + 0.65, y: y + 0.85, w: 0.5, h: 0.5, altText: t1, objectName: `Ícono ${t1}` })
    text(s, t1, { x: x + 1.8, y: y + 0.4, w: 3.9, h: 0.5, fontSize: 24, bold: true, fontFace: THEME.headFontFace })
    text(s, t2, { x: x + 1.8, y: y + 1.0, w: 3.9, h: 1.0, fontSize: 16, color: C.text2, valign: 'top' })
  }
  s.addNotes('RLS (Row Level Security) son reglas dentro de la base de datos que dicen qué filas ve cada usuario. Se prueban con casos negativos: el acceso indebido tiene que fallar.')

  // 9. Carrera de pagos (gráfico nativo)
  s = ns('CONTENIDO', 'Pagos')
  s.addText('20 pagos, 1 unidad: gana uno', { placeholder: 'title' })
  s.addChart(pres.charts.BAR, [{ name: 'Pagos', labels: ['Quedó pagado', 'En revisión (reembolso)'], values: [1, 19] }], {
    x: 0.6, y: 1.8, w: 6.6, h: 4.8, barDir: 'col', chartColors: [HEX.accent1, HEX.accent2], varyColors: true,
    showTitle: false, showLegend: false, showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: HEX.dk1, dataLabelFontSize: 18, dataLabelFontFace: '+mn-lt',
    catAxisLabelColor: HEX.dk1, catAxisLabelFontSize: 14, catAxisLabelFontFace: '+mn-lt',
    valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, valAxisMaxVal: 22,
  })
  card(s, 7.6, 1.9, 5.1, 4.6, 'Explicación')
  text(s, 'Sin reservas, sin carreras', { x: 7.9, y: 2.15, w: 4.5, h: 0.6, fontSize: 24, bold: true, color: C.accent1, fontFace: THEME.headFontFace })
  text(s, [
    { text: 'Una sola transacción bloquea el producto, verifica el monto y el stock, y descuenta.', options: { bullet: true, breakLine: true } },
    { text: 'Si otro pagó antes, tu pago queda en revisión y se reembolsa.', options: { bullet: true, breakLine: true } },
    { text: 'Probado con 20 conexiones reales al mismo tiempo.', options: { bullet: true } },
  ], { x: 7.9, y: 2.95, w: 4.5, h: 3.3, fontSize: 18, valign: 'top', paraSpaceAfter: 12 })
  s.addNotes('Es la decisión del dueño (ADR-0004): "si no paga no es suyo". El caso de prueba TC-004-01 lo demuestra con 20 procesos paralelos contra PostgreSQL.')

  // 10. Pirámide de pruebas
  s = ns('CONTENIDO', 'Pruebas')
  s.addText('La pirámide de pruebas', { placeholder: 'title' })
  const pyr = [
    ['UAT por rol', 'personas reales', '55 casos escritos', HEX.accent6],
    ['E2E', 'navegador real', '5 ejecutados · 9 escritos', HEX.accent2],
    ['Concurrencia', '20 pagos simultáneos', `${R.conc} casos`, HEX.accent4],
    ['Base de datos', 'seguridad y reglas', `${R.db} + ${R.limpieza} de limpieza`, HEX.accent3],
    ['Unitarias y demo QR', 'dinero, fotos, cifrado, API', `${R.basicas} casos`, HEX.accent1],
  ]
  pyr.forEach(([t1, t2, t3, col], i) => {
    const w = 3.4 + i * 0.85, x = 0.6 + (7.4 - w) / 2, y = 1.75 + i * 0.98
    s.addShape(pres.ShapeType.roundRect, { x, y, w, h: 0.88, rectRadius: 0.1, fill: { color: col }, line: { color: col, width: 0 }, objectName: `Nivel ${t1}` })
    text(s, `${t1} · ${t2}`, { x, y, w, h: 0.88, fontSize: 16, bold: true, color: C.background1, align: 'center', valign: 'middle', fontFace: THEME.headFontFace })
    text(s, t3, { x: 8.3, y, w: 4.4, h: 0.88, fontSize: 18, color: C.text1, valign: 'middle' })
  })
  text(s, `${R.total} pruebas automáticas, ${R.fallas} fallas`, { x: 0.6, y: 6.6, w: 7.4, h: 0.4, fontSize: 18, color: C.accent1, bold: true, align: 'center' })
  s.addNotes('Abajo, muchas pruebas rápidas y baratas; arriba, pocas pruebas lentas con personas. Cifras tomadas del reporte docs/testing/reports/latest.md. Las pruebas E2E @live y @full están escritas pero aún no se ejecutan: necesitan el sistema real y las pantallas de compra.')

  // 11. Fin de semana
  s = ns('CONTENIDO', 'Plan')
  s.addText('Tu plan para el fin de semana', { placeholder: 'title' })
  const sab = ['09:00  Repositorio propio (privado) y Supabase', '10:45  Despliegue en Cloudflare', '11:45  Usuarios, roles y 2FA', '13:30  Tus specs y tu marca', '16:30  Pruebas manuales y reporte']
  const dom = ['09:00  Pedidos y pruebas de concurrencia', '09:45  Pantallas de compra', '13:15  QR del banco en certificación', '15:45  E2E y UAT por rol', '17:30  Limpieza y lanzamiento']
  ;[['Sábado', 'Infraestructura y base', sab, HEX.accent1], ['Domingo', 'Pedidos, pago y UAT', dom, HEX.accent3]].forEach(([d, sub, items, col], i) => {
    const x = 0.6 + i * 6.15
    card(s, x, 1.8, 5.95, 4.9, `Día ${d}`)
    text(s, d, { x: x + 0.35, y: 2.0, w: 5.2, h: 0.6, fontSize: 28, bold: true, color: col, fontFace: THEME.headFontFace })
    text(s, sub, { x: x + 0.35, y: 2.6, w: 5.2, h: 0.4, fontSize: 16, color: C.text2 })
    text(s, items.map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < items.length - 1 } })), { x: x + 0.35, y: 3.2, w: 5.3, h: 3.3, fontSize: 16, valign: 'top', paraSpaceAfter: 8 })
  })
  s.addNotes('Alcance honesto: este plan es para REPLICAR el sistema usando el repositorio como plantilla. Construirlo desde cero siguiendo SDD toma entre una y dos semanas. Gestiona el usuario del banco el viernes: sin habilitación en certificación no hay cobro.')

  // 12. Errores reales
  s = ns('CONTENIDO', 'Lecciones')
  s.addText('Errores reales que ya cometimos', { placeholder: 'title' })
  const errs = [
    ['Vite 5 en Cloudflare', 'La plataforma exigía Vite 6', 'Revisa los requisitos antes de fijar versiones'],
    ['Correo a localhost:3000', 'Site URL por defecto de Supabase', 'Configúralo antes de registrar usuarios'],
    ['Prometer "mañana vendemos"', 'No habíamos medido lo que faltaba', 'Estado del proyecto con horas y bloqueos'],
    ['Llave AES en un repo público', 'Se subió una captura del portal', 'Repo privado, escáner de secretos y rotar'],
  ]
  errs.forEach(([t1, t2, t3], i) => {
    const x = 0.6 + (i % 2) * 6.15, y = 1.85 + Math.floor(i / 2) * 2.45
    card(s, x, y, 5.95, 2.25, `Error ${i + 1}`)
    text(s, t1, { x: x + 0.3, y: y + 0.2, w: 5.4, h: 0.55, fontSize: 22, bold: true, color: i === 3 ? C.accent2 : C.accent4, fontFace: THEME.headFontFace })
    text(s, 'Causa: ' + t2, { x: x + 0.3, y: y + 0.85, w: 5.4, h: 0.55, fontSize: 16, color: C.text2, valign: 'top' })
    text(s, 'Prevención: ' + t3, { x: x + 0.3, y: y + 1.45, w: 5.4, h: 0.65, fontSize: 16, color: C.text1, valign: 'top' })
  })
  s.addNotes('Muestra el capítulo 07 del manual (docs/handbook/07-lecciones-aprendidas.md): tiene 18 problemas con síntoma, causa, solución y prevención. Aprender de los errores de otros ahorra horas.')

  // 13. Seguridad
  s = ns('CONTENIDO', 'Lecciones')
  s.addText('Un secreto en un repo público', { placeholder: 'title' })
  const sec = [
    ['FaLock', 'Repo privado', 'Mientras tenga documentos del banco', HEX.accent1],
    ['FaSearch', 'Escáner de secretos', 'Bloquea llaves, JWT e imágenes nuevas en cada commit', HEX.accent3],
    ['FaSyncAlt', 'Rota primero', 'Si hay duda, cambia la llave y luego investiga', HEX.accent4],
  ]
  for (let i = 0; i < sec.length; i++) {
    const [ic, t1, t2, col] = sec[i]
    const x = 0.6 + i * 4.1
    card(s, x, 1.9, 3.9, 4.4, `Regla ${t1}`)
    iconCircle(s, x + 1.4, 2.3, 1.1, col, `Círculo ${t1}`)
    s.addImage({ data: await icon(ic, HEX.lt1), x: x + 1.7, y: 2.6, w: 0.5, h: 0.5, altText: t1, objectName: `Ícono ${t1}` })
    text(s, t1, { x: x + 0.2, y: 3.7, w: 3.5, h: 0.6, fontSize: 24, bold: true, align: 'center', fontFace: THEME.headFontFace })
    text(s, t2, { x: x + 0.3, y: 4.4, w: 3.3, h: 1.6, fontSize: 17, color: C.text2, align: 'center', valign: 'top' })
  }
  s.addNotes('Incidente real del 8 de noviembre de 2026: se subieron capturas con la llave AES de la API del banco a un repositorio público. Se retiraron del árbol, pero el historial de git las conserva: lo que de verdad lo resuelve es rotar la llave. El hook local scripts/hooks/pre-commit y el escáner scripts/check_secrets.py son la prevención.')

  // 14. Replicar
  s = ns('CONTENIDO', 'Tu turno')
  s.addText('Replícalo en 5 pasos', { placeholder: 'title' })
  const rep = [
    ['Copia el repositorio y hazlo privado', HEX.accent1],
    ['Reescribe tus specs con las plantillas', HEX.accent3],
    ['Aplica las migraciones y corre las pruebas', HEX.accent4],
    ['Despliega primero la versión vacía', HEX.accent2],
    ['Conecta tu pasarela de pago y haz el UAT', HEX.accent6],
  ]
  rep.forEach(([t, col], i) => {
    const y = 1.85 + i * 0.96
    card(s, 0.6, y, 12.1, 0.82, `Paso ${i + 1}`)
    iconCircle(s, 0.8, y + 0.1, 0.62, col, `Número ${i + 1}`)
    text(s, String(i + 1), { x: 0.8, y: y + 0.1, w: 0.62, h: 0.62, fontSize: 22, bold: true, color: C.background1, align: 'center', valign: 'middle', fontFace: THEME.headFontFace })
    text(s, t, { x: 1.8, y, w: 10.7, h: 0.82, fontSize: 22, valign: 'middle' })
  })
  s.addNotes('Guía completa: docs/handbook/08-replicar-en-otro-proyecto.md, con prompts probados para pedirle ayuda al asistente de IA.')

  // 15. Qué falta
  s = ns('CONTENIDO', 'Estado real')
  s.addText('Lo que falta, sin maquillaje', { placeholder: 'title' })
  const est = [
    ['Cuentas, roles y auditoría', 'Hecho y probado', HEX.accent1],
    ['Catálogo del vendedor', 'Hecho y probado (7 pruebas manuales OK)', HEX.accent1],
    ['Pedidos y pagos (base de datos)', 'Hecho y probado en local', HEX.accent1],
    ['Pantallas de compra y comprobante', 'Pendiente', HEX.accent4],
    ['Cobro con QR del banco', 'Pendiente: el banco debe habilitar el usuario', HEX.accent2],
    ['Liquidaciones y comisión 1 %', 'Pendiente', HEX.accent4],
  ]
  est.forEach(([t1, t2, col], i) => {
    const y = 1.8 + i * 0.82
    card(s, 0.6, y, 12.1, 0.7, `Estado ${i + 1}`)
    s.addShape(pres.ShapeType.ellipse, { x: 0.85, y: y + 0.2, w: 0.3, h: 0.3, fill: { color: col }, line: { color: col, width: 0 }, objectName: `Semáforo ${i + 1}` })
    text(s, t1, { x: 1.4, y, w: 5.2, h: 0.7, fontSize: 18, bold: true, valign: 'middle', fontFace: THEME.headFontFace })
    text(s, t2, { x: 6.7, y, w: 5.8, h: 0.7, fontSize: 16, color: C.text2, valign: 'middle' })
  })
  s.addNotes('Lo restante se estima en 45 a 67 horas de trabajo efectivo (docs/estado-del-proyecto.md). El cobro con el banco depende de que el banco habilite el usuario API en certificación y de confirmar el cifrado AES y el campo password.')

  // 16. Cierre
  s = ns('CIERRE')
  s.addText('Construye algo que alguien pague', { placeholder: 'title' })
  s.addText('Specs claras · pruebas con ID · secretos a salvo · y a vender.\nTodo está en el repositorio: manuales, UAT, E2E y runbooks.', { placeholder: 'body' })
  s.addNotes('Cierra con una llamada a la acción: que cada persona elija una idea de negocio local y escriba su primera spec esta semana. FOTO SUGERIDA para el recuadro de la derecha: estudiantes celebrando frente a una laptop, o un comprador recibiendo su paquete.')

  await pres.writeFile({ fileName: path.join(__dirname, '..', 'GarageSales-taller-fin-de-semana.pptx') })
  await applyTheme(path.join(__dirname, '..', 'GarageSales-taller-fin-de-semana.pptx'), THEME)
  console.log('Presentación generada')
}
build().catch((e) => { console.error(e); process.exit(1) })
