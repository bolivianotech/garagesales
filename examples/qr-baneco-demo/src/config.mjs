// Lee la configuración de variables de entorno y de un archivo .env opcional (sin dependencias).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function cargarEnv(archivo = path.join(raiz, '.env')) {
  if (!fs.existsSync(archivo)) return
  for (const linea of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m || linea.trim().startsWith('#')) continue
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

export function leerConfig(env = process.env) {
  const modo = (env.BANK_MODE || 'mock').toLowerCase()
  if (!['mock', 'real'].includes(modo)) throw new Error('BANK_MODE debe ser "mock" o "real".')
  const cfg = {
    raiz,
    modo,
    puerto: Number(env.PORT || 3000),
    baseUrl: (env.BANK_BASE_URL || '').replace(/\/$/, ''),
    usuario: env.BANK_USERNAME || '',
    aesKey: env.BANK_AES_KEY || '',
    passwordPlano: env.BANK_PASSWORD_PLAIN || '',
    passwordCifrado: env.BANK_PASSWORD_ENCRYPTED || '',
    // Qué se cifra como "password": plain (BANK_PASSWORD_PLAIN) · usuario (se cifra el propio usuario) · vacio (se cifra una cadena vacía)
    passwordDe: (env.BANK_PASSWORD_FROM || '').toLowerCase(),
    cuentaAbono: env.BANK_ACCOUNT_CREDIT || '',
    tokenAviso: env.BANK_NOTIFY_TOKEN || '',
    precios: [Number(env.DEMO_PRICE_1 || 0.01), Number(env.DEMO_PRICE_2 || 0.01)],
  }
  if (modo === 'real') {
    const faltan = []
    if (!cfg.baseUrl) faltan.push('BANK_BASE_URL')
    if (!cfg.usuario) faltan.push('BANK_USERNAME')
    if (!cfg.aesKey) faltan.push('BANK_AES_KEY')
    if (cfg.passwordDe && !['plain', 'usuario', 'vacio'].includes(cfg.passwordDe)) throw new Error('BANK_PASSWORD_FROM debe ser "usuario", "vacio" o "plain".')
    if (cfg.passwordDe === 'usuario') cfg.passwordPlano = cfg.usuario
    if (cfg.passwordDe === 'vacio') cfg.passwordPlano = ''
    const sinPassword = !cfg.passwordPlano && !cfg.passwordCifrado && !['vacio'].includes(cfg.passwordDe)
    if (sinPassword) faltan.push('BANK_PASSWORD_PLAIN, BANK_PASSWORD_ENCRYPTED o BANK_PASSWORD_FROM (usuario | vacio)')
    if (!cfg.cuentaAbono) faltan.push('BANK_ACCOUNT_CREDIT')
    if (faltan.length) throw new Error('Faltan variables en .env para el modo real: ' + faltan.join(', '))
  }
  return cfg
}
