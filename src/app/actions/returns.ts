"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

// Tipos para crear devoluciones
type ReturnItemInput = {
    saleItemId: string
    quantity: number
    productCondition: 'GOOD' | 'DEFECTIVE' | 'DAMAGED'
}

type ReturnReason = 'CHANGE_OF_MIND' | 'DEFECTIVE' | 'WARRANTY' | 'WRONG_ITEM' | 'OTHER'

// Validar elegibilidad de devolución
export async function validateReturnEligibility(saleId: string) {
    try {
        const sale = await prisma.sale.findUnique({
            where: { id: saleId },
            include: {
                items: true
            }
        })

        if (!sale) {
            return { success: false, error: "Venta no encontrada" }
        }

        const now = new Date()
        const saleDate = new Date(sale.date)
        const daysSinceSale = Math.floor((now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24))

        // Verificar si está dentro de 30 días
        const within30Days = daysSinceSale <= 30

        // Verificar si hay items con garantía válida
        const hasActiveWarranty = sale.items.some(item => {
            if (!item.warrantyEnd) return false
            return new Date(item.warrantyEnd) > now
        })

        return {
            success: true,
            data: {
                saleId: sale.id,
                invoiceNumber: sale.invoiceNumber,
                saleDate: sale.date,
                daysSinceSale,
                within30Days,
                hasActiveWarranty,
                eligibleReasons: within30Days
                    ? ['CHANGE_OF_MIND', 'DEFECTIVE', 'WARRANTY', 'WRONG_ITEM', 'OTHER']
                    : hasActiveWarranty
                        ? ['DEFECTIVE', 'WARRANTY']
                        : []
            }
        }
    } catch (error: any) {
        console.error("Validation Error:", error)
        return { success: false, error: "Error al validar elegibilidad" }
    }
}

// Crear devolución
export async function createReturn(
    saleId: string,
    reason: ReturnReason,
    items: ReturnItemInput[],
    notes?: string
) {
    try {
        // 1. Validar elegibilidad
        const eligibility = await validateReturnEligibility(saleId)
        if (!eligibility.success || !eligibility.data) {
            return eligibility
        }

        if (eligibility.data.eligibleReasons.length === 0) {
            return {
                success: false,
                error: "Esta venta no es elegible para devolución. Han pasado más de 30 días y no hay garantía activa."
            }
        }

        if (!eligibility.data.eligibleReasons.includes(reason)) {
            return {
                success: false,
                error: `Motivo de devolución no válido para esta venta. Solo se permite: ${eligibility.data.eligibleReasons.join(', ')}`
            }
        }

        // 2. Obtener detalles de la venta
        const sale = await prisma.sale.findUnique({
            where: { id: saleId },
            include: {
                items: true
            }
        })

        if (!sale) {
            return { success: false, error: "Venta no encontrada" }
        }

        // 3. Validar items y calcular montos
        let totalRefund = 0
        const returnItemsData = []

        for (const returnItem of items) {
            const saleItem = sale.items.find(si => si.id === returnItem.saleItemId)
            if (!saleItem) {
                return { success: false, error: `Item ${returnItem.saleItemId} no encontrado en la venta` }
            }

            // Validar cantidad
            if (returnItem.quantity > saleItem.quantity) {
                return {
                    success: false,
                    error: `Cantidad a devolver (${returnItem.quantity}) excede la cantidad vendida (${saleItem.quantity}) para ${saleItem.productName}`
                }
            }

            // Calcular reembolso por item
            const refundPerUnit = saleItem.unitPrice
            const itemRefund = refundPerUnit * returnItem.quantity

            totalRefund += itemRefund

            returnItemsData.push({
                saleItemId: returnItem.saleItemId,
                productId: null, // Se buscará al procesar
                productName: saleItem.productName,
                quantity: returnItem.quantity,
                unitPrice: saleItem.unitPrice,
                refundPerUnit,
                productCondition: returnItem.productCondition
            })
        }

        // 4. Calcular reembolso total basado en el motivo
        // - CHANGE_OF_MIND: Reembolsar lo que el cliente pagó (grossAmount proporcional)
        //   Las comisiones/fees de plataforma NO se reembolsan (son costos del negocio)
        // - WARRANTY/DEFECTIVE: Reembolsar solo el precio del producto
        //   El negocio asume costos de envío de ida y vuelta

        let finalRefundAmount = totalRefund
        let shippingCost = 0

        if (reason === 'CHANGE_OF_MIND' || reason === 'WRONG_ITEM') {
            // El cliente debe recibir de vuelta el monto BRUTO que pagó (proporcionalmente)
            // Las comisiones/impuestos de plataforma ya fueron pagadas y NO se recuperan
            // Entonces: reembolso = lo que el cliente efectivamente pagó = grossAmount

            // Calcular proporción de la venta que se está devolviendo
            const totalSaleAmount = sale.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
            const returnProportion = totalRefund / totalSaleAmount

            // El monto bruto (grossAmount) es lo que el cliente pagó
            // Si devuelve todo: reembolsar grossAmount completo
            // Si devuelve parcial: reembolsar grossAmount proporcional
            finalRefundAmount = sale.grossAmount * returnProportion

        } else if (reason === 'DEFECTIVE' || reason === 'WARRANTY') {
            // Para garantía/defectos: solo reembolsar el precio del producto
            // El negocio asume el costo de envío de ida y vuelta
            finalRefundAmount = totalRefund
            shippingCost = sale.shippingCost || 0 // Costo adicional para el negocio
        }

        // 5. Crear registro de devolución
        const returnRecord = await prisma.return.create({
            data: {
                saleId,
                reason,
                notes,
                status: 'PENDING',
                refundAmount: finalRefundAmount,
                shippingCost,
                items: {
                    create: returnItemsData
                }
            },
            include: {
                items: true,
                sale: {
                    include: {
                        client: true
                    }
                }
            }
        })

        revalidatePath("/returns")
        revalidatePath("/sales")

        return {
            success: true,
            data: returnRecord,
            message: `Devolución creada exitosamente. Monto a reembolsar: $${finalRefundAmount.toLocaleString()}`
        }

    } catch (error: any) {
        console.error("Create Return Error:", error)
        return { success: false, error: error.message || "Error al crear devolución" }
    }
}

export async function processReturn(
    returnId: string,
    approve: boolean,
    refundAccountId?: string
) {
    console.log("processReturn called with:", { returnId, approve, refundAccountId })

    try {
        const returnRecord = await prisma.return.findUnique({
            where: { id: returnId },
            include: {
                items: {
                    include: {
                        saleItem: true
                    }
                },
                sale: {
                    include: {
                        depositAccount: true,
                        items: true
                    }
                }
            }
        })

        console.log("Return record found:", returnRecord ? "Yes" : "No")

        if (!returnRecord) {
            return { success: false, error: "Devolución no encontrada" }
        }

        if (returnRecord.status !== 'PENDING') {
            return { success: false, error: `Esta devolución ya fue ${returnRecord.status}` }
        }

        // Si se rechaza
        if (!approve) {
            await prisma.return.update({
                where: { id: returnId },
                data: {
                    status: 'REJECTED',
                    processedAt: new Date()
                }
            })

            revalidatePath("/returns")
            return { success: true, message: "Devolución rechazada" }
        }

        // Si se aprueba, procesar en transacción
        if (!refundAccountId) {
            return { success: false, error: "Debe seleccionar una cuenta para el reembolso" }
        }

        await prisma.$transaction(async (tx: any) => {
            // 1. Reintegrar productos al inventario
            for (const returnItem of returnRecord.items) {
                console.log("Processing returnItem:", {
                    id: returnItem.id,
                    productId: returnItem.productId,
                    productName: returnItem.productName,
                    condition: returnItem.productCondition
                })

                if (returnItem.productCondition === 'GOOD') {
                    // Validar que tengamos productId
                    if (!returnItem.productId) {
                        console.warn(`ReturnItem ${returnItem.id} no tiene productId, omitiendo restock`)
                        continue
                    }

                    // Buscar producto por ID (más confiable que por nombre)
                    const product = await tx.product.findUnique({
                        where: { id: returnItem.productId }
                    })

                    if (!product) {
                        console.error(`Product not found: ${returnItem.productId}`)
                        throw new Error(`No se encontró el producto: ${returnItem.productName}`)
                    }

                    // Crear nuevo batch con el costo original
                    const unitCost = returnItem.saleItem.unitCost || 0

                    const batch = await tx.inventoryBatch.create({
                        data: {
                            productId: product.id,
                            quantity: returnItem.quantity,
                            initialQty: returnItem.quantity,
                            unitCost,
                            status: 'AVAILABLE',
                            // purchaseId omitido - esto es un retorno, no una compra
                            arrivalDate: new Date()
                        }
                    })

                    // Actualizar stock total
                    await tx.product.update({
                        where: { id: product.id },
                        data: {
                            stockTotal: { increment: returnItem.quantity }
                        }
                    })

                    // Marcar como restocked
                    await tx.returnItem.update({
                        where: { id: returnItem.id },
                        data: {
                            restocked: true,
                            restockedAt: new Date(),
                            batchId: batch.id,
                            productId: product.id
                        }
                    })

                    console.log(`Product ${product.name} restocked successfully`)
                } else {
                    // Producto defectuoso - no se re-stockea automáticamente
                    // Se mantiene en registro para tramitar garantía
                    await tx.returnItem.update({
                        where: { id: returnItem.id },
                        data: {
                            restocked: false,
                            restockedAt: new Date()
                        }
                    })
                }
            }

            // 2. Procesar reembolso financiero
            // Decrementar de cuenta de reembolso (negocio pierde dinero)
            await tx.financialAccount.update({
                where: { id: refundAccountId },
                data: {
                    balance: { decrement: returnRecord.refundAmount }
                }
            })

            // Opcional: Incrementar cuenta del cliente si es receivable
            // Por ahora solo restamos del negocio

            // 3. Actualizar estado de devolución
            await tx.return.update({
                where: { id: returnId },
                data: {
                    status: 'COMPLETED',
                    processedAt: new Date(),
                    refundAccountId
                }
            })
        })

        revalidatePath("/returns")
        revalidatePath("/inventory")
        revalidatePath("/accounts")

        return {
            success: true,
            message: `Devolución procesada exitosamente. Reembolsado: $${returnRecord.refundAmount.toLocaleString()}`
        }

    } catch (error: any) {
        console.error("Process Return Error:", error)
        console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            returnId,
            approve,
            refundAccountId
        })
        return { success: false, error: error.message || "Error al procesar devolución" }
    }
}

// Obtener todas las devoluciones
export async function getReturns(status?: string) {
    try {
        const where: any = {}
        if (status && status !== 'all') {
            where.status = status
        }

        const returns = await prisma.return.findMany({
            where,
            include: {
                items: true,
                sale: {
                    include: {
                        client: true
                    }
                },
                refundAccount: true
            },
            orderBy: { requestedAt: 'desc' }
        })

        return { success: true, data: returns }
    } catch (error) {
        console.error("Get Returns Error:", error)
        return { success: false, error: "Error al cargar devoluciones" }
    }
}

// Obtener una devolución específica
export async function getReturnById(returnId: string) {
    try {
        const returnRecord = await prisma.return.findUnique({
            where: { id: returnId },
            include: {
                items: {
                    include: {
                        saleItem: true
                    }
                },
                sale: {
                    include: {
                        client: true,
                        items: true
                    }
                },
                refundAccount: true
            }
        })

        if (!returnRecord) {
            return { success: false, error: "Devolución no encontrada" }
        }

        return { success: true, data: returnRecord }
    } catch (error) {
        console.error("Get Return Error:", error)
        return { success: false, error: "Error al cargar devolución" }
    }
}
