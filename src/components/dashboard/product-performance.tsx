"use client"

import { useState, useEffect, useTransition } from "react"
import { Flame, Gem, TrendingUp } from "lucide-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { getProductPerformanceMetrics } from "@/app/actions/dashboard"

// ── Types ───────────────────────────────────────────────
interface TopSeller {
    name: string
    totalQty: number
    totalRevenue: number
}

interface TopROI {
    name: string
    totalProfit: number
    marginPercent: number
}

interface PerformanceData {
    topSellers: TopSeller[]
    topROI: TopROI[]
}

type TimeRange = "all" | "currentMonth" | "lastMonth"

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
    { value: "all", label: "Histórico" },
    { value: "currentMonth", label: "Este Mes" },
    { value: "lastMonth", label: "Mes Anterior" },
]

const fmt = (n: number) =>
    "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 0 })

// ── Component ───────────────────────────────────────────
export function ProductPerformance({
    initialData,
}: {
    initialData: PerformanceData
}) {
    const [timeRange, setTimeRange] = useState<TimeRange>("all")
    const [data, setData] = useState<PerformanceData>(initialData)
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        startTransition(async () => {
            const res = await getProductPerformanceMetrics(timeRange)
            if (res.success && res.data) {
                setData(res.data)
            }
        })
    }, [timeRange])

    const isEmpty = data.topSellers.length === 0 && data.topROI.length === 0

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold tracking-tight">
                        Rendimiento del Catálogo
                    </h2>
                </div>
                <Select
                    value={timeRange}
                    onValueChange={(v) => setTimeRange(v as TimeRange)}
                >
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {TIME_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isEmpty ? (
                <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                    No hay datos de ventas para el período seleccionado.
                </div>
            ) : (
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity ${isPending ? "opacity-50" : ""}`}>
                    {/* ── 🔥 Top 5 Más Vendidos ──────────────── */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Flame className="h-4 w-4 text-orange-500" />
                                Top 5 Más Vendidos
                            </CardTitle>
                            <CardDescription>
                                Productos con mayor cantidad de unidades vendidas
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {data.topSellers.map((p, i) => (
                                    <div
                                        key={p.name}
                                        className="flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                                                #{i + 1}
                                            </span>
                                            <p className="text-sm font-medium truncate" title={p.name}>
                                                {p.name}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge variant="secondary" className="text-xs">
                                                {p.totalQty} uds
                                            </Badge>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {fmt(p.totalRevenue)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {data.topSellers.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Sin ventas en este período
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── 💎 Top 5 Mayor Rentabilidad ──────────── */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Gem className="h-4 w-4 text-cyan-400" />
                                Top 5 Mayor Rentabilidad
                            </CardTitle>
                            <CardDescription>
                                Productos que mayor ganancia neta generan
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {data.topROI.map((p, i) => (
                                    <div
                                        key={p.name}
                                        className="flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                                                #{i + 1}
                                            </span>
                                            <p className="text-sm font-medium truncate" title={p.name}>
                                                {p.name}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge
                                                variant="outline"
                                                className="text-xs border-emerald-500/30 text-emerald-500"
                                            >
                                                {p.marginPercent}%
                                            </Badge>
                                            <span className="text-sm font-bold text-emerald-500 font-mono">
                                                {fmt(p.totalProfit)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {data.topROI.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Sin datos de rentabilidad
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
