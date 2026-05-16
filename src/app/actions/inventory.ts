"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"
import {createAuditLog} from "@/lib/audit"

export async function createProduct(formData: FormData) {
    await requireAuth()
    const sku = formData.get("sku") as string
    const name = formData.get("name") as string
    const minStock = Number(formData.get("minStock")) || 5
    const description = formData.get("description") as string
    const brand = formData.get("brand") as string
    const category = formData.get("category") as string
    const subcategory = formData.get("subcategory") as string

    // Logistics fields
    const weight = formData.get("weight") ? Number(formData.get("weight")) : null
    const height = formData.get("height") ? Number(formData.get("height")) : null
    const width = formData.get("width") ? Number(formData.get("width")) : null
    const length = formData.get("length") ? Number(formData.get("length")) : null

    // Optional initial stock
    const hasInitialStock = formData.get("hasInitialStock") === "true"
    const initialQuantity = Number(formData.get("initialQuantity")) || 0
    const unitCost = Number(formData.get("unitCost")) || 0

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
                stockTotal: hasInitialStock ? initialQuantity : 0,
                weight,
                height,
                width,
                length,
            } as any
        })

        // If initial stock provided, create an inventory batch
        if (hasInitialStock && initialQuantity > 0 && unitCost > 0) {
            await prisma.inventoryBatch.create({
                data: {
                    productId: product.id,
                    quantity: initialQuantity,
                    initialQty: initialQuantity,
                    unitCost: unitCost,
                    status: "AVAILABLE",
                    arrivalDate: new Date()
                }
            })
        }
        // ---------------------------------------------------------
        // REGISTRO DE AUDITORÍA
        // ---------------------------------------------------------

        await createAuditLog({
            action: "CREATE_PRODUCT",
            entity: "Product",
            entityId: product.id,

            newValues: {
                name: product.name,
                sku: product.sku,
                category: product.category,
                subcategory: product.subcategory,
                stockTotal: product.stockTotal,
            },

            metadata: {
                hasInitialStock,
                initialQuantity,
                unitCost,
            }
        })

        revalidatePath('/inventory')
        return { success: true, data: product }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Error al crear producto" }
    }
}

export async function getProducts() {
    await requireAuth()
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

/**
 * Versión ligera para el formulario de nueva venta.
 * Solo trae los campos necesarios para el buscador y la validación de stock.
 * No incluye batches (el FIFO se calcula en el backend al guardar).
 */
export async function getProductsForSale() {
    await requireAuth()
    try {
        const products = await prisma.product.findMany({
            select: {
                id: true,
                name: true,
                sku: true,
                brand: true,
                category: true,
                stockTotal: true,
                stockFull: true,
            },
            orderBy: { name: 'asc' }
        })
        return { success: true, data: products }
    } catch (e) {
        return { success: false, error: "Error fetching products" }
    }
}

export async function updateProduct(id: string, formData: FormData) {
    await requireAuth()
    const sku = formData.get("sku") as string
    const name = formData.get("name") as string
    const minStock = Number(formData.get("minStock")) || 5
    const description = formData.get("description") as string
    const imageUrl = (formData.get("imageUrl") as string) || null
    const brand = formData.get("brand") as string
    const category = formData.get("category") as string
    const subcategory = formData.get("subcategory") as string

    // Logistics fields
    const weight = formData.get("weight") ? Number(formData.get("weight")) : null
    const height = formData.get("height") ? Number(formData.get("height")) : null
    const width = formData.get("width") ? Number(formData.get("width")) : null
    const length = formData.get("length") ? Number(formData.get("length")) : null

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

    // ---------------------------------------------------------
    // OBTENER DATOS ANTERIORES DEL PRODUCTO
    // ---------------------------------------------------------

    const existingProduct = await prisma.product.findUnique({
        where: { id }
    })

    if (!existingProduct) {
        return {
            success: false,
            error: "Producto no encontrado"
        }
    }

    try {
        const updatedProduct = await prisma.product.update({
            where: { id },
            data: {
                name,
                sku,
                description,
                imageUrl,
                brand,
                category,
                subcategory,
                minStock,
                weight,
                height,
                width,
                length,
            } as any
        })
        // ---------------------------------------------------------
// REGISTRO DE AUDITORÍA
// ---------------------------------------------------------

await createAuditLog({
    action: "UPDATE_PRODUCT",
    entity: "Product",
    entityId: updatedProduct.id,

    oldValues: {
        name: existingProduct.name,
        sku: existingProduct.sku,
        stockTotal: existingProduct.stockTotal,
        brand: existingProduct.brand,
    },

    newValues: {
        name: updatedProduct.name,
        sku: updatedProduct.sku,
        stockTotal: updatedProduct.stockTotal,
        brand: updatedProduct.brand,
    },

    metadata: {
        updatedAt: new Date()
    }
})

        revalidatePath('/inventory')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Error al actualizar producto" }
    }
}

export async function adjustProductStock(
    productId: string,
    newQuantity: number,
    newUnitCost: number,
    reason: string
) {
    await requireAuth()

    if (!reason || reason.trim().length === 0) {
        return { success: false, error: "Debe proporcionar un motivo para el ajuste" }
    }

    if (newQuantity < 0) {
        return { success: false, error: "La cantidad no puede ser negativa" }
    }

    if (newUnitCost < 0) {
        return { success: false, error: "El costo no puede ser negativo" }
    }

    try {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { batches: { where: { status: { in: ["AVAILABLE", "RESERVED"] } } } }
        })

        if (!product) {
            return { success: false, error: "Producto no encontrado" }
        }

        await prisma.$transaction(async (tx: any) => {
            // Mark all existing AVAILABLE batches as SOLD_OUT (archive them)
            await tx.inventoryBatch.updateMany({
                where: {
                    productId,
                    status: { in: ["AVAILABLE"] }
                },
                data: { status: "SOLD_OUT" }
            })

            // Create new batch with the adjusted values
            if (newQuantity > 0) {
                await tx.inventoryBatch.create({
                    data: {
                        productId,
                        quantity: newQuantity,
                        initialQty: newQuantity,
                        unitCost: newUnitCost,
                        status: "AVAILABLE",
                        arrivalDate: new Date()
                    }
                })
            }

            // Update product stock total
            // Calculate: reserved stock (keep it) + new available stock
            const reservedStock = product.batches
                .filter((b: any) => b.status === "RESERVED")
                .reduce((sum: number, b: any) => sum + b.quantity, 0)

            await tx.product.update({
                where: { id: productId },
                data: {
                    stockTotal: newQuantity + reservedStock
                }
            })

            // Log the adjustment as a transaction for auditing
            await tx.transaction.create({
                data: {
                    description: `Ajuste de inventario: ${product.name} → Cant: ${newQuantity}, Costo: $${newUnitCost.toLocaleString()}. Motivo: ${reason}`,
                    amount: newQuantity * newUnitCost,
                    date: new Date()
                }
            })
        })

        // ---------------------------------------------------------
        // REGISTRO DE AUDITORÍA
        // ---------------------------------------------------------

        await createAuditLog({
            action: "ADJUST_STOCK",
            entity: "Product",
            entityId: productId,

            oldValues: {
                stockTotal: product.stockTotal,
            },

            newValues: {
                stockTotal: newQuantity,
                unitCost: newUnitCost,
            },

            metadata: {
                reason,
                adjustedAt: new Date()
            }
        })
        
        revalidatePath('/inventory')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Error al ajustar inventario" }
    }
}

export async function deleteProduct(id: string) {
    await requireAuth()
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

    // ---------------------------------------------------------
    // REGISTRO DE AUDITORÍA
    // ---------------------------------------------------------

        await createAuditLog({
            action: "DELETE_PRODUCT",
            entity: "Product",
            entityId: product.id,

            oldValues: {
                name: product.name,
                sku: product.sku,
                stockTotal: product.stockTotal,
                brand: product.brand,
                category: product.category,
                subcategory: product.subcategory,
            },

            metadata: {
                deletedAt: new Date()
            }
        })
        
        await prisma.product.delete({ where: { id } })

        revalidatePath('/inventory')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Error al eliminar producto" }
    }
}

// Map platform IDs to DB field names
const PLATFORM_FIELD_MAP: Record<string, string> = {
    mercadolibre: "isPublishedML",
    luegopago: "isPublishedLP",
    rappi: "isPublishedRappi",
    web: "isPublishedWeb",
    facebook: "isPublishedFB",
}

export async function updateProductPublishStatus(
    productId: string,
    platformId: string,
    isPublished: boolean
) {
    await requireAuth()

    const field = PLATFORM_FIELD_MAP[platformId]
    if (!field) {
        return { success: false, error: `Plataforma desconocida: ${platformId}` }
    }

    try {
        await prisma.product.update({
            where: { id: productId },
            data: { [field]: isPublished },
        })

        revalidatePath("/inventory")
        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Error al actualizar estado de publicación" }
    }
}

export async function bulkUpdatePublishStatus(
    productIds: string[],
    platformId: string,
    isPublished: boolean
) {
    await requireAuth()

    const field = PLATFORM_FIELD_MAP[platformId]
    if (!field) {
        return { success: false, error: `Plataforma desconocida: ${platformId}` }
    }

    if (!productIds.length) {
        return { success: false, error: "No se seleccionaron productos" }
    }

    try {
        await prisma.product.updateMany({
            where: { id: { in: productIds } },
            data: { [field]: isPublished },
        })

        revalidatePath("/inventory")
        return { success: true, count: productIds.length }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Error al actualizar en masa" }
    }
}


export async function saveProductPricing(
    productId: string,
    marginPercent: number,
    platformsData: any
) {
    await requireAuth()
    try {
        await prisma.product.update({
            where: { id: productId },
            data: {
                marginPercent,
                platformPricing: JSON.stringify(platformsData),
            } as any,
        })
        revalidatePath("/inventory")
        return { success: true }
    } catch (e) {
        console.error("saveProductPricing error:", e)
        return { success: false, error: "Error al guardar configuración de precios" }
    }
}
