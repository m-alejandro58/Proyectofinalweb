import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { readFile } from "fs/promises"
import { join } from "path"

// Download a full copy of the SQLite database file
export async function GET() {
    const sessionId = (await cookies()).get("auth_session")?.value
    if (!sessionId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: sessionId } })
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Acceso denegado. Solo administradores pueden respaldar la base de datos." }, { status: 403 })
    }

    try {
        const dbPath = join(process.cwd(), "prisma", "dev.db")
        const fileBuffer = await readFile(dbPath)

        const date = new Date().toISOString().split("T")[0]
        const filename = `hardsoft_backup_${date}.db`

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": fileBuffer.length.toString(),
            }
        })
    } catch (error) {
        console.error("Backup error:", error)
        return NextResponse.json({ error: "Error al crear respaldo" }, { status: 500 })
    }
}
