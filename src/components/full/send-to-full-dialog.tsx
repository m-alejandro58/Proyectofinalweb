"use client"

import { useState, useEffect } from "react"
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
import { Truck, Plus, Trash2, Package, Check, ChevronsUpDown, Search } from "lucide-react"
import { createShipment } from "@/app/actions/full-inventory"
import { getProducts } from "@/app/actions/inventory"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function SendToFullDialog() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [products, setProducts] = useState<any[]>([])

    // Shipment Level
    const [shippingCost, setShippingCost] = useState(0)
    const [note, setNote] = useState("")

    // Current Item Input
    const [openCombobox, setOpenCombobox] = useState(false)
    const [selectedProductId, setSelectedProductId] = useState("")
    const [quantity, setQuantity] = useState(1)

    // Added Items List
    const [items, setItems] = useState<{ productId: string; productName: string; quantity: number; unitCost: number }[]>([])

    // Derived
    const selectedProductData = products.find(p => p.id === selectedProductId)
    const available = selectedProductData ? (selectedProductData.stockTotal - (selectedProductData.stockFull || 0)) : 0

    useEffect(() => {
        if (open) {
            loadProducts()
        }
    }, [open])

    const loadProducts = async () => {
        try {
            const res = await getProducts()
            if (res.success && res.data) {
                setProducts(res.data.filter((p: any) => (p.stockTotal - (p.stockFull || 0)) > 0))
            }
        } catch (error) {
            console.error(error)
        }
    }

    const addItem = () => {
        if (!selectedProductId || quantity <= 0) return

        if (items.find(i => i.productId === selectedProductId)) {
            toast.error("Este producto ya está en la lista")
            return
        }

        if (quantity > available) {
            toast.error(`Solo hay ${available} unidades disponibles`)
            return
        }

        setItems([...items, {
            productId: selectedProductId,
            productName: selectedProductData?.name || "Desconocido",
            quantity,
            unitCost: 0
        }])

        setSelectedProductId("")
        setQuantity(1)
    }

    const removeItem = (pid: string) => {
        setItems(items.filter(i => i.productId !== pid))
    }

    const handleSubmit = async () => {
        if (items.length === 0) return

        setLoading(true)
        try {
            const result = await createShipment(items, shippingCost, note)

            if (result.success) {
                toast.success("Envío creado correctamente")
                setOpen(false)
                resetForm()
                router.refresh()
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Error al enviar")
        }
        setLoading(false)
    }

    const resetForm = () => {
        setItems([])
        setShippingCost(0)
        setNote("")
        setSelectedProductId("")
        setQuantity(1)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Truck className="h-4 w-4 mr-2" /> Nuevo Paquete
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl gap-0 p-0 overflow-hidden w-[95vw]">
                <DialogHeader className="p-6 pb-4 bg-muted/40 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Crear Envío a Bodega FULL
                    </DialogTitle>
                    <DialogDescription>
                        Arma tu paquete agregando productos y define el costo total.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                    {/* Sección: Agregar Productos */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-medium">Agregar Productos</Label>
                            <Badge variant="outline" className="text-xs font-normal">
                                {products.length} productos disponibles
                            </Badge>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 items-end bg-secondary/20 p-4 rounded-lg border border-border/50">
                            <div className="space-y-2 flex-1 w-full min-w-0">
                                <Label className="text-xs">Producto (Buscar por nombre o código)</Label>
                                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCombobox}
                                            className="w-full justify-between overflow-hidden"
                                        >
                                            <span className="truncate">
                                                {selectedProductId
                                                    ? products.find((product) => product.id === selectedProductId)?.name
                                                    : "Seleccionar producto..."}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Buscar producto..." />
                                            <CommandList>
                                                <CommandEmpty>No se encontró el producto.</CommandEmpty>
                                                <CommandGroup>
                                                    {products.map((product) => {
                                                        const avail = product.stockTotal - (product.stockFull || 0)
                                                        return (
                                                            <CommandItem
                                                                key={product.id}
                                                                value={product.name}
                                                                onSelect={(currentValue) => {
                                                                    setSelectedProductId(product.id === selectedProductId ? "" : product.id)
                                                                    setOpenCombobox(false)
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        selectedProductId === product.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                <div className="flex flex-col">
                                                                    <span className="truncate max-w-[300px] font-medium">{product.name}</span>
                                                                    <span className="text-xs text-muted-foreground">Disp: {avail} | SKU: {product.sku || 'N/A'}</span>
                                                                </div>
                                                            </CommandItem>
                                                        )
                                                    })}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto">
                                <div className="space-y-2 w-24 shrink-0">
                                    <Label className="text-xs">Cantidad</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={available}
                                        value={quantity}
                                        className="bg-background"
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                                    />
                                </div>

                                <Button onClick={addItem} disabled={!selectedProductId} size="icon" className="mb-0.5 shrink-0">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        {selectedProductData && (
                            <p className="text-xs text-right text-muted-foreground mr-1">
                                Máximo disponible: {available}
                            </p>
                        )}
                    </div>

                    <Separator />

                    {/* Sección: Lista de Items */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-medium flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Contenido del Paquete
                            </Label>
                            <span className="text-sm text-muted-foreground">
                                {items.length} items
                            </span>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            {items.length === 0 ? (
                                <div className="p-8 text-center bg-muted/20">
                                    <p className="text-sm text-muted-foreground">
                                        Aún no has agregado productos al paquete.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y max-h-[200px] overflow-y-auto bg-background">
                                    {items.map((item) => (
                                        <div key={item.productId} className="flex justify-between items-center p-3 hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                                                    {item.quantity}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-medium text-sm truncate max-w-[200px] sm:max-w-xs">{item.productName}</div>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-500 shrink-0" onClick={() => removeItem(item.productId)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sección: Detalles de Envío */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-2">
                            <Label>Costo de Envío (Total)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                <Input
                                    type="number"
                                    min={0}
                                    className="pl-7"
                                    value={shippingCost}
                                    onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Valor pagado por todo el paquete.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Nota / Guía</Label>
                            <Input
                                placeholder="# Guía, Caja 1..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 border-t bg-muted/10">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading || items.length === 0}>
                        {loading ? "Procesando..." : "Confirmar Envío"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
