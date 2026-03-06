"use client"

import Link from "next/link"
import {
    AlertTriangle,
    ArrowRight,
    ShoppingCart,
    PackageX,
    TrendingUp,
} from "lucide-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts"

// ── Types ───────────────────────────────────────────────
interface PlatformPub {
    published: number
    missing: number
    label: string
    field: string
}

interface LowStockItem {
    id: string
    name: string
    sku: string | null
    stockTotal: number
}

interface OperationsData {
    total: number
    publication: Record<string, PlatformPub>
    lowStock: LowStockItem[]
}

// ── Colors (same as badges in table) ────────────────────
const PLATFORM_COLORS: Record<string, { fill: string; text: string; emoji: string }> = {
    mercadolibre: { fill: "#facc15", text: "text-yellow-400", emoji: "🟡" },
    luegopago: { fill: "#c084fc", text: "text-purple-400", emoji: "🟣" },
    rappi: { fill: "#f97316", text: "text-orange-500", emoji: "🟠" },
    web: { fill: "#38bdf8", text: "text-sky-400", emoji: "🔵" },
    facebook: { fill: "#2563eb", text: "text-blue-600", emoji: "🔷" },
}

// ── Component ───────────────────────────────────────────
export function OperationsOverview({ data }: { data: OperationsData }) {
    const { total, publication, lowStock } = data

    // Platforms with missing products (alerts)
    const alerts = Object.entries(publication)
        .filter(([, v]) => v.missing > 0)
        .sort(([, a], [, b]) => b.missing - a.missing)

    // Chart data
    const chartData = Object.entries(publication).map(([key, v]) => ({
        name: v.label,
        platformId: key,
        pct: total > 0 ? Math.round((v.published / total) * 100) : 0,
        published: v.published,
    }))

    return (
        <div className="space-y-4">
            {/* Section title */}
            <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold tracking-tight">
                    Operaciones e Inventario
                </h2>
            </div>

            {/* ── 1. Alerts ────────────────────────────────── */}
            {alerts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {alerts.slice(0, 5).map(([key, v]) => {
                        const color = PLATFORM_COLORS[key]
                        return (
                            <div
                                key={key}
                                className="flex items-center gap-3 rounded-lg border border-dashed border-yellow-500/30 bg-yellow-500/5 px-4 py-2.5 transition-colors hover:bg-yellow-500/10"
                            >
                                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        <span className="mr-1">{color?.emoji}</span>
                                        {v.missing} productos sin publicar en{" "}
                                        <span className={color?.text}>{v.label}</span>
                                    </p>
                                </div>
                                <Link href="/inventory" className="shrink-0">
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                                        Ver <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ── 2 + 3. Chart & Low Stock (side by side) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ── 2. Publication Chart ─────────────────── */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                            % Catálogo Publicado
                        </CardTitle>
                        <CardDescription>
                            Porcentaje por plataforma ({total} artículos en total)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    layout="vertical"
                                    margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                                >
                                    <XAxis
                                        type="number"
                                        domain={[0, 100]}
                                        tickFormatter={(v) => `${v}%`}
                                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={90}
                                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        formatter={(value: any, _name: any, props: any) =>
                                            [`${value}% (${props.payload.published}/${total})`, "Publicado"]
                                        }
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "8px",
                                            fontSize: 12,
                                        }}
                                    />
                                    <Bar
                                        dataKey="pct"
                                        radius={[0, 6, 6, 0]}
                                        barSize={24}
                                    >
                                        {chartData.map((entry) => (
                                            <Cell
                                                key={entry.platformId}
                                                fill={PLATFORM_COLORS[entry.platformId]?.fill ?? "#888"}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* ── 3. Low Stock Table ───────────────────── */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <PackageX className="h-4 w-4 text-red-400" />
                            Artículos con Bajo Stock
                        </CardTitle>
                        <CardDescription>
                            {lowStock.length > 0
                                ? `Los ${lowStock.length} productos con menor inventario`
                                : "¡Todo en orden! No hay productos con bajo stock."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {lowStock.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Producto</TableHead>
                                        <TableHead className="text-center w-[80px]">Stock</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lowStock.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="max-w-[200px]">
                                                <p className="truncate text-sm font-medium" title={item.name}>
                                                    {item.name}
                                                </p>
                                                {item.sku && (
                                                    <p className="text-[11px] text-muted-foreground font-mono">
                                                        {item.sku}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant={item.stockTotal === 0 ? "destructive" : "outline"}
                                                    className={item.stockTotal > 0 && item.stockTotal <= 5
                                                        ? "bg-yellow-500/15 text-yellow-500 border-yellow-500/30"
                                                        : ""
                                                    }
                                                >
                                                    {item.stockTotal}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Link href="/purchases/new">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        title="Registrar compra"
                                                    >
                                                        <ShoppingCart className="h-3.5 w-3.5" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                <PackageX className="h-8 w-8 mb-2 opacity-40" />
                                <p className="text-sm">Todos los productos tienen stock suficiente</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
