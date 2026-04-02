"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"

export async function getExpenses() {
    await requireAuth()
    try {
        const expenses = await prisma.expense.findMany({
            include: { financialAccount: true },
            orderBy: { date: 'desc' }
        })
        return { success: true, data: expenses }
    } catch (error) {
        return { success: false, error: "Error load" }
    }
}

export async function createExpense(formData: FormData) {
    await requireAuth()
    const description = formData.get("description") as string
    const category = formData.get("category") as string
    const amount = parseFloat(formData.get("amount") as string)
    const accountId = formData.get("accountId") as string
    const expenseDate = formData.get("expenseDate") as string

    if (!description || !amount || !accountId) return { success: false, error: "Datos incompletos" }

    try {
        await prisma.$transaction(async (tx: any) => {
            // Create Expense
            await tx.expense.create({
                data: {
                    description,
                    category,
                    amount,
                    financialAccountId: accountId,
                    date: expenseDate ? new Date(expenseDate + "T12:00:00Z") : new Date()
                }
            })

            // Deduct from Account
            // Validation: Account exists
            const acc = await tx.financialAccount.findUnique({ where: { id: accountId } })

            if (acc?.type === 'CREDIT') {
                // Credit Card Expense -> Increases Debt (Balance)
                await tx.financialAccount.update({
                    where: { id: accountId },
                    data: { balance: { increment: amount } }
                })
            } else {
                // Cash/Bank Expense -> Decreases Balance
                await tx.financialAccount.update({
                    where: { id: accountId },
                    data: { balance: { decrement: amount } }
                })
            }
        })

        revalidatePath("/expenses")
        revalidatePath("/accounts")
        return { success: true }
    } catch (error) {
        console.error(error)
        return { success: false, error: "Error al crear gasto" }
    }
}
