"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export type AccountType = "CASH" | "BANK" | "CREDIT" | "RECEIVABLE" | "LOAN"

export async function getFinancialAccounts() {
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

export async function updateFinancialAccount(id: string, data: { name?: string, creditLimit?: number }) {
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
