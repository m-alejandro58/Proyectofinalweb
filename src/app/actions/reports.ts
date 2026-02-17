"use server"

import { prisma } from "@/lib/db"
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format } from "date-fns"

export type ReportFilters = {
    from?: Date
    to?: Date
    platform?: string
    paymentMethod?: string
}

export type TransactionRow = {
    id: string
    date: Date
    invoiceNumber: string | null
    clientName: string
    channel: string
    paymentMethod: string

    grossAmount: number
    cogs: number
    commission: number // Platform Fee
    shipping: number
    taxes: number      // Retenciones defined in Sale

    // Calculated
    gmf: number
    ica: number
    netProfit: number
    margin: number
}

export type ReportData = {
    summary: {
        totalSales: number
        totalCommissions: number
        totalShipping: number
        totalUnitsSold: number
        totalProfit: number
        newClients: number
        totalPurchases: number
    }
    charts: {
        salesOverTime: { date: string; sales: number; profit: number }[]
        salesByPlatform: { name: string; value: number }[]
        salesByPaymentMethod: { name: string; value: number }[]
    }
    transactions: TransactionRow[]
}

export async function getReportData(filters?: ReportFilters): Promise<{ success: boolean; data?: ReportData; error?: string }> {
    try {
        const now = new Date()
        const start = filters?.from ? startOfDay(filters.from) : startOfMonth(now)
        const end = filters?.to ? endOfDay(filters.to) : endOfDay(now)

        // Build Where Clauses
        const saleWhere: any = {
            date: {
                gte: start,
                lte: end
            }
        }

        if (filters?.platform && filters.platform !== 'all') {
            saleWhere.channel = filters.platform
        }

        if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
            saleWhere.depositAccount = {
                type: filters.paymentMethod
            }
        }

        // --- FETCH DATA ---
        const sales = await prisma.sale.findMany({
            where: saleWhere,
            include: {
                items: true,
                depositAccount: true,
                client: true
            },
            orderBy: { date: 'desc' }
        })

        const newClientsCount = await prisma.contact.count({
            where: {
                type: 'CLIENT',
                createdAt: { gte: start, lte: end }
            }
        })

        const purchaseWhere: any = { date: { gte: start, lte: end } }
        const purchasesCount = await prisma.purchase.count({ where: purchaseWhere })
        const expenses = await prisma.expense.findMany({ where: { date: { gte: start, lte: end } } })

        // --- AGGREGATE SUMMARY & BUILD TRANSACTIONS ---

        let totalSales = 0
        let totalCommissions = 0
        let totalShipping = 0
        let totalUnitsSold = 0
        let totalGrossProfit = 0 // Sales - COGS
        let totalRetenciones = 0

        const transactions: TransactionRow[] = []
        const salesByDate: Record<string, { sales: number, profit: number }> = {}
        const platformMap: Record<string, number> = {}
        const payMap: Record<string, number> = {}

        sales.forEach(sale => {
            // 1. Basic Sums
            totalSales += sale.grossAmount
            totalCommissions += (sale.platformFee || 0)
            totalShipping += (sale.shippingCost || 0)
            totalRetenciones += (sale.taxes || 0)

            let saleCOGS = 0
            sale.items.forEach(item => {
                totalUnitsSold += item.quantity
                saleCOGS += (item.unitCost || 0) * item.quantity
            })
            totalGrossProfit += (sale.grossAmount - saleCOGS)

            // 2. Per-Transaction Calculations
            const gmf = sale.grossAmount * 0.004
            const operating = (sale.grossAmount - saleCOGS - (sale.platformFee || 0) - (sale.shippingCost || 0))
            const ica = operating * 0.01 // Applied to operating profit per established logic

            const net = operating - (sale.taxes || 0) - gmf - ica

            transactions.push({
                id: sale.id,
                date: sale.date,
                invoiceNumber: sale.invoiceNumber,
                clientName: sale.client?.name || 'Cliente Casual',
                channel: sale.channel || 'Otros',
                paymentMethod: sale.depositAccount?.type || 'N/A',
                grossAmount: sale.grossAmount,
                cogs: saleCOGS,
                commission: sale.platformFee || 0,
                shipping: sale.shippingCost || 0,
                taxes: sale.taxes || 0, // Retenciones
                gmf,
                ica,
                netProfit: net,
                margin: sale.grossAmount > 0 ? (net / sale.grossAmount) * 100 : 0
            })

            // 3. Charts Data
            const dateKey = format(sale.date, 'yyyy-MM-dd')
            if (!salesByDate[dateKey]) salesByDate[dateKey] = { sales: 0, profit: 0 }
            salesByDate[dateKey].sales += sale.grossAmount
            salesByDate[dateKey].profit += net

            const ch = sale.channel || 'Otros'
            platformMap[ch] = (platformMap[ch] || 0) + sale.grossAmount

            const pm = sale.depositAccount?.type || 'Desconocido'
            payMap[pm] = (payMap[pm] || 0) + sale.grossAmount
        })

        // Global Expenses (for Summary Net Profit only, not applied to rows to avoid confusion)
        const totalGlobalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
        // If filtered, we usually don't deduct global expenses, but for Summary "Profit" we need to be careful.
        // Dashboard logic: Net = Operating - Taxes. 
        // Here we summed net from rows. Rows don't have Global Expenses.
        // So Summary Net Profit = Sum(Row Nets) - Global Expenses (if not filtered?)

        // To match the table sum exactly, we should probably NOT deduct global expenses from the "Total Profit" 
        // displayed IN THE TABLE context, but arguably the Scorecard should be "Real Net".
        // Let's deduct global expenses from the Summary Scorecard, but keep Table as "Contribution".
        const isFiltered = !!(filters?.platform && filters.platform !== 'all');
        const appliedGlobalExpenses = isFiltered ? 0 : totalGlobalExpenses;

        const summaryNetProfit = transactions.reduce((sum, t) => sum + t.netProfit, 0) - appliedGlobalExpenses


        // --- FORMAT CHARTS ---
        const salesOverTime = Object.entries(salesByDate).map(([date, val]) => ({
            date,
            sales: val.sales,
            profit: val.profit // This is Sum of Row Nets (Contribution)
        })).sort((a, b) => a.date.localeCompare(b.date))

        const salesByPlatform = Object.entries(platformMap).map(([name, value]) => ({ name, value }))
        const salesByPaymentMethod = Object.entries(payMap).map(([name, value]) => ({ name, value }))

        return {
            success: true,
            data: {
                summary: {
                    totalSales,
                    totalCommissions,
                    totalShipping,
                    totalUnitsSold,
                    totalProfit: summaryNetProfit,
                    newClients: newClientsCount,
                    totalPurchases: purchasesCount
                },
                charts: {
                    salesOverTime,
                    salesByPlatform,
                    salesByPaymentMethod
                },
                transactions
            }
        }

    } catch (error) {
        console.error("Report Error:", error)
        return { success: false, error: "Error generando reporte" }
    }
}
