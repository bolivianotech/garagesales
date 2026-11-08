// Pedidos en memoria con respaldo en data/pedidos.json (suficiente para una demo; en producción va una base de datos).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { bsACentavos } from './dinero.mjs'

export function catalogoDemo(precios) {
  return [
    { id: 'camisa', sku: 'CAM-001', titulo: 'Camisa azul', precioCentavos: bsACentavos(precios[0]) },
    { id: 'gorra', sku: 'GOR-002', titulo: 'Gorra negra', precioCentavos: bsACentavos(precios[1]) },
  ]
}

export class Pedidos {
  constructor(archivo = null) {
    this.archivo = archivo
    this.lista = new Map()
    this.secuencia = 0
    if (archivo && fs.existsSync(archivo)) {
      const datos = JSON.parse(fs.readFileSync(archivo, 'utf8'))
      for (const p of datos) { this.lista.set(p.id, p); this.secuencia = Math.max(this.secuencia, p.numero) }
    }
  }
  _guardar() {
    if (!this.archivo) return
    fs.mkdirSync(path.dirname(this.archivo), { recursive: true })
    fs.writeFileSync(this.archivo, JSON.stringify([...this.lista.values()], null, 2))
  }

  /** El precio SIEMPRE sale del catálogo del servidor; lo que mande el navegador se ignora. */
  crear(items, catalogo) {
    if (!Array.isArray(items) || items.length < 1 || items.length > 2) throw Object.assign(new Error('Elige 1 o 2 productos.'), { http: 400 })
    const vistos = new Set()
    const lineas = items.map((i) => {
      const prod = catalogo.find((c) => c.id === i?.id)
      if (!prod) throw Object.assign(new Error('Producto desconocido.'), { http: 400 })
      if (vistos.has(prod.id)) throw Object.assign(new Error('Producto repetido.'), { http: 400 })
      vistos.add(prod.id)
      const qty = Number(i.qty)
      if (!Number.isInteger(qty) || qty < 1 || qty > 5) throw Object.assign(new Error('Cantidad inválida (1 a 5).'), { http: 400 })
      return { id: prod.id, sku: prod.sku, titulo: prod.titulo, qty, precioCentavos: prod.precioCentavos }
    })
    const numero = ++this.secuencia
    const pedido = {
      id: crypto.randomUUID(), numero, codigo: 'D-' + String(numero).padStart(4, '0'), items: lineas,
      totalCentavos: lineas.reduce((s, l) => s + l.qty * l.precioCentavos, 0),
      estado: 'pendiente', qrId: null, qrImage: null, vence: null, pagador: null, creado: new Date().toISOString(), pagadoEn: null,
    }
    this.lista.set(pedido.id, pedido)
    this._guardar()
    return pedido
  }
  obtener(id) { return this.lista.get(id) || null }
  porQr(qrId) { return [...this.lista.values()].find((p) => p.qrId === qrId) || null }

  /** Aplica el estado que reportó el BANCO (nunca el que diga el navegador). Idempotente. */
  aplicarEstadoBanco(pedido, estado) {
    if (pedido.estado === 'pagado') return pedido
    if (estado.pagado) {
      const p = estado.pago || {}
      pedido.estado = 'pagado'
      pedido.pagadoEn = new Date().toISOString()
      pedido.pagador = { nombre: p.senderName ?? null, banco: p.senderBankCode ?? null, cuenta: p.senderAccount ?? null, fecha: p.paymentDate ?? null, hora: p.paymentTime ?? null, monto: p.amount ?? null }
    } else if (estado.anulado && pedido.estado === 'pendiente') {
      pedido.estado = 'anulado'
    }
    this._guardar()
    return pedido
  }
  vista(p) {
    const { id, codigo, items, totalCentavos, estado, qrImage, vence, pagador, creado, pagadoEn } = p
    return { id, codigo, items, totalCentavos, estado, qrImage, vence, pagador, creado, pagadoEn }
  }
}
