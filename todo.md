# Paisajismo Pro — TODO

## CRÍTICO: Módulo Tienda (Núcleo del Sistema)
- [x] CRUD completo de productos en panel admin
- [x] Validación de stock antes de usar en diseño
- [x] Tienda como fuente única de verdad para todos los productos
- [x] Catálogo público con filtros (tipo, clima, tamaño)
- [x] Página de Tienda con visualización de productos

## Integración Crítica: Motor de Diseño
- [x] Refactorizar para usar SOLO productos de tienda
- [x] Validar que cada producto exista en tienda
- [x] Usar spacing real de cada producto
- [x] Usar precios reales de tienda
- [x] NO usar datos ficticios

## Integración Crítica: Cotizador
- [ ] Validar stock disponible antes de cotizar
- [ ] Usar precios reales de tienda
- [ ] Descontar stock (preparado para V1)
- [ ] Mostrar advertencia si stock es insuficiente

## Mejoras Módulo 1: Captura
- [x] Cámara real del dispositivo (trasera/frontal)
- [x] Herramienta de medición de terreno (líneas/píxeles)
- [x] Zoom y controles de medición
- [x] Captura de área en m²

## Fase 0: Inicialización
- [x] Scaffold del proyecto (web-db-user)
- [x] Crear todo.md

## Módulo 1 — Captura de terreno
- [x] Interfaz de subida de imagen desde archivo (botón + preview)
- [x] Acceso a cámara en vivo y captura directa
- [x] Almacenamiento de imagen en S3 y referencia en DB

## Módulo 2 — Análisis del terreno
- [x] Análisis de imagen con LLM (visión computacional)
- [x] Detección de tipo de suelo, obstáculos y área usable
- [x] Retornar mapa simplificado con zonas utilizables
- [x] Mostrar resultados de análisis en UI

## Módulo 3 — Limpieza de escena
- [x] Canvas interactivo sobre la imagen capturada
- [x] Herramienta de selección de áreas (brush/pincel)
- [x] Eliminación digital de objetos seleccionados (inpainting local)
- [x] Guardar imagen limpia en S3

## Módulo 4 — Inventario
- [x] Tabla `plants` en DB (id, name, type, price, stock, region, climate, size, spacing, sun, maintenance)
- [x] Seed de inventario real (43 elementos: plantas, árboles, arbustos, piedras, césped)
- [x] CRUD de inventario en panel admin
- [x] API de consulta de inventario con filtros

## Módulo 5 — Motor de diseño
- [x] Lógica de generación de layout con LLM
- [x] Respetar spacing entre plantas
- [x] Distribución lógica (árboles al fondo, decorativas al frente)
- [x] Validar clima y región
- [x] Output: lista de elementos con posiciones (x, y)

## Módulo 6 — Cotizador
- [x] Calcular cantidades basadas en área y spacing
- [x] Validar stock disponible
- [x] Usar precios reales del inventario
- [x] Generar total del proyecto (materiales + mano de obra)
- [x] Mostrar desglose de cotización
- [x] Exportar cotización a texto

## Módulo 7 — Visualización 2D
- [x] Renderizar diseño sobre imagen original en canvas
- [x] Mostrar posiciones reales de cada elemento
- [x] Leyenda de elementos usados
- [x] Exportar imagen del diseño
- [x] Generación de visualización fotorrealista con IA

## Módulo 8 — Persistencia
- [x] Tabla `projects` en DB
- [x] Guardar proyecto completo (imagen, análisis, diseño, cotización)
- [x] Listar proyectos guardados
- [x] Reabrir y editar proyecto existente

## Infraestructura
- [x] Schema de DB completo (plants, projects, project_items)
- [x] Migraciones aplicadas
- [x] Rutas tRPC para todos los módulos
- [x] DashboardLayout con navegación entre módulos
- [x] Tests vitest (14/14 pasando)
- [x] Checkpoint final
