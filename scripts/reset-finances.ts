import { prisma } from "../src/lib/db"

async function main() {
    console.log("⚠️ STARTING FINANCIAL DATA RESET ⚠️")

    // 1. Delete dependent transactional data
    console.log("Deleting Sale Items...")
    await prisma.saleItem.deleteMany()

    console.log("Deleting Sales...")
    await prisma.sale.deleteMany()

    console.log("Deleting Inventory Batches (Purchased Items)...")
    await prisma.inventoryBatch.deleteMany()

    console.log("Deleting Purchases...")
    await prisma.purchase.deleteMany()

    console.log("Deleting Expenses...")
    await prisma.expense.deleteMany()

    console.log("Deleting Transactions...")
    await prisma.transaction.deleteMany()

    // 2. Reset Financial Accounts
    console.log("Resetting Financial Account Balances...")
    await prisma.financialAccount.updateMany({
        data: { balance: 0 }
    })

    // Optional: Reset Inventory Batches to 0 or delete?
    // User asked for "Financial Part", usually inventory stock is part of it but maybe they want to keep products.
    // If we delete purchases, the batches created by purchases might remain if not cascaded, 
    // but looking at logic, batches are usually tied to purchases or created manually.
    // Let's reset inventory quantities to 0 to be safe/consistent?
    // Or better, leave inventory alone unless requested? "Financial part" implies money. 
    // But Sales reduce inventory. If I reset sales, inventory doesn't magically come back.
    // Actually, if they want to start "from zero", they probably want inventory 0 too?
    // Let's stick to MONETARY transactions first.

    console.log("✅ FINANCIAS RESET COMPLETE")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => await prisma.$disconnect())
