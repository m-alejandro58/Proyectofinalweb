"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"

// ─── Types ───────────────────────────────────────────────
export type AssetCategory = "MUEBLES" | "EQUIPOS" | "VEHICULOS" | "OTROS"
export type AssetStatus = "ACTIVO" | "DEPRECIADO" | "VENDIDO"

// ─────────────────────────────────────────────────────────
// AUTOCONSUMO: Convierte mercancía del inventario a Activo Fijo
// Operación ACID en 3 pasos:
//  A) Descuenta stock usando FIFO de InventoryBatch
//  B) Registra Transaction de tipo AUTOCONSUMO para auditoría
//  C) Crea el(os) registro(s) en FixedAsset con el COGS real del lote
// ─────────────────────────────────────────────────────────
export async function convertInventoryToAsset(
    productId: string,
    quantity: number,
    category: AssetCategory,
    assetName: string,
    notes?: string
) {
    await requireAuth()

    if (!productId || !assetName?.trim()) {
        return { success: false, error: "Producto y nombre del activo son requeridos" }
    }
    if (quantity <= 0 || !Number.isInteger(quantity)) {
        return { success: false, error: "La cantidad debe ser un entero positivo" }
    }

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Cargar el producto con sus lotes FIFO (disponibles, ordenados por fecha)
            const product = await tx.product.findUnique({
                where: { id: productId },
                include: {
                    batches: {
                        where: { status: "AVAILABLE" },
                        orderBy: { createdAt: "asc" }, // FIFO: más antiguo primero
                    },
                },
            })

            if (!product) throw new Error("Producto no encontrado")
            if (product.stockTotal < quantity) {
                throw new Error(
                    `Stock insuficiente. Disponible: ${product.stockTotal}, Requerido: ${quantity}`
                )
            }

            // 2. Descontar de los lotes en orden FIFO y calcular COGS promedio ponderado
            let remaining = quantity
            let totalCost = 0
            const batchDetails: { id: string; unitCost: number; qty: number }[] = []

            for (const batch of product.batches) {
                if (remaining === 0) break
                const take = Math.min(batch.quantity, remaining)
                totalCost += take * batch.unitCost
                batchDetails.push({ id: batch.id, unitCost: batch.unitCost, qty: take })
                remaining -= take

                const newQty = batch.quantity - take
                await tx.inventoryBatch.update({
                    where: { id: batch.id },
                    data: {
                        quantity: newQty,
                        status: newQty === 0 ? "SOLD_OUT" : "AVAILABLE",
                    },
                })
            }

            if (remaining > 0) {
                throw new Error("No hay suficiente stock disponible en los lotes")
            }

            // 3A. Actualizar stockTotal del producto
            await tx.product.update({
                where: { id: productId },
                data: { stockTotal: { decrement: quantity } },
            })

            // 3B. Registrar movimiento de auditoría como Transaction tipo AUTOCONSUMO
            const avgCost = totalCost / quantity
            await tx.transaction.create({
                data: {
                    type: "AUTOCONSUMO",
                    description: `Autoconsumo / Traslado a Activo Fijo: ${quantity}x "${product.name}" → "${assetName}". Costo FIFO: $${totalCost.toLocaleString("es-CO")} (prom. $${avgCost.toLocaleString("es-CO")}/u)`,
                    amount: totalCost,
                    date: new Date(),
                },
            })

            // 3C. Crear el Activo Fijo (uno por unidad, o uno con valor total si qty > 1)
            // Si qty = 1, nombre tal cual. Si qty > 1, se crea uno por unidad con sufijo numérico.
            const assets = []
            if (quantity === 1) {
                const asset = await tx.fixedAsset.create({
                    data: {
                        name: assetName.trim(),
                        category,
                        purchaseValue: totalCost,
                        currentValue: totalCost,
                        status: "ACTIVO",
                        originProductId: productId,
                        originProductName: product.name,
                        notes: notes?.trim() || null,
                    },
                })
                assets.push(asset)
            } else {
                for (let i = 1; i <= quantity; i++) {
                    const unitCost = totalCost / quantity
                    const asset = await tx.fixedAsset.create({
                        data: {
                            name: quantity > 1 ? `${assetName.trim()} #${i}` : assetName.trim(),
                            category,
                            purchaseValue: unitCost,
                            currentValue: unitCost,
                            status: "ACTIVO",
                            originProductId: productId,
                            originProductName: product.name,
                            notes: notes?.trim() || null,
                        },
                    })
                    assets.push(asset)
                }
            }

            return { assets, totalCost, product }
        })

        revalidatePath("/inventory")
        revalidatePath("/assets")
        revalidatePath("/")

        return {
            success: true,
            data: {
                assetsCreated: result.assets.length,
                totalCost: result.totalCost,
                productName: result.product.name,
            },
        }
    } catch (error) {
        console.error("convertInventoryToAsset error:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al convertir a activo fijo",
        }
    }
}

// ─────────────────────────────────────────────────────────
// CRUD BÁSICO DE ACTIVOS FIJOS
// ─────────────────────────────────────────────────────────

export async function createAsset(data: {
    name: string
    category: AssetCategory
    purchaseValue: number
    currentValue?: number
    purchaseDate?: Date
    notes?: string
}) {
    await requireAuth()

    if (!data.name?.trim()) return { success: false, error: "El nombre es requerido" }
    if (!data.category) return { success: false, error: "La categoría es requerida" }
    if (data.purchaseValue <= 0) return { success: false, error: "El valor de compra debe ser positivo" }

    try {
        const asset = await (prisma as any).fixedAsset.create({
            data: {
                name: data.name.trim(),
                category: data.category,
                purchaseValue: data.purchaseValue,
                currentValue: data.currentValue ?? data.purchaseValue,
                purchaseDate: data.purchaseDate ?? new Date(),
                status: "ACTIVO",
                notes: data.notes?.trim() || null,
            } as any,
        })

        revalidatePath("/assets")
        revalidatePath("/")
        return { success: true, data: asset }
    } catch (error) {
        console.error("createAsset error:", error)
        return { success: false, error: "Error al crear el activo" }
    }
}

export async function updateAsset(
    id: string,
    data: {
        name?: string
        category?: AssetCategory
        currentValue?: number
        purchaseDate?: Date
        status?: AssetStatus
        notes?: string
    }
) {
    await requireAuth()

    try {
        const asset = await (prisma as any).fixedAsset.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name.trim() }),
                ...(data.category !== undefined && { category: data.category }),
                ...(data.currentValue !== undefined && { currentValue: data.currentValue }),
                ...(data.purchaseDate !== undefined && { purchaseDate: data.purchaseDate }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
            } as any,
        })

        revalidatePath("/assets")
        revalidatePath("/")
        return { success: true, data: asset }
    } catch (error) {
        console.error("updateAsset error:", error)
        return { success: false, error: "Error al actualizar el activo" }
    }
}

export async function deleteAsset(id: string) {
    await requireAuth()
    try {
        await (prisma as any).fixedAsset.delete({ where: { id } })
        revalidatePath("/assets")
        revalidatePath("/")
        return { success: true }
    } catch (error) {
        console.error("deleteAsset error:", error)
        return { success: false, error: "Error al eliminar el activo" }
    }
}

export async function getAssets() {
    await requireAuth()
    try {
        const assets = await (prisma as any).fixedAsset.findMany({
            orderBy: [{ status: "asc" }, { purchaseDate: "desc" }],
        })
        return { success: true, data: assets }
    } catch (error) {
        console.error("getAssets error:", error)
        return { success: false, error: "Error al obtener activos" }
    }
}

export async function getAssetsSummary() {
    await requireAuth()
    try {
        const assets = await (prisma as any).fixedAsset.findMany({
            where: { status: "ACTIVO" },
        })

        const totalCurrentValue = assets.reduce((sum: number, a: any) => sum + a.currentValue, 0)
        const totalPurchaseValue = assets.reduce((sum: number, a: any) => sum + a.purchaseValue, 0)
        const count = assets.length

        const byCategory = assets.reduce((acc: Record<string, number>, a: any) => {
            acc[a.category] = (acc[a.category] || 0) + a.currentValue
            return acc
        }, {} as Record<string, number>)

        return {
            success: true,
            data: { totalCurrentValue, totalPurchaseValue, count, byCategory },
        }
    } catch (error) {
        console.error("getAssetsSummary error:", error)
        return { success: false, data: { totalCurrentValue: 0, totalPurchaseValue: 0, count: 0, byCategory: {} } }
    }
}
