import { getSales } from "@/app/actions/sales"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SaleDetailsDialog } from "@/components/sales/sale-details-dialog"

export default async function SalesPage() {
    const { data: sales } = await getSales()

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
                    <p className="text-muted-foreground">Historial de facturación y ganancias.</p>
                </div>
                <Link href="/sales/new">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" /> Nueva Venta
                    </Button>
                </Link>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Plataforma</TableHead>
                                <TableHead className="text-right">Bruto</TableHead>
                                <TableHead className="text-right">Comisiones</TableHead>
                                <TableHead className="text-right">Neto</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sales?.map((s: any) => (
                                <TableRow key={s.id}>
                                    <TableCell className="text-sm">
                                        {s.date.toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {s.client?.name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{s.platform}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        ${s.grossAmount.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right text-destructive text-xs">
                                        -${((s.platformFee || 0) + (s.shippingCost || 0) + (s.taxes || 0)).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-green-600">
                                        ${(s.netAmount || 0).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <SaleDetailsDialog saleId={s.id} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!sales || sales.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No hay ventas registradas.
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
