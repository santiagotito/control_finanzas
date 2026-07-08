# PROJECT HANDOVER — Control Financiero

## ESTADO ACTUAL
> Última actualización: 2026-07-08

**Branch activo:** `main` (árbol limpio, sin cambios pendientes)
**Trabajando en:** Proyecto estable — sin trabajo en progreso desde el 2026-02-08. Se retoma sesión para preparar el proyecto con BMAD.
**Stack:** React 19 + Vite 7 + Tailwind 3 (frontend, GitHub Pages) · Google Apps Script + Google Sheets (backend, `backend.gs` v5)
**Último sprint:** Fix de login y robustez del backend (feb 2026)

**Cambios recientes (últimos 5 commits):**
- `afce824` Fix login syntax error and improve backend robustness
- `174b658` Publicación para GitHub Pages: moviendo archivos a la raíz
- `a9d473b` Reestructurando para GitHub Pages: moviendo contenido de app a la raíz
- `d5132d4` Mejoras en Crecimiento Personal: hábitos custom, gratitud, frases y feedback visual
- `9283867` feat: Configure deployment to control_finanzas repo con GitHub Actions

**Pendiente prioritario:**
- [ ] Definir próximas features con BMAD (PRD / epics) — proyecto recién preparado para el flujo BMAD
- [ ] Actualizar README.md (todavía es el template genérico de Vite, no describe la app)
- [ ] Revisar que el deploy de GitHub Pages siga funcionando tras 5 meses sin cambios

**Archivos más activos del proyecto:**
- `backend.gs` — Backend Apps Script sobre Google Sheets (auth, CRUD, saldos)
- `src/services/api.js` — Cliente HTTP hacia el Apps Script
- `src/pages/Dashboard.jsx` — Dashboard principal con gráficos
- `src/pages/AnalysisPage.jsx` — Análisis y drill-down de deudas
- `src/context/AppContext.jsx` — Estado global de datos financieros
- `src/utils/financialUtils.js` — Cálculos financieros (cuotas, proyecciones)

**Decisiones activas (no están en el código):**
- El backend es un Web App de Google Apps Script pegado manualmente en el editor de Apps Script — `backend.gs` en el repo es la copia de referencia; cambios ahí requieren re-desplegar el Web App a mano.
- La app se movió del subdirectorio `app/` a la raíz del repo para simplificar el deploy a GitHub Pages (el directorio `app/` quedó vacío como remanente).
- Las peticiones POST al Apps Script usan `Content-Type: text/plain` para evitar preflight CORS.
- Deploy: GitHub Actions (`.github/workflows/deploy.yml`) publica al repo `control_finanzas` en GitHub Pages.

---

## HISTORIAL DE SPRINTS

### 2026-07-08 — Preparación del proyecto: handover + BMAD

**Qué se hizo:**
- Se creó este documento de handover (`PROJECT_HANDOVER.md`) con la sección ESTADO ACTUAL para habilitar `/handover prime` en próximas sesiones.
- Se preparó el proyecto para trabajar con la metodología BMAD (generación de contexto de proyecto para agentes IA).

**Archivos clave modificados:**
- `PROJECT_HANDOVER.md` — creado (este documento)
- `docs/project-context.md` — contexto del proyecto para agentes BMAD

**Decisiones técnicas:**
- El handover doc vive en la raíz del repo (no en `docs/`) para máxima visibilidad.

**Pendiente para la próxima sesión:**
- [ ] Correr `/handover prime` al iniciar la próxima sesión para cargar contexto barato
- [ ] Usar los skills BMAD (PRD, epics, stories) para planificar la siguiente ronda de features

### Resumen histórico (reconstruido desde git, feb 2026 y anteriores)

**Qué se hizo (últimas rondas de trabajo antes de este handover):**
- Login con email/password contra hoja `User` de Google Sheets + mejoras de robustez del backend (v5).
- Migración de la app desde `app/` a la raíz del repo y configuración de CI/CD a GitHub Pages (router basename, 404 handling, workflow en la raíz).
- Módulo de Crecimiento Personal: hábitos custom, registro de gratitud, frases motivacionales y feedback visual (`HabitContext`, hojas `Habitos`, `HabitosLog`, `Gratitud`, `Frases`).
- Dashboard rediseñado: alertas inteligentes, sincronización de cuotas, drill-down de deudas (modal en AnalysisPage), flujo de caja proyectado con filtros corregidos.
- Organización por cuenta en reglas recurrentes y pagos; ordenamiento en desgloses del Dashboard.

**Funcionalidad actual de la app (páginas):**
Dashboard, Transacciones, Cuentas, Metas, Objetivos Mensuales, Alertas de Pago, Reglas Recurrentes, Análisis, Configuración, Login. Herramientas: calculadora de compras diferidas, gauge de presupuesto, gráficos (Recharts).
