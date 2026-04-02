"use client"

import { useState, useTransition } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Building2, Package, AlertCircle, Loader2 } from "lucide-react"
import { convertInventoryToAsset } from "@/app/actions/assets"
import { toast } from "sonner"

const CATEGORIES = [
    { value: "EQUIPOS", label: "🖥️ Equipos Electrónicos" },
    { value: "MUEBLES", label: "🪑 Muebles y Enseres" },
    { value: "VEHICULOS", label: "🚗 Vehículos y Transporte" },
    { value: "OTROS", label: "📦 Otros Activos" },
]

interface TransferToAssetDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    product: {
        id: string
        name: string
        stockTotal: number
        batches?: any[]
    }
}

export function TransferToAssetDialog({
    open,
    onOpenChange,
    product,
}: TransferToAssetDialogProps) {
    const [quantity, setQuantity] = useState("1")
    const [assetName, setAssetName] = useState("")
    const [category, setCategory] = useState<string>("")
    const [notes, setNotes] = useState("")
    const [isPending, startTransition] = useTransition()

    const availableStock = product?.stockTotal ?? 0
    const quantityNum = parseInt(quantity) || 0
    const isValid =
        assetName.trim().length > 0 &&
        category.length > 0 &&
        quantityNum > 0 &&
        quantityNum <= availableStock

    const handleClose = () => {
        if (isPending) return
        setQuantity("1")
        setAssetName("")
        setCategory("")
        setNotes("")
        onOpenChange(false)
    }

    const handleConfirm = () => {
        if (!isValid) return
        startTransition(async () => {
            const res = await convertInventoryToAsset(
                product.id,
                quantityNum,
                category as any,
                assetName,
                notes
            )
            if (res.success) {
                toast.success(
                    `✅ ${res.data?.assetsCreated} activo(s) creado(s) por $${res.data?.totalCost?.toLocaleString("es-CO")}`,
                    {
                        description: `"${res.data?.productName}" trasladado a Activos Fijos`,
                        duration: 5000,
                    }
                )
                handleClose()
            } else {
                toast.error(`❌ Error: ${res.error}`)
            }
        })
    }

    // Estimate cost from most recent batch for guidance
    const availableBatches = product?.batches?.filter((b: any) => b.status === "AVAILABLE") ?? []
    const estimatedUnitCost =
        availableBatches.length > 0
            ? availableBatches.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]?.unitCost
            : null
    const estimatedTotal =
        estimatedUnitCost && quantityNum > 0
            ? (estimatedUnitCost * quantityNum).toLocaleString("es-CO", { style: "currency", currency: "COP" })
            : null

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2.5 text-xl">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <Building2 className="h-5 w-5" />
                        </div>
                        Trasladar a Uso de Empresa
                    </DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-1 pt-1">
                            <div className="flex items-center gap-2 text-sm">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-foreground">{product?.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Stock disponible: <span className="font-semibold">{availableStock} unidades</span>
                            </p>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Quantity */}
                    <div className="space-y-1.5">
                        <Label htmlFor="transfer-qty">Cantidad a trasladar</Label>
                        <Input
                            id="transfer-qty"
                            type="number"
                            min={1}
                            max={availableStock}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className={
                                quantityNum > availableStock
                                    ? "border-destructive focus-visible:ring-destructive"
                                    : ""
                            }
                        />
                        {quantityNum > availableStock && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5" /> Excede el stock disponible
                            </p>
                        )}
                    </div>

                    {/* Asset Name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="transfer-name">
                            Nombre del activo <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="transfer-name"
                            placeholder="Ej: Silla Gerencial Oficina, Monitor 4K Diseño..."
                            value={assetName}
                            onChange={(e) => setAssetName(e.target.value)}
                        />
                        {quantity && parseInt(quantity) > 1 && (
                            <p className="text-xs text-muted-foreground">
                                Se crearán {quantity} activos: &quot;{assetName || "Nombre"} #1&quot;, &quot;{assetName || "Nombre"} #2&quot;, ...
                            </p>
                        )}
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                        <Label htmlFor="transfer-cat">
                            Categoría <span className="text-destructive">*</span>
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger id="transfer-cat">
                                <SelectValue placeholder="Seleccione una categoría..." />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label htmlFor="transfer-notes">Notas (opcional)</Label>
                        <Textarea
                            id="transfer-notes"
                            placeholder="Oficina destino, motivo del traslado..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className="resize-none"
                        />
                    </div>

                    {/* Estimated cost info */}
                    {estimatedTotal && (
                        <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 dark:bg-amber-900/20 dark:border-amber-800">
                            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-amber-800 dark:text-amber-300">
                                <p className="font-semibold">Costo FIFO estimado: {estimatedTotal}</p>
                                <p className="mt-0.5 opacity-80">
                                    El activo se registrará con el costo real de adquisición (COGS) del lote más antiguo disponible.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleClose} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!isValid || isPending}
                        className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <Building2 className="h-4 w-4" />
                                Confirmar Traslado
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
