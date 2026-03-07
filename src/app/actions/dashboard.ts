"use server"

import { prisma } from "@/lib/db"
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns"
import { requireAuth } from "@/lib/auth-guard"

export async function getDashboardMetrics(dateRange?: { from: Date, to: Date }) {
    await requireAuth()
    try {
        const now = new Date()
        const start = dateRange?.from || startOfMonth(now)
        const end = dateRange?.to || endOfMonth(now)

        // 1. SALES METRICS
        const sales = await prisma.sale.findMany({
            where: {
                date: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                items: true
            }
        })

        const totalSales = sales.reduce((sum, sale) => sum + sale.grossAmount, 0)
        const totalItemsSold = sales.reduce((sum, sale) => sum + sale.items.reduce((acc, item) => acc + item.quantity, 0), 0)

        // Costs & Profits
        const totalCOGS = sales.reduce((sum, sale) => sum + (sale.items.reduce((acc, item) => acc + ((item.unitCost || 0) * item.quantity), 0)), 0)
        const totalShipping = sales.reduce((sum, sale) => sum + (sale.shippingCost || 0), 0)
        const totalPlatformFees = sales.reduce((sum, sale) => sum + (sale.platformFee || 0), 0)
        const totalTaxes = sales.reduce((sum, sale) => sum + (sale.taxes || 0), 0) // Retenciones

        // 1. Gross Profit (Ganancia Bruta)
        // Formula: Sales - COGS
        // Note: User must ensure 'unitCost' in Inventory Batches includes (Purchase Price + Import Tax + Inbound Freight).
        // FIX: If COGS is 0 (missing data), assume 60% of Sales as 'Costo Amazon + Importación' for testing.
        const grossProfit = totalSales - totalCOGS

        // 2. Operating Profit (Utilidad Operativa / EBIT)
        // Formula: Gross - Operating Expenses - Platform Fees - Outbound Shipping

        // Expenses from DB (Marketing, Admin, etc)
        const expenses = await prisma.expense.findMany({
            where: { date: { gte: start, lte: end } }
        })

        const expensesByCategory: Record<string, number> = {}
        expenses.forEach(exp => {
            expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount
        })
        const totalOperatingExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

        const operatingProfit = grossProfit - totalPlatformFees - totalShipping - totalOperatingExpenses

        // 3. Net Profit (Utilidad Neta)
        // Formula specified by user: Operating - (Operating * 1% ICA) - (Sales * 4x1000 GMF)

        // A. ICA Santa Rosa (1% of Operating Profit as per user instruction, usually on Sales but following instruction)
        // Instruction: "(Ganancia_Operativa * 0.01)"
        const taxICA = operatingProfit * 0.01

        // B. GMF (4x1000): 0.4% on Sales (as per instruction "(Ventas * 0.004)")
        const taxGMF = totalSales * 0.004

        // C. Renta removed.
        const taxRenta = 0

        const totalTaxProvisions = taxICA + taxGMF + taxRenta + totalTaxes

        const netProfit = operatingProfit - totalTaxProvisions

        const finalBalance = netProfit

        // Channels
        const salesByChannel: Record<string, number> = {}
        sales.forEach(sale => {
            const channel = sale.channel || 'Otros'
            salesByChannel[channel] = (salesByChannel[channel] || 0) + sale.grossAmount
        })

        // 2. INVENTORY METRICS
        const products = await prisma.product.findMany({
            include: { batches: true }
        })

        // Value of Inventory = Sum(Batch Qty * Batch Unit Cost)
        // If unitCost is not in product, we rely on batch. 
        // Note: We should use Available batches only? Or all? Usually Available + Transit if owned.
        // Let's assume Available for "Liquidable" inventory.
        let inventoryValue = 0
        products.forEach(p => {
            p.batches.forEach(b => {
                if (b.status === 'AVAILABLE') {
                    inventoryValue += (b.quantity * b.unitCost)
                }
            })
        })

        // 3. FINANCIAL ACCOUNTS (Liquidity & Debt)
        const accounts = await prisma.financialAccount.findMany()

        let liquidity = 0 // Cash + Bank
        let totalDebt = 0 // Credit + Loans
        let receivables = 0 // Sistecredito / Pending

        accounts.forEach(acc => {
            if (['CASH', 'BANK', 'WALLET'].includes(acc.type)) {
                liquidity += acc.balance
            } else if (['CREDIT', 'LOAN'].includes(acc.type)) {
                // If balance is positive, it might mean we overpaid or it's just tracking usage. 
                // Usually Credit Card balance is Debt. 
                // Let's assume positive balance = Debt for Credit Cards based on previous logic?
                // Wait, previous logic: "Credit 'balance' ... Purchase INCREASES debt (Positive)".
                totalDebt += acc.balance
            } else if (acc.type === 'RECEIVABLE') {
                receivables += acc.balance
            }
        })


        return {
            success: true,
            data: {
                period: { start, end },
                sales: {
                    total: totalSales,
                    count: sales.length,
                    itemsSold: totalItemsSold,
                    byChannel: salesByChannel
                },
                costs: {
                    cogs: totalCOGS,
                    shipping: totalShipping,
                    platformFees: totalPlatformFees,
                    taxes: totalTaxes, // Retenciones
                    taxProvisions: {
                        ica: taxICA,
                        gmf: taxGMF,
                        renta: taxRenta
                    },
                    operatingExpenses: totalOperatingExpenses,
                    expensesByCategory
                },
                profitability: {
                    gross: grossProfit,
                    operating: operatingProfit,
                    net: netProfit,
                    finalBalance: finalBalance,
                    margins: {
                        gross: totalSales > 0 ? (grossProfit / totalSales) * 100 : 0,
                        operating: totalSales > 0 ? (operatingProfit / totalSales) * 100 : 0,
                        net: totalSales > 0 ? (netProfit / totalSales) * 100 : 0,
                        final: totalSales > 0 ? (finalBalance / totalSales) * 100 : 0
                    }
                },
                inventory: {
                    totalValue: inventoryValue,
                    productCount: products.length
                },
                financials: {
                    liquidity,
                    debt: totalDebt,
                    receivables
                }
            }
        }

    } catch (error) {
        console.error("Dashboard Error:", error)
        return { success: false, error: error instanceof Error ? error.message : "Error desconocido" }
    }
}

export async function getOperationsMetrics() {
    await requireAuth()
    try {
        const products: any[] = await prisma.product.findMany()

        const total = products.length

        // Publication counts
        const publication = {
            mercadolibre: { published: 0, missing: 0, label: "MercadoLibre", field: "isPublishedML" },
            luegopago: { published: 0, missing: 0, label: "LuegoPago", field: "isPublishedLP" },
            rappi: { published: 0, missing: 0, label: "Rappi", field: "isPublishedRappi" },
            web: { published: 0, missing: 0, label: "Página Web", field: "isPublishedWeb" },
            facebook: { published: 0, missing: 0, label: "Facebook", field: "isPublishedFB" },
        }

        for (const p of products) {
            if (p.isPublishedML) publication.mercadolibre.published++; else publication.mercadolibre.missing++
            if (p.isPublishedLP) publication.luegopago.published++; else publication.luegopago.missing++
            if (p.isPublishedRappi) publication.rappi.published++; else publication.rappi.missing++
            if (p.isPublishedWeb) publication.web.published++; else publication.web.missing++
            if (p.isPublishedFB) publication.facebook.published++; else publication.facebook.missing++
        }

        // Low stock products (stockTotal <= 5), ordered ascending — all items
        const lowStock = products
            .filter((p) => p.stockTotal <= 5)
            .sort((a, b) => a.stockTotal - b.stockTotal)
            .map((p) => ({
                id: p.id,
                name: p.name,
                sku: p.sku,
                stockTotal: p.stockTotal,
            }))

        return {
            success: true,
            data: { total, publication, lowStock },
        }
    } catch (error) {
        console.error("Operations Metrics Error:", error)
        return { success: false, error: error instanceof Error ? error.message : "Error desconocido" }
    }
}

// ── Product Performance Metrics ──────────────────────────
export async function getProductPerformanceMetrics(
    timeRange: "all" | "currentMonth" | "lastMonth"
) {
    await requireAuth()
    try {
        // Build date filter
        const now = new Date()
        let dateFilter: any = undefined

        if (timeRange === "currentMonth") {
            const start = new Date(now.getFullYear(), now.getMonth(), 1)
            dateFilter = { gte: start }
        } else if (timeRange === "lastMonth") {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const end = new Date(now.getFullYear(), now.getMonth(), 1)
            dateFilter = { gte: start, lt: end }
        }

        // Get sales with items
        const sales = await prisma.sale.findMany({
            where: dateFilter ? { date: dateFilter } : undefined,
            include: { items: true },
        })

        // Aggregate by product name
        const productMap = new Map<string, {
            name: string
            totalQty: number
            totalRevenue: number
            totalCost: number
            totalProfit: number
        }>()

        for (const sale of sales) {
            for (const item of sale.items) {
                const key = item.productName
                const existing = productMap.get(key) || {
                    name: key,
                    totalQty: 0,
                    totalRevenue: 0,
                    totalCost: 0,
                    totalProfit: 0,
                }
                const revenue = item.quantity * item.unitPrice
                const cost = item.quantity * (item.unitCost || 0)
                existing.totalQty += item.quantity
                existing.totalRevenue += revenue
                existing.totalCost += cost
                existing.totalProfit += revenue - cost
                productMap.set(key, existing)
            }
        }

        const allProducts = Array.from(productMap.values())

        // Top 5 best sellers (by quantity)
        const topSellers = [...allProducts]
            .sort((a, b) => b.totalQty - a.totalQty)
            .slice(0, 5)
            .map((p) => ({
                name: p.name,
                totalQty: p.totalQty,
                totalRevenue: p.totalRevenue,
            }))

        // Top 5 most profitable (by net profit)
        const topROI = [...allProducts]
            .sort((a, b) => b.totalProfit - a.totalProfit)
            .slice(0, 5)
            .map((p) => ({
                name: p.name,
                totalProfit: p.totalProfit,
                marginPercent: p.totalRevenue > 0
                    ? Math.round((p.totalProfit / p.totalRevenue) * 100)
                    : 0,
            }))

        return { success: true, data: { topSellers, topROI } }
    } catch (error) {
        console.error("Product Performance Error:", error)
        return { success: false, error: error instanceof Error ? error.message : "Error desconocido" }
    }
}
