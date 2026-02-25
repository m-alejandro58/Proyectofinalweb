"use server"

import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"

/**
 * Server-side auth guard for server actions.
 * Validates the session cookie AND verifies the user exists in the database.
 * Returns the authenticated user object with role and permissions.
 */
export async function requireAuth() {
    const sessionId = (await cookies()).get("auth_session")?.value

    if (!sessionId) {
        redirect("/login")
    }

    const user = await prisma.user.findUnique({
        where: { id: sessionId },
        select: {
            id: true, username: true, name: true, role: true,
            canSell: true, canManageInventory: true, canManageFinances: true,
            canManageContacts: true, canManageOrders: true, canManageClaims: true
        }
    })

    if (!user) {
        ; (await cookies()).delete("auth_session")
        redirect("/login")
    }

    return user
}

/**
 * Requires ADMIN role. Redirects to / if not admin.
 */
export async function requireAdmin() {
    const user = await requireAuth()
    if (user.role !== "ADMIN") {
        redirect("/")
    }
    return user
}
