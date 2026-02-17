"use server"

import { prisma } from "@/lib/db"
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns"

export async function getDashboardMetrics(dateRange?: { from: Date, to: Date }) {
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
