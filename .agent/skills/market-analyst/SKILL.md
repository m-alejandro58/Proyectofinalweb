---
description: Analista de Mercado IA - Rastrea precios en Google Shopping Colombia y genera reporte estratégico con Gemini
---

# Analista de Mercado IA (Market Analyst)

## Activación
Este skill se activa cuando el usuario solicita:
- Análisis de precios de mercado
- Comparación de precios con retailers colombianos
- Reporte de competencia
- Estrategia de pricing basada en datos reales

## Funcionalidad
1. **Recopilación de datos**: Consulta Google Shopping vía SerpApi, filtrado por Colombia (`gl=co`).
2. **Retailers clave**: Identifica precios de Alkosto, Ktronix, Falabella, Éxito, Speedlogic y Tauret.
3. **Estadísticas**: Calcula precio mínimo, máximo y promedio.
4. **Análisis IA**: Gemini 3.1 Flash Lite genera un reporte estratégico considerando el contexto fiscal colombiano 2026 (UVT = $52.374 COP, exclusión de IVA para computadores bajo 50 UVT).

## Archivos
- `src/app/actions/market-analyst.ts` — Server Action (SerpApi + Gemini)
- `src/components/inventory/market-analyst-dialog.tsx` — UI Dialog
- Botón integrado en `product-table.tsx`

## Variables de Entorno
- `SERPAPI_KEY` — API Key de SerpApi (serpapi.com)
- `GEMINI_API_KEY` — API Key de Google Gemini
