// Script de reversa: devuelve al inventario el item de RAM DDR4 8GB
// que fue marcado incorrectamente como vendido desde la pestaña Mercado Full.
// Ejecutar con: node scripts/reverse-full-ram.js

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log("🔍 Buscando items SOLD_OUT con 'DDR4' o 'RAM' en FullInventory...")

    // Buscar items SOLD_OUT que contengan DDR4 o RAM en el nombre
    const candidates = await prisma.fullInventory.findMany({
        where: {
            status: "SOLD_OUT",
        },
        include: { product: true },
        orderBy: { updatedAt: "desc" }
    })

    // Filter client-side for DDR4/RAM (SQLite case-insensitive LIKE workaround)
    const ramCandidates = candidates.filter(i =>
        i.productName.toLowerCase().includes('ddr4') ||
        i.productName.toLowerCase().includes('ram') ||
        i.productName.toLowerCase().includes('memoria')
    )

    if (ramCandidates.length === 0) {
        console.log("\n❌ No se encontraron items SOLD_OUT con DDR4/RAM en el nombre.")
        console.log("📋 Mostrando todos los SOLD_OUT más recientes:")
        candidates.slice(0, 10).forEach(i => {
            console.log(`  - [${i.id}]`)
            console.log(`    Nombre: ${i.productName}`)
            console.log(`    Enviados: ${i.quantitySent} | En stock: ${i.quantityInStock} | Vendidos: ${i.quantitySold}`)
            console.log(`    Actualizado: ${i.updatedAt.toISOString()}\n`)
        })
        await prisma.$disconnect()
        return
    }

    console.log(`\n✅ Candidatos encontrados: ${ramCandidates.length}\n`)
    ramCandidates.forEach((item, idx) => {
        console.log(`  ${idx + 1}. [${item.id}]`)
        console.log(`     Nombre: ${item.productName}`)
        console.log(`     Enviados: ${item.quantitySent} | En stock: ${item.quantityInStock} | Vendidos: ${item.quantitySold}`)
        console.log(`     Producto stockFull: ${item.product.stockFull} | stockTotal: ${item.product.stockTotal}`)
        console.log(`     Actualizado: ${item.updatedAt.toISOString()}\n`)
    })

    // Tomar el más reciente
    const target = ramCandidates[0]
    const qtyToRestore = target.quantitySold

    if (qtyToRestore <= 0) {
        console.log("⚠️  quantitySold es 0, no hay nada que revertir.")
        await prisma.$disconnect()
        return
    }

    console.log(`\n🔄 Revirtiendo: "${target.productName}"`)
    console.log(`   Cantidad a restaurar: ${qtyToRestore}`)
    console.log(`   Status: SOLD_OUT → IN_WAREHOUSE`)

    await prisma.$transaction(async (tx) => {
        // 1. Restaurar FullInventory
        await tx.fullInventory.update({
            where: { id: target.id },
            data: {
                quantityInStock: { increment: qtyToRestore },
                quantitySold: { decrement: qtyToRestore },
                status: "IN_WAREHOUSE"
            }
        })

        // 2. Restaurar stockFull y stockTotal del producto
        await tx.product.update({
            where: { id: target.productId },
            data: {
                stockFull: { increment: qtyToRestore },
                stockTotal: { increment: qtyToRestore }
            }
        })
    })

    // Verificar resultado
    const restored = await prisma.fullInventory.findUnique({
        where: { id: target.id },
        include: { product: true }
    })

    console.log("\n✅ Reversa completada exitosamente:")
    console.log(`   FullInventory quantityInStock: ${restored.quantityInStock}`)
    console.log(`   FullInventory quantitySold: ${restored.quantitySold}`)
    console.log(`   FullInventory status: ${restored.status}`)
    console.log(`   Producto stockFull: ${restored.product.stockFull}`)
    console.log(`   Producto stockTotal: ${restored.product.stockTotal}`)
}

main()
    .catch(e => {
        console.error("❌ Error:", e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
