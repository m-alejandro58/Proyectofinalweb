import { getCustomerOrders, autoReleaseExpiredOrders } from "@/app/actions/customer-orders"
import { getFinancialAccounts } from "@/app/actions/accounts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, PackageCheck, Truck, Clock, CreditCard, PackageSearch, Archive, AlertTriangle, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreateOrderDialog } from "@/components/orders/create-order-dialog"
import { OrderDetailsDialog } from "@/components/orders/order-details-dialog"
import { OrdersSearch } from "@/components/orders/orders-search"

export default async function OrdersPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string }>
}) {
    const { query: queryRaw } = await searchParams
    const query = queryRaw || ""
    // Auto-release expired reservations (7+ days)
    await autoReleaseExpiredOrders()

    const { data: orders } = await getCustomerOrders(undefined, query)
    const { data: accounts } = await getFinancialAccounts()

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount)

    // Summary calculations
    const activeOrders = orders?.filter((o: any) => !["DELIVERED", "CANCELLED"].includes(o.status)) || []
    const customOrders = orders?.filter((o: any) => o.type === "CUSTOM") || []
    const layawayOrders = orders?.filter((o: any) => o.type === "LAYAWAY") || []
    const creditOrders = orders?.filter((o: any) => o.type === "CREDIT") || []
    const pendingDelivery = orders?.filter((o: any) => ["ARRIVED", "PAID"].includes(o.status)) || []
    const totalPendingRevenue = activeOrders.reduce((sum: number, o: any) => sum + (o.agreedPrice - o.totalPaid), 0)

    // Credit-specific
    const activeCreditOrders = creditOrders.filter((o: any) => o.status === "ACTIVE")
    const creditPendingTotal = activeCreditOrders.reduce((sum: number, o: any) => sum + (o.agreedPrice - o.totalPaid), 0)

    // Mora calculation helper: days since last payment or creation
    const getDaysSinceLastPayment = (order: any) => {
        if (order.type !== "CREDIT" || order.status !== "ACTIVE") return 0
        const remaining = order.agreedPrice - order.totalPaid
        if (remaining <= 0) return 0
        const lastPayment = order.payments?.length > 0
            ? new Date(order.payments[order.payments.length - 1].date)
            : new Date(order.requestDate)
        return Math.floor((Date.now() - lastPayment.getTime()) / (1000 * 60 * 60 * 24))
    }

    // WhatsApp collection message builder
    const buildWhatsAppUrl = (order: any) => {
        const clientPhone = order.client?.phone
        if (!clientPhone) return null

        // Clean phone number: remove spaces, dashes, plus signs, parentheses
        let cleanPhone = clientPhone.replace(/[\s\-\+\(\)]/g, '')
        // Prepend Colombia country code if not present
        if (!cleanPhone.startsWith('57') && cleanPhone.length === 10) {
            cleanPhone = '57' + cleanPhone
        }

        const customerName = order.client?.name || 'Cliente'
        const pendingAmount = formatCurrency(order.agreedPrice - order.totalPaid)

        // Build product list from items array or fallback to description
        const productList = order.items && order.items.length > 0
            ? order.items.map((item: any) => `${item.quantity}x ${item.productName}`).join(', ')
            : order.description

        const message = `Hola ${customerName}, esperamos que te encuentres muy bien.\n\nNos comunicamos del área de cartera de Hardsoft Technology para recordarte amablemente que actualmente presentas un saldo pendiente de ${pendingAmount} correspondiente a tu compra a crédito de:\n\n${productList}\n\nPor favor, indícanos si requieres nuevamente los datos de nuestras cuentas (Nequi, Davivienda, etc.) para registrar tu abono.\n\nQuedamos a tu entera disposición. ¡Feliz día!`

        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    }

    const getStatusBadge = (status: string) => {
        const map: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
            "PENDING": { label: "Pendiente", variant: "outline" },
            "ORDERED": { label: "Ordenado", variant: "secondary" },
            "IN_TRANSIT": { label: "En Tránsito", variant: "secondary" },
            "ARRIVED": { label: "Llegó", variant: "default" },
            "ACTIVE": { label: "Activo", variant: "secondary" },
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
        if (type === "CREDIT") return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">💳 Crédito</Badge>
        return <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Apartado</Badge>
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pedidos, Apartados & Créditos</h1>
                    <p className="text-muted-foreground">Gestiona pedidos, productos separados y créditos directos a clientes.</p>
                </div>
                <div className="flex flex-col sm:flex-row w-full md:w-auto items-center gap-2">
                    <OrdersSearch />
                    <div className="w-full sm:w-auto mt-2 sm:mt-0">
                        <CreateOrderDialog accounts={accounts || []} />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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

                <Card className="border-amber-500/30">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Créditos Activos</CardTitle>
                        <CreditCard className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-500">{activeCreditOrders.length}</div>
                        <p className="text-xs text-muted-foreground">Pendiente: {formatCurrency(creditPendingTotal)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Orders Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Todos los Pedidos, Apartados y Créditos</CardTitle>
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
                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-1 flex-wrap">
                                                {getStatusBadge(order.status)}
                                                {(() => {
                                                    const days = getDaysSinceLastPayment(order)
                                                    if (days > 15) return (
                                                        <Badge variant="destructive" className="text-xs animate-pulse">
                                                            ⚠️ Mora: +{days}d
                                                        </Badge>
                                                    )
                                                    return null
                                                })()}
                                            </div>
                                        </td>
                                        <td className="p-3 text-muted-foreground">
                                            {new Date(order.requestDate).toLocaleDateString('es-CO')}
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <OrderDetailsDialog order={order} accounts={accounts || []} />
                                                {(() => {
                                                    const days = getDaysSinceLastPayment(order)
                                                    if (days > 15 && order.client?.phone) {
                                                        const waUrl = buildWhatsAppUrl(order)
                                                        if (waUrl) return (
                                                            <a href={waUrl} target="_blank" rel="noopener noreferrer">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-500/10" title="Cobrar por WhatsApp">
                                                                    <MessageCircle className="h-4 w-4" />
                                                                </Button>
                                                            </a>
                                                        )
                                                    }
                                                    return null
                                                })()}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {(!orders || orders.length === 0) && (
                                    <tr>
                                        <td colSpan={9} className="text-center py-12 text-muted-foreground">
                                            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                            {query ? (
                                                <p>No se encontraron pedidos que coincidan con &apos;{query}&apos;.</p>
                                            ) : (
                                                <>
                                                    <p>No hay pedidos ni apartados registrados.</p>
                                                    <p className="text-xs mt-1">Crea uno con el botón superior.</p>
                                                </>
                                            )}
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
