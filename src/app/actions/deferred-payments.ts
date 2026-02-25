"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"

export async function getDeferredPayments(status?: string) {
    await requireAuth()
    try {
        const where: any = {}
        if (status && status !== "ALL") {
            where.status = status
        }

        const payments = await prisma.deferredPayment.findMany({
            where,
            include: {
                sale: {
                    include: {
                        client: true,
                        depositAccount: true
                    }
                },
                targetAccount: true
            },
            orderBy: { expectedDate: 'asc' }
        })

        return { success: true, data: payments }
    } catch (error) {
        console.error("Deferred payments error:", error)
        return { success: false, error: "Error al obtener pagos diferidos" }
    }
}

export async function getDeferredPaymentsSummary() {
    await requireAuth()
    try {
        const pending = await prisma.deferredPayment.findMany({
            where: { status: "PENDING" }
        })

        const now = new Date()
        const in7Days = new Date()
        in7Days.setDate(in7Days.getDate() + 7)

        const totalPending = pending.reduce((sum, p) => sum + p.amount, 0)
        const upcomingCount = pending.filter(p => p.expectedDate <= in7Days).length
        const upcomingAmount = pending.filter(p => p.expectedDate <= in7Days).reduce((sum, p) => sum + p.amount, 0)
        const overdueCount = pending.filter(p => p.expectedDate < now).length
        const overdueAmount = pending.filter(p => p.expectedDate < now).reduce((sum, p) => sum + p.amount, 0)

        return {
            success: true,
            data: {
                totalPending,
                pendingCount: pending.length,
                upcomingCount,
                upcomingAmount,
                overdueCount,
                overdueAmount
            }
        }
    } catch (error) {
        console.error("Deferred summary error:", error)
        return { success: false, error: "Error" }
    }
}

export async function markAsDisbursed(
    paymentId: string,
    targetAccountId: string,
    notes?: string
) {
    await requireAuth()
    try {
        await prisma.$transaction(async (tx: any) => {
            const payment = await tx.deferredPayment.findUnique({
                where: { id: paymentId },
                include: { sale: { include: { depositAccount: true } } }
            })

            if (!payment) throw new Error("Pago diferido no encontrado")
            if (payment.status !== "PENDING") throw new Error("Este pago ya fue procesado")

            // 1. Mark DeferredPayment as DISBURSED
            await tx.deferredPayment.update({
                where: { id: paymentId },
                data: {
                    status: "DISBURSED",
                    disbursedDate: new Date(),
                    targetAccountId,
                    notes: notes || undefined
                }
            })

            // 2. Transfer money: RECEIVABLE account → target BANK account
            // Decrease RECEIVABLE balance
            if (payment.sale.depositAccountId) {
                await tx.financialAccount.update({
                    where: { id: payment.sale.depositAccountId },
                    data: { balance: { decrement: payment.amount } }
                })
            }

            // Increase target account balance
            const targetAccount = await tx.financialAccount.findUnique({
                where: { id: targetAccountId }
            })

            if (!targetAccount) throw new Error("Cuenta destino no encontrada")

            if (targetAccount.type === 'CREDIT' || targetAccount.type === 'LOAN') {
                await tx.financialAccount.update({
                    where: { id: targetAccountId },
                    data: { balance: { decrement: payment.amount } }
                })
            } else {
                await tx.financialAccount.update({
                    where: { id: targetAccountId },
                    data: { balance: { increment: payment.amount } }
                })
            }

            // 3. Record transaction
            await tx.transaction.create({
                data: {
                    description: `Desembolso SisteCredito - Venta ${payment.sale.invoiceNumber || payment.saleId.slice(0, 8)}`,
                    amount: payment.amount,
                    fromAccountId: targetAccountId,
                    date: new Date()
                }
            })
        })

        revalidatePath("/accounts")
        revalidatePath("/")
        return { success: true }
    } catch (error: any) {
        console.error("Disburse error:", error)
        return { success: false, error: error.message || "Error al procesar desembolso" }
    }
}
