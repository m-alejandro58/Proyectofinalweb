"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"

// ---------------------------------------------------------
// ACTIONS
// ---------------------------------------------------------

/**
 * Create a new FullShipment with multiple items
 */
export async function createShipment(
    items: { productId: string; quantity: number; unitCost: number }[],
    shippingCost: number,
    note?: string
) {
    await requireAuth()

    if (!items || items.length === 0) {
        return { success: false, error: "No hay items en el envío" }
    }

    try {
        // 1. Validate all products and stock
        for (const item of items) {
            const product = await prisma.product.findUnique({
                where: { id: item.productId },
                select: { name: true, stockTotal: true, stockFull: true }
            })

            if (!product) return { success: false, error: `Producto ${item.productId} no encontrado` }

            const available = product.stockTotal - (product.stockFull || 0)
            if (available < item.quantity) {
                return {
                    success: false,
                    error: `Stock insuficiente para ${product.name}. Disponible: ${available}`
                }
            }
        }

        // 2. Create Shipment + Items + Update Product Stocks
        await prisma.$transaction(async (tx: any) => {
            // Create Shipment
            const shipment = await tx.fullShipment.create({
                data: {
                    shippingCost,
                    note,
                    status: "SHIPPING",
                    sentAt: new Date()
                }
            })

            // Process each item
            for (const item of items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } })

                // Create FullInventory record linked to shipment
                await tx.fullInventory.create({
                    data: {
                        productId: item.productId,
                        productName: product.name,
                        quantitySent: item.quantity,
                        quantityInStock: item.quantity,
                        unitCost: item.unitCost,
                        status: "SHIPPING",
                        shipmentId: shipment.id,
                        sentAt: new Date()
                    }
                })

                // Update Product stockFull
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stockFull: { increment: item.quantity }
                    }
                })
            }
        })

        revalidatePath("/full")
        revalidatePath("/inventory")
        return { success: true, message: "Envío creado correctamente" }

    } catch (e: any) {
        console.error("Error creating shipment:", e)
        return { success: false, error: "Error al crear envío: " + e.message }
    }
}

/**
 * Confirm arrival of ENTIRE shipment
 */
export async function confirmShipmentArrival(shipmentId: string) {
    await requireAuth()

    try {
        const now = new Date()

        await prisma.$transaction(async (tx: any) => {
            // Update Shipment
            await tx.fullShipment.update({
                where: { id: shipmentId },
                data: {
                    status: "RECEIVED",
                    arrivedAt: now
                }
            })

            // Update all items in this shipment
            await tx.fullInventory.updateMany({
                where: { shipmentId },
                data: {
                    status: "IN_WAREHOUSE",
                    arrivedAt: now
                }
            })
        })

        revalidatePath("/full")
        return { success: true, message: "Llegada de envío confirmada" }
    } catch (e: any) {
        return { success: false, error: "Error al confirmar envío" }
    }
}

/**
 * Record sale of a specific item (from a batch)
 */
export async function recordFullSale(fullId: string, quantity: number) {
    await requireAuth()

    if (quantity <= 0) return { success: false, error: "Cantidad inválida" }

    try {
        const fullItem = await prisma.fullInventory.findUnique({
            where: { id: fullId }
        })

        if (!fullItem) return { success: false, error: "Item no encontrado" }

        if (fullItem.quantityInStock < quantity) {
            return { success: false, error: `Solo quedan ${fullItem.quantityInStock} unidades en este lote` }
        }

        await prisma.$transaction(async (tx: any) => {
            const newStock = fullItem.quantityInStock - quantity
            const newSold = fullItem.quantitySold + quantity
            const newStatus = newStock === 0 ? "SOLD_OUT" : fullItem.status

            await tx.fullInventory.update({
                where: { id: fullId },
                data: {
                    quantityInStock: newStock,
                    quantitySold: newSold,
                    status: newStatus
                }
            })

            await tx.product.update({
                where: { id: fullItem.productId },
                data: {
                    stockFull: { decrement: quantity },
                    stockTotal: { decrement: quantity }
                }
            })
        })

        revalidatePath("/full")
        revalidatePath("/inventory")
        return { success: true, message: "Venta registrada" }
    } catch (e: any) {
        return { success: false, error: "Error al registrar venta" }
    }
}

export async function returnFromFull(fullId: string, quantity: number) {
    await requireAuth()

    if (quantity <= 0) return { success: false, error: "Cantidad inválida" }

    try {
        const fullItem = await prisma.fullInventory.findUnique({
            where: { id: fullId }
        })

        if (!fullItem) return { success: false, error: "Item no encontrado" }

        if (fullItem.quantityInStock < quantity) {
            return { success: false, error: `Solo hay ${fullItem.quantityInStock} unidades disponibles para devolver` }
        }

        await prisma.$transaction(async (tx: any) => {
            const newStock = fullItem.quantityInStock - quantity
            const newStatus = newStock === 0 ? "RETURNED" : fullItem.status

            await tx.fullInventory.update({
                where: { id: fullId },
                data: {
                    quantityInStock: newStock,
                    status: newStatus
                }
            })

            await tx.product.update({
                where: { id: fullItem.productId },
                data: {
                    stockFull: { decrement: quantity }
                }
            })
        })

        revalidatePath("/full")
        revalidatePath("/inventory")
        return { success: true, message: "Devolución procesada" }
    } catch (e: any) {
        return { success: false, error: "Error al procesar devolución" }
    }
}

// ---------------------------------------------------------
// QUERY
// ---------------------------------------------------------

export async function getFullInventory(status?: string) {
    await requireAuth()

    try {
        const where: any = {}
        if (status && status !== 'all') {
            where.status = status
        }

        const items = await prisma.fullInventory.findMany({
            where,
            include: {
                shipment: {
                    select: { note: true, shippingCost: true }
                }
            },
            orderBy: { sentAt: 'desc' }
        })

        // Calculate metrics
        const now = new Date()
        const itemsWithMetrics = items.map((item: any) => {
            let daysInWarehouse = 0
            if (item.arrivedAt) {
                const diffTime = Math.abs(now.getTime() - new Date(item.arrivedAt).getTime())
                daysInWarehouse = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            }

            const hasAlert = daysInWarehouse > 60 && item.quantityInStock > 0

            return {
                ...item,
                daysInWarehouse,
                hasAlert
            }
        })

        return { success: true, data: itemsWithMetrics }
    } catch (e) {
        return { success: false, error: "Error al obtener inventario FULL" }
    }
}

export async function getFullShipments() {
    await requireAuth()

    try {
        const shipments = await prisma.fullShipment.findMany({
            include: {
                items: true
            },
            orderBy: { sentAt: 'desc' }
        })
        return { success: true, data: shipments }
    } catch (e) {
        return { success: false, error: "Error obteniendo envíos" }
    }
}

export async function getFullMetrics() {
    await requireAuth()

    try {
        const all = await prisma.fullInventory.findMany({
            include: { shipment: true }
        })

        const totalInStock = all.reduce((acc: number, item: any) => acc + item.quantityInStock, 0)
        const totalValue = all.reduce((acc: number, item: any) => acc + (item.quantityInStock * item.unitCost), 0)

        const now = new Date()
        const alertCount = all.filter((item: any) => {
            if (!item.arrivedAt || item.quantityInStock === 0) return false
            const days = Math.ceil(Math.abs(now.getTime() - new Date(item.arrivedAt).getTime()) / (1000 * 60 * 60 * 24))
            return days > 60
        }).length

        const soldItems = all.filter((i: any) => i.status === 'SOLD_OUT' && i.arrivedAt)
        let avgDaysToSell = 0
        if (soldItems.length > 0) {
            const totalDays = soldItems.reduce((acc: number, item: any) => {
                const days = Math.ceil(Math.abs(new Date(item.updatedAt).getTime() - new Date(item.arrivedAt).getTime()) / (1000 * 60 * 60 * 24))
                return acc + days
            }, 0)
            avgDaysToSell = Math.round(totalDays / soldItems.length)
        }

        return {
            success: true,
            data: {
                totalInStock,
                totalValue,
                alertCount,
                avgDaysToSell
            }
        }
    } catch (e) {
        return { success: false, error: "Error calculando métricas" }
    }
}
