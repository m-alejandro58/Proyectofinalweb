import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const amount = 3319266;
    const luloId = '03053cb4-2966-43b6-946a-fbb0b3d0f16a';
    const sisteId = 'b6075f9e-0a2d-415a-b78f-1ed01363db25';

    await prisma.$transaction([
        prisma.financialAccount.update({
            where: { id: luloId },
            data: { balance: { increment: amount } }
        }),
        prisma.financialAccount.update({
            where: { id: sisteId },
            data: { balance: { decrement: amount } }
        }),
        prisma.transaction.create({
            data: {
                type: 'TRANSFER',
                description: 'transferencia de sistecredito de luego te pago',
                amount: amount,
                fromAccountId: sisteId,
                toAccountId: luloId
            }
        })
    ]);
    console.log("Transfer successful");
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
