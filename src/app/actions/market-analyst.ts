"use server"

import { requireAuth } from "@/lib/auth-guard"
import { GoogleGenAI } from "@google/genai"

// ── Types ────────────────────────────────────────────────────
export type MarketPriceStats = {
    min: number
    max: number
    avg: number
    count: number
    isSimulated: boolean
    listings: { title: string; price: number; permalink: string; source: string }[]
}

export type MarketAnalysisResult = {
    success: boolean
    stats?: MarketPriceStats
    report?: string
    error?: string
}

// ══════════════════════════════════════════════════════════════
// ── SerpApi Google Shopping Search ──────────────────────────
// ══════════════════════════════════════════════════════════════

// Colombian retailers to highlight (case-insensitive match on source/link)
const TARGET_RETAILERS = [
    "alkosto", "ktronix", "falabella", "exito", "éxito",
    "speedlogic", "tauret",
]

function identifyRetailer(source: string, link: string): string | null {
    const combined = `${source} ${link}`.toLowerCase()
    for (const r of TARGET_RETAILERS) {
        if (combined.includes(r)) {
            // Return a clean display name
            if (r === "alkosto") return "Alkosto.com.co"
            if (r === "ktronix") return "Ktronix.com"
            if (r === "falabella") return "Falabella.com.co"
            if (r === "exito" || r === "éxito") return "Exito.com"
            if (r === "speedlogic") return "Speedlogic.com.co"
            if (r === "tauret") return "Tauret.com"
        }
    }
    return null
}

export async function searchGoogleShopping(query: string): Promise<MarketPriceStats> {
    const apiKey = process.env.SERPAPI_KEY
    if (!apiKey) {
        throw new Error("SERPAPI_KEY_MISSING")
    }

    const params = new URLSearchParams({
        engine: "google_shopping",
        q: query,
        gl: "co",           // Colombia
        hl: "es",           // Spanish
        location: "Colombia",
        num: "30",
        api_key: apiKey,
    })

    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
        method: "GET",
        headers: { "Accept": "application/json" },
        cache: "no-store",
    })

    if (!res.ok) {
        const body = await res.text().catch(() => "")
        console.error("SerpApi error:", res.status, body)
        throw new Error(`SERPAPI_HTTP_${res.status}`)
    }

    const data = await res.json()
    const shoppingResults = data.shopping_results || []

    if (shoppingResults.length === 0) {
        throw new Error("NO_RESULTS")
    }

    // Extract all results with valid prices
    const allListings: { title: string; price: number; permalink: string; source: string }[] = []

    for (const item of shoppingResults) {
        // SerpApi returns price as string like "$1.299.000" or "COP 1,299,000"
        let priceNum = 0
        const rawPrice = item.extracted_price || item.price
        if (typeof rawPrice === "number") {
            priceNum = rawPrice
        } else if (typeof rawPrice === "string") {
            // Strip everything but digits and comma/dots, then parse
            const cleaned = rawPrice.replace(/[^0-9.,]/g, "")
            // Handle Colombian format (dots as thousands, comma as decimal)
            priceNum = parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || 0
        }

        if (priceNum <= 0) continue

        const source = item.source || ""
        const link = item.link || item.product_link || ""
        const retailerName = identifyRetailer(source, link)

        allListings.push({
            title: item.title || "",
            price: priceNum,
            permalink: link,
            source: retailerName || source || "Google Shopping",
        })
    }

    if (allListings.length === 0) {
        throw new Error("NO_VALID_PRICES")
    }

    const prices = allListings.map(l => l.price)

    return {
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
        count: allListings.length,
        isSimulated: false,
        listings: allListings.slice(0, 15),
    }
}

// ══════════════════════════════════════════════════════════════
// ── Simulated fallback (when SerpApi is unavailable) ────────
// ══════════════════════════════════════════════════════════════
export async function generateSimulatedPrices(productName: string): Promise<MarketPriceStats> {
    const asciiSum = productName.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
    const basePrice = asciiSum * 10000
    return {
        min: Math.round(basePrice * 0.75),
        max: Math.round(basePrice * 1.35),
        avg: Math.round(basePrice * 1.05),
        count: 0,
        isSimulated: true,
        listings: [],
    }
}

// ══════════════════════════════════════════════════════════════
// ── Main Server Action ──────────────────────────────────────
// ══════════════════════════════════════════════════════════════
export async function analyzeMarketPrices(
    productName: string,
    _clientStats?: MarketPriceStats | null // kept for API compat, ignored
): Promise<MarketAnalysisResult> {
    await requireAuth()

    if (!productName || productName.trim().length === 0) {
        return { success: false, error: "Nombre de producto requerido" }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        return { success: false, error: "API Key de Gemini no configurada" }
    }

    try {
        let stats: MarketPriceStats
        let dataSource: string

        try {
            stats = await searchGoogleShopping(productName.trim())
            dataSource = `Google Shopping Colombia (${stats.count} resultados)`
        } catch (searchErr: any) {
            const msg = searchErr.message || ""
            if (msg === "SERPAPI_KEY_MISSING") {
                return { success: false, error: "⚠️ SERPAPI_KEY no configurada en .env" }
            }
            console.warn("SerpApi search failed:", msg)
            stats = await generateSimulatedPrices(productName)
            dataSource = "Estimación algorítmica (API no disponible)"
        }

        // ── Identify key retailer prices for the prompt ──
        const retailerPrices = stats.listings
            .filter(l => TARGET_RETAILERS.some(r => l.source.toLowerCase().includes(r)))
            .map(l => `- ${l.source}: $${l.price.toLocaleString("es-CO")} COP → "${l.title}"`)
            .join("\n")

        // ── Gemini 3.1 Flash Lite Analysis ──────────────────
        const ai = new GoogleGenAI({ apiKey })

        const simulatedNote = stats.isSimulated
            ? `\n\n⚠️ NOTA: Los precios son ESTIMACIONES ALGORÍTMICAS. Verifica en Google Shopping para datos reales.`
            : ""

        const prompt = `Eres un analista de mercado tecnológico en Colombia trabajando para Hardsoft Technology (tienda de tecnología en Pereira).

DATOS DEL PRODUCTO ANALIZADO: "${productName}"

FUENTE DE DATOS: ${dataSource}
- Precio Mínimo: $${stats.min.toLocaleString("es-CO")} COP
- Precio Promedio: $${stats.avg.toLocaleString("es-CO")} COP
- Precio Máximo: $${stats.max.toLocaleString("es-CO")} COP

${retailerPrices ? `PRECIOS DE RETAILERS CLAVE EN COLOMBIA:\n${retailerPrices}` : "No se encontraron precios de los retailers principales (Alkosto, Ktronix, Falabella, Éxito, Speedlogic, Tauret)."}

${stats.listings.length > 0 ? `\nTop 5 listings generales:\n${stats.listings.slice(0, 5).map((item, i) => `${i + 1}. "${item.title}" → $${item.price.toLocaleString("es-CO")} COP (${item.source})`).join("\n")}` : ""}

CONTEXTO FISCAL COLOMBIA 2026 (CRÍTICO):
- La UVT (Unidad de Valor Tributario) es de $52.374 COP.
- Los computadores y tabletas cuyo precio unitario sea inferior a 50 UVT ($2.618.700 COP) están EXCLUIDOS de IVA.
- Si el precio promedio bordea el límite de 50 UVT, DEBES generar una ALERTA ROJA sobre el impacto del 19% de IVA en la competitividad del precio.
- Para productos que NO son computadores/tabletas, esta regla NO aplica.

TU TAREA:
1. Evalúa la posición competitiva del producto frente a los retailers grandes.
2. Analiza si el precio promedio es competitivo.
3. Si aplica, ALERTA ROJA sobre el umbral fiscal de 50 UVT.
4. Sugiere el rango de precio ideal para ser competitivo en el mercado colombiano.
5. Da una recomendación final concreta.
${stats.isSimulated ? "\n6. Aclara que son estimaciones y recomienda verificar en Google Shopping." : ""}

FORMATO: Reporte ejecutivo (máx 250 palabras). NO Markdown complejo. Texto plano con viñetas (guiones). Secciones con títulos en MAYÚSCULA y dos puntos.`

        let report = ""
        const MAX_RETRIES = 2
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const response = await ai.models.generateContent({
                    model: "gemini-3.1-flash-lite-preview",
                    contents: prompt,
                    config: { temperature: 0.6, maxOutputTokens: 2048 },
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

        return {
            success: true,
            stats,
            report: (report || "No se pudo generar el análisis.") + simulatedNote,
        }
    } catch (e: any) {
        console.error("Market analysis error:", e)
        const msg = e.message || ""
        if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
            return { success: false, error: "Límite de cuota de IA. Espera ~30 segundos." }
        }
        return { success: false, error: "Error en el análisis: " + msg }
    }
}
