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
        const user = await prisma.user.findUnique({
            where: { username }
        })

        if (!user || user.password !== password) {
            return { success: false, error: "Credenciales inválidas" }
        }

        if (!user.isActive) {
            return { success: false, error: "Usuario desactivado. Contacte al administrador." }
        }

        // Session-only cookie - with maxAge of 12 hours (43200 seconds)
        ; (await cookies()).set("auth_session", user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            sameSite: "lax",
            maxAge: 43200 // 12 horas de expiración dura
        })

        return {
            success: true, role: user.role,
            canSell: user.canSell, canManageInventory: user.canManageInventory,
            canManageFinances: user.canManageFinances, canManageContacts: user.canManageContacts,
            canManageOrders: user.canManageOrders, canManageClaims: user.canManageClaims
        }
    } catch (error) {
        console.error("Login error", error)
        return { success: false, error: "Error en el servidor" }
    }
}

export async function logout() {
    ; (await cookies()).delete("auth_session")
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

export async function getCurrentUser() {
    const sessionId = (await cookies()).get("auth_session")?.value
    if (!sessionId) return null

    try {
        const user = await prisma.user.findUnique({
            where: { id: sessionId },
            select: {
                id: true, name: true, username: true, role: true,
                canSell: true, canManageInventory: true, canManageFinances: true,
                canManageContacts: true, canManageOrders: true, canManageClaims: true
            }
        })
        return user
    } catch {
        return null
    }
}

// Keep backwards compat
export async function getCurrentUserName() {
    const user = await getCurrentUser()
    return user?.name || user?.username || null
}

export async function getSession() {
    const sessionId = (await cookies()).get("auth_session")?.value
    return sessionId ? true : false
}

// Helper to create initial admin if no users exist
export async function createInitialUser() {
    const count = await prisma.user.count()
    if (count === 0) {
        await prisma.user.create({
            data: {
                username: "admin",
                password: "123",
                name: "Administrador",
                role: "ADMIN",
                canSell: true,
                canManageInventory: true,
                canManageFinances: true,
                canManageContacts: true,
                canManageOrders: true,
                canManageClaims: true
            }
        })
        console.log("Admin user created: admin / 123")
    }
}

// ==========================
// ADMIN-ONLY USER MANAGEMENT
// ==========================

async function requireAdminSession() {
    const sessionId = (await cookies()).get("auth_session")?.value
    if (!sessionId) throw new Error("No autenticado")

    const user = await prisma.user.findUnique({ where: { id: sessionId } })
    if (!user || user.role !== "ADMIN") throw new Error("Acceso denegado: se requiere rol ADMIN")
    return user
}

export async function getUsers() {
    await requireAdminSession()
    const users = await prisma.user.findMany({
        select: {
            id: true, username: true, name: true, role: true, isActive: true,
            canSell: true, canManageInventory: true, canManageFinances: true,
            canManageContacts: true, canManageOrders: true, canManageClaims: true,
            createdAt: true
        },
        orderBy: { createdAt: 'asc' }
    })
    return { success: true, data: users }
}

export async function createUser(data: {
    username: string
    password: string
    name: string
    canSell: boolean
    canManageInventory: boolean
    canManageFinances: boolean
    canManageContacts: boolean
    canManageOrders: boolean
    canManageClaims: boolean
}) {
    await requireAdminSession()

    if (!data.username || !data.password) {
        return { success: false, error: "Usuario y contraseña son obligatorios" }
    }

    const exists = await prisma.user.findUnique({ where: { username: data.username } })
    if (exists) {
        return { success: false, error: "El nombre de usuario ya existe" }
    }

    try {
        await prisma.user.create({
            data: {
                username: data.username,
                password: data.password,
                name: data.name,
                role: "STANDARD",
                canSell: data.canSell,
                canManageInventory: data.canManageInventory,
                canManageFinances: data.canManageFinances,
                canManageContacts: data.canManageContacts,
                canManageOrders: data.canManageOrders,
                canManageClaims: data.canManageClaims
            }
        })
        return { success: true }
    } catch (error) {
        console.error("Create user error", error)
        return { success: false, error: "Error al crear usuario" }
    }
}

export async function updateUser(userId: string, data: {
    name?: string
    isActive?: boolean
    canSell?: boolean
    canManageInventory?: boolean
    canManageFinances?: boolean
    canManageContacts?: boolean
    canManageOrders?: boolean
    canManageClaims?: boolean
}) {
    const admin = await requireAdminSession()

    if (userId === admin.id) {
        return { success: false, error: "No puede editar permisos de su propia cuenta admin" }
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data
        })
        return { success: true }
    } catch (error) {
        console.error("Update user error", error)
        return { success: false, error: "Error al actualizar usuario" }
    }
}

export async function changePassword(userId: string, newPassword: string) {
    await requireAdminSession()

    if (!newPassword || newPassword.length < 3) {
        return { success: false, error: "La contraseña debe tener al menos 3 caracteres" }
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { password: newPassword }
        })
        return { success: true }
    } catch (error) {
        console.error("Change password error", error)
        return { success: false, error: "Error al cambiar contraseña" }
    }
}

export async function deleteUser(userId: string) {
    const admin = await requireAdminSession()

    if (userId === admin.id) {
        return { success: false, error: "No puede eliminar su propia cuenta" }
    }

    try {
        await prisma.user.delete({ where: { id: userId } })
        return { success: true }
    } catch (error) {
        console.error("Delete user error", error)
        return { success: false, error: "Error al eliminar usuario" }
    }
}
