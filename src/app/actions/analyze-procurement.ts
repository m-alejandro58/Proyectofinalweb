"use server"

import { requireAuth } from "@/lib/auth-guard"
import { GoogleGenAI } from "@google/genai"
import {
    searchGoogleShopping,
    generateSimulatedPrices,
    type MarketPriceStats,
} from "@/app/actions/market-analyst"
import { calculateGrossProfit, calculateMarginPercentage } from "@/utils/finance"

// ── Types ────────────────────────────────────────────────────
export type ProcurementVerdict = "PRODUCTO_GANADOR" | "DESCARTAR" | "NEUTRAL"

export type ProcurementAnalysisInput = {
    productName: string
    supplierCost: number
    salePrice: number
    commissionPercent: number
    shippingCost: number
}

export type ProcurementAnalysisResult = {
    success: boolean
    verdict?: ProcurementVerdict
    stats?: MarketPriceStats
    report?: string
    calculations?: {
        totalMLCost: number
        netProfit: number
        netMarginPercent: number
    }
    error?: string
}

// ══════════════════════════════════════════════════════════════
// ── Main Server Action ──────────────────────────────────────
// ══════════════════════════════════════════════════════════════
export async function analyzeProcurement(
    input: ProcurementAnalysisInput,
): Promise<ProcurementAnalysisResult> {
    await requireAuth()

    const { productName, supplierCost, salePrice, commissionPercent, shippingCost } = input

    // ── Validations ──
    if (!productName || productName.trim().length === 0) {
        return { success: false, error: "Nombre de producto requerido" }
    }
    if (supplierCost <= 0) {
        return { success: false, error: "Costo del proveedor debe ser mayor a 0" }
    }
    if (salePrice <= 0) {
        return { success: false, error: "Precio de venta debe ser mayor a 0" }
    }

    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) {
        return { success: false, error: "API Key de Gemini no configurada" }
    }

    // ── Local calculations using finance module ──
    const commissionAmount = Math.round(salePrice * (commissionPercent / 100))
    const totalMLCost = commissionAmount + shippingCost
    const totalCost = supplierCost + totalMLCost
    const netProfit = calculateGrossProfit(salePrice, totalCost)
    const netMarginPercent = calculateMarginPercentage(totalCost, salePrice)

    try {
        // ── 1. Search market prices via SerpApi ──
        let stats: MarketPriceStats
        let dataSource: string

        try {
            stats = await searchGoogleShopping(productName.trim())
            dataSource = `Google Shopping Colombia (${stats.count} resultados reales)`
        } catch (searchErr: any) {
            const msg = searchErr.message || ""
            if (msg === "SERPAPI_KEY_MISSING") {
                return { success: false, error: "⚠️ SERPAPI_KEY no configurada en .env" }
            }
            console.warn("SerpApi search failed for procurement:", msg)
            stats = await generateSimulatedPrices(productName)
            dataSource = "Estimación algorítmica (API no disponible)"
        }

        // ── 2. Build competition prices for the prompt ──
        const competitorPrices = stats.listings
            .slice(0, 12)
            .map(l => `- ${l.source}: $${l.price.toLocaleString("es-CO")} COP ("${l.title}")`)
            .join("\n")

        const competitorSummary = competitorPrices
            ? competitorPrices
            : `Mín: $${stats.min.toLocaleString("es-CO")}, Prom: $${stats.avg.toLocaleString("es-CO")}, Máx: $${stats.max.toLocaleString("es-CO")} (${dataSource})`

        // ── 3. Gemini 3.1 Pro Verdict ──
        const ai = new GoogleGenAI({ apiKey: geminiKey })

        const simulatedNote = stats.isSimulated
            ? "\n\n⚠️ NOTA: Los precios de mercado son ESTIMACIONES ALGORÍTMICAS porque la API de búsqueda no estuvo disponible. Verifica en Google Shopping para datos reales."
            : ""

        const prompt = `Eres el Director de Compras de Hardsoft Technology en Colombia. Tenemos la oportunidad de comprar "${productName}" a un costo de $${supplierCost.toLocaleString("es-CO")} COP. Si lo vendemos a $${salePrice.toLocaleString("es-CO")} COP, nuestro margen neto descontando comisión de MercadoLibre (${commissionPercent}% = $${commissionAmount.toLocaleString("es-CO")} COP) y envíos ($${shippingCost.toLocaleString("es-CO")} COP) será del ${netMarginPercent.toFixed(1)}% ($${Math.round(netProfit).toLocaleString("es-CO")} COP de utilidad neta).

La competencia lo está vendiendo a estos precios:
${competitorSummary}

CONTEXTO FISCAL COLOMBIA 2026:
- UVT = $52.374 COP. Computadores/tabletas bajo 50 UVT ($2.618.700 COP) están excluidos de IVA.
- Si el precio de venta ($${salePrice.toLocaleString("es-CO")}) supera $2.618.700, aplica 19% de IVA adicional.

Analiza si podemos ser competitivos y rentables. ¿Es un PRODUCTO GANADOR o debemos DESCARTAR la compra del lote?

INSTRUCCIONES:
1. Comienza tu respuesta con EXACTAMENTE una de estas etiquetas: [PRODUCTO GANADOR] o [DESCARTAR] o [EVALUAR CON CAUTELA].
2. Si el margen es menor al 15%, advierte explícitamente.
3. Compara nuestro precio con los de la competencia.
4. Sé directo, conciso y justifica tu decisión.

FORMATO: Texto plano con viñetas (guiones). Máximo 250 palabras. Sin Markdown complejo.`

        let report = ""
        const MAX_RETRIES = 2
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const response = await ai.models.generateContent({
                    model: "gemini-3.1-pro-preview",
                    contents: prompt,
                    config: { temperature: 0.5, maxOutputTokens: 2048 },
                })
                report = response.text?.trim() || ""
                break
            } catch (retryErr: any) {
                const is429 =
                    retryErr?.status === 429 ||
                    retryErr?.message?.includes("429") ||
                    retryErr?.message?.includes("RESOURCE_EXHAUSTED")
                if (is429 && attempt < MAX_RETRIES) {
                    await new Promise(r => setTimeout(r, 5000))
                    continue
                }
                throw retryErr
            }
        }

        // ── 4. Parse verdict from report ──
        let verdict: ProcurementVerdict = "NEUTRAL"
        const reportUpper = report.toUpperCase()
        if (reportUpper.includes("[PRODUCTO GANADOR]")) {
            verdict = "PRODUCTO_GANADOR"
        } else if (reportUpper.includes("[DESCARTAR]")) {
            verdict = "DESCARTAR"
        }

        return {
            success: true,
            verdict,
            stats,
            report: (report || "No se pudo generar el análisis.") + simulatedNote,
            calculations: {
                totalMLCost,
                netProfit: Math.round(netProfit),
                netMarginPercent: Math.round(netMarginPercent * 10) / 10,
            },
        }
    } catch (e: any) {
        console.error("Procurement analysis error:", e)
        const msg = e.message || ""
        if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
            return { success: false, error: "Límite de cuota de IA alcanzado. Espera ~30 segundos e intenta de nuevo." }
        }
        return { success: false, error: "Error en el análisis: " + msg }
    }
}
