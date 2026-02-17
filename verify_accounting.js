const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verifyAccountingFix() {
    console.log('🔍 Verificando Reparación Contable...\n')

    try {
        // 1. Check existing inventory batches
        console.log('📦 INVENTARIO Y LOTES DISPONIBLES:')
        const products = await prisma.product.findMany({
            where: { stockTotal: { gt: 0 } },
            include: {
                batches: {
                    where: { status: 'AVAILABLE', quantity: { gt: 0 } },
                    orderBy: { createdAt: 'asc' }
                }
            }
        })

        if (products.length === 0) {
            console.log('⚠️  No hay productos con stock disponible.')
            console.log('   Para probar la reparación, necesitas primero:')
            console.log('   1. Crear un proveedor')
            console.log('   2. Realizar una compra de productos')
            console.log('   3. Recibir el inventario\n')
        } else {
            products.forEach(product => {
                console.log(`\n   Producto: ${product.name}`)
                console.log(`   Stock Total: ${product.stockTotal}`)
                console.log(`   Lotes disponibles: ${product.batches.length}`)
                product.batches.forEach((batch, index) => {
                    console.log(`      Lote ${index + 1}: ${batch.quantity} unidades @ $${batch.unitCost.toLocaleString()} c/u`)
                })
            })
            console.log('')
        }

        // 2. Check recent sales
        console.log('\n💰 VENTAS RECIENTES:')
        const sales = await prisma.sale.findMany({
            include: {
                items: true,
                client: true
            },
            orderBy: { date: 'desc' },
            take: 5
        })

        if (sales.length === 0) {
            console.log('   No hay ventas registradas aún.\n')
        } else {
            sales.forEach(sale => {
                console.log(`\n   Venta ID: ${sale.id}`)
                console.log(`   Cliente: ${sale.client?.name || 'Cliente Casual'}`)
                console.log(`   Fecha: ${sale.date.toLocaleDateString()}`)
                console.log(`   Monto Bruto: $${sale.grossAmount.toLocaleString()}`)
                console.log(`   Items:`)

                let totalCOGS = 0
                sale.items.forEach(item => {
                    const itemCOGS = (item.unitCost || 0) * item.quantity
                    totalCOGS += itemCOGS

                    const status = item.unitCost ? '✅' : '❌'
                    console.log(`      - ${item.productName}`)
                    console.log(`        Cantidad: ${item.quantity}`)
                    console.log(`        Precio Unit: $${item.unitPrice.toLocaleString()}`)
                    console.log(`        Costo Unit: ${item.unitCost ? '$' + item.unitCost.toLocaleString() : 'NULL'} ${status}`)
                    console.log(`        COGS: $${itemCOGS.toLocaleString()}`)
                })

                const grossProfit = sale.grossAmount - totalCOGS
                const margin = sale.grossAmount > 0 ? (grossProfit / sale.grossAmount * 100).toFixed(2) : 0

                console.log(`\n   📊 ANÁLISIS:`)
                console.log(`      Total COGS: $${totalCOGS.toLocaleString()}`)
                console.log(`      Ganancia Bruta: $${grossProfit.toLocaleString()}`)
                console.log(`      Margen Bruto: ${margin}%`)
            })
        }

        // 3. Summary
        console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('📋 RESUMEN DE VERIFICACIÓN:')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

        const salesWithCost = await prisma.saleItem.count({
            where: { unitCost: { not: null } }
        })

        const salesWithoutCost = await prisma.saleItem.count({
            where: { unitCost: null }
        })

        console.log(`✅ Items con unitCost: ${salesWithCost}`)
        console.log(`❌ Items sin unitCost: ${salesWithoutCost}`)

        if (salesWithoutCost > 0) {
            console.log('\n⚠️  IMPORTANTE: Hay items sin costo unitario.')
            console.log('   Estos son de ventas ANTERIORES a la reparación.')
            console.log('   Las NUEVAS ventas deberían tener unitCost calculado.\n')
        }

        console.log('\n✨ PRÓXIMOS PASOS PARA PROBAR:')
        console.log('   1. Abre http://localhost:3000 en tu navegador')
        console.log('   2. Crea una nueva venta con algún producto del inventario')
        console.log('   3. Vuelve a ejecutar este script: node verify_accounting.js')
        console.log('   4. Verifica que la nueva venta tenga unitCost ✅\n')

    } catch (error) {
        console.error('❌ Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

verifyAccountingFix()
