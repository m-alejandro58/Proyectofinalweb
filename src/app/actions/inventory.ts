"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createProduct(formData: FormData) {
    const sku = formData.get("sku") as string
    const name = formData.get("name") as string
    const minStock = Number(formData.get("minStock")) || 5
    const description = formData.get("description") as string
    const brand = formData.get("brand") as string
    const category = formData.get("category") as string
    const subcategory = formData.get("subcategory") as string

    // Check if sku exists (if provided)
    if (sku) {
        const distinct = await prisma.product.findFirst({ where: { sku } })
        if (distinct) {
            return { success: false, error: "Ya existe un producto con este SKU" }
        }
    }

    try {
        const product = await prisma.product.create({
            data: {
                name,
                sku,
                description,
                brand,
                category,
                subcategory,
                minStock,
                stockTotal: 0
            }
        })

        revalidatePath('/inventory')
        return { success: true, data: product }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Error al crear producto" }
    }
}

// ... (existing code)

export async function getProducts() {
    try {
        const products = await prisma.product.findMany({
            include: {
                batches: true
            },
            orderBy: { name: 'asc' }
        })
        return { success: true, data: products }
    } catch (e) {
        return { success: false, error: "Error fetching products" }
    }
}

export async function updateProduct(id: string, formData: FormData) {
    const sku = formData.get("sku") as string
    const name = formData.get("name") as string
    const minStock = Number(formData.get("minStock")) || 5
    const description = formData.get("description") as string
    const brand = formData.get("brand") as string
    const category = formData.get("category") as string
    const subcategory = formData.get("subcategory") as string

    // Check if sku exists (if changed)
    if (sku) {
        const distinct = await prisma.product.findFirst({
            where: {
                sku,
                id: { not: id }
            }
        })
        if (distinct) {
            return { success: false, error: "Ya existe otro producto con este SKU" }
        }
    }

    try {
        await prisma.product.update({
            where: { id },
            data: {
                name,
                sku,
                description,
                brand,
                category,
                subcategory,
                minStock
            }
        })

        revalidatePath('/inventory')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Error al actualizar producto" }
    }
}

export async function deleteProduct(id: string) {
    try {
        // Check for dependencies
        const product = await prisma.product.findUnique({
            where: { id },
            include: { batches: true }
        })

        if (!product) return { success: false, error: "Producto no encontrado" }

        // Prevent delete if it has inventory history
        if (product.batches.length > 0) {
            return { success: false, error: "No se puede eliminar: El producto tiene historial de compras/inventario. Considere 'Archivarlo' (funcionalidad pendiente) o contacte a soporte." }
        }

        await prisma.product.delete({ where: { id } })

        revalidatePath('/inventory')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Error al eliminar producto" }
    }
}
