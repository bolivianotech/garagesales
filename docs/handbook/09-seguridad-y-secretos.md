# 09 · Seguridad y secretos

## 1. Qué es un secreto aquí
| Secreto | Dónde vive | Quién puede verlo |
|---|---|---|
| Llave AES del banco | Secretos de Supabase (Edge Functions) | Nadie, salvo el titular en el portal del banco |
| Usuario/contraseña de API Market | Secretos de Supabase | Titular |
| Clave `service_role` de Supabase | Secretos de Supabase | Titular |
| Contraseña de la base de datos | Gestor de contraseñas del titular | Titular |
| Token del aviso del banco | Secretos de Supabase y portal del banco | Titular |

**No son secretos** (van en el navegador por diseño): la URL del proyecto Supabase y la clave pública (`anon`/*publishable*). Aun así, no se pegan en lugares públicos innecesariamente.

## 2. Reglas
1. Un secreto **jamás** va al repositorio, a capturas de pantalla, a chats ni a correos.
2. Si hay duda de que se filtró, se **rota** primero y se investiga después.
3. Las capturas del portal del banco se tapan o se guardan **fuera** del repositorio (`docs/privado/` está ignorado, aun así preferible una carpeta externa).
4. El repositorio es **privado** mientras contenga documentos del banco.
5. Las Edge Functions leen secretos de variables de entorno; nunca de archivos del repo.
6. Cualquier archivo de Office abierto crea temporales (`~$archivo.docx`): están en `.gitignore`.

## 3. Incidente del 2026-11-08 (registro)

| Dato | Detalle |
|---|---|
| Qué pasó | Se subió a un repositorio **público** el commit `6ca9b28` con `docs/image003.png` (llave AES visible) y `docs/text_prod.jpeg` (usuario y password cifrado en una prueba del banco) |
| Detección | Al revisar el contenido de los archivos subidos |
| Contención | Archivos retirados del árbol y `.gitignore` reforzado. `main` se auditó (29 commits, sin imágenes ni patrones de secretos) y **está limpia**: el commit solo existía en la rama de trabajo. Se creó la rama limpia `claude/garagesales-limpia-ivzqi8` **sin** ese commit |
| Lo que NO se resuelve con eso | El historial de git sigue conteniendo los archivos |
| Acciones obligatorias del titular | (1) Regenerar la llave AES en el portal; (2) cambiar la contraseña/credencial de API; (3) pasar el repositorio a **privado**; (4) revisar el `.docx` subido; (5) avisar al estudiante que usa la misma credencial en sus sistemas |
| Acciones adicionales | Fusionar la rama limpia y **borrar la rama anterior** (`claude/dreamy-faraday-ivzqi8`) en GitHub → *Branches* → papelera. GitHub puede seguir sirviendo el commit por su código durante un tiempo, así que **rotar sigue siendo obligatorio** |
| Estado | **Abierto hasta que se confirme la rotación** |

### Procedimiento de rotación (30 minutos)
1. Portal del banco → usuario de API → **regenerar Llave AES** (ícono junto al campo). Guardar la nueva llave en el gestor de contraseñas.
2. Cambiar la contraseña/credencial de API siguiendo el proceso del banco.
3. Actualizar los secretos en Supabase: `supabase secrets set BANCO_ECONOMICO_AES_KEY=… BANCO_ECONOMICO_PASSWORD=…`
4. Redesplegar las Edge Functions.
5. Probar `authenticate` y generar un QR de prueba.
6. Registrar la fecha de rotación en `docs/estado-del-proyecto.md`.

> Cuidado: regenerar la llave afecta a **todos** los sistemas que usen ese usuario (por ejemplo, los del estudiante). Coordinar antes.

## 4. Detección automática
- `scripts/check_secrets.py` revisa archivos nuevos y modificados buscando llaves hexadecimales de 32/64 caracteres, JWT, claves `sb_secret_`, `service_role`, bloques de clave privada y asignaciones `…KEY=valor` no vacías. Se ejecuta antes de cada commit (`scripts/hooks/pre-commit`) y en CI.
- GitHub *secret scanning* del repositorio (Settings → Code security) conviene activarlo.
- Antes de hacer público un repositorio, escanear **también el historial**.

## 5. Datos personales
- El nombre del pagador y su banco vienen del banco; se muestran solo al comprador (su comprobante), al vendedor de ese pedido y al personal.
- El número de cuenta del pagador llega ofuscado y así se guarda.
- Los números de cuenta de vendedores se cifran en reposo (spec 008).
- Cumplir la normativa boliviana de protección de datos; publicar política de privacidad antes del lanzamiento.

## 6. Plan de respuesta a incidentes
1. **Contener:** rotar credenciales, pausar funciones si hace falta.
2. **Evaluar:** qué se expuso, desde cuándo, quién lo vio (logs).
3. **Corregir:** eliminar la causa y agregar una prevención automática.
4. **Registrar:** este capítulo, con fecha y responsable.
5. **Aprender:** una línea en [07 · Lecciones aprendidas](07-lecciones-aprendidas.md).
