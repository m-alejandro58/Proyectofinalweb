"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

type SaleItemInput = {
    productId: string
    quantity: number
    unitPrice: number
    warrantyMonths?: number // User asked for warranty expiration date calculation
    serialNumber?: string
}

export async function createSale(
    clientId: string,
    depositAccountId: string,
    channel: string,
    grossAmount: number,
    platformFee: number,
    shippingCost: number,
    taxes: number,
    items: SaleItemInput[],
    invoiceNumber?: string,
    paymentMethod?: string
) {
    if (!clientId || !depositAccountId || items.length === 0) {
        return { success: false, error: "Datos incompletos" }
    }

    const netAmount = grossAmount - platformFee - shippingCost - taxes

    try {
        await prisma.$transaction(async (tx: any) => {
            // 1. Create Sale Header
            const sale = await tx.sale.create({
                data: {
                    clientId,
                    depositAccountId,
                    channel,
                    paymentMethod: paymentMethod || null,
                    grossAmount,
                    platformFee,
                    shippingCost,
                    taxes,
                    netAmount,
                    invoiceNumber,
                    date: new Date()
                }
            })

            // 2. Process Items (Stock & Warranty)
            for (const item of items) {
                // Validation: Check Stock
                const product = await tx.product.findUnique({ where: { id: item.productId } })
                if (!product) throw new Error(`Producto no encontrado ${item.productId}`)

                if (product.stockTotal < item.quantity) {
                    throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${product.stockTotal}`)
                }

                // Calculate Warranty End Date
                let warrantyEnd = undefined
                if (item.warrantyMonths && item.warrantyMonths > 0) {
                    const d = new Date()
                    d.setMonth(d.getMonth() + item.warrantyMonths)
                    warrantyEnd = d
                }

                // FIFO Batch Deduction Logic - Calculate unitCost BEFORE creating SaleItem
                const batches = await tx.inventoryBatch.findMany({
                    where: {
                        productId: item.productId,
                        status: 'AVAILABLE',
                        quantity: { gt: 0 }
                    },
                    orderBy: { createdAt: 'asc' } // FIFO: Oldest first
                })

                let qtyToDeduct = item.quantity
                let totalCost = 0 // Track total cost for weighted average

                // Calculate weighted average cost based on FIFO batches
                for (const batch of batches) {
                    if (qtyToDeduct <= 0) break;

                    if (batch.quantity >= qtyToDeduct) {
                        // Batch has enough
                        totalCost += qtyToDeduct * batch.unitCost
                        qtyToDeduct = 0
                    } else {
                        // Batch has partial amount
                        const available = batch.quantity
                        totalCost += available * batch.unitCost
                        qtyToDeduct -= available
                    }
                }

                // Calculate weighted average unit cost
                const calculatedUnitCost = item.quantity > 0 ? totalCost / item.quantity : 0

                // Create Sale Item with unitCost
                await tx.saleItem.create({
                    data: {
                        saleId: sale.id,
                        productName: product.name, // Snapshot name
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        unitCost: calculatedUnitCost, // ✅ NOW SAVING THE COST!
                        serialNumber: item.serialNumber,
                        warrantyEnd
                    }
                })

                // Update Stock (Global)
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stockTotal: { decrement: item.quantity }
                    }
                })

                // Now perform actual batch deduction
                qtyToDeduct = item.quantity
                for (const batch of batches) {
                    if (qtyToDeduct <= 0) break;

                    if (batch.quantity >= qtyToDeduct) {
                        // Batch has enough
                        await tx.inventoryBatch.update({
                            where: { id: batch.id },
                            data: {
                                quantity: { decrement: qtyToDeduct },
                                // If 0 left, optionally mark SOLD_OUT, but 'quantity: { gt: 0 }' filter handles it next time.
                                status: batch.quantity === qtyToDeduct ? 'SOLD_OUT' : 'AVAILABLE'
                            }
                        })
                        qtyToDeduct = 0
                    } else {
                        // Batch has partial amount
                        const available = batch.quantity
                        await tx.inventoryBatch.update({
                            where: { id: batch.id },
                            data: {
                                quantity: 0,
                                status: 'SOLD_OUT'
                            }
                        })
                        qtyToDeduct -= available
                    }
                }
            }

            // 3. Update Financial Account (Deposit)
            // Sales increase balance of Assets (Cash/Bank)
            // Or Decrease Debt if paying to Credit Card? (Unlikely)
            // If Receivable, it Increases Balance (Asset).

            await tx.financialAccount.update({
                where: { id: depositAccountId },
                data: { balance: { increment: netAmount } }
            })

            // 4. Auto-create DeferredPayment for SisteCredito
            if (channel === 'LUEGOPAGO' && paymentMethod === 'SISTECREDITO') {
                const saleDate = new Date()
                const expectedDate = new Date(saleDate)
                expectedDate.setDate(expectedDate.getDate() + 60)

                await tx.deferredPayment.create({
                    data: {
                        saleId: sale.id,
                        amount: netAmount,
                        platform: 'LUEGOPAGO',
                        paymentMethod: 'SISTECREDITO',
                        status: 'PENDING',
                        saleDate,
                        expectedDate
                    }
                })
            }
        })

        revalidatePath("/sales")
        revalidatePath("/inventory")
        revalidatePath("/accounts")
        return { success: true }
    } catch (error: any) { // eslint-disable-line
        console.error("Sale Error:", error)
        return { success: false, error: error.message || "Error al procesar venta" }
    }
}

export async function getSales() {
    try {
        const sales = await prisma.sale.findMany({
            include: {
                client: true,
                depositAccount: true,
                items: true
            },
            orderBy: { date: 'desc' }
        })
        return { success: true, data: sales }
    } catch (error) {
        return { success: false, error: "Error load" }
    }
}

// Get single sale by ID with full details
export async function getSaleById(saleId: string) {
    console.log("getSaleById called with:", saleId)
    try {
        const sale = await prisma.sale.findUnique({
            where: { id: saleId },
            include: {
                client: true,
                depositAccount: true,
                items: true, // SaleItem doesn't have product relation
                returns: {
                    include: {
                        items: true
                    }
                }
            }
        })

        console.log("Sale found:", sale ? "Yes" : "No")

        if (!sale) {
            return { success: false, error: "Venta no encontrada" }
        }

        return { success: true, data: sale }
    } catch (error) {
        console.error("Error fetching sale:", error)
        return { success: false, error: "Error al obtener detalles de venta" }
    }
}
