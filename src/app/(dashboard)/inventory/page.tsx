import { getProducts } from "@/app/actions/inventory"
import { CreateProductDialog } from "@/components/inventory/create-product-dialog"
import { ProductTable } from "@/components/inventory/product-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Truck } from "lucide-react"
import { ReceiveStockButton } from "@/components/inventory/receive-stock-button"
import { ExportButton } from "@/components/export-buttons"

export default async function InventoryPage() {
    const { data: products } = await getProducts()

    // Extract incoming batches
    const incomingBatches: any[] = []
    products?.forEach((p: any) => {
        p.batches.forEach((b: any) => {
            if (b.status === 'TRANSIT') {
                incomingBatches.push({ ...b, productName: p.name, productSku: p.sku })
            }
        })
    })

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
                    <p className="text-muted-foreground">Catalogo de productos y control de existencias.</p>
                </div>
                <div className="flex gap-2">
                    <ExportButton table="inventory" label="Exportar CSV" />
                    <CreateProductDialog />
                </div>
            </div>

            {/* Incoming Batches Section */}
            {incomingBatches.length > 0 && (
                <Card className="border-blue-500/20 bg-blue-500/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2 text-blue-600">
                            <Truck className="h-5 w-5" />
                            Mercancía en Tránsito / Importaciones
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-center">Cantidad</TableHead>
                                    <TableHead className="text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {incomingBatches.map((batch: any) => (
                                    <TableRow key={batch.id}>
                                        <TableCell>
                                            <div className="font-medium">{batch.productName}</div>
                                            <div className="text-xs text-muted-foreground">{batch.productSku}</div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold">{batch.quantity}</TableCell>
                                        <TableCell className="text-right">
                                            <ReceiveStockButton batchId={batch.id} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="p-6">
                    <ProductTable products={products || []} />
                </CardContent>
            </Card>
        </div>
    )
}
