"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Package } from "lucide-react"
import { markAsDisbursed } from "@/app/actions/deferred-payments"

type Props = {
    payment: any
    bankAccounts: any[]
}

export function MarkDisbursedDialog({ payment, bankAccounts }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [targetAccountId, setTargetAccountId] = useState("")
    const [notes, setNotes] = useState("")

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

    const formatDate = (d: Date | string) =>
        new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })

    const daysRemaining = Math.ceil(
        (new Date(payment.expectedDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    const handleSubmit = async () => {
        if (!targetAccountId) {
            alert("Seleccione la cuenta donde Sistecredito depositó el dinero")
            return
        }
        setLoading(true)
        const res = await markAsDisbursed(payment.id, targetAccountId, notes)
        if (res.success) {
            setOpen(false)
            setTargetAccountId("")
            setNotes("")
            router.refresh()
        } else {
            alert(res.error)
        }
        setLoading(false)
    }

    // Get product names from the sale items
    const products = payment.sale?.items || []
    const client = payment.sale?.client

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs">
                    <CheckCircle className="h-3 w-3 text-green-500" /> Marcar Pagado
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        Confirmar Desembolso
                    </DialogTitle>
                    <DialogDescription>
                        Registra el pago de Sistecredito/LuegoPago y selecciona la cuenta donde fue consignado.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Sale summary */}
                    <div className="rounded-lg bg-muted p-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Venta #</span>
                            <span className="font-mono font-medium">{payment.sale?.invoiceNumber || payment.saleId.slice(0, 8)}</span>
                        </div>
                        {client && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Cliente</span>
                                <span className="font-medium">{client.name}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Fecha venta</span>
                            <span>{formatDate(payment.saleDate)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Fecha esperada</span>
                            <span className={daysRemaining < 0 ? "text-red-500 font-medium" : ""}>
                                {formatDate(payment.expectedDate)}
                                {daysRemaining < 0
                                    ? ` (${Math.abs(daysRemaining)} días vencido)`
                                    : daysRemaining === 0 ? " (hoy)" : ` (en ${daysRemaining} días)`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Plataforma</span>
                            <Badge variant="secondary" className="text-[10px]">{payment.paymentMethod} / {payment.platform}</Badge>
                        </div>

                        {/* Products */}
                        {products.length > 0 && (
                            <div className="pt-1 border-t">
                                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                    <Package className="h-3 w-3" /> Productos vendidos:
                                </p>
                                {products.map((item: any) => (
                                    <div key={item.id} className="flex justify-between text-xs">
                                        <span>{item.quantity}× {item.productName}</span>
                                        <span className="font-medium">{formatCurrency(item.unitPrice * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between border-t pt-2">
                            <span className="font-semibold">Monto a recibir</span>
                            <span className="font-bold text-green-600">{formatCurrency(payment.amount)}</span>
                        </div>
                    </div>

                    {/* Target account */}
                    <div className="grid gap-2">
                        <Label>¿En qué cuenta consignó Sistecredito?</Label>
                        <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione la cuenta destino..." />
                            </SelectTrigger>
                            <SelectContent>
                                {bankAccounts.map((a: any) => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.name} — {formatCurrency(a.balance)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Notas (opcional)</Label>
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Ej: Consignación 26 Feb, ref 1234..."
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {loading ? "Registrando..." : "Confirmar Recibo"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
