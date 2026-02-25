"use client"

import { useState, useMemo, useEffect } from "react"
import { Plus } from "lucide-react"
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
import { createProduct } from "@/app/actions/inventory"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

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

export function CreateProductDialog({ onSuccess }: { onSuccess?: (product: any) => void }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [category, setCategory] = useState("")
    const [subcategory, setSubcategory] = useState("")
    const [hasInitialStock, setHasInitialStock] = useState(false)
    const [initialQuantity, setInitialQuantity] = useState("")
    const [unitCost, setUnitCost] = useState("")

    const totalValue = useMemo(() => {
        const qty = Number(initialQuantity) || 0
        const cost = Number(unitCost) || 0
        return qty * cost
    }, [initialQuantity, unitCost])

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)

        const formData = new FormData(event.currentTarget)
        formData.set("hasInitialStock", hasInitialStock ? "true" : "false")
        formData.set("initialQuantity", initialQuantity)
        formData.set("unitCost", unitCost)

        const res = await createProduct(formData)

        setLoading(false)
        if (res.success) {
            setOpen(false)
            setCategory("")
            setSubcategory("")
            setHasInitialStock(false)
            setInitialQuantity("")
            setUnitCost("")
            if (onSuccess && res.data) {
                onSuccess(res.data)
            }
        } else {
            alert(res.error)
        }
    }

    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => setIsMounted(true), [])

    if (!isMounted) {
        return (
            <Button className="gap-2" variant={onSuccess ? "outline" : "default"} disabled>
                <Plus className="h-4 w-4" /> {onSuccess ? "Nuevo" : "Nuevo Producto"}
            </Button>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2" variant={onSuccess ? "outline" : "default"}>
                    <Plus className="h-4 w-4" /> {onSuccess ? "Nuevo" : "Nuevo Producto"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Mantenimiento de Productos</DialogTitle>
                    <DialogDescription>
                        Registra un nuevo artículo en el sistema.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="sku" className="text-right">
                                ID / SKU
                            </Label>
                            <Input
                                id="sku"
                                name="sku"
                                placeholder="Identificador Único"
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
                                            {CATEGORIES[category].map(sub => (
                                                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <input type="hidden" name="subcategory" value={subcategory} />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="brand" className="text-right">
                                Marca
                            </Label>
                            <Input
                                id="brand"
                                name="brand"
                                placeholder="Ej. Logitech, Samsung"
                                className="col-span-3"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Producto
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Ej. Mouse Redragon"
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="minStock" className="text-right">
                                Stock Mín.
                            </Label>
                            <Input
                                id="minStock"
                                name="minStock"
                                type="number"
                                defaultValue="5"
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">
                                Descrip.
                            </Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Detalles del producto"
                                className="col-span-3"
                            />
                        </div>

                        {/* Initial Stock Section */}
                        <div className="border-t pt-4 mt-2">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <Label className="text-sm font-medium">¿Tiene stock actual?</Label>
                                    <p className="text-xs text-muted-foreground">Ingrese inventario existente que ya posea</p>
                                </div>
                                <Switch
                                    checked={hasInitialStock}
                                    onCheckedChange={setHasInitialStock}
                                />
                            </div>

                            {hasInitialStock && (
                                <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-dashed">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="initialQuantity" className="text-right">
                                            Cantidad
                                        </Label>
                                        <Input
                                            id="initialQuantity"
                                            type="number"
                                            min="1"
                                            placeholder="Ej. 10"
                                            className="col-span-3"
                                            value={initialQuantity}
                                            onChange={(e) => setInitialQuantity(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="unitCost" className="text-right">
                                            Costo Unit.
                                        </Label>
                                        <div className="col-span-3 relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                            <Input
                                                id="unitCost"
                                                type="number"
                                                min="0"
                                                step="any"
                                                placeholder="Ej. 50000"
                                                className="pl-7"
                                                value={unitCost}
                                                onChange={(e) => setUnitCost(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    {totalValue > 0 && (
                                        <div className="text-right pr-1">
                                            <span className="text-sm text-muted-foreground">Valor Total: </span>
                                            <span className="text-lg font-bold text-primary">
                                                ${totalValue.toLocaleString('es-CO')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Crear Producto"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
