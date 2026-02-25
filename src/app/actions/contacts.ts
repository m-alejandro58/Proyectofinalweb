"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"

export async function getContacts(type?: "PROVIDER" | "CLIENT") {
    await requireAuth()
    try {
        const where = type ? { type } : {}
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

    if (!name || !type) return { success: false, error: "Nombre y Tipo obligatorios" }

    try {
        const contact = await prisma.contact.create({
            data: {
                name, type, govId, email, phone, city
            }
        })
        revalidatePath("/contacts")
        return { success: true, data: contact }
    } catch (error) {
        console.error(error)
        return { success: false, error: "Error al crear contacto" }
    }
}
