"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"

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
    paymentMethod?: string,
    saleDate?: Date
) {
    await requireAuth()
    if (!clientId || !depositAccountId || items.length === 0) {
        return { success: false, error: "Datos incompletos" }
    }

    if (grossAmount < 0 || platformFee < 0 || shippingCost < 0 || taxes < 0) {
        return { success: false, error: "Montos no pueden ser negativos" }
    }
    for (const item of items) {
        if (item.quantity <= 0 || item.unitPrice < 0) {
            return { success: false, error: "La cantidad debe ser mayor a 0 y el precio válido" }
        }
    }

    const netAmount = grossAmount - platformFee - shippingCost - taxes

    try {
        await prisma.$transaction(async (tx: any) => {
            // 1. Create Sale Header
            // Generate consecutive invoice number if not provided (e.g. REM-0001)
            let finalInvoiceNumber = invoiceNumber
            if (!finalInvoiceNumber) {
                // Find highest REM- number
                const lastRem = await tx.sale.findFirst({
                    where: { invoiceNumber: { startsWith: 'REM-' } },
                    orderBy: { invoiceNumber: 'desc' }
                })

                let nextNum = 1
                if (lastRem && lastRem.invoiceNumber) {
                    const match = lastRem.invoiceNumber.match(/REM-(\d+)/)
                    if (match && match[1]) {
                        nextNum = parseInt(match[1], 10) + 1
                    }
                }

                finalInvoiceNumber = `REM-${nextNum.toString().padStart(4, '0')}`
            }

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
                    invoiceNumber: finalInvoiceNumber,
                    date: saleDate || new Date()
                }
            })

            // 2. Process Items (Stock & Warranty)
            let totalCogsForSale = 0
            for (const item of items) {
                // Validation: Check Stock
                const product = await tx.product.findUnique({ where: { id: item.productId } })
                if (!product) throw new Error(`Producto no encontrado ${item.productId}`)

                const isMercadoLibre = channel === 'MERCADOLIBRE'
                const stockLocal = product.stockTotal - (product.stockFull || 0)
                const stockAvailable = isMercadoLibre ? product.stockTotal : stockLocal

                if (stockAvailable < item.quantity) {
                    if (isMercadoLibre) {
                        throw new Error(`Stock insuficiente para ${product.name}. Stock total: ${product.stockTotal} (Local: ${stockLocal}, FULL: ${product.stockFull || 0})`)
                    } else {
                        throw new Error(`Stock insuficiente para ${product.name}. Disponible local: ${stockLocal} (Total: ${product.stockTotal}, En FULL: ${product.stockFull || 0}). Si la venta es de MercadoLibre FULL, selecciona el canal MERCADOLIBRE.`)
                    }
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
                totalCogsForSale += totalCost

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
                // isMercadoLibre and stockLocal already declared above (validation block)
                // Re-fetch fresh stock values after other potential updates in the loop
                const productStock = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: { stockFull: true, stockTotal: true }
                })
                const currentStockFull = productStock?.stockFull || 0

                // How many units come from FULL vs local for this item
                let qtyFromFull = 0
                if (isMercadoLibre && currentStockFull > 0) {
                    // Take from FULL first, then local
                    qtyFromFull = Math.min(item.quantity, currentStockFull)
                }

                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stockTotal: { decrement: item.quantity },
                        // If some units come from FULL, also decrement stockFull
                        ...(qtyFromFull > 0 ? { stockFull: { decrement: qtyFromFull } } : {})
                    }
                })

                // If we took from FULL, update FullInventory records (FIFO: oldest shipment first)
                if (qtyFromFull > 0) {
                    const fullItems = await tx.fullInventory.findMany({
                        where: {
                            productId: item.productId,
                            status: 'IN_WAREHOUSE',
                            quantityInStock: { gt: 0 }
                        },
                        orderBy: { arrivedAt: 'asc' } // FIFO: arrived first, sold first
                    })

                    let remainingFromFull = qtyFromFull
                    for (const fullItem of fullItems) {
                        if (remainingFromFull <= 0) break

                        const deductFromThis = Math.min(remainingFromFull, fullItem.quantityInStock)
                        const newStock = fullItem.quantityInStock - deductFromThis
                        const newSold = fullItem.quantitySold + deductFromThis

                        await tx.fullInventory.update({
                            where: { id: fullItem.id },
                            data: {
                                quantityInStock: newStock,
                                quantitySold: newSold,
                                status: newStock === 0 ? 'SOLD_OUT' : 'IN_WAREHOUSE'
                            }
                        })
                        remainingFromFull -= deductFromThis
                    }
                }

                // Now perform actual inventory batch deduction (for local stock portion)
                qtyToDeduct = item.quantity
                for (const batch of batches) {
                    if (qtyToDeduct <= 0) break;

                    if (batch.quantity >= qtyToDeduct) {
                        // Batch has enough
                        await tx.inventoryBatch.update({
                            where: { id: batch.id },
                            data: {
                                quantity: { decrement: qtyToDeduct },
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

            // Calculate real taxes to save (GMF + ICA)
            const gmfToSave = grossAmount * 0.004
            const operatingProfit = grossAmount - totalCogsForSale - platformFee - shippingCost
            const icaToSave = operatingProfit > 0 ? operatingProfit * 0.01 : 0
            const autoTaxesToSave = gmfToSave + icaToSave

            // 3. Update Financial Account (Deposit)
            // Sales increase balance of Assets (Cash/Bank)
            // Or Decrease Debt if paying to Credit Card? (Unlikely)
            // If Receivable, it Increases Balance (Asset).

            await tx.financialAccount.update({
                where: { id: depositAccountId },
                data: { balance: { increment: netAmount - autoTaxesToSave } }
            })

            // 3.5. Auto-divert taxes to "Impuestos Ahorrados"
            if (autoTaxesToSave > 0) {
                let taxAccount = await tx.financialAccount.findFirst({
                    where: { name: 'Impuestos Ahorrados' }
                })

                if (!taxAccount) {
                    taxAccount = await tx.financialAccount.create({
                        data: {
                            name: 'Impuestos Ahorrados',
                            type: 'BANK',
                            balance: 0,
                            description: 'Cuenta automática para provisión de impuestos (4x1000, Retenciones, ICA)'
                        }
                    })
                }

                await tx.financialAccount.update({
                    where: { id: taxAccount.id },
                    data: { balance: { increment: autoTaxesToSave } }
                })
            }

            // 4. Auto-create DeferredPayment for any SISTECREDITO sale
            // Applies to all channels: LuegoPago, Presencial, WhatsApp, etc.
            if (paymentMethod === 'SISTECREDITO') {
                const sDate = saleDate || new Date()
                const expectedDate = new Date(sDate)
                expectedDate.setDate(expectedDate.getDate() + 60)

                await tx.deferredPayment.create({
                    data: {
                        saleId: sale.id,
                        amount: netAmount ?? grossAmount,
                        platform: channel || 'PRESENCIAL',
                        paymentMethod: 'SISTECREDITO',
                        status: 'PENDING',
                        saleDate: sDate,
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

export async function getSales(queryParam?: string) {
    await requireAuth()
    try {
        const where: any = {}
        if (queryParam) {
            where.OR = [
                { invoiceNumber: { contains: queryParam, mode: 'insensitive' } },
                { client: { name: { contains: queryParam, mode: 'insensitive' } } },
                { items: { some: { productName: { contains: queryParam, mode: 'insensitive' } } } }
            ]
        }

        const sales = await prisma.sale.findMany({
            where,
            include: {
                client: true,
                depositAccount: true,
                items: true
            },
            orderBy: { date: 'desc' }
        })
        return { success: true, data: sales }
    } catch (error: any) { // eslint-disable-line
        console.error("Error fetching sales:", error)
        return { success: false, error: error.message || "Error load" }
    }
}

// Get single sale by ID with full details
export async function getSaleById(saleId: string) {
    await requireAuth()
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

export async function updateSale(saleId: string, updates: {
    platformFee: number
    shippingCost: number
    taxes: number
    channel: string
    paymentMethod: string
    depositAccountId: string
    editReason: string
}) {
    await requireAuth()

    try {
        await prisma.$transaction(async (tx: any) => {
            const sale = await tx.sale.findUnique({
                where: { id: saleId },
                include: { items: true }
            })

            if (!sale) throw new Error("Venta no encontrada")

            const oldGross = sale.grossAmount
            const oldPlat = sale.platformFee || 0
            const oldShip = sale.shippingCost || 0
            const oldTax = sale.taxes || 0
            const oldNet = sale.netAmount || (oldGross - oldPlat - oldShip - oldTax)
            const oldDepositAcc = sale.depositAccountId

            // Calculate original COGS
            const totalCogsForSale = sale.items.reduce((sum: number, item: any) => sum + ((item.unitCost || 0) * item.quantity), 0)

            // Calculate original AutoTaxes
            const oldGmf = oldGross * 0.004
            const oldOpProfit = oldGross - totalCogsForSale - oldPlat - oldShip
            const oldIca = oldOpProfit > 0 ? oldOpProfit * 0.01 : 0
            const oldAutoTaxes = oldGmf + oldIca

            // ------ 1. REVERSE OLD BALANCES ------
            if (oldDepositAcc) {
                await tx.financialAccount.update({
                    where: { id: oldDepositAcc },
                    data: { balance: { decrement: oldNet - oldAutoTaxes } }
                })
            }

            if (oldAutoTaxes > 0) {
                const taxAcc = await tx.financialAccount.findFirst({ where: { name: 'Impuestos Ahorrados' } })
                if (taxAcc) {
                    await tx.financialAccount.update({
                        where: { id: taxAcc.id },
                        data: { balance: { decrement: oldAutoTaxes } }
                    })
                }
            }

            // ------ 2. CALCULATE NEW VALUES ------
            const newNet = oldGross - updates.platformFee - updates.shippingCost - updates.taxes
            const newGmf = oldGross * 0.004
            const newOpProfit = oldGross - totalCogsForSale - updates.platformFee - updates.shippingCost
            const newIca = newOpProfit > 0 ? newOpProfit * 0.01 : 0
            const newAutoTaxes = newGmf + newIca

            // ------ 3. APPLY NEW BALANCES ------
            if (updates.depositAccountId) {
                await tx.financialAccount.update({
                    where: { id: updates.depositAccountId },
                    data: { balance: { increment: newNet - newAutoTaxes } }
                })
            }

            if (newAutoTaxes > 0) {
                let taxAcc = await tx.financialAccount.findFirst({ where: { name: 'Impuestos Ahorrados' } })
                if (!taxAcc) {
                    taxAcc = await tx.financialAccount.create({
                        data: {
                            name: 'Impuestos Ahorrados',
                            type: 'BANK',
                            balance: 0,
                            description: 'Cuenta automática para provisión de impuestos'
                        }
                    })
                }
                await tx.financialAccount.update({
                    where: { id: taxAcc.id },
                    data: { balance: { increment: newAutoTaxes } }
                })
            }

            // Update Deferred Payment if needed (just changing platform/method, amount)
            // It's complex to revert or change SISTECREDITO logic completely, but we can update amount
            const deferred = await tx.deferredPayment.findFirst({ where: { saleId: sale.id } })
            if (updates.channel === 'LUEGOPAGO' && updates.paymentMethod === 'SISTECREDITO' && !deferred) {
                // Was not Sistecredito before, now it is
                const expectedDate = new Date(sale.date)
                expectedDate.setDate(expectedDate.getDate() + 60)
                await tx.deferredPayment.create({
                    data: {
                        saleId: sale.id, amount: newNet, platform: 'LUEGOPAGO', paymentMethod: 'SISTECREDITO', status: 'PENDING',
                        saleDate: sale.date, expectedDate
                    }
                })
            } else if (deferred && (updates.channel !== 'LUEGOPAGO' || updates.paymentMethod !== 'SISTECREDITO')) {
                // Was Sistecredito, now it's not -> DELETE deferred payment
                await tx.deferredPayment.delete({ where: { id: deferred.id } })
            } else if (deferred && updates.channel === 'LUEGOPAGO' && updates.paymentMethod === 'SISTECREDITO') {
                // Still sistecredito, just update amount
                await tx.deferredPayment.update({ where: { id: deferred.id }, data: { amount: newNet } })
            }

            // ------ 4. UPDATE SALE RECORD ------
            await tx.sale.update({
                where: { id: saleId },
                data: {
                    platformFee: updates.platformFee,
                    shippingCost: updates.shippingCost,
                    taxes: updates.taxes,
                    netAmount: newNet,
                    channel: updates.channel,
                    paymentMethod: updates.paymentMethod,
                    depositAccountId: updates.depositAccountId,
                    isEdited: true,
                    editReason: updates.editReason
                }
            })
        })

        revalidatePath("/sales")
        revalidatePath("/accounts")
        revalidatePath("/reports")

        return { success: true }
    } catch (error: any) { // eslint-disable-line
        console.error("Update Sale Error:", error)
        return { success: false, error: error.message || "Error al modificar venta" }
    }
}
