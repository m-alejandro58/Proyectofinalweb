"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { cookies } from "next/headers"

type PurchaseItemInput = {
    productId: string
    quantity: number
    unitCost: number
}

export async function createPurchase(
    providerId: string,
    paymentAccountId: string,
    items: PurchaseItemInput[],
    receiptNumber?: string,
    notes?: string,
    isTransit: boolean = false,
    purchaseDate?: Date
) {
    await requireAuth()
    if (!providerId || !paymentAccountId || items.length === 0) {
        return { success: false, error: "Datos incompletos" }
    }

    for (const item of items) {
        if (item.quantity <= 0 || item.unitCost < 0) {
            return { success: false, error: "Cantidades y costos deben ser valores positivos válidos" }
        }
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)

    try {
        await prisma.$transaction(async (tx: any) => {
            const account = await tx.financialAccount.findUnique({ where: { id: paymentAccountId } })
            if (!account) throw new Error("Cuenta no encontrada")

            const purchase = await tx.purchase.create({
                data: {
                    providerId,
                    paymentAccountId,
                    receiptNumber,
                    notes,
                    totalAmount,
                    date: purchaseDate || new Date()
                }
            })

            for (const item of items) {
                // Create Batch
                await tx.inventoryBatch.create({
                    data: {
                        productId: item.productId,
                        purchaseId: purchase.id,
                        initialQty: item.quantity,
                        quantity: item.quantity,
                        unitCost: item.unitCost,
                        status: isTransit ? "TRANSIT" : "AVAILABLE",
                        arrivalDate: isTransit ? null : purchaseDate || new Date(),
                        createdAt: purchaseDate || new Date()
                    }
                })

                // Update Stock ONLY if available immediately
                if (!isTransit) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            stockTotal: { increment: item.quantity }
                        }
                    })
                }
            }

            // Update Financial Account (Money leaves regardless of transit status usually, unless it's credit?)
            // Assuming we pay upfront or verify credit liability now.
            if (account.type === 'CREDIT' || account.type === 'LOAN') {
                await tx.financialAccount.update({
                    where: { id: paymentAccountId },
                    data: { balance: { increment: totalAmount } }
                })
            } else {
                await tx.financialAccount.update({
                    where: { id: paymentAccountId },
                    data: { balance: { decrement: totalAmount } }
                })
            }

            await tx.transaction.create({
                data: {
                    description: `Compra Fac. ${receiptNumber || 'N/A'} - ${isTransit ? '(En Tránsito)' : ''}`,
                    amount: totalAmount,
                    fromAccountId: paymentAccountId,
                    date: new Date()
                }
            })
        })

        revalidatePath("/purchases")
        revalidatePath("/inventory")
        revalidatePath("/accounts")
        return { success: true }
    } catch (error: any) {
        console.error("Purchase Error:", error)
        return { success: false, error: error.message || "Error al procesar compra" }
    }
}

export async function getPurchases(queryParam?: string) {
    await requireAuth()
    try {
        const where: any = {}
        if (queryParam) {
            where.OR = [
                { receiptNumber: { contains: queryParam, mode: 'insensitive' } },
                { provider: { name: { contains: queryParam, mode: 'insensitive' } } },
                { batches: { some: { product: { name: { contains: queryParam, mode: 'insensitive' } } } } }
            ]
        }

        const purchases = await prisma.purchase.findMany({
            where,
            include: {
                provider: true,
                paymentAccount: true,
                batches: {
                    include: { product: true }
                }
            },
            orderBy: { date: 'desc' }
        })
        return { success: true, data: purchases }
    } catch (error) {
        return { success: false, error: "Error load" }
    }
}

export async function updatePurchase(
    purchaseId: string,
    providerId: string,
    paymentAccountId: string,
    items: PurchaseItemInput[],
    receiptNumber?: string,
    notes?: string
) {
    await requireAuth()
    const sessionId = (await cookies()).get("auth_session")?.value
    if (sessionId) {
        const user = await prisma.user.findUnique({ where: { id: sessionId } })
        if (!user || user.role !== "ADMIN") {
            throw new Error("Transacción denegada. Solo los Administradores pueden editar facturas financieras.")
        }
    }

    if (!purchaseId || !providerId || !paymentAccountId || items.length === 0) {
        return { success: false, error: "Datos incompletos" }
    }

    for (const item of items) {
        if (item.quantity <= 0 || item.unitCost < 0) {
            return { success: false, error: "Cantidades y costos deben ser valores positivos válidos" }
        }
    }

    try {
        await prisma.$transaction(async (tx: any) => {
            // Obtener la compra original con sus lotes
            const oldPurchase = await tx.purchase.findUnique({
                where: { id: purchaseId },
                include: { batches: true }
            })

            if (!oldPurchase) throw new Error("Factura de compra no encontrada")

            const oldAccount = await tx.financialAccount.findUnique({ where: { id: oldPurchase.paymentAccountId } })
            const newAccount = await tx.financialAccount.findUnique({ where: { id: paymentAccountId } })

            if (!oldAccount || !newAccount) throw new Error("Cuentas financieras no encontradas")

            // PASO A: Revertir Inventario Viejo (Solo si no estaba en TRÁNSITO)
            // Calculamos cuánto se vendió de cada lote para la validación FIFO
            for (const batch of oldPurchase.batches) {
                const soldQty = batch.initialQty - batch.quantity
                
                // Buscar el nuevo item correspondiente (por productId)
                const newItem = items.find(i => i.productId === batch.productId)

                if (newItem) {
                    // El producto se mantiene, validamos que la nueva cantidad sea al menos lo que ya se vendió
                    const newAvailable = newItem.quantity - soldQty
                    if (newAvailable < 0) {
                        const product = await tx.product.findUnique({ where: { id: batch.productId } })
                        throw new Error(`Operación denegada: No puedes reducir la cantidad comprada del producto "${product?.name}" porque ya fue vendido (stock insuficiente). Mínimo permitido: ${soldQty}.`)
                    }
                } else {
                    // Eliminaron el producto de la compra entera. Valida si ya habían vendido algo.
                    if (soldQty > 0) {
                        const product = await tx.product.findUnique({ where: { id: batch.productId } })
                        throw new Error(`Operación denegada: No puedes eliminar el producto "${product?.name}" de la compra porque ya se vendieron ${soldQty} unidades.`)
                    }
                }

                if (batch.status !== "TRANSIT") {
                    await tx.product.update({
                        where: { id: batch.productId },
                        data: { stockTotal: { decrement: batch.initialQty } }
                    })
                }

                // Borrar los batches viejos. Los recreamos abajo.
                await tx.inventoryBatch.delete({ where: { id: batch.id } })
            }

            // PASO B: Revertir Cuentas Financieras (Devolver valor de la compra anterior)
            if (oldAccount.type === 'CREDIT' || oldAccount.type === 'LOAN') {
                await tx.financialAccount.update({
                    where: { id: oldPurchase.paymentAccountId },
                    data: { balance: { decrement: oldPurchase.totalAmount } }
                })
            } else {
                await tx.financialAccount.update({
                    where: { id: oldPurchase.paymentAccountId },
                    data: { balance: { increment: oldPurchase.totalAmount } }
                })
            }

            // PASO C: Aplicar Cuentas Financieras Nueva Compra
            const newTotalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)
            
            if (newAccount.type === 'CREDIT' || newAccount.type === 'LOAN') {
                await tx.financialAccount.update({
                    where: { id: paymentAccountId },
                    data: { balance: { increment: newTotalAmount } }
                })
            } else {
                await tx.financialAccount.update({
                    where: { id: paymentAccountId },
                    data: { balance: { decrement: newTotalAmount } }
                })
            }

            // PASO D: Actualizar la entidad Compra Maestra
            await tx.purchase.update({
                where: { id: purchaseId },
                data: {
                    providerId,
                    paymentAccountId,
                    receiptNumber,
                    notes,
                    totalAmount: newTotalAmount
                }
            })

            // PASO E: Registrar los nuevos batches manteniendo createdAt original para FIFO
            for (const item of items) {
                // Verificar cuántos "vendidos" arrastramos si existía el batch viejo
                const oldBatch = oldPurchase.batches.find((b: any) => b.productId === item.productId)
                const soldQty = oldBatch ? (oldBatch.initialQty - oldBatch.quantity) : 0
                const isTransit = oldBatch ? oldBatch.status === "TRANSIT" : false
                
                const newAvailable = item.quantity - soldQty
                let newStatus = isTransit ? "TRANSIT" : "AVAILABLE"
                if (newAvailable <= 0 && !isTransit) newStatus = "SOLD_OUT"

                await tx.inventoryBatch.create({
                    data: {
                        productId: item.productId,
                        purchaseId: purchaseId,
                        initialQty: item.quantity,
                        quantity: newAvailable,
                        unitCost: item.unitCost,
                        status: newStatus,
                        arrivalDate: isTransit ? null : oldBatch?.arrivalDate || new Date(),
                        createdAt: oldBatch ? oldBatch.createdAt : new Date() // Conserva orden FIFO
                    }
                })

                // Volver a sumar al Stock General (si no es Transit)
                if (!isTransit) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stockTotal: { increment: item.quantity } }
                    })
                }
            }

            // PASO F: Registro/Transacción de Auditoría
            await tx.transaction.create({
                data: {
                    description: `Edición de Compra Fac. ${receiptNumber || 'N/A'}`,
                    amount: newTotalAmount,
                    type: "ADJUSTMENT",
                    fromAccountId: paymentAccountId,
                    date: new Date()
                }
            })
        })

        revalidatePath("/purchases")
        revalidatePath("/inventory")
        revalidatePath("/accounts")
        return { success: true }
    } catch (error: any) {
        console.error("Update Purchase Error:", error)
        return { success: false, error: error.message || "Error al modificar la compra" }
    }
}
