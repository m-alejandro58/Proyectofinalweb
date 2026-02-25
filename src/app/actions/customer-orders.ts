"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"

// ---- Types ----
type CreateOrderInput = {
    type: "CUSTOM" | "LAYAWAY"
    clientId: string
    description: string
    productId?: string
    quantity: number
    agreedPrice: number
    estimatedCost?: number
    providerId?: string
    expectedArrival?: string // ISO date string
    addToInventory?: boolean
    notes?: string
    // Optional initial payment
    initialPayment?: {
        amount: number
        method: string
        accountId: string
    }
}

type PaymentInput = {
    amount: number
    method: string // "Efectivo", "Transferencia", "Crédito"
    accountId: string
    notes?: string
}

// ---- Create Order ----
export async function createCustomerOrder(input: CreateOrderInput) {
    await requireAuth()
    if (!input.clientId || !input.description || input.agreedPrice <= 0) {
        return { success: false, error: "Datos incompletos" }
    }

    if (input.type === "LAYAWAY" && !input.productId) {
        return { success: false, error: "Debe seleccionar un producto para apartar" }
    }

    try {
        const order = await prisma.$transaction(async (tx: any) => {
            let reservedBatchId: string | null = null

            // LAYAWAY: Reserve stock immediately
            if (input.type === "LAYAWAY" && input.productId) {
                const product = await tx.product.findUnique({
                    where: { id: input.productId }
                })
                if (!product) throw new Error("Producto no encontrado")
                const available = product.stockTotal - (product.stockFull || 0)
                if (available < input.quantity) {
                    throw new Error(`Stock insuficiente para ${product.name}. Disponible local: ${available} (Total: ${product.stockTotal}, En FULL: ${product.stockFull || 0})`)
                }

                // Find FIFO batch to reserve from
                const batches = await tx.inventoryBatch.findMany({
                    where: {
                        productId: input.productId,
                        status: "AVAILABLE",
                        quantity: { gt: 0 }
                    },
                    orderBy: { createdAt: "asc" }
                })

                let qtyToReserve = input.quantity
                for (const batch of batches) {
                    if (qtyToReserve <= 0) break

                    if (batch.quantity >= qtyToReserve) {
                        // Mark batch portion as reserved
                        await tx.inventoryBatch.update({
                            where: { id: batch.id },
                            data: {
                                quantity: { decrement: qtyToReserve },
                                status: batch.quantity === qtyToReserve ? "RESERVED" : "AVAILABLE"
                            }
                        })
                        reservedBatchId = batch.id
                        qtyToReserve = 0
                    } else {
                        await tx.inventoryBatch.update({
                            where: { id: batch.id },
                            data: {
                                quantity: 0,
                                status: "RESERVED"
                            }
                        })
                        if (!reservedBatchId) reservedBatchId = batch.id
                        qtyToReserve -= batch.quantity
                    }
                }

                // Decrease product stock total
                await tx.product.update({
                    where: { id: input.productId },
                    data: { stockTotal: { decrement: input.quantity } }
                })
            }

            // Create the order
            const newOrder = await tx.customerOrder.create({
                data: {
                    type: input.type,
                    clientId: input.clientId,
                    description: input.description,
                    productId: input.productId || null,
                    quantity: input.quantity,
                    agreedPrice: input.agreedPrice,
                    estimatedCost: input.estimatedCost || null,
                    providerId: input.providerId || null,
                    expectedArrival: input.expectedArrival ? new Date(input.expectedArrival) : null,
                    addToInventory: input.addToInventory || false,
                    notes: input.notes || null,
                    status: input.type === "LAYAWAY" ? "RESERVED" : "PENDING",
                    reservedBatchId,
                    requestDate: new Date()
                }
            })

            // Process initial payment if provided
            if (input.initialPayment && input.initialPayment.amount > 0) {
                await tx.orderPayment.create({
                    data: {
                        orderId: newOrder.id,
                        amount: input.initialPayment.amount,
                        type: "ADVANCE",
                        method: input.initialPayment.method,
                        accountId: input.initialPayment.accountId,
                        date: new Date()
                    }
                })

                // Update totalPaid
                await tx.customerOrder.update({
                    where: { id: newOrder.id },
                    data: {
                        totalPaid: input.initialPayment.amount,
                        status: input.type === "LAYAWAY" ? "PAYING" : "PENDING"
                    }
                })

                // Update financial account
                const account = await tx.financialAccount.findUnique({
                    where: { id: input.initialPayment.accountId }
                })
                if (account) {
                    if (account.type === 'CREDIT' || account.type === 'LOAN') {
                        await tx.financialAccount.update({
                            where: { id: input.initialPayment.accountId },
                            data: { balance: { decrement: input.initialPayment.amount } }
                        })
                    } else {
                        await tx.financialAccount.update({
                            where: { id: input.initialPayment.accountId },
                            data: { balance: { increment: input.initialPayment.amount } }
                        })
                    }
                }
            }

            return newOrder
        })

        revalidatePath("/orders")
        revalidatePath("/inventory")
        revalidatePath("/accounts")
        return { success: true, data: order }
    } catch (error: any) {
        console.error("Create order error:", error)
        return { success: false, error: error.message || "Error al crear pedido" }
    }
}

// ---- Get Orders ----
export async function getCustomerOrders(filter?: { type?: string, status?: string }) {
    await requireAuth()
    try {
        const where: any = {}
        if (filter?.type && filter.type !== "ALL") {
            where.type = filter.type
        }
        if (filter?.status && filter.status !== "ALL") {
            where.status = filter.status
        }

        const orders = await prisma.customerOrder.findMany({
            where,
            include: {
                client: true,
                provider: true,
                payments: {
                    include: { account: true },
                    orderBy: { date: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return { success: true, data: orders }
    } catch (error) {
        console.error("Get orders error:", error)
        return { success: false, error: "Error al obtener pedidos" }
    }
}

// ---- Get Order By Id ----
export async function getOrderById(orderId: string) {
    await requireAuth()
    try {
        const order = await prisma.customerOrder.findUnique({
            where: { id: orderId },
            include: {
                client: true,
                provider: true,
                payments: {
                    include: { account: true },
                    orderBy: { date: 'asc' }
                }
            }
        })

        if (!order) return { success: false, error: "Pedido no encontrado" }
        return { success: true, data: order }
    } catch (error) {
        return { success: false, error: "Error al obtener pedido" }
    }
}

// ---- Add Payment (supports split payments) ----
export async function addOrderPayment(orderId: string, payments: PaymentInput[]) {
    await requireAuth()
    if (!orderId || payments.length === 0) {
        return { success: false, error: "Datos incompletos" }
    }

    try {
        await prisma.$transaction(async (tx: any) => {
            const order = await tx.customerOrder.findUnique({
                where: { id: orderId }
            })

            if (!order) throw new Error("Pedido no encontrado")
            if (order.status === "DELIVERED" || order.status === "CANCELLED") {
                throw new Error("Este pedido ya fue completado o cancelado")
            }

            let paymentTotal = 0

            for (const payment of payments) {
                if (payment.amount <= 0) continue

                paymentTotal += payment.amount

                // Determine payment type
                const newTotalPaid = order.totalPaid + paymentTotal
                let paymentType = "PARTIAL"
                if (order.totalPaid === 0 && paymentTotal < order.agreedPrice) {
                    paymentType = "ADVANCE"
                } else if (newTotalPaid >= order.agreedPrice) {
                    paymentType = "FINAL"
                }

                // Create payment record
                await tx.orderPayment.create({
                    data: {
                        orderId,
                        amount: payment.amount,
                        type: paymentType,
                        method: payment.method,
                        accountId: payment.accountId,
                        notes: payment.notes || null,
                        date: new Date()
                    }
                })

                // Update financial account
                const account = await tx.financialAccount.findUnique({
                    where: { id: payment.accountId }
                })
                if (account) {
                    if (account.type === 'CREDIT' || account.type === 'LOAN') {
                        await tx.financialAccount.update({
                            where: { id: payment.accountId },
                            data: { balance: { decrement: payment.amount } }
                        })
                    } else {
                        await tx.financialAccount.update({
                            where: { id: payment.accountId },
                            data: { balance: { increment: payment.amount } }
                        })
                    }
                }
            }

            // Update order totals and status
            const newTotal = order.totalPaid + paymentTotal
            let newStatus = order.status

            if (order.type === "LAYAWAY") {
                if (newTotal >= order.agreedPrice) {
                    newStatus = "PAID"
                } else if (newTotal > 0) {
                    newStatus = "PAYING"
                }
            }

            await tx.customerOrder.update({
                where: { id: orderId },
                data: {
                    totalPaid: newTotal,
                    status: newStatus
                }
            })
        })

        revalidatePath("/orders")
        revalidatePath("/accounts")
        return { success: true }
    } catch (error: any) {
        console.error("Add payment error:", error)
        return { success: false, error: error.message || "Error al registrar pago" }
    }
}

// ---- Update Order Status ----
type StatusUpdateInput = {
    // Required when transitioning to ORDERED (paying supplier)
    supplierPaymentAccountId?: string
    supplierInvoice?: string
    actualCost?: number // override estimatedCost if final cost differs

    // Required when transitioning to DELIVERED
    deliveryPayments?: { amount: number, method: string, accountId: string }[]
    deliveredWithoutPayment?: boolean
    unpaidReason?: string
}

export async function updateOrderStatus(orderId: string, newStatus: string, extra?: StatusUpdateInput) {
    await requireAuth()
    try {
        await prisma.$transaction(async (tx: any) => {
            const order = await tx.customerOrder.findUnique({
                where: { id: orderId }
            })

            if (!order) throw new Error("Pedido no encontrado")

            const dateUpdates: any = {}
            const orderUpdates: any = { status: newStatus }

            // ----- CUSTOM: PENDING → ORDERED -----
            // When we mark as "ordered", the supplier gets paid
            if (order.type === "CUSTOM" && newStatus === "ORDERED") {
                if (!extra?.supplierPaymentAccountId) {
                    throw new Error("Debe seleccionar la cuenta desde donde se pagó al proveedor")
                }

                const costAmount = extra.actualCost || order.estimatedCost || 0
                if (costAmount <= 0) {
                    throw new Error("El costo del proveedor debe ser mayor a 0")
                }

                const account = await tx.financialAccount.findUnique({
                    where: { id: extra.supplierPaymentAccountId }
                })
                if (!account) throw new Error("Cuenta de pago no encontrada")

                // Deduct from financial account
                if (account.type === 'CREDIT' || account.type === 'LOAN') {
                    await tx.financialAccount.update({
                        where: { id: extra.supplierPaymentAccountId },
                        data: { balance: { increment: costAmount } }
                    })
                } else {
                    await tx.financialAccount.update({
                        where: { id: extra.supplierPaymentAccountId },
                        data: { balance: { decrement: costAmount } }
                    })
                }

                // Record transaction
                await tx.transaction.create({
                    data: {
                        description: `Compra pedido especial - Fac. ${extra.supplierInvoice || 'N/A'} - ${order.description}`,
                        amount: costAmount,
                        fromAccountId: extra.supplierPaymentAccountId,
                        date: new Date()
                    }
                })

                // Create a Purchase record
                const purchase = await tx.purchase.create({
                    data: {
                        providerId: order.providerId || undefined,
                        paymentAccountId: extra.supplierPaymentAccountId,
                        receiptNumber: extra.supplierInvoice || null,
                        notes: `Pedido especial: ${order.description}`,
                        totalAmount: costAmount,
                        date: new Date()
                    }
                })

                // Update order with purchase link and supplier info
                orderUpdates.purchaseId = purchase.id
                orderUpdates.supplierInvoice = extra.supplierInvoice || null
                orderUpdates.supplierPaymentAccountId = extra.supplierPaymentAccountId
                if (extra.actualCost) {
                    orderUpdates.estimatedCost = extra.actualCost
                }

                dateUpdates.orderedDate = new Date()
            }

            // ----- CUSTOM: IN_TRANSIT -----
            if (newStatus === "IN_TRANSIT") {
                dateUpdates.orderedDate = order.orderedDate || new Date()
            }

            // ----- CUSTOM: ARRIVED → Create Inventory as RESERVED -----
            if (order.type === "CUSTOM" && newStatus === "ARRIVED") {
                dateUpdates.arrivedDate = new Date()

                // If we have a productId and a purchase, create inventory batch as RESERVED
                if (order.productId && order.purchaseId) {
                    const cost = order.estimatedCost || 0
                    const unitCost = order.quantity > 0 ? cost / order.quantity : 0

                    const batch = await tx.inventoryBatch.create({
                        data: {
                            productId: order.productId,
                            purchaseId: order.purchaseId,
                            initialQty: order.quantity,
                            quantity: order.quantity,
                            unitCost: unitCost,
                            status: "RESERVED",
                            arrivalDate: new Date()
                        }
                    })

                    // Save the batch ID on the order so we can track it
                    orderUpdates.reservedBatchId = batch.id

                    // Update product stock (counted in total but not available for sale)
                    await tx.product.update({
                        where: { id: order.productId },
                        data: { stockTotal: { increment: order.quantity } }
                    })
                }
            }

            // ----- DELIVERED -----
            if (newStatus === "DELIVERED") {
                const remainingBalance = order.agreedPrice - order.totalPaid

                if (remainingBalance > 0) {
                    // There's money still owed
                    if (extra?.deliveredWithoutPayment) {
                        // Delivered without payment — require reason
                        if (!extra.unpaidReason || extra.unpaidReason.trim().length === 0) {
                            throw new Error("Debe indicar el motivo por el cual se entrega sin pago completo")
                        }

                        // Record the unpaid delivery as a note on the order
                        orderUpdates.notes = (order.notes ? order.notes + "\n" : "") +
                            `[ENTREGADO SIN PAGO COMPLETO - ${new Date().toLocaleDateString('es-CO')}] Pendiente: $${remainingBalance.toLocaleString()} - Motivo: ${extra.unpaidReason.trim()}`
                    } else {
                        // Must provide delivery payments
                        if (!extra?.deliveryPayments || extra.deliveryPayments.length === 0) {
                            throw new Error("Debe registrar el pago del cliente o indicar que se entrega sin pago")
                        }

                        const totalDeliveryPayment = extra.deliveryPayments.reduce((sum: number, p: any) => sum + p.amount, 0)

                        // Validate all payments have required fields
                        for (const p of extra.deliveryPayments) {
                            if (!p.accountId || p.amount <= 0) {
                                throw new Error("Cada pago debe tener monto mayor a 0 y cuenta seleccionada")
                            }
                        }

                        // Process each delivery payment
                        let runningPaid = order.totalPaid
                        for (const payment of extra.deliveryPayments) {
                            // Determine payment type
                            const newTotalAfter = runningPaid + payment.amount
                            const payType = newTotalAfter >= order.agreedPrice ? "FINAL" : "PARTIAL"

                            // Create OrderPayment record
                            await tx.orderPayment.create({
                                data: {
                                    orderId: order.id,
                                    amount: payment.amount,
                                    type: payType,
                                    method: payment.method,
                                    accountId: payment.accountId,
                                    date: new Date(),
                                    notes: "Pago al momento de entrega"
                                }
                            })

                            // Update financial account (money comes IN)
                            const account = await tx.financialAccount.findUnique({
                                where: { id: payment.accountId }
                            })
                            if (!account) throw new Error(`Cuenta ${payment.accountId} no encontrada`)

                            if (account.type === 'CREDIT' || account.type === 'LOAN') {
                                await tx.financialAccount.update({
                                    where: { id: payment.accountId },
                                    data: { balance: { decrement: payment.amount } }
                                })
                            } else {
                                await tx.financialAccount.update({
                                    where: { id: payment.accountId },
                                    data: { balance: { increment: payment.amount } }
                                })
                            }

                            runningPaid += payment.amount
                        }

                        // Update totalPaid on the order
                        orderUpdates.totalPaid = runningPaid
                    }
                }

                // Deduct stock from reserved batch (product leaves the store)
                if (order.reservedBatchId) {
                    const batch = await tx.inventoryBatch.findUnique({
                        where: { id: order.reservedBatchId }
                    })

                    if (batch && batch.status === "RESERVED") {
                        const newQty = batch.quantity - order.quantity
                        await tx.inventoryBatch.update({
                            where: { id: order.reservedBatchId },
                            data: {
                                quantity: Math.max(newQty, 0),
                                status: newQty <= 0 ? "SOLD_OUT" : "RESERVED"
                            }
                        })

                        // Decrement product stockTotal
                        if (order.productId) {
                            await tx.product.update({
                                where: { id: order.productId },
                                data: { stockTotal: { decrement: order.quantity } }
                            })
                        }
                    }
                }

                dateUpdates.deliveredDate = new Date()
            }

            await tx.customerOrder.update({
                where: { id: orderId },
                data: {
                    ...orderUpdates,
                    ...dateUpdates
                }
            })
        })

        revalidatePath("/orders")
        revalidatePath("/inventory")
        revalidatePath("/accounts")
        revalidatePath("/purchases")
        revalidatePath("/")
        return { success: true }
    } catch (error: any) {
        console.error("Update status error:", error)
        return { success: false, error: error.message || "Error al actualizar estado" }
    }
}

// ---- Cancel Order ----
export async function cancelOrder(orderId: string) {
    await requireAuth()
    try {
        await prisma.$transaction(async (tx: any) => {
            const order = await tx.customerOrder.findUnique({
                where: { id: orderId },
                include: { payments: true }
            })

            if (!order) throw new Error("Pedido no encontrado")
            if (order.status === "DELIVERED") throw new Error("No se puede cancelar un pedido entregado")

            // LAYAWAY: Restore reserved stock
            if (order.type === "LAYAWAY" && order.productId) {
                // Restore product stock
                await tx.product.update({
                    where: { id: order.productId },
                    data: { stockTotal: { increment: order.quantity } }
                })

                // Restore batch
                if (order.reservedBatchId) {
                    await tx.inventoryBatch.update({
                        where: { id: order.reservedBatchId },
                        data: {
                            quantity: { increment: order.quantity },
                            status: "AVAILABLE"
                        }
                    })
                }
            }

            // Reverse payments (return money to accounts)
            for (const payment of order.payments) {
                if (payment.accountId) {
                    const account = await tx.financialAccount.findUnique({
                        where: { id: payment.accountId }
                    })
                    if (account) {
                        if (account.type === 'CREDIT' || account.type === 'LOAN') {
                            await tx.financialAccount.update({
                                where: { id: payment.accountId },
                                data: { balance: { increment: payment.amount } }
                            })
                        } else {
                            await tx.financialAccount.update({
                                where: { id: payment.accountId },
                                data: { balance: { decrement: payment.amount } }
                            })
                        }
                    }
                }
            }

            await tx.customerOrder.update({
                where: { id: orderId },
                data: {
                    status: "CANCELLED",
                    totalPaid: 0
                }
            })
        })

        revalidatePath("/orders")
        revalidatePath("/inventory")
        revalidatePath("/accounts")
        return { success: true }
    } catch (error: any) {
        console.error("Cancel order error:", error)
        return { success: false, error: error.message || "Error al cancelar pedido" }
    }
}

// ---- Get Order Summary (for dashboard) ----
export async function getOrdersSummary() {
    await requireAuth()
    try {
        const orders = await prisma.customerOrder.findMany({
            where: {
                status: { notIn: ["DELIVERED", "CANCELLED"] }
            }
        })

        const pending = orders.filter(o => o.status === "PENDING").length
        const ordered = orders.filter(o => o.status === "ORDERED" || o.status === "IN_TRANSIT").length
        const arrived = orders.filter(o => o.status === "ARRIVED").length
        const reserved = orders.filter(o => ["RESERVED", "PAYING"].includes(o.status)).length
        const paid = orders.filter(o => o.status === "PAID").length

        const totalPendingRevenue = orders.reduce((sum, o) => sum + (o.agreedPrice - o.totalPaid), 0)

        return {
            success: true,
            data: {
                pending,
                ordered,
                arrived,
                reserved,
                paid,
                totalActive: orders.length,
                totalPendingRevenue
            }
        }
    } catch (error) {
        return { success: false, error: "Error" }
    }
}

// ---- Release Reserved Stock (Manual) ----
// Makes a reserved batch available for normal sale
export async function releaseReservedStock(orderId: string) {
    await requireAuth()
    try {
        await prisma.$transaction(async (tx: any) => {
            const order = await tx.customerOrder.findUnique({
                where: { id: orderId }
            })
            if (!order) throw new Error("Pedido no encontrado")
            if (!order.reservedBatchId) throw new Error("No hay lote reservado para este pedido")

            const batch = await tx.inventoryBatch.findUnique({
                where: { id: order.reservedBatchId }
            })
            if (!batch) throw new Error("Lote no encontrado")
            if (batch.status !== "RESERVED") throw new Error("El lote ya no está reservado")

            // Change batch status to AVAILABLE
            await tx.inventoryBatch.update({
                where: { id: order.reservedBatchId },
                data: { status: "AVAILABLE" }
            })

            // Clear the reservation link on the order
            await tx.customerOrder.update({
                where: { id: orderId },
                data: {
                    reservedBatchId: null,
                    notes: (order.notes ? order.notes + "\n" : "") +
                        `[STOCK LIBERADO - ${new Date().toLocaleDateString('es-CO')}] El producto fue liberado para venta normal.`
                }
            })
        })

        revalidatePath("/orders")
        revalidatePath("/inventory")
        return { success: true }
    } catch (error: any) {
        console.error("Release reserved stock error:", error)
        return { success: false, error: error.message || "Error al liberar stock" }
    }
}

// ---- Auto-Release Expired Orders (7+ days without pickup) ----
// Called on orders page load to automatically release reservations > 7 days old
export async function autoReleaseExpiredOrders() {
    await requireAuth()
    try {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        // Find ARRIVED orders with reserved batches older than 7 days
        const expiredOrders = await prisma.customerOrder.findMany({
            where: {
                status: "ARRIVED",
                reservedBatchId: { not: null },
                arrivedDate: { lt: sevenDaysAgo }
            }
        })

        let releasedCount = 0

        for (const order of expiredOrders) {
            if (!order.reservedBatchId) continue

            await prisma.$transaction(async (tx: any) => {
                const batch = await tx.inventoryBatch.findUnique({
                    where: { id: order.reservedBatchId }
                })

                if (batch && batch.status === "RESERVED") {
                    await tx.inventoryBatch.update({
                        where: { id: order.reservedBatchId },
                        data: { status: "AVAILABLE" }
                    })

                    await tx.customerOrder.update({
                        where: { id: order.id },
                        data: {
                            reservedBatchId: null,
                            notes: (order.notes ? order.notes + "\n" : "") +
                                `[AUTO-LIBERADO - ${new Date().toLocaleDateString('es-CO')}] Stock liberado automáticamente después de 7 días sin reclamar.`
                        }
                    })

                    releasedCount++
                }
            })
        }

        if (releasedCount > 0) {
            revalidatePath("/orders")
            revalidatePath("/inventory")
        }

        return { success: true, releasedCount }
    } catch (error: any) {
        console.error("Auto-release error:", error)
        return { success: false, error: error.message }
    }
}
