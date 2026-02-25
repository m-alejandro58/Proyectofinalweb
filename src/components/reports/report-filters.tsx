"use client"

import * as React from "react"
import { CalendarIcon, Filter } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useRouter, useSearchParams } from "next/navigation"

export function ReportFilters() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [date, setDate] = React.useState<DateRange | undefined>({
        from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
        to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
    })

    // Update filters in URL on change
    const updateFilters = (key: string, value: string | undefined) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value && value !== 'all') {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        router.replace(`/reports?${params.toString()}`)
    }

    const handleDateSelect = (newDate: DateRange | undefined) => {
        setDate(newDate)
        if (newDate?.from) {
            const params = new URLSearchParams(searchParams.toString())
            params.set("from", newDate.from.toISOString())
            if (newDate.to) {
                params.set("to", newDate.to.toISOString())
            } else {
                params.delete("to")
            }
            router.replace(`/reports?${params.toString()}`)
        } else if (!newDate) {
            const params = new URLSearchParams(searchParams.toString())
            params.delete("from")
            params.delete("to")
            router.replace(`/reports?${params.toString()}`)
        }
    }

    return (
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-end md:items-center bg-muted/40 p-4 rounded-lg">

            {/* DATE PICKER */}
            <div className="grid gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-[260px] justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                                        {format(date.to, "LLL dd, y", { locale: es })}
                                    </>
                                ) : (
                                    format(date.from, "LLL dd, y", { locale: es })
                                )
                            ) : (
                                <span>Seleccionar Fechas</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={handleDateSelect}
                            numberOfMonths={2}
                            locale={es}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* PLATFORM FILTER */}
            <div className="w-[200px]">
                <Select
                    onValueChange={(val) => updateFilters("platform", val)}
                    defaultValue={searchParams.get("platform") || "all"}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Plataforma" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las plataformas</SelectItem>
                        <SelectItem value="MERCADOLIBRE">MercadoLibre</SelectItem>
                        <SelectItem value="LUEGOPAGO">LuegoPago</SelectItem>
                        <SelectItem value="FACEBOOK">Facebook</SelectItem>
                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                        <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                        <SelectItem value="WEBSITE">Website</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* PAYMENT METHOD FILTER */}
            <div className="w-[200px]">
                <Select
                    onValueChange={(val) => updateFilters("paymentMethod", val)}
                    defaultValue={searchParams.get("paymentMethod") || "all"}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Método de Pago" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los métodos</SelectItem>
                        <SelectItem value="CASH">Efectivo</SelectItem>
                        <SelectItem value="BANK">Banco (Transferencia)</SelectItem>
                        <SelectItem value="CREDIT">Tarjeta Crédito</SelectItem>
                        <SelectItem value="RECEIVABLE">Sistecredito / Fiado</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Clear Button */}
            {(searchParams.get("from") || searchParams.get("platform") || searchParams.get("paymentMethod")) && (
                <Button variant="ghost" onClick={() => router.replace('/reports')}>
                    Borrar Filtros
                </Button>
            )}

        </div>
    )
}
