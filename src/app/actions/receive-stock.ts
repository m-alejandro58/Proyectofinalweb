"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function receiveBatch(batchId: string) {
    try {
        await prisma.$transaction(async (tx: any) => {
            const batch = await tx.inventoryBatch.findUnique({ where: { id: batchId } })
            if (!batch) throw new Error("Lote no encontrado")
            if (batch.status !== "TRANSIT") throw new Error("El lote no está en tránsito")

            // Update Batch
            await tx.inventoryBatch.update({
                where: { id: batchId },
                data: {
                    status: "AVAILABLE",
                    arrivalDate: new Date()
                }
            })

            // Update Product Stock
            await tx.product.update({
                where: { id: batch.productId },
                data: {
                    stockTotal: { increment: batch.quantity }
                }
            })
        })

        revalidatePath("/inventory")
        return { success: true }
    } catch (error: any) {
        console.error(error)
        return { success: false, error: error.message || "Error al recibir lote" }
    }
}
