"use client"

import { useState } from "react"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoreHorizontal, RotateCcw, CheckCircle, PackageCheck, ShoppingCart, Undo2, AlertTriangle } from "lucide-react"
import { reverseFullSaleRecord, returnFromFull, confirmShipmentArrival } from "@/app/actions/full-inventory"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"

export function FullItemActions({ item }: { item: any }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [action, setAction] = useState<"RETURN" | "REVERSE_SALE" | null>(null)
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
            if (action === "RETURN") {
                res = await returnFromFull(item.id, quantity)
            } else if (action === "REVERSE_SALE") {
                res = await reverseFullSaleRecord(item.id, quantity)
            }

            if (res?.success) {
                toast.success(
                    action === "RETURN" ? "Devolución a inventario local procesada" :
                    "Stock revertido correctamente"
                )
                setAction(null)
                setQuantity(1)
                router.refresh()
            } else {
                toast.error(res?.error ?? "Error desconocido")
            }
        } catch (error) {
            toast.error("Error al procesar acción")
        }
        setLoading(false)
    }

    const isInWarehouse = item.status === "IN_WAREHOUSE"
    const hasSoldUnits = item.quantitySold > 0

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
                        onClick={() => copyToClipboard(item.id).then(() => toast.success("ID copiado")).catch(() => toast.error("Error al copiar"))}
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

                    {isInWarehouse && (
                        <>
                            {/* Registrar Venta → redirige al módulo de ventas */}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors text-muted-foreground">
                                            <ShoppingCart className="mr-2 h-4 w-4 text-green-400 opacity-60" />
                                            <span className="opacity-60">Registrar Venta</span>
                                            <AlertTriangle className="ml-auto h-3 w-3 text-amber-400" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="max-w-[220px] text-xs">
                                        <p className="font-semibold mb-1">📦 Artículo en Mercado Full</p>
                                        <p>Para registrar la venta, ve a <strong>Ventas → Nueva Venta</strong> y selecciona el canal <strong>MercadoLibre</strong>.</p>
                                        <p className="mt-1 text-muted-foreground">El sistema descuenta automáticamente del stock Full.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <DropdownMenuItem asChild>
                                <Link href="/sales/new" className="flex items-center cursor-pointer">
                                    <ShoppingCart className="mr-2 h-4 w-4 text-green-500" />
                                    Ir a Nueva Venta →
                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => setAction("RETURN")}>
                                <RotateCcw className="mr-2 h-4 w-4 text-orange-500" />
                                Devolver a Inventario Local
                            </DropdownMenuItem>
                        </>
                    )}

                    {/* Reverse sale — available if there are sold units (for correction) */}
                    {hasSoldUnits && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => { setAction("REVERSE_SALE"); setQuantity(item.quantitySold) }}
                                className="text-amber-600 dark:text-amber-400"
                            >
                                <Undo2 className="mr-2 h-4 w-4" />
                                Revertir Venta Incorrecta
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Dialog for Return / Reverse-sale */}
            <Dialog open={!!action} onOpenChange={(open) => !open && setAction(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {action === "RETURN" ? "Devolver a Inventario Local" : "Revertir Venta Incorrecta"}
                        </DialogTitle>
                        <DialogDescription>
                            {item.productName}
                            {action === "REVERSE_SALE" && (
                                <span className="block mt-1 text-amber-600 dark:text-amber-400 text-xs">
                                    ⚠️ Usa esto solo para corregir ventas registradas accidentalmente desde esta pestaña.
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Cantidad</Label>
                            <Input
                                type="number"
                                min={1}
                                max={action === "RETURN" ? item.quantityInStock : item.quantitySold}
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                            />
                            <p className="text-xs text-muted-foreground">
                                {action === "RETURN"
                                    ? `Disponibles en lote: ${item.quantityInStock}`
                                    : `Unidades vendidas (a revertir): ${item.quantitySold}`
                                }
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAction(null)}>Cancelar</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading || quantity <= 0}
                            variant={action === "REVERSE_SALE" ? "destructive" : "default"}
                        >
                            {loading ? "Procesando..." : "Confirmar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
