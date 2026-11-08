# 07 · Lecciones aprendidas (problemas reales y su solución)

Cada fila es algo que **de verdad pasó** en este proyecto. Si te aparece el síntoma, ya sabes qué hacer.

| # | Síntoma | Causa | Solución | Prevención |
|---|---|---|---|---|
| 1 | El asistente no podía probar contra Supabase | El entorno de desarrollo bloquea `supabase.co` | Probar en PostgreSQL local con un Supabase simulado (`supabase/tests/00_mock_supabase.sql`) | Documentar qué se probó local y qué no |
| 2 | Cloudflare: "Vite 5.4.21 cannot be automatically configured" | Wrangler exige Vite ≥ 6 para autoconfigurar | Subir a Vite 6 y Vitest 3 | Revisar requisitos de la plataforma antes de fijar versiones |
| 3 | Cloudflare (ramas): "missing a `previews` block" | `wrangler preview` exige `"previews": {}` | Agregarlo a `wrangler.jsonc` | Probar con una rama de prueba en el primer despliegue |
| 4 | Cloudflare construía `main` y fallaba | El código estaba en otra rama | Cambiar *Production branch* o fusionar | Fusionar la primera versión funcional a `main` cuanto antes |
| 5 | El correo de confirmación llevaba a `localhost:3000` | Site URL por defecto de Supabase | Configurar Site URL y Redirect URLs; la app envía `emailRedirectTo` | Configurar URLs **antes** de registrar usuarios |
| 6 | Un test SQL "no fallaba" cuando debía | El `INSERT … SELECT` no insertaba filas (la fila no era visible por RLS) | Usar el id real obtenido como superusuario (`\gset`) | Probar siempre que la acción devuelve error, no que "no hay filas" |
| 7 | La suite ejecutaba un archivo de datos como si fuera prueba | El patrón `NNN_*.sql` incluía el archivo de preparación | Renombrar sin prefijo numérico (`concurrency_setup.sql`) | Convención de nombres: solo las pruebas llevan prefijo numérico |
| 8 | `UPDATE … RETURNING` dentro de un subselect no funciona | SQL no admite DML en subconsulta | Helper `expect_affected` con `GET DIAGNOSTICS` | Helpers de prueba comunes (`helpers.sql`) |
| 9 | Dos compradores, una unidad | Competencia por el stock | Descontar en la confirmación con bloqueo de filas; probar con 20 conexiones reales | Prueba de concurrencia en CI |
| 10 | El hook de git avisaba "commits sin subir" siempre | Clon superficial sin la referencia `origin/<rama>` | Verificar con `git fetch` que el commit remoto = local | Entender el aviso antes de actuar |
| 11 | `git push --force` fue bloqueado | Reescribe historia remota | Hacer un `merge` normal de `main` en la rama | Evitar reescribir historia compartida |
| 12 | La rama ya estaba fusionada y se siguió trabajando sobre ella | Reutilizar una rama tras su PR | Reiniciarla desde `main` (o fusionar `main` en ella) | Una rama por tarea y borrarla al fusionar |
| 13 | "No veo el PR para fusionar" | El PR ya estaba fusionado | Revisar `Closed` y `Merged` en GitHub | Mirar el estado del PR antes de buscar uno nuevo |
| 14 | Prometimos "vender mañana" | No se había medido lo que faltaba | `estado-del-proyecto.md` con horas y bloqueos | Estimar con evidencia, separar "hecho" de "pendiente" |
| 15 | **Credenciales del banco subidas a un repo público** | Se subieron capturas con la llave AES y un password cifrado | Retirar del árbol, **rotar llave y contraseña**, escáner de secretos | Capítulo 09: repositorio privado, `.gitignore`, `check_secrets.py` |
| 16 | `authenticate` responde `404 "Usuario no habilitado para uso de apis"` | El banco no habilitó el usuario en ese ambiente | Pedir la habilitación al banco | Gestionarlo **antes** de empezar a programar |
| 17 | Una cuenta Gmail con `+` | El truco funciona, pero cuesta explicarlo | Documentar con ejemplo literal y advertir de la variante sin `+` | Tabla de cuentas exactas en la guía |
| 18 | Función de moderación imposible de probar desde el SQL Editor | Identifica al admin por la sesión del usuario | Construir la pantalla de admin; marcar la prueba como bloqueada | Diseñar pruebas manuales que dependan solo de lo ya construido |

## Hábitos que ahorraron tiempo
- Aplicar **primero** el despliegue vacío (para encontrar problemas de plataforma el primer día).
- Cada fase cierra con **reporte de pruebas**, no con "creo que funciona".
- Preguntar al dueño en tandas cortas con opciones y recomendación.
- Registrar decisiones como ADR el mismo día.

## Hábitos que costaron tiempo
- Resolver tarde lo del banco (usuario, contraseña, AES): bloquea todo el cobro.
- Escribir una regla (reserva) sin confirmarla con el dueño.
- Dejar que los archivos de trabajo personales entren al repositorio.
