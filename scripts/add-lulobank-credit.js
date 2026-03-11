const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
    const lulo = await prisma.financialAccount.findFirst({
        where: { name: { contains: "Lulo" } },
    })
    if (!lulo) { console.error("No se encontro Lulo Bank"); return }

    console.log(`Cuenta: ${lulo.name}`)
    console.log(`Balance actual: ${lulo.balance}`)
    console.log(`Abono: +2,523,887`)
    console.log(`Nuevo balance: ${lulo.balance + 2523887}`)

    await prisma.$transaction([
        prisma.financialAccount.update({
            where: { id: lulo.id },
            data: { balance: lulo.balance + 2523887 },
        }),
        prisma.transaction.create({
            data: {
                type: "ADJUSTMENT",
                description: "Ajuste de cuentas a la realidad actual",
                amount: 2523887,
                toAccountId: lulo.id,
                date: new Date(),
            },
        }),
    ])

    const updated = await prisma.financialAccount.findUnique({ where: { id: lulo.id } })
    console.log(`\nListo! Nuevo balance de ${updated.name}: ${updated.balance}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
