import { prisma } from "../src/lib/db"

async function main() {
    console.log("Checking Sales...")
    const sales = await prisma.sale.findMany({
        include: { items: true }
    })

    console.log(`Found ${sales.length} sales.`)

    sales.forEach(s => {
        console.log(`ID: ${s.id.slice(0, 8)} | Date: ${s.date.toISOString()} | Amount: ${s.grossAmount} | Channel: ${s.channel}`)
    })
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
