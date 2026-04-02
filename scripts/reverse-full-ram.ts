/**
 * Script de reversa: Devuelve al inventario el item de RAM DDR4 8GB
 * que fue marcado incorrectamente como vendido desde la pestaña Mercado Full.
 *
 * Ejecutar con: npx tsx scripts/reverse-full-ram.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("🔍 Buscando items SOLD_OUT de RAM DDR4 en FullInventory...")

    // Find all SOLD_OUT items matching RAM DDR4 8GB
    const candidates = await prisma.fullInventory.findMany({
        where: {
            status: "SOLD_OUT",
            productName: { contains: "DDR4", mode: "insensitive" }
        },
        include: { product: true },
        orderBy: { updatedAt: "desc" }
    })

    if (candidates.length === 0) {
        // Try broader search
        const allSoldOut = await prisma.fullInventory.findMany({
            where: { status: "SOLD_OUT" },
            include: { product: true },
            orderBy: { updatedAt: "desc" },
            take: 10
        })
        console.log("\n❌ No se encontraron items SOLD_OUT con 'DDR4' en el nombre.")
        console.log("📋 Últimos 10 items SOLD_OUT en FullInventory:")
        allSoldOut.forEach(i => {
            console.log(`  - [${i.id}] ${i.productName} | Vendido: ${i.quantitySold} | Actualizado: ${i.updatedAt.toISOString()}`)
        })
        console.log("\nEjecuta el script otra vez después de identificar el ID correcto.")
        return
    }

    console.log(`\n✅ Encontrados ${candidates.length} candidato(s):\n`)
    candidates.forEach((item, i) => {
        console.log(`  ${i + 1}. [${item.id}]`)
        console.log(`     Producto: ${item.productName}`)
        console.log(`     Enviados: ${item.quantitySent} | En stock: ${item.quantityInStock} | Vendidos: ${item.quantitySold}`)
        console.log(`     Producto stockFull actual: ${item.product.stockFull} | stockTotal: ${item.product.stockTotal}`)
        console.log(`     Actualizado: ${item.updatedAt.toISOString()}\n`)
    })

    // Take the most recently updated one (last action)
    const target = candidates[0]
    const qtyToRestore = target.quantitySold  // Restore ALL that was sold via recordFullSale

    if (qtyToRestore <= 0) {
        console.log("⚠️  quantitySold es 0, no hay nada que revertir.")
        return
    }

    console.log(`\n🔄 Revirtiendo item: ${target.productName}`)
    console.log(`   Cantidad a restaurar: ${qtyToRestore}`)
    console.log(`   Status: SOLD_OUT → IN_WAREHOUSE`)

    await prisma.$transaction(async (tx: any) => {
        // 1. Restore FullInventory record
        await tx.fullInventory.update({
            where: { id: target.id },
            data: {
                quantityInStock: { increment: qtyToRestore },
                quantitySold: { decrement: qtyToRestore },
                status: "IN_WAREHOUSE"
            }
        })

        // 2. Restore product stockFull and stockTotal
        await tx.product.update({
            where: { id: target.productId },
            data: {
                stockFull: { increment: qtyToRestore },
                stockTotal: { increment: qtyToRestore }
            }
        })
    })

    // Verify final state
    const restored = await prisma.fullInventory.findUnique({
        where: { id: target.id },
        include: { product: true }
    })

    console.log("\n✅ Reversa completada:")
    console.log(`   FullInventory quantityInStock: ${restored!.quantityInStock}`)
    console.log(`   FullInventory quantitySold: ${restored!.quantitySold}`)
    console.log(`   FullInventory status: ${restored!.status}`)
    console.log(`   Producto stockFull: ${restored!.product.stockFull}`)
    console.log(`   Producto stockTotal: ${restored!.product.stockTotal}`)
}

main()
    .catch(e => {
        console.error("❌ Error:", e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
