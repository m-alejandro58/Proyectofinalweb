"use client"

import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { useState } from "react"

interface ExportButtonProps {
    table: string
    label?: string
    variant?: "default" | "outline" | "ghost" | "secondary"
    size?: "default" | "sm" | "lg" | "icon"
    className?: string
}

export function ExportButton({ table, label = "Descargar CSV", variant = "outline", size = "sm", className }: ExportButtonProps) {
    const [loading, setLoading] = useState(false)

    async function handleDownload() {
        setLoading(true)
        try {
            const response = await fetch(`/api/export?table=${table}`)
            if (!response.ok) throw new Error("Export failed")

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = response.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || `${table}.csv`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            a.remove()
        } catch (error) {
            console.error("Download error:", error)
            alert("Error al descargar archivo")
        }
        setLoading(false)
    }

    return (
        <Button variant={variant} size={size} className={className} onClick={handleDownload} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
            {label}
        </Button>
    )
}

export function BackupButton() {
    const [loading, setLoading] = useState(false)

    async function handleBackup() {
        setLoading(true)
        try {
            const response = await fetch("/api/backup")
            if (!response.ok) throw new Error("Backup failed")

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = response.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "backup.db"
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            a.remove()
        } catch (error) {
            console.error("Backup error:", error)
            alert("Error al crear respaldo")
        }
        setLoading(false)
    }

    return (
        <Button onClick={handleBackup} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {loading ? "Descargando copia..." : "Descargar Copia de Seguridad (.db)"}
        </Button>
    )
}
