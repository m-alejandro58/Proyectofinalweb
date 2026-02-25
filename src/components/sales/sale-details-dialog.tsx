"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Eye, AlertTriangle } from "lucide-react"
import { getSaleById } from "@/app/actions/sales"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

// Helper functions for translations
const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
        'CHANGE_OF_MIND': 'Cambio de Opinión',
        'DEFECTIVE': 'Producto Defectuoso',
        'WARRANTY': 'Garantía',
        'WRONG_ITEM': 'Artículo Equivocado',
        'OTHER': 'Otro'
    }
    return labels[reason] || reason
}

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        'PENDING': 'Pendiente',
        'APPROVED': 'Aprobado',
        'REJECTED': 'Rechazado',
        'COMPLETED': 'Completado'
    }
    return labels[status] || status
}

export function SaleDetailsDialog({ saleId }: { saleId: string }) {
    const [open, setOpen] = useState(false)
    const [sale, setSale] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open && !sale) {
            loadSale()
        }
    }, [open])

    const loadSale = async () => {
        setLoading(true)
        try {
            const result = await getSaleById(saleId)
            if (result.success && result.data) {
                setSale(result.data)
            }
        } catch (error) {
            console.error("Error loading sale:", error)
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Detalles
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex justify-between items-start pr-8">
                        <div>
                            <DialogTitle>Detalles de Venta</DialogTitle>
                            <DialogDescription>
                                Información completa de la transacción
                            </DialogDescription>
                        </div>
                        {sale && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200"
                                onClick={() => window.open(`/receipt/${sale.id}`, '_blank')}
                            >
                                Imprimir Remisión
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                {loading && (
                    <div className="py-8 text-center text-muted-foreground">
                        Cargando detalles...
                    </div>
                )}

                {!loading && sale && (
                    <div className="space-y-6">
                        {/* Información General */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Fecha</p>
                                <p className="font-medium">{new Date(sale.date).toLocaleDateString('es-CO', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Cliente</p>
                                <p className="font-medium">{sale.client?.name || 'Cliente Casual'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Plataforma/Canal</p>
                                <Badge variant="outline">{sale.channel}</Badge>
                            </div>
                            {sale.paymentMethod && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Medio de Pago</p>
                                    <p className="font-medium">{sale.paymentMethod}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-muted-foreground">Cuenta de Depósito</p>
                                <p className="font-medium">{sale.depositAccount?.name}</p>
                            </div>
                            {sale.invoiceNumber && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Factura</p>
                                    <p className="font-medium">{sale.invoiceNumber}</p>
                                </div>
                            )}
                        </div>

                        {sale.isEdited && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-semibold text-sm">Venta Modificada</p>
                                    <p className="text-sm mt-1">{sale.editReason}</p>
                                </div>
                            </div>
                        )}

                        <Separator />

                        {/* Items Vendidos */}
                        <div>
                            <h3 className="font-semibold mb-3">Productos Vendidos</h3>
                            <div className="space-y-3">
                                {sale.items.map((item: any) => (
                                    <div key={item.id} className="bg-muted p-4 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="font-medium">{item.productName}</p>
                                                {item.serialNumber && (
                                                    <p className="text-sm text-muted-foreground">
                                                        Serial: <span className="font-mono">{item.serialNumber}</span>
                                                    </p>
                                                )}
                                                {item.warrantyEnd && (
                                                    <p className="text-sm text-muted-foreground">
                                                        Garantía hasta: {new Date(item.warrantyEnd).toLocaleDateString('es-CO')}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-muted-foreground">
                                                    {item.quantity} x ${item.unitPrice.toLocaleString()}
                                                </p>
                                                <p className="font-bold">
                                                    ${(item.quantity * item.unitPrice).toLocaleString()}
                                                </p>
                                                {item.unitCost && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Costo: ${item.unitCost.toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Separator />

                        {/* Resumen Financiero */}
                        <div>
                            <h3 className="font-semibold mb-3">Resumen Financiero</h3>
                            <div className="space-y-2 bg-muted p-4 rounded-lg">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal (Bruto)</span>
                                    <span className="font-medium">${sale.grossAmount.toLocaleString()}</span>
                                </div>
                                {sale.platformFee > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">- Comisión Plataforma</span>
                                        <span className="text-destructive">-${sale.platformFee.toLocaleString()}</span>
                                    </div>
                                )}
                                {sale.shippingCost > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">- Costo Envío</span>
                                        <span className="text-destructive">-${sale.shippingCost.toLocaleString()}</span>
                                    </div>
                                )}
                                {sale.taxes > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">- Impuestos</span>
                                        <span className="text-destructive">-${sale.taxes.toLocaleString()}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Neto Recibido</span>
                                    <span className="text-green-600">${sale.netAmount.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Devoluciones */}
                        {sale.returns && sale.returns.length > 0 && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="font-semibold mb-3">Devoluciones</h3>
                                    <div className="space-y-2">
                                        {sale.returns.map((returnRecord: any) => (
                                            <div key={returnRecord.id} className="bg-destructive/10 p-3 rounded-lg text-sm">
                                                <div className="flex justify-between">
                                                    <span>
                                                        {new Date(returnRecord.requestedAt).toLocaleDateString()} - {getReasonLabel(returnRecord.reason)}
                                                    </span>
                                                    <Badge variant={returnRecord.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                                        {getStatusLabel(returnRecord.status)}
                                                    </Badge>
                                                </div>
                                                <p className="text-muted-foreground mt-1">
                                                    Reembolso: ${returnRecord.refundAmount.toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
