# Presentación del taller

**`GarageSales-taller-fin-de-semana.pptx`** — 16 diapositivas (16:9) para una audiencia joven: del método SDD a una tienda con pago QR, con cifras reales del proyecto, errores reales y un plan de fin de semana. Cada diapositiva tiene **notas del orador**.

| # | Diapositiva | # | Diapositiva |
|---|---|---|---|
| 1 | Portada | 9 | 20 pagos, 1 unidad (gráfico) |
| 2 | Dos días, un sistema completo | 10 | La pirámide de pruebas |
| 3 | Del catálogo al retiro | 11 | Plan de fin de semana |
| 4 | Primero la spec | 12 | Errores reales |
| 5 | Una spec por dentro | 13 | Un secreto en un repo público |
| 6 | Herramientas gratuitas | 14 | Replícalo en 5 pasos |
| 7 | Arquitectura | 15 | Lo que falta, sin maquillaje |
| 8 | Cada rol ve solo lo suyo | 16 | Cierre |

## Fotos
La portada y el cierre tienen un **recuadro de foto** (clic → *Insertar imagen*). Mientras no pongas fotos, se ve un patrón QR decorativo. Qué fotos usar y de dónde sacarlas: [`guia-de-fotos.md`](guia-de-fotos.md). Las fotos reales **no vienen incluidas**: hay que agregarlas.

## Regenerar el archivo
```bash
# una vez, fuera del repositorio:
mkdir ~/deckdeps && cd ~/deckdeps && npm init -y && npm install pptxgenjs react react-dom react-icons sharp
# desde la raíz del repositorio:
NODE_PATH=~/deckdeps/node_modules node docs/presentations/src/build_taller.js
```
El script usa la herramienta de PowerPoint del asistente para aplicar el tema; si no la tienes, comenta las dos líneas de `applyTheme` y ajusta los colores a mano. Las cifras (201 pruebas; 63 / 115 / 13 / 5 casos) salen de `docs/testing/reports/latest.md`: actualízalas si cambian.
