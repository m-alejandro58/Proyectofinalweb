"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateSale } from "@/app/actions/sales"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export function EditSaleDialog({ sale, accounts }: { sale: any, accounts: any[] }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form state
    const [platformFee, setPlatformFee] = useState(sale.platformFee?.toString() || "0")
    const [shippingCost, setShippingCost] = useState(sale.shippingCost?.toString() || "0")
    const [taxes, setTaxes] = useState(sale.taxes?.toString() || "0")
    const [channel, setChannel] = useState(sale.channel || "PRESENCIAL")
    const [paymentMethod, setPaymentMethod] = useState(sale.paymentMethod || "")
    const [depositAccountId, setDepositAccountId] = useState(sale.depositAccountId || "")
    const [editReason, setEditReason] = useState("")

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!editReason.trim()) {
            alert("Escriba el motivo de la modificación")
            return
        }

        setLoading(true)
        const res = await updateSale(sale.id, {
            platformFee: Number(platformFee),
            shippingCost: Number(shippingCost),
            taxes: Number(taxes),
            channel,
            paymentMethod,
            depositAccountId,
            editReason: editReason.trim()
        })

        if (res.success) {
            setOpen(false)
            router.refresh()
            // Reset reason
            setEditReason("")
        } else {
            alert(res.error)
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val)
            if (!val) setEditReason("") // clear logic
        }}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Edit className="h-5 w-5" />
                        Modificar Venta
                    </DialogTitle>
                    <DialogDescription className="text-amber-600 flex gap-2 items-start bg-amber-50 p-3 rounded-md mt-2">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <span>Atención: Modificar una venta re-calculará la ganancia neta. Debes registrar un motivo para este cambio en el historial.</span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Comisión</Label>
                            <Input
                                type="number"
                                min="0" step="any"
                                value={platformFee}
                                onChange={e => setPlatformFee(e.target.value)}
                                className="col-span-3 text-destructive font-bold"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Envío</Label>
                            <Input
                                type="number"
                                min="0" step="any"
                                value={shippingCost}
                                onChange={e => setShippingCost(e.target.value)}
                                className="col-span-3 text-destructive font-bold"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Impuestos</Label>
                            <Input
                                type="number"
                                min="0" step="any"
                                value={taxes}
                                onChange={e => setTaxes(e.target.value)}
                                className="col-span-3 text-destructive font-bold"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Canal</Label>
                            <div className="col-span-3">
                                <Select value={channel} onValueChange={setChannel}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PRESENCIAL">Presencial / Local</SelectItem>
                                        <SelectItem value="MERCADOLIBRE">MercadoLibre</SelectItem>
                                        <SelectItem value="FACEBOOK">Facebook Marketplace</SelectItem>
                                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                                        <SelectItem value="WEBSITE">Sitio Web</SelectItem>
                                        <SelectItem value="LUEGOPAGO">LuegoPago</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Medio Pago</Label>
                            <div className="col-span-3">
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Ej. Efectivo, Transferencia..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                                        <SelectItem value="TRANSFERENCIA">Transferencia / Bancolombia / Nequi</SelectItem>
                                        <SelectItem value="TARJETA_CREDITO">Tarjeta de Crédito / Débito</SelectItem>
                                        <SelectItem value="SISTECREDITO">SisteCredito</SelectItem>
                                        <SelectItem value="MERCADOPAGO">Mercado Pago / Link de Pago</SelectItem>
                                        <SelectItem value="OTRO">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Cuenta Destino</Label>
                            <div className="col-span-3">
                                <Select onValueChange={setDepositAccountId} value={depositAccountId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="¿Dónde entró el dinero?" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.map(a => (
                                            <SelectItem key={a.id} value={a.id}>{a.name} ({a.type})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right text-xs mt-2 text-amber-700 font-bold">
                                Motivo Cambio
                            </Label>
                            <Textarea
                                className="col-span-3 border-amber-300 focus-visible:ring-amber-500"
                                placeholder="Especifique por qué está editando esta venta..."
                                value={editReason}
                                onChange={e => setEditReason(e.target.value)}
                                required
                            />
                        </div>

                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
                            {loading ? "Guardando..." : "Confirmar Edición"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
