"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoreHorizontal, DollarSign, RotateCcw, CheckCircle, PackageCheck } from "lucide-react"
import { recordFullSale, returnFromFull, confirmShipmentArrival } from "@/app/actions/full-inventory"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function FullItemActions({ item }: { item: any }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [action, setAction] = useState<"SALE" | "RETURN" | null>(null)
    const [quantity, setQuantity] = useState(1)

    const handleConfirmShipment = async () => {
        if (!item.shipmentId) {
            toast.error("Este item no tiene envío asociado")
            return
        }

        setLoading(true)
        try {
            const res = await confirmShipmentArrival(item.shipmentId)
            if (res.success) {
                toast.success("Llegada de envío confirmada: Todos los items disponibles")
                router.refresh()
            } else {
                toast.error(res.error)
            }
        } catch (error) {
            toast.error("Error al confirmar")
        }
        setLoading(false)
    }

    const handleSubmit = async () => {
        if (quantity <= 0) return
        setLoading(true)
        try {
            let res
            if (action === "SALE") {
                res = await recordFullSale(item.id, quantity)
            } else {
                res = await returnFromFull(item.id, quantity)
            }

            if (res.success) {
                toast.success(action === "SALE" ? "Venta registrada" : "Devolución procesada")
                setAction(null)
                setQuantity(1)
                router.refresh()
            } else {
                toast.error(res.error)
            }
        } catch (error) {
            toast.error("Error al procesar acción")
        }
        setLoading(false)
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => navigator.clipboard.writeText(item.id)}
                    >
                        Copiar ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    {item.status === "SHIPPING" && item.shipmentId && (
                        <DropdownMenuItem onClick={handleConfirmShipment}>
                            <PackageCheck className="mr-2 h-4 w-4 text-blue-500" />
                            Confirmar Envío Completo
                        </DropdownMenuItem>
                    )}

                    {item.status === "IN_WAREHOUSE" && (
                        <>
                            <DropdownMenuItem onClick={() => setAction("SALE")}>
                                <DollarSign className="mr-2 h-4 w-4 text-green-500" />
                                Registrar Venta
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAction("RETURN")}>
                                <RotateCcw className="mr-2 h-4 w-4 text-orange-500" />
                                Devolver a Inventario
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Dialog for Sale/Return */}
            <Dialog open={!!action} onOpenChange={(open) => !open && setAction(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {action === "SALE" ? "Registrar Venta FULL" : "Devolver a Inventario Local"}
                        </DialogTitle>
                        <DialogDescription>
                            {item.productName}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Cantidad</Label>
                            <Input
                                type="number"
                                min={1}
                                max={item.quantityInStock}
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Disponibles en lote: {item.quantityInStock}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAction(null)}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={loading || quantity <= 0}>
                            {loading ? "Procesando..." : "Confirmar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
