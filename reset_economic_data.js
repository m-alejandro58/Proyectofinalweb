/**
 * Script para resetear datos económicos de la empresa
 * 
 * ELIMINA:
 * - Todas las ventas y sus items
 * - Todas las compras
 * - Todas las devoluciones
 * - Todo el inventario (batches)
 * - Todos los productos
 * - Todos los gastos de la empresa
 * - Resetea balances de cuentas financieras a 0
 * 
 * MANTIENE:
 * - Contactos (clientes y proveedores)
 * - Cuentas financieras (pero con balance 0)
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function resetEconomicData() {
    console.log("🔄 Iniciando reset COMPLETO de datos económicos...")

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Eliminar devoluciones (tienen FK a ventas)
            console.log("🗑️  Eliminando devoluciones...")
            const deletedReturnItems = await tx.returnItem.deleteMany()
            const deletedReturns = await tx.return.deleteMany()
            console.log(`   ✓ ${deletedReturns.count} devoluciones eliminadas`)

            // 2. Eliminar ventas
            console.log("🗑️  Eliminando ventas...")
            const deletedSaleItems = await tx.saleItem.deleteMany()
            const deletedSales = await tx.sale.deleteMany()
            console.log(`   ✓ ${deletedSales.count} ventas eliminadas`)

            // 3. Eliminar batches de inventario
            console.log("🗑️  Eliminando inventario...")
            const deletedBatches = await tx.inventoryBatch.deleteMany()
            console.log(`   ✓ ${deletedBatches.count} lotes de inventario eliminados`)

            // 4. Eliminar compras
            console.log("🗑️  Eliminando compras...")
            const deletedPurchases = await tx.purchase.deleteMany()
            console.log(`   ✓ ${deletedPurchases.count} compras eliminadas`)

            // 5. Eliminar productos
            console.log("🗑️  Eliminando productos...")
            const deletedProducts = await tx.product.deleteMany()
            console.log(`   ✓ ${deletedProducts.count} productos eliminados`)

            // 6. Eliminar gastos de la empresa
            console.log("🗑️  Eliminando gastos...")
            const deletedExpenses = await tx.expense.deleteMany()
            console.log(`   ✓ ${deletedExpenses.count} gastos eliminados`)

            // 7. Resetear balances de cuentas financieras a 0
            console.log("💰 Reseteando balances de cuentas...")
            const updatedAccounts = await tx.financialAccount.updateMany({
                data: {
                    balance: 0
                }
            })
            console.log(`   ✓ ${updatedAccounts.count} cuentas reseteadas`)
        })

        console.log("\n✅ Reset COMPLETO exitoso!")
        console.log("\n📊 Estado actual:")
        console.log("   - Ventas: 0")
        console.log("   - Compras: 0")
        console.log("   - Devoluciones: 0")
        console.log("   - Inventario: 0")
        console.log("   - Productos: 0")
        console.log("   - Gastos: 0")
        console.log("   - Balance cuentas: $0")

        const contactsCount = await prisma.contact.count()
        const accountsCount = await prisma.financialAccount.count()

        console.log("\n🔒 Datos preservados:")
        console.log(`   - ${contactsCount} contactos`)
        console.log(`   - ${accountsCount} cuentas financieras`)

    } catch (error) {
        console.error("\n❌ Error durante el reset:", error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Ejecutar con confirmación
const args = process.argv.slice(2)
if (args.includes('--confirm')) {
    resetEconomicData()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error)
            process.exit(1)
        })
} else {
    console.log("⚠️  ADVERTENCIA: Este script eliminará TODOS los datos económicos y productos")
    console.log("📋 Se eliminarán: ventas, compras, devoluciones, inventario, productos y gastos")
    console.log("✅ Se mantendrán: contactos y cuentas financieras (con balance 0)")
    console.log("\nPara ejecutar, usa: node reset_economic_data.js --confirm")
}
