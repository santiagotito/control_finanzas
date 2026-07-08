---
project_name: 'Control Financiero'
user_name: 'Santi'
date: '2026-07-08'
sections_completed:
  [
    'technology_stack',
    'language_rules',
    'framework_rules',
    'code_quality',
    'workflow_rules',
    'critical_rules',
  ]
---

# Project Context for AI Agents

_Reglas y patrones críticos que los agentes IA deben seguir al implementar código en este proyecto. Enfocado en detalles no obvios._

---

## Technology Stack & Versions

- **Frontend:** React 19.2 + Vite 7.2 (`type: module`, JSX plano — **no TypeScript**)
- **Estilos:** Tailwind CSS 3.4 (+ `clsx` y `tailwind-merge` para clases condicionales)
- **Routing:** react-router-dom 7.12 con `basename` implícito por `base: '/control_finanzas/'` en `vite.config.js`
- **Gráficos:** Recharts 3.6 · **Iconos:** lucide-react · **Fechas:** date-fns 4
- **Backend:** Google Apps Script (`backend.gs` v5) como Web App sobre Google Sheets — no hay base de datos ni servidor propio
- **Deploy:** GitHub Actions → GitHub Pages (repo `control_finanzas`)
- **Lint:** ESLint 9 (flat config, `eslint.config.js`) con react-hooks y react-refresh

## Critical Implementation Rules

### Backend (Google Apps Script)

- `backend.gs` en la raíz del repo es la **copia de referencia**: editarlo aquí NO actualiza el backend real. Todo cambio requiere pegarlo en el editor de Apps Script y re-desplegar el Web App manualmente. Avisar siempre al usuario cuando un cambio toque `backend.gs`.
- El backend enruta por `action` en el body JSON del POST (`{ action, payload }`). Al agregar un endpoint: agregar el case en `backend.gs` Y el método correspondiente en `src/services/api.js`.
- Los nombres de hojas de Google Sheets están en la constante `SHEET_NAMES` de `backend.gs` (Transacciones, Cuentas, Metas, Configuracion, Recurrentes, Habitos, HabitosLog, Gratitud, Frases, User). No inventar hojas nuevas sin agregarlas también a `setupSheets()`.

### Comunicación frontend ↔ backend

- Los POST al Apps Script usan `Content-Type: text/plain;charset=utf-8` **a propósito** para evitar el preflight CORS. No "corregirlo" a `application/json`.
- La URL del Web App vive hardcodeada en `src/config.js` (`API_URL`). El comentario dice que es variable de entorno, pero en la práctica está en el código — no moverla sin ajustar también el workflow de deploy.
- Las respuestas del backend siguen el formato `{ status: 'success' | 'error', data | message }`; comprobar siempre `result.status === 'success'` antes de usar `result.data`.

### React / Estado

- Estado global vía Context API con tres providers: `AppContext` (datos financieros), `AuthContext` (login), `HabitContext` (crecimiento personal). No introducir Redux/Zustand.
- Patrón de carga optimista: `AppContext` lee primero de `localStorage` (`finance_app_cache`) y refresca en segundo plano con `loadData(true)`. Toda mutación debe mantener este patrón (actualizar estado + refrescar desde API).
- Componentes en JSX plano con nombres PascalCase; páginas en `src/pages/*Page.jsx` (excepto `Dashboard.jsx`), componentes reutilizables en `src/components/<dominio>/`, lógica de cálculo en `src/utils/`.
- Los cálculos financieros (cuotas, proyecciones, saldos) van en `src/utils/financialUtils.js` y `src/utils/projectionUtils.js`, no dentro de componentes.

### Code Quality & Style

- Sin TypeScript y sin tests configurados actualmente — no crear archivos `.ts/.tsx` ni suites de test sin acordarlo antes.
- Idioma: UI, comentarios y textos en **español**; nombres de variables/funciones en inglés (patrón existente).
- `npm run lint` debe pasar antes de commitear (ESLint flat config).

### Development Workflow

- Rama única `main`; el push a `main` dispara el deploy a GitHub Pages vía `.github/workflows/deploy.yml`.
- `vite.config.js` tiene `base: '/control_finanzas/'` — las rutas absolutas de assets deben respetarlo; probar el build con `npm run build && npm run preview` antes de push.
- Commits mezclan español e inglés; formato preferido `tipo: descripción` (feat/fix/chore/docs).

### Critical Don't-Miss Rules

- **NO** leer ni exponer credenciales; el login compara contra la hoja `User` de Sheets — no loguear passwords ni tokens en consola.
- **NO** romper el fallback de caché: la app debe seguir renderizando con datos de `localStorage` si la API no responde.
- **NO** cambiar `Content-Type` de las peticiones ni agregar headers custom (rompe CORS con Apps Script).
- Cuidado con OneDrive: el repo vive en una carpeta sincronizada; evitar operaciones que generen miles de archivos temporales fuera de `node_modules`/`dist`.
- El directorio `app/` en la raíz es un remanente vacío de la migración a la raíz — no volver a colocar código ahí.
