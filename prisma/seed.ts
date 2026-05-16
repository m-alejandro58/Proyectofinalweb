import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Seeding database...")

    // ---------------------------------------------------------
    // USUARIOS
    // ---------------------------------------------------------

    const adminPassword = await bcrypt.hash("admin123", 10)
    const userPassword = await bcrypt.hash("user123", 10)

    const admin = await prisma.user.upsert({
        where: { username: "admin" },
        update: {},
        create: {
            username: "admin",
            password: adminPassword,
            name: "Administrador",
            role: "ADMIN",
            isActive: true,
        }
    })

    await prisma.user.upsert({
        where: { username: "vendedor" },
        update: {},
        create: {
            username: "vendedor",
            password: userPassword,
            name: "Vendedor",
            role: "STANDARD",
            isActive: true,
            canSell: true,
            canManageInventory: false,
            canManageFinances: false,
            canManageContacts: true,
            canManageOrders: true,
            canManageClaims: false,
        }
    })

    console.log("✅ Usuarios creados")

    // ---------------------------------------------------------
    // CUENTAS FINANCIERAS
    // ---------------------------------------------------------

    const caja = await prisma.financialAccount.create({
        data: {
            name: "Caja Principal",
            type: "CASH",
            balance: 5000000,
            description: "Efectivo en caja del local",
        }
    })

    console.log("✅ Cuentas financieras creadas")

    // ---------------------------------------------------------
    // CONTACTOS
    // ---------------------------------------------------------

    const proveedor = await prisma.contact.create({
        data: {
            name: "Tech Distribuciones SAS",
            type: "PROVIDER",
            govId: "900123456-1",
            email: "ventas@techdist.com",
            phone: "3001234567",
            city: "Bogotá",
            department: "Cundinamarca",
        }
    })

    const cliente = await prisma.contact.create({
        data: {
            name: "Carlos Gómez",
            type: "CLIENT",
            govId: "1234567890",
            email: "carlos@gmail.com",
            phone: "3107654321",
            city: "Pereira",
            department: "Risaralda",
        }
    })

    console.log("✅ Contactos creados")

    // ---------------------------------------------------------
    // PRODUCTOS
    // ---------------------------------------------------------

    const mouse = await prisma.product.create({
        data: {
            name: "Mouse Logitech G305",
            sku: "LOG-G305",
            description: "Mouse inalámbrico gaming con sensor HERO",
            brand: "Logitech",
            category: "Periféricos",
            subcategory: "Mouse",
            stockTotal: 10,
            minStock: 3,
            weight: 0.1,
        }
    })

    await prisma.inventoryBatch.create({
        data: {
            productId: mouse.id,
            quantity: 10,
            initialQty: 10,
            unitCost: 85000,
            status: "AVAILABLE",
            arrivalDate: new Date(),
        }
    })

    const teclado = await prisma.product.create({
        data: {
            name: "Teclado Redragon K552",
            sku: "RED-K552",
            description: "Teclado mecánico compacto con switches azules",
            brand: "Redragon",
            category: "Periféricos",
            subcategory: "Teclado",
            stockTotal: 5,
            minStock: 2,
            weight: 0.6,
        }
    })

    await prisma.inventoryBatch.create({
        data: {
            productId: teclado.id,
            quantity: 5,
            initialQty: 5,
            unitCost: 120000,
            status: "AVAILABLE",
            arrivalDate: new Date(),
        }
    })

    const ram = await prisma.product.create({
        data: {
            name: "Memoria RAM Kingston 8GB DDR4",
            sku: "KIN-8GB-DDR4",
            description: "Módulo de memoria DDR4 2666MHz",
            brand: "Kingston",
            category: "Componentes",
            subcategory: "Memoria Ram DDR4",
            stockTotal: 8,
            minStock: 3,
            weight: 0.05,
        }
    })

    await prisma.inventoryBatch.create({
        data: {
            productId: ram.id,
            quantity: 8,
            initialQty: 8,
            unitCost: 95000,
            status: "AVAILABLE",
            arrivalDate: new Date(),
        }
    })

    console.log("✅ Productos e inventario creados")

    // ---------------------------------------------------------
    // COMPRA
    // ---------------------------------------------------------

    await prisma.purchase.create({
        data: {
            providerId: proveedor.id,
            paymentAccountId: caja.id,
            totalAmount: 1750000,
            notes: "Compra inicial de inventario",
            receiptNumber: "FAC-001",
        }
    })

    console.log("✅ Compra creada")

    // ---------------------------------------------------------
    // VENTA
    // ---------------------------------------------------------

    const venta = await prisma.sale.create({
        data: {
            clientId: cliente.id,
            depositAccountId: caja.id,
            channel: "Presencial",
            paymentMethod: "NORMAL",
            grossAmount: 200000,
            netAmount: 200000,
            invoiceNumber: "VTA-001",
            items: {
                create: [
                    {
                        productName: "Mouse Logitech G305",
                        quantity: 1,
                        unitPrice: 120000,
                        unitCost: 85000,
                    },
                    {
                        productName: "Teclado Redragon K552",
                        quantity: 1,
                        unitPrice: 80000,
                        unitCost: 120000,
                    }
                ]
            }
        }
    })

    console.log("✅ Venta creada")

    // ---------------------------------------------------------
    // AUDIT LOG INICIAL
    // ---------------------------------------------------------

    await prisma.auditLog.create({
        data: {
            action: "SEED_DATABASE",
            entity: "System",
            entityId: "seed",
            metadata: JSON.stringify({ seededAt: new Date() }),
        }
    })

    console.log("✅ Audit log inicial creado")
    console.log("🎉 Seed completado exitosamente")
    console.log("")
    console.log("👤 Usuarios creados:")
    console.log("   admin / admin123 (ADMIN)")
    console.log("   vendedor / user123 (STANDARD)")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })