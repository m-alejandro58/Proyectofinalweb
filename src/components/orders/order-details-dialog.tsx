"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Eye, Plus, Trash2, CheckCircle, XCircle, Truck, Package, Clock, Receipt, DollarSign, AlertTriangle, ShieldAlert, Unlock, CreditCard } from "lucide-react"
import { addOrderPayment, updateOrderStatus, cancelOrder, releaseReservedStock } from "@/app/actions/customer-orders"

type Props = {
    order: any
    accounts: any[]
}

export function OrderDetailsDialog({ order, accounts }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [showPaymentForm, setShowPaymentForm] = useState(false)

    // Supplier payment form (for CUSTOM → ORDERED)
    const [showSupplierForm, setShowSupplierForm] = useState(false)
    const [supplierAccountId, setSupplierAccountId] = useState("")
    const [supplierInvoice, setSupplierInvoice] = useState("")
    const [actualCost, setActualCost] = useState(order.estimatedCost || 0)

    // Delivery form (for → DELIVERED)
    const [showDeliveryForm, setShowDeliveryForm] = useState(false)
    const [deliveryMode, setDeliveryMode] = useState<"pay" | "unpaid" | null>(null)
    const [unpaidReason, setUnpaidReason] = useState("")
    const [deliveryPayments, setDeliveryPayments] = useState<{ amount: number, method: string, accountId: string }[]>([
        { amount: 0, method: "Efectivo", accountId: "" }
    ])

    // Client payment form (split payments for partial payments during order)
    const [payments, setPayments] = useState<{ amount: number, method: string, accountId: string }[]>([
        { amount: 0, method: "Efectivo", accountId: "" }
    ])

    const remaining = order.agreedPrice - order.totalPaid

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount)

    // ---- Partial payment helpers ----
    const addPaymentRow = () => {
        setPayments([...payments, { amount: 0, method: "Efectivo", accountId: "" }])
    }
    const removePaymentRow = (idx: number) => {
        if (payments.length <= 1) return
        setPayments(payments.filter((_, i) => i !== idx))
    }
    const updatePaymentRow = (idx: number, field: string, value: any) => {
        const updated = [...payments]
        updated[idx] = { ...updated[idx], [field]: value }
        setPayments(updated)
    }

    // ---- Delivery payment helpers ----
    const addDeliveryPaymentRow = () => {
        setDeliveryPayments([...deliveryPayments, { amount: 0, method: "Efectivo", accountId: "" }])
    }
    const removeDeliveryPaymentRow = (idx: number) => {
        if (deliveryPayments.length <= 1) return
        setDeliveryPayments(deliveryPayments.filter((_, i) => i !== idx))
    }
    const updateDeliveryPaymentRow = (idx: number, field: string, value: any) => {
        const updated = [...deliveryPayments]
        updated[idx] = { ...updated[idx], [field]: value }
        setDeliveryPayments(updated)
    }

    // ---- Handlers ----
    const handleAddPayment = async () => {
        const validPayments = payments.filter(p => p.amount > 0 && p.accountId)
        if (validPayments.length === 0) {
            alert("Agregue al menos un pago con monto y cuenta.")
            return
        }

        const total = validPayments.reduce((sum, p) => sum + p.amount, 0)
        if (total > remaining) {
            alert(`El total de pagos ($${total.toLocaleString()}) excede el saldo pendiente ($${remaining.toLocaleString()}).`)
            return
        }

        setLoading(true)
        const res = await addOrderPayment(order.id, validPayments)
        if (res.success) {
            setShowPaymentForm(false)
            setPayments([{ amount: 0, method: "Efectivo", accountId: "" }])
            router.refresh()
            setOpen(false)
        } else {
            alert(res.error)
        }
        setLoading(false)
    }

    const handleStatusChange = async (newStatus: string) => {
        // If transitioning a CUSTOM order to ORDERED, show supplier payment form first
        if (order.type === "CUSTOM" && newStatus === "ORDERED") {
            setShowSupplierForm(true)
            return
        }

        // If transitioning to DELIVERED and there's remaining balance, show delivery form
        if (newStatus === "DELIVERED" && remaining > 0) {
            setShowDeliveryForm(true)
            setDeliveryPayments([{ amount: remaining, method: "Efectivo", accountId: "" }])
            return
        }

        setLoading(true)
        const res = await updateOrderStatus(order.id, newStatus)
        if (res.success) {
            router.refresh()
            setOpen(false)
        } else {
            alert(res.error)
        }
        setLoading(false)
    }

    // Confirm supplier payment and advance to ORDERED
    const handleConfirmSupplierPayment = async () => {
        if (!supplierAccountId) {
            alert("Debe seleccionar la cuenta desde donde pagó al proveedor.")
            return
        }
        if (actualCost <= 0) {
            alert("El costo al proveedor debe ser mayor a 0.")
            return
        }

        setLoading(true)
        const res = await updateOrderStatus(order.id, "ORDERED", {
            supplierPaymentAccountId: supplierAccountId,
            supplierInvoice: supplierInvoice || undefined,
            actualCost: actualCost,
        })
        if (res.success) {
            setShowSupplierForm(false)
            router.refresh()
            setOpen(false)
        } else {
            alert(res.error)
        }
        setLoading(false)
    }

    // Confirm delivery with payment
    const handleConfirmDeliveryWithPayment = async () => {
        const validPayments = deliveryPayments.filter(p => p.amount > 0 && p.accountId)
        if (validPayments.length === 0) {
            alert("Debe registrar al menos un pago con monto y cuenta.")
            return
        }

        setLoading(true)
        const res = await updateOrderStatus(order.id, "DELIVERED", {
            deliveryPayments: validPayments,
        })
        if (res.success) {
            setShowDeliveryForm(false)
            router.refresh()
            setOpen(false)
        } else {
            alert(res.error)
        }
        setLoading(false)
    }

    // Confirm delivery without payment
    const handleConfirmDeliveryUnpaid = async () => {
        if (!unpaidReason.trim()) {
            alert("Debe indicar el motivo por el cual se entrega sin pago completo.")
            return
        }

        setLoading(true)
        const res = await updateOrderStatus(order.id, "DELIVERED", {
            deliveredWithoutPayment: true,
            unpaidReason: unpaidReason.trim(),
        })
        if (res.success) {
            setShowDeliveryForm(false)
            router.refresh()
            setOpen(false)
        } else {
            alert(res.error)
        }
        setLoading(false)
    }

    const handleCancel = async () => {
        if (!confirm("¿Está seguro de cancelar este pedido? " + (order.type === "LAYAWAY" ? "El producto volverá al inventario." : "Se marcará como cancelado."))) return

        setLoading(true)
        const res = await cancelOrder(order.id)
        if (res.success) {
            router.refresh()
            setOpen(false)
        } else {
            alert(res.error)
        }
        setLoading(false)
    }

    // Status timeline
    const getSteps = () => {
        if (order.type === "CUSTOM") {
            return [
                { key: "PENDING", label: "Pendiente", icon: Clock },
                { key: "ORDERED", label: "Ordenado", icon: Package },
                { key: "IN_TRANSIT", label: "En Tránsito", icon: Truck },
                { key: "ARRIVED", label: "Llegó", icon: CheckCircle },
                { key: "DELIVERED", label: "Entregado", icon: CheckCircle },
            ]
        }
        if (order.type === "CREDIT") {
            return [
                { key: "ACTIVE", label: "Activo", icon: CreditCard },
                { key: "PAID", label: "Pagado", icon: CheckCircle },
            ]
        }
        return [
            { key: "RESERVED", label: "Separado", icon: Clock },
            { key: "PAYING", label: "Abonando", icon: Package },
            { key: "PAID", label: "Pagado", icon: CheckCircle },
            { key: "DELIVERED", label: "Entregado", icon: CheckCircle },
        ]
    }

    const steps = getSteps()
    const currentStepIdx = steps.findIndex(s => s.key === order.status)

    // Next valid status
    const getNextStatus = () => {
        if (order.status === "DELIVERED" || order.status === "CANCELLED") return null
        if (order.type === "CUSTOM") {
            const flow: Record<string, string> = {
                "PENDING": "ORDERED",
                "ORDERED": "IN_TRANSIT",
                "IN_TRANSIT": "ARRIVED",
                "ARRIVED": "DELIVERED",
            }
            return flow[order.status] || null
        } else if (order.type === "CREDIT") {
            // Credits don't have manual status transitions — they auto-complete via payments
            return null
        } else {
            // LAYAWAY: PAID → DELIVERED
            if (order.status === "PAID") return "DELIVERED"
            return null
        }
    }

    const nextStatus = getNextStatus()

    const nextStatusLabel: Record<string, string> = {
        "ORDERED": "Marcar como Ordenado al Proveedor",
        "IN_TRANSIT": "Marcar En Tránsito",
        "ARRIVED": "Marcar como Llegó (agrega al inventario)",
        "DELIVERED": remaining > 0 ? `Entregar (Pendiente: ${formatCurrency(remaining)})` : "Marcar como Entregado",
    }

    // ---- Payment method selector (reusable) ----
    const PaymentMethodSelect = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
                <SelectItem value="Crédito">Tarjeta Crédito</SelectItem>
                <SelectItem value="Nequi">Nequi</SelectItem>
            </SelectContent>
        </Select>
    )

    const AccountSelect = ({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder?: string }) => (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger>
                <SelectValue placeholder={placeholder || "Seleccione cuenta..."} />
            </SelectTrigger>
            <SelectContent>
                {accounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.type})
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )

    return (
        <Dialog open={open} onOpenChange={(v) => {
            setOpen(v)
            if (!v) {
                setShowSupplierForm(false)
                setShowPaymentForm(false)
                setShowDeliveryForm(false)
                setDeliveryMode(null)
                setUnpaidReason("")
            }
        }}>
            <DialogTrigger asChild>
                <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {order.type === "CUSTOM" ? "Pedido Especial" : order.type === "CREDIT" ? "💳 Crédito Directo" : "Apartado"} — {order.description}
                    </DialogTitle>
                    <DialogDescription>
                        Cliente: {order.client?.name} | Creado: {new Date(order.requestDate).toLocaleDateString('es-CO')}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Status Timeline */}
                    {order.status !== "CANCELLED" && (
                        <div className="flex items-center gap-1 overflow-x-auto pb-2">
                            {steps.map((step, idx) => {
                                const isCompleted = idx < currentStepIdx
                                const isCurrent = idx === currentStepIdx
                                const StepIcon = step.icon

                                return (
                                    <div key={step.key} className="flex items-center">
                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${isCompleted ? "bg-green-500/20 text-green-500" :
                                            isCurrent ? "bg-primary/20 text-primary ring-2 ring-primary/30" :
                                                "bg-muted text-muted-foreground"
                                            }`}>
                                            <StepIcon className="h-3.5 w-3.5" />
                                            {step.label}
                                        </div>
                                        {idx < steps.length - 1 && (
                                            <div className={`w-6 h-0.5 mx-1 ${isCompleted ? "bg-green-500" : "bg-muted"
                                                }`} />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {order.status === "CANCELLED" && (
                        <div className="p-4 bg-destructive/10 rounded-lg text-center">
                            <Badge variant="destructive" className="text-base px-4 py-1">CANCELADO</Badge>
                        </div>
                    )}

                    {/* Financial Summary */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 rounded-lg border text-center">
                            <p className="text-xs text-muted-foreground">Precio Acordado</p>
                            <p className="text-lg font-bold">{formatCurrency(order.agreedPrice)}</p>
                        </div>
                        <div className="p-3 rounded-lg border text-center">
                            <p className="text-xs text-muted-foreground">Total Pagado</p>
                            <p className="text-lg font-bold text-green-500">{formatCurrency(order.totalPaid)}</p>
                        </div>
                        <div className="p-3 rounded-lg border text-center">
                            <p className="text-xs text-muted-foreground">Pendiente</p>
                            <p className={`text-lg font-bold ${remaining > 0 ? "text-orange-500" : "text-green-500"}`}>
                                {formatCurrency(remaining)}
                            </p>
                        </div>
                    </div>

                    {/* Payment Progress Bar */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span>Progreso de pago</span>
                            <span>{Math.round((order.totalPaid / order.agreedPrice) * 100)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${Math.min((order.totalPaid / order.agreedPrice) * 100, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Multi-item list (CREDIT) */}
                    {order.type === "CREDIT" && order.items && order.items.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold mb-2">📦 Productos del Crédito</h4>
                            <div className="rounded-lg border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/50 text-xs">
                                            <th className="text-left p-2">Producto</th>
                                            <th className="text-center p-2">Cant.</th>
                                            <th className="text-right p-2">Precio Unit.</th>
                                            <th className="text-right p-2">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.items.map((item: any) => (
                                            <tr key={item.id} className="border-t">
                                                <td className="p-2 font-medium">{item.productName}</td>
                                                <td className="p-2 text-center">{item.quantity}</td>
                                                <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                                                <td className="p-2 text-right font-medium">{formatCurrency(item.unitPrice * item.quantity)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Order Details */}
                    <div className="grid gap-2 text-sm">
                        {order.provider && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Proveedor:</span>
                                <span>{order.provider.name}</span>
                            </div>
                        )}
                        {order.estimatedCost && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Costo Proveedor:</span>
                                <span>{formatCurrency(order.estimatedCost)}</span>
                            </div>
                        )}
                        {order.supplierInvoice && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Factura Proveedor:</span>
                                <span className="flex items-center gap-1">
                                    <Receipt className="h-3.5 w-3.5" />
                                    {order.supplierInvoice}
                                </span>
                            </div>
                        )}
                        {order.expectedArrival && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Llegada Estimada:</span>
                                <span>{new Date(order.expectedArrival).toLocaleDateString('es-CO')}</span>
                            </div>
                        )}
                        {order.notes && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Notas:</span>
                                <span className="text-right max-w-[60%]">{order.notes}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Cantidad:</span>
                            <span>{order.quantity}</span>
                        </div>
                        {order.estimatedCost && order.estimatedCost > 0 && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Ganancia Estimada:</span>
                                <span className="font-medium text-green-500">
                                    {formatCurrency(order.agreedPrice - order.estimatedCost)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* ========== SUPPLIER PAYMENT FORM (CUSTOM → ORDERED) ========== */}
                    {showSupplierForm && (
                        <div className="border-2 border-primary/30 rounded-lg p-4 space-y-4 bg-primary/5">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Pago al Proveedor
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                Registre el pago al proveedor. Esto descontará el monto de la cuenta seleccionada.
                            </p>

                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="grid gap-1">
                                    <Label className="text-xs">Costo Real al Proveedor</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={actualCost || ""}
                                        onChange={e => setActualCost(parseFloat(e.target.value) || 0)}
                                        placeholder="$0"
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-xs">Nro. Factura del Proveedor</Label>
                                    <Input
                                        value={supplierInvoice}
                                        onChange={e => setSupplierInvoice(e.target.value)}
                                        placeholder="Ej: FAC-12345"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-1">
                                <Label className="text-xs">¿Desde qué cuenta se pagó?</Label>
                                <AccountSelect value={supplierAccountId} onChange={setSupplierAccountId} />
                            </div>

                            {actualCost > 0 && (
                                <div className="text-xs bg-muted p-2 rounded">
                                    <p>Ganancia estimada: <strong className="text-green-500">{formatCurrency(order.agreedPrice - actualCost)}</strong></p>
                                </div>
                            )}

                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" size="sm" onClick={() => setShowSupplierForm(false)}>
                                    Cancelar
                                </Button>
                                <Button size="sm" onClick={handleConfirmSupplierPayment} disabled={loading}>
                                    {loading ? "Procesando..." : "Confirmar y Marcar como Ordenado"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ========== DELIVERY FORM (→ DELIVERED) ========== */}
                    {showDeliveryForm && (
                        <div className="border-2 border-orange-500/40 rounded-lg p-4 space-y-4 bg-orange-500/5">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-orange-500">
                                <AlertTriangle className="h-4 w-4" />
                                Pago Pendiente al Entregar
                            </h4>
                            <p className="text-sm">
                                El cliente debe <strong>{formatCurrency(remaining)}</strong> de un total de {formatCurrency(order.agreedPrice)}.
                                ¿Cómo desea proceder?
                            </p>

                            {/* Mode selector */}
                            {deliveryMode === null && (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setDeliveryMode("pay")}
                                        className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-border hover:border-green-500/50 transition-all text-center"
                                    >
                                        <DollarSign className="h-6 w-6 text-green-500" />
                                        <p className="font-medium text-sm">Registrar Pago</p>
                                        <p className="text-xs text-muted-foreground">El cliente paga ahora</p>
                                    </button>
                                    <button
                                        onClick={() => setDeliveryMode("unpaid")}
                                        className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-border hover:border-destructive/50 transition-all text-center"
                                    >
                                        <AlertTriangle className="h-6 w-6 text-destructive" />
                                        <p className="font-medium text-sm">Entregar Sin Pago</p>
                                        <p className="text-xs text-muted-foreground">Requiere motivo obligatorio</p>
                                    </button>
                                </div>
                            )}

                            {/* Pay mode — collect delivery payment */}
                            {deliveryMode === "pay" && (
                                <div className="space-y-3">
                                    <h5 className="text-xs font-semibold uppercase text-muted-foreground">Registrar Pago del Cliente</h5>

                                    {deliveryPayments.map((dp, idx) => (
                                        <div key={idx} className="grid gap-3 md:grid-cols-4 items-end border-b pb-3 last:border-0">
                                            <div className="grid gap-1">
                                                <Label className="text-xs">Monto</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={dp.amount || ""}
                                                    onChange={e => updateDeliveryPaymentRow(idx, "amount", parseFloat(e.target.value) || 0)}
                                                    placeholder="$0"
                                                />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label className="text-xs">Método</Label>
                                                <PaymentMethodSelect value={dp.method} onChange={v => updateDeliveryPaymentRow(idx, "method", v)} />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label className="text-xs">¿Dónde entra?</Label>
                                                <AccountSelect value={dp.accountId} onChange={v => updateDeliveryPaymentRow(idx, "accountId", v)} placeholder="Cuenta..." />
                                            </div>
                                            <div>
                                                {deliveryPayments.length > 1 && (
                                                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeDeliveryPaymentRow(idx)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex items-center justify-between">
                                        <Button variant="ghost" size="sm" onClick={addDeliveryPaymentRow}>
                                            <Plus className="mr-1 h-3 w-3" /> Dividir pago
                                        </Button>
                                        <p className="text-sm">
                                            Total: <strong className="text-green-500">
                                                {formatCurrency(deliveryPayments.reduce((s, p) => s + p.amount, 0))}
                                            </strong>
                                            {" "}/ Pendiente: {formatCurrency(remaining)}
                                        </p>
                                    </div>

                                    <div className="flex gap-2 justify-end">
                                        <Button variant="outline" size="sm" onClick={() => setDeliveryMode(null)}>Atrás</Button>
                                        <Button size="sm" onClick={handleConfirmDeliveryWithPayment} disabled={loading}>
                                            {loading ? "Procesando..." : "Confirmar Pago y Entregar"}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Unpaid mode — require reason */}
                            {deliveryMode === "unpaid" && (
                                <div className="space-y-3">
                                    <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                                        <p className="text-xs text-destructive font-medium flex items-center gap-1">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            Está a punto de entregar el producto sin cobrar {formatCurrency(remaining)}
                                        </p>
                                    </div>

                                    <div className="grid gap-1">
                                        <Label className="text-xs font-semibold">Motivo (obligatorio) *</Label>
                                        <Textarea
                                            value={unpaidReason}
                                            onChange={e => setUnpaidReason(e.target.value)}
                                            placeholder="Explique detalladamente por qué se entrega sin el pago completo..."
                                            rows={3}
                                        />
                                    </div>

                                    <div className="flex gap-2 justify-end">
                                        <Button variant="outline" size="sm" onClick={() => setDeliveryMode(null)}>Atrás</Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={handleConfirmDeliveryUnpaid}
                                            disabled={loading || !unpaidReason.trim()}
                                        >
                                            {loading ? "Procesando..." : "Entregar Sin Pago Completo"}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Cancel delivery form */}
                            {deliveryMode === null && (
                                <div className="flex justify-end">
                                    <Button variant="outline" size="sm" onClick={() => setShowDeliveryForm(false)}>
                                        Cancelar
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Payment History */}
                    {order.payments && order.payments.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold mb-2">
                                {order.type === "CREDIT" ? "💳 Historial de Abonos" : "Historial de Pagos del Cliente"}
                            </h4>
                            <div className="space-y-2">
                                {order.payments.map((p: any) => (
                                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">{p.type}</Badge>
                                            <span>{p.method}</span>
                                            {p.account && <span className="text-muted-foreground text-xs">→ {p.account.name}</span>}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium text-green-500">{formatCurrency(p.amount)}</span>
                                            <span className="text-xs text-muted-foreground">{new Date(p.date).toLocaleDateString('es-CO')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add Partial Payment Form (during order lifecycle, not at delivery) */}
                    {!["DELIVERED", "CANCELLED"].includes(order.status) && !(order.type !== "CREDIT" && order.status === "PAID") && remaining > 0 && !showDeliveryForm && !showSupplierForm && (
                        <div className="border rounded-lg p-4 space-y-3">
                            {!showPaymentForm ? (
                                <Button variant="outline" className="w-full" onClick={() => setShowPaymentForm(true)}>
                                    <Plus className="mr-2 h-4 w-4" /> {order.type === "CREDIT" ? "Registrar Abono" : "Registrar Abono / Pago del Cliente"}
                                </Button>
                            ) : (
                                <>
                                    <h4 className="text-sm font-semibold">Registrar Pago del Cliente</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Puede dividir en varios métodos (ej: parte en efectivo, parte transferencia)
                                    </p>

                                    {payments.map((payment, idx) => (
                                        <div key={idx} className="grid gap-3 md:grid-cols-4 items-end border-b pb-3 last:border-0">
                                            <div className="grid gap-1">
                                                <Label className="text-xs">Monto</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={payment.amount || ""}
                                                    onChange={e => updatePaymentRow(idx, "amount", parseFloat(e.target.value) || 0)}
                                                    placeholder="$0"
                                                />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label className="text-xs">Método</Label>
                                                <PaymentMethodSelect value={payment.method} onChange={v => updatePaymentRow(idx, "method", v)} />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label className="text-xs">Cuenta</Label>
                                                <AccountSelect value={payment.accountId} onChange={v => updatePaymentRow(idx, "accountId", v)} placeholder="¿Dónde entra?" />
                                            </div>
                                            <div>
                                                {payments.length > 1 && (
                                                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removePaymentRow(idx)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex items-center justify-between">
                                        <Button variant="ghost" size="sm" onClick={addPaymentRow}>
                                            <Plus className="mr-1 h-3 w-3" /> Dividir pago
                                        </Button>
                                        <p className="text-sm">
                                            Total: <strong className="text-green-500">
                                                {formatCurrency(payments.reduce((s, p) => s + p.amount, 0))}
                                            </strong>
                                            {" "}/ Pendiente: {formatCurrency(remaining)}
                                        </p>
                                    </div>

                                    <div className="flex gap-2 justify-end">
                                        <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(false)}>Cancelar</Button>
                                        <Button size="sm" onClick={handleAddPayment} disabled={loading}>
                                            {loading ? "Procesando..." : "Confirmar Pago"}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Reserved Stock Info — only for ARRIVED orders with a reserved batch */}
                    {order.status === "ARRIVED" && order.reservedBatchId && !showDeliveryForm && !showSupplierForm && (() => {
                        const arrivedDate = order.arrivedDate ? new Date(order.arrivedDate) : null
                        const daysWaiting = arrivedDate ? Math.floor((Date.now() - arrivedDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
                        const isExpiringSoon = daysWaiting >= 5

                        return (
                            <div className={`rounded-lg p-4 space-y-3 border-2 ${isExpiringSoon ? "border-orange-500/40 bg-orange-500/5" : "border-blue-500/30 bg-blue-500/5"
                                }`}>
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                                        <ShieldAlert className={`h-4 w-4 ${isExpiringSoon ? "text-orange-500" : "text-blue-500"}`} />
                                        Stock Reservado
                                    </h4>
                                    <Badge variant="outline" className={isExpiringSoon ? "border-orange-500/50 text-orange-500" : ""}>
                                        {daysWaiting} día{daysWaiting !== 1 ? "s" : ""} esperando
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Este producto está en inventario pero <strong>reservado</strong> para el cliente.
                                    No está disponible para venta normal.
                                    {daysWaiting >= 7 && " Se liberará automáticamente al recargar la página."}
                                    {daysWaiting >= 5 && daysWaiting < 7 && ` Se liberará automáticamente en ${7 - daysWaiting} día${7 - daysWaiting !== 1 ? "s" : ""}.`}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    disabled={loading}
                                    onClick={async () => {
                                        if (!confirm("¿Liberar este producto para venta normal? El cliente ya no tendrá la reserva.")) return
                                        setLoading(true)
                                        const res = await releaseReservedStock(order.id)
                                        if (res.success) {
                                            router.refresh()
                                            setOpen(false)
                                        } else {
                                            alert(res.error)
                                        }
                                        setLoading(false)
                                    }}
                                >
                                    <Unlock className="mr-2 h-4 w-4" />
                                    Liberar para Venta Normal
                                </Button>
                            </div>
                        )
                    })()}

                    {/* Action Buttons */}
                    {!["DELIVERED", "CANCELLED", "PAID"].includes(order.status) && !showSupplierForm && !showDeliveryForm && (
                        <div className="flex gap-2 justify-between items-center pt-2 border-t">
                            <Button variant="destructive" size="sm" onClick={handleCancel} disabled={loading}>
                                <XCircle className="mr-2 h-4 w-4" /> Cancelar Pedido
                            </Button>
                            {nextStatus && (
                                <Button onClick={() => handleStatusChange(nextStatus)} disabled={loading}>
                                    {nextStatusLabel[nextStatus] || `Avanzar a ${nextStatus}`}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
