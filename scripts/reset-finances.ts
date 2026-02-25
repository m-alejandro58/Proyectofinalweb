import { prisma } from "../src/lib/db"

async function main() {
    console.log("⚠️ STARTING FINANCIAL DATA RESET ⚠️")

    // 1. Delete dependent transactional data (Children first)
    console.log("Deleting Provider Claims...")
    await prisma.providerClaim.deleteMany()

    console.log("Deleting Returns & Return Items...")
    await prisma.returnItem.deleteMany()
    await prisma.return.deleteMany()

    console.log("Deleting Customer Orders & Payments...")
    await prisma.orderPayment.deleteMany()
    await prisma.customerOrder.deleteMany()

    console.log("Deleting Sales & Deferred Payments...")
    await prisma.saleItem.deleteMany()
    await prisma.deferredPayment.deleteMany()
    await prisma.sale.deleteMany()

    console.log("Deleting MercadoLibre FULL Inventory...")
    await prisma.fullInventory.deleteMany()
    await prisma.fullShipment.deleteMany()

    console.log("Deleting Purchases & Inventory Batches...")
    await prisma.inventoryBatch.deleteMany()
    await prisma.purchase.deleteMany()

    console.log("Deleting General Financials...")
    await prisma.expense.deleteMany()
    await prisma.transaction.deleteMany()

    // 2. Delete Core Metadata (Parents)
    console.log("Deleting Products & Catalog...")
    await prisma.product.deleteMany()

    console.log("Deleting Contacts (Clients/Providers)...")
    await prisma.contact.deleteMany()

    console.log("Deleting Financial Accounts...")
    await prisma.financialAccount.deleteMany()

    console.log("✅ FULL SYSTEM WIPE COMPLETE (Users kept intact)")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => await prisma.$disconnect())
