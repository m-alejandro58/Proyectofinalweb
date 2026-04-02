"use server"

import { requireAuth } from "@/lib/auth-guard"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import fs from "fs/promises"
import path from "path"

export async function uploadProductImage(formData: FormData) {
    await requireAuth()

    const file = formData.get("file") as File
    const productId = formData.get("productId") as string

    if (!file || !productId) {
        return { success: false, error: "Archivo o ID de producto no proporcionado." }
    }

    if (!file.type.startsWith("image/")) {
        return { success: false, error: "El archivo debe ser una imagen." }
    }

    try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Definir la ruta de almacenamiento
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "products")
        
        // Crear carpeta si no existe
        await fs.mkdir(uploadsDir, { recursive: true })

        // Generar nombre de archivo único conservando la extensión
        const ext = path.extname(file.name) || ".jpg"
        const fileName = `${productId}-${Date.now()}${ext}`
        const filePath = path.join(uploadsDir, fileName)

        // Escribir archivo físico
        await fs.writeFile(filePath, buffer)

        // La ruta pública para el navegador empieza desde la raíz de public
        const publicUrl = `/uploads/products/${fileName}`

        // Actualizar el producto en Prisma
        await prisma.product.update({
            where: { id: productId },
            data: { imageUrl: publicUrl }
        })

        revalidatePath("/inventory")
        return { success: true, url: publicUrl, message: "Imagen vinculada exitosamente" }
    } catch (error: any) {
        console.error("Upload Error:", error)
        return { success: false, error: "Fallo al guardar la imagen en el servidor." }
    }
}
