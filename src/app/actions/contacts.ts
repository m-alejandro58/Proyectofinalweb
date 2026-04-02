"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"

export async function getContacts(type?: "PROVIDER" | "CLIENT", queryParam?: string) {
    await requireAuth()
    try {
        const where: any = type ? { type } : {}
        if (queryParam) {
            where.OR = [
                { name: { contains: queryParam, mode: 'insensitive' } },
                { email: { contains: queryParam, mode: 'insensitive' } },
                { govId: { contains: queryParam, mode: 'insensitive' } },
                { phone: { contains: queryParam, mode: 'insensitive' } }
            ]
        }
        const contacts = await prisma.contact.findMany({
            where,
            orderBy: { name: 'asc' }
        })
        return { success: true, data: contacts }
    } catch (error) {
        console.error(error)
        return { success: false, error: "Error al cargar contactos" }
    }
}

export async function createContact(formData: FormData) {
    await requireAuth()
    const name = formData.get("name") as string
    const type = formData.get("type") as "PROVIDER" | "CLIENT"
    const govId = formData.get("govId") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const city = formData.get("city") as string
    const address = formData.get("address") as string

    if (!name || !type) return { success: false, error: "Nombre y Tipo obligatorios" }

    if (!govId) {
        return { success: false, error: "La Cédula / NIT es obligatoria" }
    }

    try {
        const contact = await prisma.contact.create({
            data: {
                name, type, govId, email, phone, city, address
            }
        })
        revalidatePath("/contacts")
        return { success: true, data: contact }
    } catch (error) {
        console.error(error)
        return { success: false, error: "Error al crear contacto" }
    }
}
