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
import { EditSaleDialog } from "@/components/sales/edit-sale-dialog"
import { getFinancialAccounts } from "@/app/actions/accounts"
import { ExportButton } from "@/components/export-buttons"
import { SalesSearch } from "@/components/sales/sales-search"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default async function SalesPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string }>
}) {
    const { query: queryRaw } = await searchParams
    const query = queryRaw || ""
    const result = await getSales(query)
    const sales = result.data
    const error = result.success ? null : result.error
    
    const { data: accountsRaw } = await getFinancialAccounts()
    const accounts = accountsRaw || []

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
                    <p className="text-muted-foreground">Historial de facturación y ganancias.</p>
                </div>
                <div className="flex flex-col sm:flex-row w-full md:w-auto items-center gap-2">
                    <SalesSearch />
                    <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <ExportButton table="sales" label="Exportar CSV" />
                        <Link href="/sales/new">
                            <Button className="gap-2 shrink-0">
                                <Plus className="h-4 w-4" /> Nueva Venta
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error al cargar las ventas</AlertTitle>
                    <AlertDescription>
                        {error}. Por favor intenta recargar la página o contacta a soporte.
                    </AlertDescription>
                </Alert>
            )}

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
                                        {s.date ? new Date(s.date).toLocaleDateString() : 'N/A'}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {s.client?.name || 'Cliente Desconocido'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{s.channel || 'N/A'}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        ${(s.grossAmount || 0).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right text-destructive text-xs">
                                        -${((s.platformFee || 0) + (s.shippingCost || 0) + (s.taxes || 0)).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-green-600">
                                        ${(s.netAmount || 0).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <EditSaleDialog sale={s} accounts={accounts} />
                                            <SaleDetailsDialog saleId={s.id} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!sales || sales.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        {query ? `No se encontraron ventas que coincidan con '${query}'.` : "No hay ventas registradas."}
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
