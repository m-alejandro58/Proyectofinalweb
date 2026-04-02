"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-guard"
import { GoogleGenAI } from "@google/genai"

// ── Types ────────────────────────────────────────────────────
export type PlatformCopy = {
    platform: string
    emoji: string
    title: string
    description: string
    tags?: string
    extras?: Record<string, string>
}

export type CopywritingResult = {
    success: boolean
    data?: PlatformCopy[]
    error?: string
    productName?: string
}

// ── Platform metadata (for mapping response → UI) ────────────
const PLATFORM_META = {
    mercadolibre: { name: "Mercado Libre", emoji: "🟡" },
    facebook: { name: "Facebook", emoji: "🔵" },
    luegopago: { name: "LuegoPago", emoji: "🟣" },
    web: { name: "Web / TiendaNube", emoji: "🟢" },
    rappi: { name: "Rappi", emoji: "🟠" },
}

// ── Build the consolidated prompt ───────────────────────────
function buildPrompt(product: {
    name: string
    description: string | null
    brand: string | null
    category: string | null
    subcategory: string | null
    weight: number | null
    height: number | null
    width: number | null
    length: number | null
}): string {
    const desc = product.description || "Sin descripción adicional"
    const nombre = product.name
    const logistica = [
        product.weight ? `Peso: ${product.weight} kg` : null,
        (product.height && product.width && product.length)
            ? `Dimensiones: ${product.height}×${product.width}×${product.length} cm` : null,
    ].filter(Boolean).join(" | ") || "No especificada"

    return `Eres un equipo de 5 expertos en marketing y e-commerce para Hardsoft Technology (tienda de tecnología en Colombia). Cada experto generará copy para su plataforma siguiendo reglas estrictas.

INFORMACIÓN DEL PRODUCTO:
- Nombre: ${nombre}
- Descripción/Notas: ${desc}
- Marca: ${product.brand || "N/A"}
- Categoría: ${product.category || "N/A"} / ${product.subcategory || "N/A"}
- Logística: ${logistica}

══════════════════════════════════════
EXPERTO 1 — 🟡 MERCADO LIBRE
══════════════════════════════════════
ROL: Redactor publicitario experto en la venta de productos tecnológicos en Mercado Libre Colombia.

REGLAS OBLIGATORIAS:
- Título: máximo 60 caracteres. Sin emojis. SEO técnico con marca/modelo/característica principal.
- Descripción: Clara y directa en pocos párrafos. Beneficios primero (cómo mejora la vida del comprador). Incluir gatillos mentales (escasez, autoridad) y un CTA entre el 2do y 3er párrafo. Finalizar con ficha técnica en viñetas. Mencionar garantía de Hardsoft Technology. Tono: persuasivo, seguro, tecnológico.

══════════════════════════════════════
EXPERTO 2 — 🔵 FACEBOOK MARKETPLACE
══════════════════════════════════════
ROL: Copywriter y gerente de marketing digital especializado en Facebook Marketplace. Conoces los 3 públicos: gamers, estudiantes y profesionales remotos.

REGLAS OBLIGATORIAS — Estructura del anuncio (en este orden exacto):
1. Título SEO: claro con beneficio clave.
2. Gancho (Hook): emoji ⚠️ o 🛑 + pregunta que toque un dolor del cliente.
3. Solución: el producto como respuesta definitiva, mencionando calidad premium y Hardsoft Technology.
4. Beneficios (viñetas con emojis ⚡🛡️🧠💻): 3 a 5 puntos clave.
5. Estado y entrega: "📦 ESTADO: 100% Nuevos y originales. 📍 Entrega inmediata en Cartago, Pereira y todo el Eje Cafetero."
6. CTA: "💬 ¡Envíame un mensaje! [frase de urgencia]. 🌐 Conoce todos nuestros equipos en: 👉 https://www.hardsofttechnology.com/"
7. Tags: 15 palabras clave exactas de búsqueda relacionadas con el producto, separadas por coma, finalizando SIEMPRE con "Cartago, Pereira, Hardsoft".
- El "anuncio" del JSON debe contener TODO el texto del anuncio (partes 1-6). Los tags van en campo separado.

══════════════════════════════════════
EXPERTO 3 — 🟣 LUEGOPAGO
══════════════════════════════════════
ROL: Gerente de marketing SEO para LuegoPago/Sistecredito en Colombia. Conviertes visitas en ventas aprovechando el financiamiento de Sistecredito.

REGLAS OBLIGATORIAS:
- Título: máx 60 caracteres. SEO para búsqueda interna. Estructura: [Producto] + [Marca] + [Característica] + [Beneficio].
- Descripción en este orden:
  1. Párrafo gancho: cómo mejora la experiencia del usuario colombiano.
  2. Párrafo financiero: invitar a llevarlo HOY a cuotas sin cuota inicial con Sistecredito en LuegoPago.
  3. Especificaciones en viñetas (beneficio de cada spec).
  4. Cierre: "100% original, nuevo y con Garantía de 1 Año." (OBLIGATORIO).
- NO mencionar a Hardsoft Technology.

══════════════════════════════════════
EXPERTO 4 — 🟢 WEB / TIENDAN UBE
══════════════════════════════════════
ROL: Director de E-commerce y SEO de Hardsoft Technology. Contenido profesional optimizado para Google.

REGLAS OBLIGATORIAS — 4 partes exactas:
- tituloSeo (máx 70 chars): [Producto] [Marca] [Característica] | HardSoft
- descripcionSeo (máx 160 chars): meta-descripción persuasiva con beneficio principal y CTA para Google.
- tags: 8 palabras clave separadas por coma.
- cuerpo: descripción completa con esta estructura:
  1. Párrafo introductorio: profesional y aspiracional.
  2. "¿Por qué elegir [Nombre]?: viñetas con beneficios técnicos traducidos a ventajas reales (Ej: "Sensor 6.400 DPI: movimientos rápidos y precisos").
  3. ⚠️ Información Técnica: lista breve de specs duras.
  4. Sección fija OBLIGATORIA: "Tu Compra es 100% Segura: Nuestra Promesa HardSoft. Somos HardSoft Technology, ubicados en Pereira con envíos a toda Colombia. Garantía real y productos 100% originales."
  5. Preguntas Frecuentes: 2 o 3 preguntas comunes con respuesta.
  6. CTA: "¡Haz clic en 'Agregar al carrito' o contáctanos por WhatsApp si necesitas ayuda!"

══════════════════════════════════════
EXPERTO 5 — 🟠 RAPPI
══════════════════════════════════════
ROL: Estratega de e-commerce para Rappi Colombia. Maximiza CTR y compra por impulso cumpliendo límites técnicos estrictos.

REGLAS OBLIGATORIAS (incumplirlas = producto rechazado):
- PROHIBIDO: emojis, palabras "iFood/Uber/Didi/Domicilios/PedidosYa", MAYÚSCULAS SOSTENIDAS, adjetivos subjetivos ("el mejor", "increíble").
- Título: máx 40 caracteres. Estructura: Marca + Modelo + Característica técnica principal.
- Descripción: máx 150 caracteres. Usa guiones (-) para 3 beneficios clave. Sin párrafos. Incluir compatibilidad y contenido de la caja.

══════════════════════════════════════
FORMATO DE RESPUESTA OBLIGATORIO
══════════════════════════════════════
Responde ÚNICAMENTE con un objeto JSON válido y puro (SIN markdown, SIN backticks \`\`\`, SIN texto adicional antes o después). Estructura exacta:

{
  "mercadolibre": {
    "titulo": "...",
    "descripcion": "..."
  },
  "facebook": {
    "anuncio": "...",
    "tags": "..."
  },
  "luegopago": {
    "titulo": "...",
    "descripcion": "..."
  },
  "web": {
    "tituloSeo": "...",
    "descripcionSeo": "...",
    "tags": "...",
    "cuerpo": "..."
  },
  "rappi": {
    "titulo": "...",
    "descripcion": "..."
  }
}`
}

// ── Map the raw JSON response → PlatformCopy array ───────────
function mapResponse(parsed: any): PlatformCopy[] {
    const ml = parsed.mercadolibre || {}
    const fb = parsed.facebook || {}
    const lp = parsed.luegopago || {}
    const web = parsed.web || {}
    const rappi = parsed.rappi || {}

    return [
        {
            platform: PLATFORM_META.mercadolibre.name,
            emoji: PLATFORM_META.mercadolibre.emoji,
            title: ml.titulo || "",
            description: ml.descripcion || "",
        },
        {
            platform: PLATFORM_META.facebook.name,
            emoji: PLATFORM_META.facebook.emoji,
            title: "Anuncio de Facebook",
            description: fb.anuncio || "",
            tags: fb.tags || undefined,
        },
        {
            platform: PLATFORM_META.luegopago.name,
            emoji: PLATFORM_META.luegopago.emoji,
            title: lp.titulo || "",
            description: lp.descripcion || "",
        },
        {
            platform: PLATFORM_META.web.name,
            emoji: PLATFORM_META.web.emoji,
            title: web.tituloSeo || "",
            description: web.cuerpo || "",
            tags: web.tags || undefined,
            extras: web.descripcionSeo ? { metaDescription: web.descripcionSeo } : undefined,
        },
        {
            platform: PLATFORM_META.rappi.name,
            emoji: PLATFORM_META.rappi.emoji,
            title: rappi.titulo || "",
            description: rappi.descripcion || "",
        },
    ]
}

// ── Main Server Action ───────────────────────────────────────
export async function generatePlatformCopy(productId: string): Promise<CopywritingResult> {
    await requireAuth()

    if (!productId) {
        return { success: false, error: "ID de producto requerido" }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        return { success: false, error: "API Key de Gemini no configurada. Agrega GEMINI_API_KEY al archivo .env" }
    }

    try {
        // 1. Get product from DB (including logistics fields)
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: {
                name: true,
                description: true,
                brand: true,
                category: true,
                subcategory: true,
                weight: true,
                height: true,
                width: true,
                length: true,
            },
        }) as any

        if (!product) {
            return { success: false, error: "Producto no encontrado" }
        }

        // 2. Build single consolidated prompt
        const prompt = buildPrompt(product)

        // 3. Call Gemini — single request, with retry on 429
        const ai = new GoogleGenAI({ apiKey })
        let text: string | undefined
        const MAX_RETRIES = 2

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const response = await ai.models.generateContent({
                    model: "gemini-3.1-flash-lite-preview",
                    contents: prompt,
                    config: {
                        temperature: 0.75,
                        maxOutputTokens: 8192,
                    },
                })
                text = response.text?.trim()
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

        if (!text) {
            return { success: false, error: "La IA no generó respuesta. Intenta de nuevo en unos segundos." }
        }

        // 4. Parse JSON — strip markdown fences if present
        let cleanJson = text
        const fenceMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (fenceMatch) {
            cleanJson = fenceMatch[1].trim()
        }
        // Also strip any leading/trailing non-JSON text
        const jsonStart = cleanJson.indexOf("{")
        const jsonEnd = cleanJson.lastIndexOf("}")
        if (jsonStart !== -1 && jsonEnd !== -1) {
            cleanJson = cleanJson.slice(jsonStart, jsonEnd + 1)
        }

        const parsed = JSON.parse(cleanJson)

        // 5. Map to typed PlatformCopy[]
        const results = mapResponse(parsed)

        return {
            success: true,
            data: results,
            productName: product.name,
        }
    } catch (e: any) {
        console.error("Error generating marketing copy:", e)
        const msg: string = e.message || ""
        if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
            return { success: false, error: "Límite de cuota alcanzado. Espera ~30 segundos y vuelve a intentar." }
        }
        if (msg.includes("JSON") || msg.includes("parse")) {
            return { success: false, error: "Error al procesar la respuesta de la IA. Intenta de nuevo." }
        }
        return { success: false, error: "Error al generar contenido: " + msg }
    }
}
