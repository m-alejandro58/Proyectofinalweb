"use server"

import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"

/**
 * Server-side auth guard for server actions.
 * Validates the session cookie AND verifies the user exists in the database.
 * Call this at the start of any server action that modifies or reads sensitive data.
 * 
 * @returns The authenticated user object
 * @throws Redirects to /login if not authenticated
 */
export async function requireAuth() {
    const sessionId = (await cookies()).get("auth_session")?.value

    if (!sessionId) {
        redirect("/login")
    }

    const user = await prisma.user.findUnique({
        where: { id: sessionId },
        select: { id: true, username: true, name: true }
    })

    if (!user) {
        // Session cookie references a user that no longer exists — clear it
        (await cookies()).delete("auth_session")
        redirect("/login")
    }

    return user
}
