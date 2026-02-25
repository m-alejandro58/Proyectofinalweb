"use client"

import { useState, useMemo } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateProduct, adjustProductStock } from "@/app/actions/inventory"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const CATEGORIES: Record<string, string[]> = {
    "Componentes": [
        "Procesador", "Memoria Ram DDR4", "Memoria Ram DDR5", "Motherboard", "Fuente De poder",
        "Disipador Aire CPU", "Disipador Liquido CPU", "Disipador M.2", "Tarjeta Grafica",
        "Almacenamiento SSD", "Almacenamiento M.2", "Almacenamiento HDD", "Gabinete CPU",
        "Bateria Portatil", "Altavoces", "Almacenamiento SD"
    ],
    "Periféricos": [
        "Monitor", "Teclado", "Mouse", "Parlantes", "Audifonos", "Camara"
    ],
    "Portatil": ["Gamer", "Oficina"],
    "Licencia": ["Licencia"],
    "Accesorios": ["USB", "Adaptador", "Cable HDMI", "Juguetes"]
}

export function EditProductDialog({ product, open, onOpenChange, onSuccess }: { product: any, open: boolean, onOpenChange: (open: boolean) => void, onSuccess?: () => void }) {
    const [loading, setLoading] = useState(false)
    const [category, setCategory] = useState(product.category || "")
    const [subcategory, setSubcategory] = useState(product.subcategory || "")

    // Stock adjustment state
    const currentStock = product.stockTotal || 0
    const currentAvgCost = useMemo(() => {
        const availableBatches = (product.batches || []).filter((b: any) => b.status === "AVAILABLE")
        if (availableBatches.length === 0) return 0
        const totalCost = availableBatches.reduce((sum: number, b: any) => sum + (b.unitCost * b.quantity), 0)
        const totalQty = availableBatches.reduce((sum: number, b: any) => sum + b.quantity, 0)
        return totalQty > 0 ? totalCost / totalQty : 0
    }, [product.batches])

    const [newQuantity, setNewQuantity] = useState(String(currentStock))
    const [newUnitCost, setNewUnitCost] = useState(String(Math.round(currentAvgCost)))
    const [adjustReason, setAdjustReason] = useState("")
    const [showStockWarning, setShowStockWarning] = useState(false)
    const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)

    const stockChanged = Number(newQuantity) !== currentStock || Number(newUnitCost) !== Math.round(currentAvgCost)

    const newTotalValue = useMemo(() => {
        const qty = Number(newQuantity) || 0
        const cost = Number(newUnitCost) || 0
        return qty * cost
    }, [newQuantity, newUnitCost])

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)

        // If stock/cost changed, show warning dialog first
        if (stockChanged) {
            setPendingFormData(formData)
            setShowStockWarning(true)
            return
        }

        // No stock change, just update product info
        await submitProductUpdate(formData, false)
    }

    async function submitProductUpdate(formData: FormData, withStockAdjust: boolean) {
        setLoading(true)

        // Update product metadata
        const res = await updateProduct(product.id, formData)
        if (!res.success) {
            setLoading(false)
            alert(res.error)
            return
        }

        // Update stock if needed
        if (withStockAdjust) {
            const stockRes = await adjustProductStock(
                product.id,
                Number(newQuantity),
                Number(newUnitCost),
                adjustReason
            )
            if (!stockRes.success) {
                setLoading(false)
                alert(stockRes.error)
                return
            }
        }

        setLoading(false)
        onOpenChange(false)
        if (onSuccess) onSuccess()
    }

    async function handleConfirmStockAdjust() {
        if (!adjustReason.trim()) {
            return // Button should already be disabled
        }
        setShowStockWarning(false)
        if (pendingFormData) {
            await submitProductUpdate(pendingFormData, true)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Editar Producto</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-sku" className="text-right">
                                    ID / SKU
                                </Label>
                                <Input
                                    id="edit-sku"
                                    name="sku"
                                    defaultValue={product.sku}
                                    className="col-span-3"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Categoría</Label>
                                <div className="col-span-3">
                                    <Select value={category} onValueChange={(val) => { setCategory(val); setSubcategory(""); }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione Categoría" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(CATEGORIES).map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <input type="hidden" name="category" value={category} />
                                </div>
                            </div>

                            {category && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Sub-Categoría</Label>
                                    <div className="col-span-3">
                                        <Select value={subcategory} onValueChange={setSubcategory}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione Tipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CATEGORIES[category]?.map(sub => (
                                                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <input type="hidden" name="subcategory" value={subcategory} />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-brand" className="text-right">
                                    Marca
                                </Label>
                                <Input
                                    id="edit-brand"
                                    name="brand"
                                    defaultValue={product.brand}
                                    className="col-span-3"
                                />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-name" className="text-right">
                                    Producto
                                </Label>
                                <Input
                                    id="edit-name"
                                    name="name"
                                    defaultValue={product.name}
                                    className="col-span-3"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-minStock" className="text-right">
                                    Stock Mín.
                                </Label>
                                <Input
                                    id="edit-minStock"
                                    name="minStock"
                                    type="number"
                                    defaultValue={product.minStock}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-description" className="text-right">
                                    Descrip.
                                </Label>
                                <Textarea
                                    id="edit-description"
                                    name="description"
                                    defaultValue={product.description}
                                    className="col-span-3"
                                />
                            </div>

                            {/* Stock Adjustment Section */}
                            <div className="border-t pt-4 mt-2">
                                <div className="mb-3">
                                    <Label className="text-sm font-medium">Inventario</Label>
                                    <p className="text-xs text-muted-foreground">Modifique la cantidad o costo del stock disponible</p>
                                </div>

                                <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-dashed">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-stock" className="text-right">
                                            Cantidad
                                        </Label>
                                        <Input
                                            id="edit-stock"
                                            type="number"
                                            min="0"
                                            className="col-span-3"
                                            value={newQuantity}
                                            onChange={(e) => setNewQuantity(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-cost" className="text-right">
                                            Costo Unit.
                                        </Label>
                                        <div className="col-span-3 relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                            <Input
                                                id="edit-cost"
                                                type="number"
                                                min="0"
                                                step="100"
                                                className="pl-7"
                                                value={newUnitCost}
                                                onChange={(e) => setNewUnitCost(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    {newTotalValue > 0 && (
                                        <div className="text-right pr-1">
                                            <span className="text-sm text-muted-foreground">Valor Total: </span>
                                            <span className="text-lg font-bold text-primary">
                                                ${newTotalValue.toLocaleString('es-CO')}
                                            </span>
                                        </div>
                                    )}
                                    {stockChanged && (
                                        <div className="flex items-center gap-2 text-amber-600 text-xs mt-1">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            <span>Se detectaron cambios en el inventario. Se requerirá un motivo al guardar.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar Cambios"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Stock Adjustment Warning Dialog */}
            <AlertDialog open={showStockWarning} onOpenChange={(open) => {
                if (!open) {
                    setShowStockWarning(false)
                    setAdjustReason("")
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="h-5 w-5" />
                            Ajuste de Inventario
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p>
                                    Estás a punto de modificar el inventario de <strong>{product.name}</strong>:
                                </p>
                                <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                                    {Number(newQuantity) !== currentStock && (
                                        <div className="flex justify-between">
                                            <span>Cantidad:</span>
                                            <span>
                                                <span className="text-muted-foreground line-through mr-2">{currentStock}</span>
                                                <span className="font-semibold">{newQuantity}</span>
                                            </span>
                                        </div>
                                    )}
                                    {Number(newUnitCost) !== Math.round(currentAvgCost) && (
                                        <div className="flex justify-between">
                                            <span>Costo Unitario:</span>
                                            <span>
                                                <span className="text-muted-foreground line-through mr-2">${Math.round(currentAvgCost).toLocaleString('es-CO')}</span>
                                                <span className="font-semibold">${Number(newUnitCost).toLocaleString('es-CO')}</span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adjust-reason" className="text-sm font-medium text-foreground">
                                        Motivo del ajuste <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        id="adjust-reason"
                                        placeholder="Ej: Conteo físico de inventario, error en registro anterior, mercancía dañada..."
                                        value={adjustReason}
                                        onChange={(e) => setAdjustReason(e.target.value)}
                                        className="min-h-[80px]"
                                    />
                                    {adjustReason.trim().length === 0 && (
                                        <p className="text-xs text-destructive">Debes ingresar un motivo para continuar</p>
                                    )}
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmStockAdjust}
                            disabled={!adjustReason.trim()}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            Confirmar Ajuste
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
