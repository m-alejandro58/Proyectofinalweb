"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"

export type AccountType = "CASH" | "BANK" | "CREDIT" | "RECEIVABLE" | "LOAN"

export async function getFinancialAccounts() {
    await requireAuth()
    try {
        const accounts = await prisma.financialAccount.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, data: accounts }
    } catch (error) {
        console.error("Error fetching accounts:", error)
        return { success: false, error: "Error al obtener cuentas" }
    }
}

export async function createFinancialAccount(formData: FormData) {
    await requireAuth()
    const name = formData.get("name") as string
    const type = formData.get("type") as AccountType
    const description = formData.get("description") as string
    const initialBalance = parseFloat(formData.get("initialBalance") as string) || 0
    const creditLimit = parseFloat(formData.get("creditLimit") as string) || 0

    if (!name || !type) {
        return { success: false, error: "Nombre y tipo son obligatorios" }
    }

    try {
        await prisma.financialAccount.create({
            data: {
                name,
                type,
                description,
                balance: initialBalance,
                creditLimit: type === "CREDIT" ? creditLimit : 0,
            }
        })

        revalidatePath("/accounts")
        return { success: true }
    } catch (error) {
        console.error("Error creating account:", error)
        return { success: false, error: "Error al crear la cuenta" }
    }
}

export async function updateFinancialAccount(id: string, data: { name?: string, creditLimit?: number, image?: string }) {
    await requireAuth()
    if (!id) return { success: false, error: "ID de cuenta requerido" }

    try {
        const account = await prisma.financialAccount.findUnique({ where: { id } })
        if (!account) return { success: false, error: "Cuenta no encontrada" }

        const updateData: any = {}
        if (data.name !== undefined && data.name.trim() !== "") {
            updateData.name = data.name.trim()
        }
        if (data.creditLimit !== undefined && ["CREDIT", "LOAN"].includes(account.type)) {
            updateData.creditLimit = data.creditLimit
        }
        if (data.image !== undefined) {
            updateData.image = data.image
        }

        await prisma.financialAccount.update({
            where: { id },
            data: updateData
        })

        revalidatePath("/accounts")
        return { success: true }
    } catch (error) {
        console.error("Error updating account:", error)
        return { success: false, error: "Error al actualizar la cuenta" }
    }
}

// ─── CASHBACK → AHORRO AUTOMÁTICO ─────────────────────────────────────────────
// Registra el cashback de la tarjeta:
//   1) Abona el monto a la deuda de la tarjeta (balance += amount)
//   2) Transfiere ese mismo monto de la cuenta operativa → cuenta de ahorro
export async function registerCashback(
    cardId: string,           // CREDIT account receiving cashback
    operatingAccountId: string, // CASH/BANK from which the "real" saving comes
    savingsAccountId: string,   // BANK/CASH destination savings
    amount: number
) {
    await requireAuth()
    if (!cardId || !operatingAccountId || !savingsAccountId || amount <= 0) {
        return { success: false, error: "Parámetros inválidos" }
    }
    if (operatingAccountId === savingsAccountId) {
        return { success: false, error: "La cuenta origen y destino del ahorro deben ser distintas" }
    }

    try {
        await prisma.$transaction(async (tx: any) => {
            // 1. Reduce card debt (cashback from bank reduces what you owe)
            await tx.financialAccount.update({
                where: { id: cardId },
                data: { balance: { decrement: amount } }
            })

            // 2. Debit operating account
            await tx.financialAccount.update({
                where: { id: operatingAccountId },
                data: { balance: { decrement: amount } }
            })

            // 3. Credit savings account
            await tx.financialAccount.update({
                where: { id: savingsAccountId },
                data: { balance: { increment: amount } }
            })

            // 4. Log cashback credit on card
            await tx.transaction.create({
                data: {
                    type: "CASHBACK",
                    description: `Cashback recibido`,
                    amount,
                    fromAccountId: null,
                    toAccountId: cardId,
                }
            })

            // 5. Log the internal transfer operating → savings
            await tx.transaction.create({
                data: {
                    type: "CASHBACK",
                    description: `Ahorro por cashback`,
                    amount,
                    fromAccountId: operatingAccountId,
                    toAccountId: savingsAccountId,
                }
            })
        })

        revalidatePath("/accounts")
        return { success: true }
    } catch (error) {
        console.error("Cashback error:", error)
        return { success: false, error: "Error al registrar el cashback" }
    }
}

// ─── PAGO DE DEUDA ────────────────────────────────────────────────────────────
// Paga una tarjeta o préstamo desde cualquier cuenta líquida:
//   1) Reduce la deuda (balance += amount → menos deuda)
//   2) Debita la cuenta origen (balance -= amount)
//   3) Registra la transacción
export async function payDebt(
    debtAccountId: string,  // CREDIT or LOAN account to pay
    sourceAccountId: string, // CASH or BANK being used to pay
    amount: number,
    description?: string
) {
    await requireAuth()
    if (!debtAccountId || !sourceAccountId || amount <= 0) {
        return { success: false, error: "Parámetros inválidos" }
    }
    if (debtAccountId === sourceAccountId) {
        return { success: false, error: "La cuenta deudora y la cuenta origen deben ser distintas" }
    }

    try {
        await prisma.$transaction(async (tx: any) => {
            // 1. Reduce debt (balance moves toward 0)
            await tx.financialAccount.update({
                where: { id: debtAccountId },
                data: { balance: { increment: amount } }
            })

            // 2. Debit source account
            await tx.financialAccount.update({
                where: { id: sourceAccountId },
                data: { balance: { decrement: amount } }
            })

            // 3. Log payment
            await tx.transaction.create({
                data: {
                    type: "DEBT_PAYMENT",
                    description: description?.trim() || "Pago de deuda",
                    amount,
                    fromAccountId: sourceAccountId,
                    toAccountId: debtAccountId,
                }
            })
        })

        revalidatePath("/accounts")
        return { success: true }
    } catch (error) {
        console.error("Debt payment error:", error)
        return { success: false, error: "Error al registrar el pago" }
    }
}

// ─── HISTORIAL DE TRANSACCIONES POR CUENTA ────────────────────────────────────
export async function getAccountTransactions(accountId: string) {
    await requireAuth()
    try {
        const transactions = await (prisma as any).transaction.findMany({
            where: {
                OR: [
                    { fromAccountId: accountId },
                    { toAccountId: accountId },
                ]
            },
            include: {
                fromAccount: { select: { id: true, name: true, type: true } },
                toAccount: { select: { id: true, name: true, type: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        })
        return { success: true, data: transactions }
    } catch (error) {
        console.error("Error fetching transactions:", error)
        return { success: false, error: "Error al obtener historial" }
    }
}

