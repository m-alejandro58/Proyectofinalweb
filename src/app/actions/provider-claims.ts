"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"

// Valid status transitions per claim type
const STATUS_FLOWS: Record<string, string[]> = {
    SWAP: ["INITIATED", "REORDERED", "REPLACEMENT_RECEIVED", "RETURNED_TO_PROVIDER", "REFUNDED", "CLOSED"],
    REPLACEMENT: ["INITIATED", "RETURNED_TO_PROVIDER", "REPLACEMENT_RECEIVED", "CLOSED"],
    REFUND: ["INITIATED", "RETURNED_TO_PROVIDER", "REFUNDED", "CLOSED"],
}

// Human-readable status labels
const STATUS_LABELS: Record<string, string> = {
    INITIATED: "Iniciado",
    REORDERED: "Recomprado",
    REPLACEMENT_RECEIVED: "Reemplazo Recibido",
    RETURNED_TO_PROVIDER: "Devuelto al Proveedor",
    REFUNDED: "Reembolsado",
    CLOSED: "Cerrado",
}

export async function createProviderClaim(
    type: "SWAP" | "REPLACEMENT" | "REFUND",
    productName: string,
    providerId: string,
    reason: string,
    quantity: number = 1,
    productId?: string,
    customerReturnId?: string,
    originalPurchaseId?: string,
    notes?: string
) {
    await requireAuth()

    if (!productName || !providerId || !reason) {
        return { success: false, error: "Datos incompletos: producto, proveedor y razón son requeridos" }
    }

    if (!STATUS_FLOWS[type]) {
        return { success: false, error: "Tipo de reclamación inválido" }
    }

    try {
        const claim = await prisma.providerClaim.create({
            data: {
                type,
                productName,
                productId: productId || null,
                quantity,
                providerId,
                customerReturnId: customerReturnId || null,
                originalPurchaseId: originalPurchaseId || null,
                reason,
                notes: notes || null,
                status: "INITIATED",
            },
        })

        revalidatePath("/claims")
        revalidatePath("/returns")
        return { success: true, data: claim }
    } catch (e: any) {
        console.error("Error creating provider claim:", e)
        return { success: false, error: "Error al crear reclamación: " + e.message }
    }
}

export async function getProviderClaims(status?: string) {
    await requireAuth()

    try {
        const where: any = {}
        if (status && status !== "all") {
            where.status = status
        }

        const claims = await prisma.providerClaim.findMany({
            where,
            include: {
                provider: { select: { id: true, name: true } },
                customerReturn: {
                    select: {
                        id: true,
                        reason: true,
                        refundAmount: true,
                        sale: {
                            select: {
                                id: true,
                                client: { select: { name: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        })

        return { success: true, data: claims }
    } catch (e: any) {
        console.error("Error fetching provider claims:", e)
        return { success: false, error: "Error al obtener reclamaciones" }
    }
}

export async function getClaimsSummary() {
    await requireAuth()

    try {
        const all = await prisma.providerClaim.findMany({
            select: { status: true, refundAmount: true, reorderAmount: true },
        })

        const active = all.filter((c: any) => c.status !== "CLOSED")
        const pendingRefund = all.filter((c: any) =>
            c.status === "RETURNED_TO_PROVIDER" || c.status === "REPLACEMENT_RECEIVED"
        )
        const closed = all.filter((c: any) => c.status === "CLOSED")
        const totalRefunded = all
            .filter((c: any) => c.refundAmount != null)
            .reduce((sum: number, c: any) => sum + (c.refundAmount || 0), 0)

        return {
            success: true,
            data: {
                total: all.length,
                active: active.length,
                pendingRefund: pendingRefund.length,
                closed: closed.length,
                totalRefunded,
            },
        }
    } catch (e) {
        return { success: false, error: "Error al obtener resumen" }
    }
}

export async function advanceClaimStatus(
    claimId: string,
    data?: {
        reorderAmount?: number,
        reorderPurchaseId?: string,
        refundAmount?: number,
        refundAccountId?: string,
        notes?: string,
    }
) {
    await requireAuth()

    if (!claimId) {
        return { success: false, error: "ID de reclamación requerido" }
    }

    try {
        const claim = await prisma.providerClaim.findUnique({ where: { id: claimId } })
        if (!claim) {
            return { success: false, error: "Reclamación no encontrada" }
        }

        const flow = STATUS_FLOWS[claim.type]
        if (!flow) {
            return { success: false, error: "Tipo de reclamación inválido" }
        }

        const currentIndex = flow.indexOf(claim.status)
        if (currentIndex === -1 || currentIndex >= flow.length - 1) {
            return { success: false, error: "Esta reclamación ya está cerrada o en estado inválido" }
        }

        const nextStatus = flow[currentIndex + 1]

        // Build update data based on transition
        const updateData: any = {
            status: nextStatus,
            notes: data?.notes || claim.notes,
        }

        // Set date for the transition
        switch (nextStatus) {
            case "REORDERED":
                updateData.reorderedAt = new Date()
                if (data?.reorderAmount) updateData.reorderAmount = data.reorderAmount
                if (data?.reorderPurchaseId) updateData.reorderPurchaseId = data.reorderPurchaseId
                break
            case "REPLACEMENT_RECEIVED":
                updateData.replacementReceivedAt = new Date()
                break
            case "RETURNED_TO_PROVIDER":
                updateData.returnedToProviderAt = new Date()
                break
            case "REFUNDED":
                updateData.refundedAt = new Date()
                if (data?.refundAmount) updateData.refundAmount = data.refundAmount
                if (data?.refundAccountId) updateData.refundAccountId = data.refundAccountId
                break
            case "CLOSED":
                updateData.closedAt = new Date()
                break
        }

        // If transitioning to REFUNDED, update the financial account balance
        if (nextStatus === "REFUNDED" && data?.refundAmount && data?.refundAccountId) {
            await prisma.$transaction(async (tx: any) => {
                // Update claim
                await tx.providerClaim.update({
                    where: { id: claimId },
                    data: updateData,
                })

                // Add refund to the account balance
                await tx.financialAccount.update({
                    where: { id: data.refundAccountId },
                    data: {
                        balance: { increment: data.refundAmount },
                    },
                })

                // Register transaction
                await tx.transaction.create({
                    data: {
                        description: `Reembolso proveedor: ${claim.productName} (Reclamación ${claim.type})`,
                        amount: data.refundAmount!,
                        fromAccountId: data.refundAccountId,
                    },
                })
            })
        } else {
            await prisma.providerClaim.update({
                where: { id: claimId },
                data: updateData,
            })
        }

        revalidatePath("/claims")
        return {
            success: true,
            message: `Reclamación avanzada a: ${STATUS_LABELS[nextStatus] || nextStatus}`,
        }
    } catch (e: any) {
        console.error("Error advancing claim:", e)
        return { success: false, error: "Error al avanzar reclamación: " + e.message }
    }
}
