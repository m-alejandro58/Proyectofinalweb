"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { updatePurchase } from "@/app/actions/purchases"
import { Plus, Trash2, Edit } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"

type Props = {
    purchase: any
    providers: any[]
    accounts: any[]
    products: any[]
}

export function EditPurchaseDialog({ purchase, providers, accounts, products }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form state
    const [providerId, setProviderId] = useState(purchase.providerId)
    const [accountId, setAccountId] = useState(purchase.paymentAccountId || "")
    const [receipt, setReceipt] = useState(purchase.receiptNumber || "")
    const [notes, setNotes] = useState(purchase.notes || "")

    // Items array (mapped from original purchase batches)
    const [items, setItems] = useState<{ productId: string, quantity: number, unitCost: number }[]>([])

    // Inline adding product
    const [currentProduct, setCurrentProduct] = useState("")
    const [currentQty, setCurrentQty] = useState(1)
    const [currentCost, setCurrentCost] = useState(0)

    // Product search inside dialog
    const [productSearch, setProductSearch] = useState("")
    const [showResults, setShowResults] = useState(false)

    // Initialize items when modal opens
    useEffect(() => {
        if (open) {
            setProviderId(purchase.providerId)
            setAccountId(purchase.paymentAccountId || "")
            setReceipt(purchase.receiptNumber || "")
            setNotes(purchase.notes || "")
            setItems(purchase.batches.map((b: any) => ({
                productId: b.productId,
                quantity: b.initialQty,
                unitCost: b.unitCost
            })))
            setCurrentProduct("")
            setProductSearch("")
            setCurrentQty(1)
            setCurrentCost(0)
            setShowResults(false)
        }
    }, [open, purchase])

    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return products
        const q = productSearch.toLowerCase()
        return products.filter((p: any) =>
            p.name?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q)
        )
    }, [productSearch, products])

    const addItem = () => {
        if (!currentProduct || currentQty <= 0 || currentCost <= 0) return
        
        // Prevent adding duplicate product (just increase quantity or alert)
        const exists = items.find(i => i.productId === currentProduct)
        if (exists) {
            alert("Este producto ya está en la factura. Elimínalo primero para cambiar su cantidad.")
            return
        }

        setItems([...items, { productId: currentProduct, quantity: currentQty, unitCost: currentCost }])
        setCurrentProduct("")
        setProductSearch("")
        setCurrentQty(1)
        setCurrentCost(0)
    }

    const removeItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx))
    }

    const total = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)

    const handleSubmit = async () => {
        if (!providerId || !accountId || items.length === 0) {
            toast.error("Complete todos los campos requeridos y asegúrese de que la tabla tenga productos.")
            return
        }

        setLoading(true)
        const res = await updatePurchase(
            purchase.id,
            providerId,
            accountId,
            items,
            receipt,
            notes
        )

        if (res.success) {
            toast.success("Compra actualizada y saldos financieros ajustados correctamente.")
            setOpen(false)
            router.refresh()
        } else {
            toast.error(res.error || "Hubo un error al actualizar la compra.")
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" title="Editar Compra">
                    <Edit className="h-4 w-4 text-blue-500" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Factura de Compra</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 md:grid-cols-2 mt-4">
                    {/* Campos Principales */}
                    <div className="grid gap-4 bg-muted/20 p-4 rounded-md border">
                        <div className="grid gap-2">
                            <Label>Proveedor</Label>
                            <Select onValueChange={setProviderId} value={providerId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione Proveedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {providers.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Cuenta de Pago</Label>
                            <Select onValueChange={setAccountId} value={accountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Origen de fondos" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(a => (
                                        <SelectItem key={a.id} value={a.id}>{a.name} ({a.type})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>N° Recibo / Factura</Label>
                            <Input value={receipt} onChange={e => setReceipt(e.target.value)} placeholder="FAC-001" />
                        </div>
                    </div>

                    {/* Agregar Productos */}
                    <div className="grid gap-4 bg-muted/10 p-4 rounded-md border">
                        <div className="grid gap-1 relative">
                            <Label>Agregar Producto Nuevo</Label>
                            <Input
                                placeholder="Escriba nombre o SKU..."
                                value={productSearch}
                                onChange={e => {
                                    setProductSearch(e.target.value)
                                    setShowResults(true)
                                    setCurrentProduct("")
                                }}
                                onFocus={() => setShowResults(true)}
                                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                                autoComplete="off"
                            />
                            {showResults && productSearch.length > 0 && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[150px] overflow-y-auto bg-popover border rounded-md shadow-lg">
                                    {filteredProducts.length === 0 ? (
                                        <div className="p-3 text-sm text-center">Sin resultados</div>
                                    ) : (
                                        filteredProducts.map((p: any) => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b"
                                                onClick={() => {
                                                    setCurrentProduct(p.id)
                                                    setProductSearch(`${p.name}`)
                                                    setShowResults(false)
                                                }}
                                            >
                                                {p.name} {p.sku && `(${p.sku})`}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 items-end">
                            <div className="grid gap-2 flex-1">
                                <Label>Cant.</Label>
                                <Input type="number" min="1" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} />
                            </div>
                            <div className="grid gap-2 flex-1">
                                <Label>Costo U.</Label>
                                <Input type="number" min="0" value={currentCost} onChange={e => setCurrentCost(Number(e.target.value))} />
                            </div>
                            <Button variant="secondary" onClick={addItem} type="button">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Tabla de Productos Existentes */}
                <div className="mt-4 border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-right">Cant.</TableHead>
                                <TableHead className="text-right">Costo U.</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, idx) => {
                                const prod = products.find((p: any) => p.id === item.productId)
                                return (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium text-sm">
                                            {prod?.name || "Producto Restante"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input 
                                                type="number" 
                                                min="1" 
                                                className="h-7 w-20 text-right ml-auto" 
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const newArr = [...items]
                                                    newArr[idx].quantity = Number(e.target.value)
                                                    setItems(newArr)
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input 
                                                type="number" 
                                                min="0" 
                                                className="h-7 w-24 text-right ml-auto" 
                                                value={item.unitCost}
                                                onChange={(e) => {
                                                    const newArr = [...items]
                                                    newArr[idx].unitCost = Number(e.target.value)
                                                    setItems(newArr)
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            ${(item.quantity * item.unitCost).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeItem(idx)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {items.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No hay artículos en esta compra.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex justify-between items-center mt-4 p-4 bg-muted/30 rounded-lg">
                    <span className="text-lg text-muted-foreground">Nuevo Total Compra:</span>
                    <span className="text-3xl font-bold">${total.toLocaleString()}</span>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Guardando Cambios..." : "Guardar Edición"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
