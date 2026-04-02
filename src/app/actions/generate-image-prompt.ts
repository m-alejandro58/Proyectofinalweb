"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-guard"
import { GoogleGenAI } from "@google/genai"

export type ImagePromptResult = {
    success: boolean
    prompt?: string
    error?: string
}

export async function generateImagePrompt(productId: string): Promise<ImagePromptResult> {
    await requireAuth()

    if (!productId) {
        return { success: false, error: "ID de producto requerido." }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        return { success: false, error: "API Key de Gemini no configurada." }
    }

    try {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: {
                name: true,
                category: true,
                description: true,
                brand: true,
            },
        })

        if (!product) {
            return { success: false, error: "Producto no encontrado." }
        }

        const metaPrompt = `Actúa como un Prompt Engineer experto en e-commerce. Tu tarea es redactar el texto exacto que el usuario copiará y pegará en un generador de imágenes. Analiza este producto: Nombre: ${product.name}, Categoría: ${product.category || "N/A"}, Descripción: ${product.description || "Sin descripción"}. Escribe el prompt rellenando todos los datos faltantes con información técnica real o deducida lógicamente de la descripción. DEVUELVE ÚNICAMENTE EL TEXTO FINAL LISTO PARA COPIAR.

PLANTILLA A RELLENAR Y DEVOLVER:
Actúas como un especialista en comunicación visual de productos para marketplaces (Mercado Libre). Te adjunto una imagen clara y REAL de mi producto.
Aquí tienes la información técnica del artículo:
1. Nombre del producto: [Nombre]
2. Categoría o uso principal: [Categoría]
3. Características destacadas: [Extrae mínimo 3 ventajas técnicas clave de la descripción]
4. Color y Material: [Infiere el color y material físico, ej: PCB negro con disipadores de aluminio, Plástico ABS mate, etc.]
5. Público objetivo: [Infiere el público ideal basado en el producto]
6. Estilo de marca deseado: Tecnológico, moderno y profesional.
7. Tamaño en píxeles: 1080x1080.

Tu tarea es generar 5 imágenes distintas de ambientación comercial a partir de la ÚNICA imagen base que te proporciono. REGLA ESTRICTA: MANTÉN LA FORMA Y PÍXELES DEL PRODUCTO 100% INTACTOS.
1. **Ambientación real con humanos:** el producto debe mostrarse en su uso natural, en contexto real, con personas representando al usuario final.
2. **Imagen de poder o protagonismo:** fondo limpio, iluminación publicitaria, el producto como única estrella de la imagen.
3. **Imagen con detalles destacados:** mostrar el producto con flechas o gráficos señalando funciones, beneficios, partes o materiales.
4. **Imagen en contexto exigente o comparativo:** mostrar el producto siendo usado en condiciones extremas o en una comparación antes/después o sin/con.
5. **Imagen compuesta de 3 vistas:** una imagen que incluya vista frontal, detalle y vista en uso del producto.`

        const ai = new GoogleGenAI({ apiKey })
        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: metaPrompt,
            config: {
                temperature: 0.6,
                maxOutputTokens: 2048,
            },
        })

        const text = response.text?.trim()
        if (!text) {
            return { success: false, error: "La IA no generó respuesta. Intenta de nuevo." }
        }

        return { success: true, prompt: text }
    } catch (e: any) {
        console.error("Error generating image prompt:", e)
        const msg: string = e.message || ""
        if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
            return { success: false, error: "Cuota de IA agotada. Espera ~30 segundos e intenta de nuevo." }
        }
        return { success: false, error: "Error al generar el prompt: " + msg }
    }
}
