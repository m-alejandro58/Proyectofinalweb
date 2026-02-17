import { getPurchases } from "@/app/actions/purchases"
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

export default async function PurchasesPage() {
    const { data: purchases } = await getPurchases()

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Compras</h1>
                    <p className="text-muted-foreground">Historial de adquisiciones y gastos de inventario.</p>
                </div>
                <Link href="/purchases/new">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" /> Registrar Compra
                    </Button>
                </Link>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Proveedor</TableHead>
                                <TableHead>Cuenta Pago</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Items</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchases?.map((p: any) => (
                                <TableRow key={p.id}>
                                    <TableCell className="text-sm">
                                        {p.date.toLocaleDateString()}
                                        <br />
                                        <span className="text-xs text-muted-foreground">{p.receiptNumber}</span>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {p.provider.name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{p.paymentAccount?.name}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold">
                                        ${p.totalAmount.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground text-xs">
                                        {p.batches.reduce((sum: number, b: any) => sum + b.quantity, 0)} u
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!purchases || purchases.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No hay compras registradas.
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
