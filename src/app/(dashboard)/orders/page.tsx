import { getCustomerOrders, autoReleaseExpiredOrders } from "@/app/actions/customer-orders"
import { getFinancialAccounts } from "@/app/actions/accounts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, PackageCheck, Truck, Clock, CreditCard, PackageSearch, Archive } from "lucide-react"
import { CreateOrderDialog } from "@/components/orders/create-order-dialog"
import { OrderDetailsDialog } from "@/components/orders/order-details-dialog"

export default async function OrdersPage() {
    // Auto-release expired reservations (7+ days)
    await autoReleaseExpiredOrders()

    const { data: orders } = await getCustomerOrders()
    const { data: accounts } = await getFinancialAccounts()

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount)

    // Summary calculations
    const activeOrders = orders?.filter((o: any) => !["DELIVERED", "CANCELLED"].includes(o.status)) || []
    const customOrders = orders?.filter((o: any) => o.type === "CUSTOM") || []
    const layawayOrders = orders?.filter((o: any) => o.type === "LAYAWAY") || []
    const pendingDelivery = orders?.filter((o: any) => ["ARRIVED", "PAID"].includes(o.status)) || []
    const totalPendingRevenue = activeOrders.reduce((sum: number, o: any) => sum + (o.agreedPrice - o.totalPaid), 0)

    const getStatusBadge = (status: string) => {
        const map: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
            "PENDING": { label: "Pendiente", variant: "outline" },
            "ORDERED": { label: "Ordenado", variant: "secondary" },
            "IN_TRANSIT": { label: "En Tránsito", variant: "secondary" },
            "ARRIVED": { label: "Llegó", variant: "default" },
            "DELIVERED": { label: "Entregado", variant: "default" },
            "RESERVED": { label: "Separado", variant: "outline" },
            "PAYING": { label: "Abonando", variant: "secondary" },
            "PAID": { label: "Pagado", variant: "default" },
            "CANCELLED": { label: "Cancelado", variant: "destructive" },
        }
        const info = map[status] || { label: status, variant: "outline" as const }
        return <Badge variant={info.variant}>{info.label}</Badge>
    }

    const getTypeBadge = (type: string) => {
        if (type === "CUSTOM") return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Pedido</Badge>
        return <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Apartado</Badge>
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pedidos & Apartados</h1>
                    <p className="text-muted-foreground">Gestiona pedidos especiales de proveedores y productos separados por clientes.</p>
                </div>
                <CreateOrderDialog accounts={accounts || []} />
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pedidos Activos</CardTitle>
                        <PackageSearch className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{customOrders.filter((o: any) => !["DELIVERED", "CANCELLED"].includes(o.status)).length}</div>
                        <p className="text-xs text-muted-foreground">Pedidos especiales en proceso</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Apartados Activos</CardTitle>
                        <Archive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{layawayOrders.filter((o: any) => !["DELIVERED", "CANCELLED"].includes(o.status)).length}</div>
                        <p className="text-xs text-muted-foreground">Productos separados</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Listos p/ Entregar</CardTitle>
                        <PackageCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingDelivery.length}</div>
                        <p className="text-xs text-muted-foreground">Llegaron o ya pagados</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalPendingRevenue)}</div>
                        <p className="text-xs text-muted-foreground">Saldo pendiente de clientes</p>
                    </CardContent>
                </Card>
            </div>

            {/* Orders Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Todos los Pedidos y Apartados</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="text-left p-3 font-medium">Tipo</th>
                                    <th className="text-left p-3 font-medium">Cliente</th>
                                    <th className="text-left p-3 font-medium">Descripción</th>
                                    <th className="text-right p-3 font-medium">Precio</th>
                                    <th className="text-right p-3 font-medium">Pagado</th>
                                    <th className="text-right p-3 font-medium">Pendiente</th>
                                    <th className="text-center p-3 font-medium">Estado</th>
                                    <th className="text-left p-3 font-medium">Fecha</th>
                                    <th className="text-center p-3 font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders?.map((order: any) => (
                                    <tr key={order.id} className="border-b hover:bg-muted/30 transition-colors">
                                        <td className="p-3">{getTypeBadge(order.type)}</td>
                                        <td className="p-3 font-medium">{order.client?.name || "N/A"}</td>
                                        <td className="p-3 max-w-[200px] truncate">{order.description}</td>
                                        <td className="p-3 text-right">{formatCurrency(order.agreedPrice)}</td>
                                        <td className="p-3 text-right text-green-500">{formatCurrency(order.totalPaid)}</td>
                                        <td className="p-3 text-right text-orange-500">{formatCurrency(order.agreedPrice - order.totalPaid)}</td>
                                        <td className="p-3 text-center">{getStatusBadge(order.status)}</td>
                                        <td className="p-3 text-muted-foreground">
                                            {new Date(order.requestDate).toLocaleDateString('es-CO')}
                                        </td>
                                        <td className="p-3 text-center">
                                            <OrderDetailsDialog order={order} accounts={accounts || []} />
                                        </td>
                                    </tr>
                                ))}
                                {(!orders || orders.length === 0) && (
                                    <tr>
                                        <td colSpan={9} className="text-center py-12 text-muted-foreground">
                                            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                            <p>No hay pedidos ni apartados registrados.</p>
                                            <p className="text-xs mt-1">Crea uno con el botón superior.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
