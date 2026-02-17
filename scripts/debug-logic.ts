import { prisma } from "../src/lib/db"
import { startOfMonth, endOfMonth } from "date-fns"

async function main() {
    console.log("Simulating getDashboardMetrics...")
    const now = new Date()
    const start = startOfMonth(now)
    const end = endOfMonth(now)
    console.log("Period:", start, "to", end)

    const sales = await prisma.sale.findMany({
        where: {
            date: {
                gte: start,
                lte: end
            }
        },
        include: {
            items: true,
            depositAccount: true
        }
    })

    console.log(`Found ${sales.length} sales in period.`)

    const totalSales = sales.reduce((sum, sale) => sum + sale.grossAmount, 0)
    console.log("Total Sales:", totalSales)

    const totalShipping = sales.reduce((sum, sale) => {
        console.log(`Sale ${sale.id} Shipping:`, sale.shippingCost)
        return sum + (sale.shippingCost || 0)
    }, 0)

    const totalPlatformFees = sales.reduce((sum, sale) => {
        console.log(`Sale ${sale.id} Fee:`, sale.platformFee)
        return sum + (sale.platformFee || 0)
    }, 0)

    const totalTaxes = sales.reduce((sum, sale) => sum + (sale.taxes || 0), 0)

    const grossProfit = totalSales // Simplify for now (minus COGS)
    console.log("Gross:", grossProfit)

    const expenses = await prisma.expense.findMany({
        where: { date: { gte: start, lte: end } }
    })
    console.log(`Found ${expenses.length} expenses.`)
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

    const operatingProfit = grossProfit - totalPlatformFees - totalShipping - totalTaxes
    console.log("Operating:", operatingProfit)

    const netProfit = operatingProfit
    const finalBalance = netProfit - totalExpenses
    console.log("Final Balance:", finalBalance)

}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
