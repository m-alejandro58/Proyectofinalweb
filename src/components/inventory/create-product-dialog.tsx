"use client"

import { useState } from "react"
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

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)

        const formData = new FormData(event.currentTarget)
        const res = await createProduct(formData)

        setLoading(false)
        if (res.success) {
            setOpen(false)
            setCategory("")
            setSubcategory("")
            if (onSuccess && res.data) {
                onSuccess(res.data)
            }
        } else {
            alert(res.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2" variant={onSuccess ? "outline" : "default"}>
                    <Plus className="h-4 w-4" /> {onSuccess ? "Nuevo" : "Nuevo Producto"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
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
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Crear Producto"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
