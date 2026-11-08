# Consulta al Banco Económico (lista para enviar)

Estas son las dudas que bloquean pasar de "pruebas locales" a "cobros reales". Se pueden enviar tal cual por correo al contacto de API Market. **No incluir la llave AES ni contraseñas en el correo.**

---

**Asunto:** API Market (usuario A24627210) — consultas para el ambiente de certificación y producción

Buenos días. Estamos integrando QR Simple (generateQR, statusQR, cancelQR, paidQR) y consulta de movimientos con el usuario API **A24627210**, tipo de uso APIMARKET. Necesitamos confirmar lo siguiente:

1. **Autenticación (`/api/authentication/authenticate`):** el manual pide `userName` y `password` (cifrado). Nuestro portal solo muestra el usuario y la llave AES; no recibimos ninguna contraseña. ¿Qué valor debe ir en `password` y cómo se obtiene o se genera?
2. **Cifrado AES-256:** ¿qué modo (CBC, ECB, GCM), qué vector de inicialización, qué relleno (PKCS7) y en qué formato se interpreta la llave (32 caracteres de texto o 64 caracteres hexadecimales)? ¿Pueden darnos un ejemplo con texto plano, llave de prueba y resultado esperado?
3. **Certificación:** ¿nuestro usuario ya está habilitado en `https://apimktdesa.baneco.com.bo/ApiGateway/`? ¿Con qué cuenta de abono de pruebas (`accountCredit`) podemos generar QR y cómo se simula un pago en ese ambiente?
4. **Notificación de pago (`notifyPaymentQR`):** registramos la URL en el portal. ¿Desde qué IP salen las notificaciones, qué tipo de autorización admiten (Bearer, Basic) y cuántos reintentos hacen si respondemos con error?
5. **Producción:** URL base de producción, proceso y tiempos para pasar de certificación a producción, y si la llave AES y el usuario cambian.
6. **Límites:** tiempo de vida del token y límites de consultas por minuto en `statusQR`, `paidQR` y `accounts/history`.
7. **Catálogo de bancos:** el archivo o tabla con los códigos ASFI (`senderBankCode`) y el nombre de cada entidad.
8. **Campo `description`:** confirmar largo máximo (100 caracteres), caracteres permitidos y si aparece en el comprobante del pagador.
9. **Movimientos:** la URL que tenemos de una integración anterior (`accounts/queryMovements`) no aparece en el manual v1.3.0 (que documenta `accounts/history`). ¿Cuál es la vigente?

Gracias.

---

## Qué se hace con las respuestas
| Respuesta | Dónde se aplica |
|---|---|
| 1 (password) | secreto `BANCO_ECONOMICO_PASSWORD` |
| 2 (AES) | `supabase/functions/_shared/aes.ts` y su prueba con el ejemplo del banco |
| 3 y 5 (certificación/producción) | `BANCO_ECONOMICO_BASE_URL`, `BANCO_ECONOMICO_ACCOUNT_CREDIT` |
| 4 (notificación) | portal del banco: URL de la función `notify-payment` y token |
| 7 (catálogo) | tabla `bank_catalog` |
