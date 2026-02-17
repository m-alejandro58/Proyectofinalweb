"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"
import { es } from "date-fns/locale"

export function DashboardFilters() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Default to current month
    const [period, setPeriod] = useState(searchParams.get("period") || "CURRENT_MONTH")
    const [channel, setChannel] = useState(searchParams.get("channel") || "ALL")

    useEffect(() => {
        applyFilters()
    }, [period, channel])

    const applyFilters = () => {
        const params = new URLSearchParams()

        let from, to
        const now = new Date()

        if (period === "CURRENT_MONTH") {
            from = startOfMonth(now)
            to = endOfMonth(now)
        } else if (period === "LAST_MONTH") {
            const lastMonth = subMonths(now, 1)
            from = startOfMonth(lastMonth)
            to = endOfMonth(lastMonth)
        } else if (period === "THIS_YEAR") {
            from = new Date(now.getFullYear(), 0, 1)
            to = new Date(now.getFullYear(), 11, 31)
        }

        if (from && to) {
            params.set("from", from.toISOString())
            params.set("to", to.toISOString())
        }

        params.set("period", period)
        if (channel !== "ALL") {
            params.set("channel", channel)
        }

        router.push(`/?${params.toString()}`)
    }

    return (
        <div className="flex gap-4 p-4 bg-muted/20 rounded-lg items-center overflow-x-auto">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filtrar por:</span>

            <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="CURRENT_MONTH">Este Mes</SelectItem>
                    <SelectItem value="LAST_MONTH">Mes Pasado</SelectItem>
                    <SelectItem value="THIS_YEAR">Este Año</SelectItem>
                </SelectContent>
            </Select>

            <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Canal / Plataforma" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Todos los canales</SelectItem>
                    <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                    <SelectItem value="MERCADOLIBRE">MercadoLibre</SelectItem>
                    <SelectItem value="FACEBOOK">Facebook</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="WEBSITE">Website</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
