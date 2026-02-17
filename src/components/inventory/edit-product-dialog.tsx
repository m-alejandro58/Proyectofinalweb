"use client"

import { useState } from "react"
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
import { updateProduct } from "@/app/actions/inventory"
import { Textarea } from "@/components/ui/textarea"
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

export function EditProductDialog({ product, open, onOpenChange, onSuccess }: { product: any, open: boolean, onOpenChange: (open: boolean) => void, onSuccess?: () => void }) {
    const [loading, setLoading] = useState(false)
    const [category, setCategory] = useState(product.category || "")
    const [subcategory, setSubcategory] = useState(product.subcategory || "")

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)

        const formData = new FormData(event.currentTarget)
        const res = await updateProduct(product.id, formData)

        setLoading(false)
        if (res.success) {
            onOpenChange(false)
            if (onSuccess) onSuccess()
        } else {
            alert(res.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
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
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar Cambios"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
