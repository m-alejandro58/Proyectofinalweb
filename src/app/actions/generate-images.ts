"use server"

// ─────────────────────────────────────────────────────────────
// DEPRECATED: La generación directa de imágenes vía API ha sido
// desactivada. El pipeline ahora opera mediante prompts copiables
// desde el componente PromptGeneratorModal en el frontend.
//
// Este archivo se conserva como stub para evitar errores de
// importación en código que aún pueda referenciarlo.
// ─────────────────────────────────────────────────────────────

export type GeneratedImage = {
    url: string
    style: string
    prompt: string
}

export type GenerateImagesResult = {
    success: boolean
    images?: GeneratedImage[]
    error?: string
}

export async function generateStudioImages(
    _productId: string,
    _seedImageUrl: string
): Promise<GenerateImagesResult> {
    return {
        success: false,
        error: "El Estudio IA por API ha sido desactivado. Usa el Generador de Prompts desde la tabla de inventario.",
    }
}
