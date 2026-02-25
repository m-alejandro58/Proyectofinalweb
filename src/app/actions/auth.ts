"use server"

import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    if (!username || !password) {
        return { success: false, error: "Complete todos los campos" }
    }

    try {
        // Simple plain text check for this environment as requested without external libs yet
        // In prod, use bcrypt.
        const user = await prisma.user.findUnique({
            where: { username }
        })

        if (!user || user.password !== password) {
            return { success: false, error: "Credenciales inválidas" }
        }

        // Set session cookie
        (await cookies()).set("auth_session", user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            sameSite: "lax"
        })

        return { success: true }
    } catch (error) {
        console.error("Login error", error)
        return { success: false, error: "Error en el servidor" }
    }
}

export async function logout() {
    (await cookies()).delete("auth_session")
    redirect("/login")
}

export async function checkCredentials(password: string) {
    const sessionId = (await cookies()).get("auth_session")?.value

    if (!sessionId) {
        return { success: false, error: "Sesión no encontrada" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: sessionId }
        })

        if (!user) {
            return { success: false, error: "Usuario no encontrado" }
        }

        if (user.password !== password) {
            return { success: false, error: "Contraseña incorrecta" }
        }

        return { success: true }
    } catch (error) {
        console.error("Check credentials error", error)
        return { success: false, error: "Error en el servidor" }
    }
}

export async function getCurrentUserName() {
    const sessionId = (await cookies()).get("auth_session")?.value

    if (!sessionId) return null

    try {
        const user = await prisma.user.findUnique({
            where: { id: sessionId },
            select: { name: true, username: true }
        })
        return user?.name || user?.username || null
    } catch {
        return null
    }
}

export async function getSession() {
    const sessionId = (await cookies()).get("auth_session")?.value
    return sessionId ? true : false
}

// Helper to create initial user if none exists
export async function createInitialUser() {
    const count = await prisma.user.count()
    if (count === 0) {
        await prisma.user.create({
            data: {
                username: "admin",
                password: "123", // Default password
                name: "Administrador"
            }
        })
        console.log("Admin user created: admin / 123")
    }
}
