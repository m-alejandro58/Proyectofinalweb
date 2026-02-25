import { getFullInventory, getFullMetrics, getFullShipments } from "@/app/actions/full-inventory"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Warehouse, AlertTriangle, Timer, DollarSign, Package, PackageCheck } from "lucide-react"
import { SendToFullDialog } from "@/components/full/send-to-full-dialog"
import { FullItemActions } from "@/components/full/full-item-actions"
import { Button } from "@/components/ui/button"

const STATUS_LABELS: Record<string, string> = {
    SHIPPING: "En Tránsito",
    IN_WAREHOUSE: "En Bodega",
    SOLD_OUT: "Agotado",
    RETURNED: "Devuelto",
    RECEIVED: "Recibido"
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
        case "SHIPPING": return "secondary"
        case "IN_WAREHOUSE": return "default"
        case "RECEIVED": return "default"
        case "SOLD_OUT": return "outline"
        case "RETURNED": return "outline"
        default: return "default"
    }
}

export default async function FullPage() {
    const [inventoryRes, metricsRes, shipmentsRes] = await Promise.all([
        getFullInventory(),
        getFullMetrics(),
        getFullShipments()
    ])

    const items = inventoryRes.data || []
    const shipments = shipmentsRes.data || []
    const metrics = metricsRes.data || {
        totalInStock: 0,
        totalValue: 0,
        alertCount: 0,
        avgDaysToSell: 0
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">MercadoLibre FULL</h1>
                    <p className="text-muted-foreground">Gestión de inventario y envíos a bodega.</p>
                </div>
                <SendToFullDialog />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unidades en Bodega</CardTitle>
                        <Warehouse className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalInStock}</div>
                        <p className="text-xs text-muted-foreground">Disponible para venta en ML</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor en Bodega</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${metrics.totalValue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Costo de inventario</p>
                    </CardContent>
                </Card>
                <Card className={metrics.alertCount > 0 ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className={`text-sm font-medium ${metrics.alertCount > 0 ? "text-red-500" : ""}`}>
                            Alertas de Antigüedad
                        </CardTitle>
                        <AlertTriangle className={`h-4 w-4 ${metrics.alertCount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${metrics.alertCount > 0 ? "text-red-500" : ""}`}>
                            {metrics.alertCount}
                        </div>
                        <p className={`text-xs ${metrics.alertCount > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                            Items &gt; 60 días sin vender
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rotación Promedio</CardTitle>
                        <Timer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.avgDaysToSell ? `${metrics.avgDaysToSell} días` : "N/A"}</div>
                        <p className="text-xs text-muted-foreground">Tiempo promedio en bodega</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="inventory">
                <TabsList>
                    <TabsTrigger value="inventory">Inventario (Lotes)</TabsTrigger>
                    <TabsTrigger value="shipments">Envíos (Paquetes)</TabsTrigger>
                </TabsList>

                <TabsContent value="inventory">
                    <Card>
                        <CardHeader>
                            <CardTitle>Lotes en Bodega</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha Envío</TableHead>
                                        <TableHead>Producto</TableHead>
                                        <TableHead>Envío</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-center">En Bodega</TableHead>
                                        <TableHead className="text-center">Vendidos</TableHead>
                                        <TableHead>Antigüedad</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="text-sm">
                                                {new Date(item.sentAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div>{item.productName}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    Enviado: {item.quantitySent} uds
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {item.shipment?.note || "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(item.status)}>
                                                    {STATUS_LABELS[item.status] || item.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center font-bold">
                                                {item.quantityInStock}
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground">
                                                {item.quantitySold}
                                            </TableCell>
                                            <TableCell>
                                                {item.arrivedAt ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-medium ${item.daysInWarehouse > 60 ? "text-red-600" :
                                                                item.daysInWarehouse > 45 ? "text-orange-500" : ""
                                                            }`}>
                                                            {item.daysInWarehouse} días
                                                        </span>
                                                        {item.daysInWarehouse > 60 && item.quantityInStock > 0 && (
                                                            <div title="Alerta: >60 días sin vender">
                                                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <FullItemActions item={item} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {items.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center">
                                                No hay inventario en bodega FULL.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="shipments">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial de Envíos</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Nota / Guía</TableHead>
                                        <TableHead className="text-center">Items</TableHead>
                                        <TableHead>Costo Envío</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Llegada</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shipments.map((shipment: any) => (
                                        <TableRow key={shipment.id}>
                                            <TableCell>
                                                {new Date(shipment.sentAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {shipment.note || "Sin nota"}
                                                <div className="text-xs text-muted-foreground">{shipment.id.slice(0, 8)}...</div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {shipment.items?.length || 0} productos
                                            </TableCell>
                                            <TableCell>
                                                ${shipment.shippingCost.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(shipment.status)}>
                                                    {STATUS_LABELS[shipment.status] || shipment.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {shipment.arrivedAt ? new Date(shipment.arrivedAt).toLocaleDateString() : "—"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {shipment.status === "SHIPPING" && (
                                                    <FullItemActions item={{ ...shipment, shipmentId: shipment.id }} />
                                                    // Reusing FullItemActions logic just for confirmation? 
                                                    // No, properly logic was: FullItemActions takes an item, uses shipmentId inside.
                                                    // Here we don't have an item, we have a shipment.
                                                    // We can put a direct button here or map a fake item to reuse the component.
                                                    // Better: direct button or new component.
                                                    // Reusing logic by passing dummy item with shipmentId is hacky but works given FullItemActions only checks shipmentId for confirm.
                                                    // I'll stick to hacky reuse to avoid duplication if it works, or just write the button logic.
                                                    // Actually, I'll pass a dummy item with status SHIPPING and shipmentId.
                                                )}
                                                {shipment.status === "RECEIVED" && (
                                                    <PackageCheck className="h-4 w-4 text-green-500 ml-auto" />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {shipments.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                No hay envíos registrados.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
