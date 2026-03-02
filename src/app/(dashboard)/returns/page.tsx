import { getReturns } from "@/app/actions/returns"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CreateReturnDialog } from "@/components/returns/create-return-dialog"
import { ProcessReturnDialog } from "@/components/returns/process-return-dialog"
import { CreateClaimDialog } from "@/components/claims/create-claim-dialog"
import { ExportButton } from "@/components/export-buttons"
import { TrendingDown, Package, RotateCcw } from "lucide-react"

export default async function ReturnsPage() {
    const { data: returns } = await getReturns()

    const all = returns || []

    // Completed returns only (real money outflow)
    const completed = all.filter((r: any) => r.status === "COMPLETED")
    const totalRefunded = completed.reduce((s: number, r: any) => s + r.refundAmount, 0)
    const pending = all.filter((r: any) => r.status === "PENDING")

    // Monthly summary
    const now = new Date()
    const monthlyMap: Record<string, { label: string; count: number; amount: number }> = {}

    for (const r of completed) {
        const d = new Date(r.processedAt || r.requestedAt)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        const label = d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
        if (!monthlyMap[key]) monthlyMap[key] = { label, count: 0, amount: 0 }
        monthlyMap[key].count++
        monthlyMap[key].amount += r.refundAmount
    }

    const monthlyRows = Object.entries(monthlyMap)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 6)

    const fmt = (n: number) =>
        new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING": return <Badge variant="outline" className="text-amber-600 border-amber-400">⏳ Pendiente</Badge>
            case "COMPLETED": return <Badge variant="outline" className="text-green-600 border-green-400">✅ Completado</Badge>
            case "REJECTED": return <Badge variant="destructive">✗ Rechazado</Badge>
            default: return <Badge variant="secondary">{status}</Badge>
        }
    }

    const REASON_LABELS: Record<string, string> = {
        CHANGE_OF_MIND: "Cambio de opinión",
        DEFECTIVE: "Defectuoso",
        WARRANTY: "Garantía",
        WRONG_ITEM: "Artículo incorrecto",
        OTHER: "Otro",
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Devoluciones</h1>
                    <p className="text-muted-foreground">Gestión de productos devueltos y reembolsos.</p>
                </div>
                <div className="flex gap-2">
                    <ExportButton table="returns" label="Exportar CSV" />
                    <CreateReturnDialog />
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-full bg-red-100 dark:bg-red-950">
                            <TrendingDown className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total reembolsado</p>
                            <p className="text-xl font-bold text-red-600">{fmt(totalRefunded)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-full bg-green-100 dark:bg-green-950">
                            <RotateCcw className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Devoluciones completadas</p>
                            <p className="text-xl font-bold">{completed.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-950">
                            <Package className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Pendientes de procesar</p>
                            <p className="text-xl font-bold text-amber-600">{pending.length}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly history */}
            {monthlyRows.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Historial Mensual de Reembolsos</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mes</TableHead>
                                    <TableHead className="text-right">Devoluciones</TableHead>
                                    <TableHead className="text-right">Monto reembolsado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {monthlyRows.map(([key, data]) => {
                                    const isCurrentMonth =
                                        key === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
                                    return (
                                        <TableRow key={key} className={isCurrentMonth ? "bg-muted/30" : ""}>
                                            <TableCell className="capitalize font-medium">
                                                {data.label}
                                                {isCurrentMonth && <Badge variant="secondary" className="ml-2 text-[10px]">Este mes</Badge>}
                                            </TableCell>
                                            <TableCell className="text-right">{data.count}</TableCell>
                                            <TableCell className="text-right font-bold text-red-600">
                                                {fmt(data.amount)}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Full returns table */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Todas las Devoluciones</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Productos</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Reembolso</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {all.map((r: any) => (
                                <TableRow key={r.id}>
                                    <TableCell className="text-sm whitespace-nowrap">
                                        {new Date(r.requestedAt).toLocaleDateString("es-CO", {
                                            day: "2-digit", month: "short", year: "numeric"
                                        })}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {r.sale.client?.name || "Cliente Casual"}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                        {r.items?.map((i: any) => `${i.quantity}× ${i.productName}`).join(", ") || "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                            {REASON_LABELS[r.reason] || r.reason}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(r.status)}</TableCell>
                                    <TableCell className="text-right font-bold text-red-600">
                                        {fmt(r.refundAmount)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {r.status === "PENDING" && <ProcessReturnDialog returnData={r} />}
                                        {r.status === "COMPLETED" && (
                                            <div className="flex items-center gap-2 justify-end">
                                                <span className="text-xs text-muted-foreground">
                                                    {r.refundAccount?.name}
                                                </span>
                                                {r.items?.some((item: any) =>
                                                    item.productCondition === "DEFECTIVE" || item.productCondition === "DAMAGED"
                                                ) && (
                                                        <CreateClaimDialog
                                                            prefillData={{
                                                                customerReturnId: r.id,
                                                                productName: r.items[0]?.productName || "Producto",
                                                                productId: r.items[0]?.productId || undefined,
                                                                quantity: r.items.reduce((s: number, i: any) => s + i.quantity, 0),
                                                            }}
                                                        />
                                                    )}
                                            </div>
                                        )}
                                        {r.status === "REJECTED" && (
                                            <span className="text-xs text-red-600">Rechazado</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {all.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        No hay devoluciones registradas.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
