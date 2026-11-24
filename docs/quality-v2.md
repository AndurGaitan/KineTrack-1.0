# Indicadores de calidad v2 — frontend (fase 1, modo sombra)

Documentación completa (modelo, reglas, activación, rollback, decisiones pendientes): `backend/docs/quality-v2/README.md`.

Rama: `feature/quality-indicators-v2-pve-shadow`. Todo lo de este documento queda **oculto con la flag `quality_indicators_v2` apagada** (valor por defecto): la app se comporta igual que antes.

## Qué se agregó
- `GET /api/settings` ahora puede traer `qualityIndicatorsV2` (campo aditivo). Se guarda en el estado de la app (`AppContext.qualityIndicatorsV2`) y `setQualityV2Enabled(enabled)` lo cambia (solo coordinador).
- **Calidad v2** (`/coordinator/calidad-sombra`, solo coordinador): pestaña en la navegación del coordinador (solo con la flag activa) y pantalla con definición del indicador, cumplimiento de PVE, completitud, numerador/denominador/excluidos/sin evaluar/incompletos, tabla por día, pacientes que explican cada resultado y corrección auditada. Es una vista de **contraste**: no reemplaza al panel de calidad actual.
- **Aviso discreto** (`PveV2PendingNotice`) en el detalle del sector, desde la hora de aviso de la institución (18:00 por defecto), con los pacientes en VMI sin la PVE de hoy registrada.

## Archivos
Modificados: `src/App.tsx`, `src/api/settingsApi.ts`, `src/components/CoordinatorNav.tsx`, `src/contexts/AppContext.tsx`, `src/pages/SectorDetailPage.tsx`, `src/types/index.ts`.
Nuevos: `src/api/qualityV2Api.ts`, `src/components/PveV2PendingNotice.tsx`, `src/pages/coordinator/QualityShadowPage.tsx`.

## Verificación
`npx tsc --noEmit`: 55 errores, los mismos de antes de la rama. `eslint`: 5 errores y 87 advertencias, idénticos a la línea base; los archivos nuevos sin hallazgos. `vite build`: correcto. No hay pruebas automáticas en el frontend ni se probó la interfaz en un navegador contra una base real.
