"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"

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
    isTransit: boolean = false
) {
    await requireAuth()
    if (!providerId || !paymentAccountId || items.length === 0) {
        return { success: false, error: "Datos incompletos" }
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
                    date: new Date()
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
                        arrivalDate: isTransit ? null : new Date()
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

export async function getPurchases() {
    await requireAuth()
    try {
        const purchases = await prisma.purchase.findMany({
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
