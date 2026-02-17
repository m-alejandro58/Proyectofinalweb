const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const count = await prisma.user.count()
        console.log(`Users found: ${count}`)
        if (count === 0) {
            await prisma.user.create({
                data: {
                    username: "admin",
                    password: "123",
                    name: "Admin"
                }
            })
            console.log("Admin created")
        }
    } catch (e) {
        console.error("Error connecting to DB:", e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
