import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

// Download a full copy of the SQLite database file
export async function GET() {
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
