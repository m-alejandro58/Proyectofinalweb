"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createTransfer(formData: FormData) {
    const amount = parseFloat(formData.get("amount") as string)
    const fromId = formData.get("fromId") as string
    const toId = formData.get("toId") as string
    const description = formData.get("description") as string

    if (amount <= 0 || !fromId || !toId) return { success: false, error: "Datos inválidos" }
    if (fromId === toId) return { success: false, error: "Cuenta de origen y destino iguales" }

    try {
        await prisma.$transaction(async (tx: any) => {
            // Validate accounts
            const fromAcc = await tx.financialAccount.findUnique({ where: { id: fromId } })
            const toAcc = await tx.financialAccount.findUnique({ where: { id: toId } })

            if (!fromAcc || !toAcc) throw new Error("Cuentas no encontradas")

            // Logic:
            // From: Decrement balance (Asset) or Increment Balance if Debt?
            // Let's stick to: Balance represents VALUE for Assets.
            // For Liability (Credit/Loan): Balance represents DEBT (Value negative? No, usually modeled as Positive usage).
            // Let's assume standard accounting:
            // Asset -> Asset: from - amount, to + amount.
            // Receivable (Asset) -> Bank (Asset): from - amount, to + amount.
            // Bank -> CreditCard (Liability): PAGO TARJETA.
            //    Bank - amount.
            //    CreditCard - amount (Debt decreases).

            // So logic depends on Type?
            // Let's simplify: 
            // If Type CREDIT: 'balance' is DEBT. Transfer TO Credit means Paying Debt -> Decrement Balance.
            // If Type CREDIT: Transfer FROM Credit means Cash Advance -> Increment Balance (Debt).

            // FROM Logic:
            if (fromAcc.type === 'CREDIT' || fromAcc.type === 'LOAN') {
                await tx.financialAccount.update({ where: { id: fromId }, data: { balance: { increment: amount } } }) // Debt increases
            } else {
                await tx.financialAccount.update({ where: { id: fromId }, data: { balance: { decrement: amount } } }) // Asset decreases
            }

            // TO Logic:
            if (toAcc.type === 'CREDIT' || toAcc.type === 'LOAN') {
                await tx.financialAccount.update({ where: { id: toId }, data: { balance: { decrement: amount } } }) // Debt decreases (Payment)
            } else {
                await tx.financialAccount.update({ where: { id: toId }, data: { balance: { increment: amount } } }) // Asset increases
            }

            // Record Transaction
            await tx.transaction.create({
                data: {
                    description: description || `Transferencia de ${fromAcc.name} a ${toAcc.name}`,
                    amount: amount,
                    fromAccountId: fromId
                }
            })
        })

        revalidatePath("/accounts")
        return { success: true }
    } catch (error) {
        console.error(error)
        return { success: false, error: "Error en transferencia" }
    }
}
