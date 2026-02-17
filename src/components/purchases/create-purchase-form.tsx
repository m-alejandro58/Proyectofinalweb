"use client"

import { useState, useEffect } from "react"
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
import { Card, CardContent } from "@/components/ui/card"
import { createPurchase } from "@/app/actions/purchases"
import { Plus, Trash2 } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { CreateProductDialog } from "@/components/inventory/create-product-dialog"

type Props = {
    providers: any[]
    accounts: any[]
    products: any[]
}

export function CreatePurchaseForm({ providers, accounts, products: initialProducts }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [items, setItems] = useState<{ productId: string, quantity: number, unitCost: number }[]>([])

    // Local products state to allow appending new ones
    const [products, setProducts] = useState(initialProducts)

    // Header State
    const [providerId, setProviderId] = useState("")
    const [accountId, setAccountId] = useState("")
    const [receipt, setReceipt] = useState("")
    const [isTransit, setIsTransit] = useState(false)

    // Line Input State
    const [currentProduct, setCurrentProduct] = useState("")
    const [currentQty, setCurrentQty] = useState(1)
    const [currentCost, setCurrentCost] = useState(0)

    const handleNewProduct = (newProd: any) => {
        setProducts([...products, newProd])
        setCurrentProduct(newProd.id)
    }

    const addItem = () => {
        if (!currentProduct || currentQty <= 0 || currentCost <= 0) return
        setItems([...items, { productId: currentProduct, quantity: currentQty, unitCost: currentCost }])

        // Reset inputs
        setCurrentProduct("")
        setCurrentQty(1)
        setCurrentCost(0)
    }

    const removeItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx))
    }

    const total = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitCost), 0)

    const handleSubmit = async () => {
        if (!providerId || !accountId || items.length === 0) {
            alert("Complete los campos requeridos")
            return
        }

        setLoading(true)
        const res = await createPurchase(providerId, accountId, items, receipt, "", isTransit)
        if (res.success) {
            router.push("/purchases")
            router.refresh()
        } else {
            alert(res.error)
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardContent className="pt-6 grid gap-4">
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
                        <div className="flex items-center space-x-2 pt-2">
                            <input
                                type="checkbox"
                                id="transit"
                                checked={isTransit}
                                onChange={e => setIsTransit(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="transit" className="text-sm font-medium leading-none cursor-pointer">
                                Importación / En Camino (No sumar a bodega)
                            </Label>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6 grid gap-4 bg-muted/20">
                        <div className="flex items-end gap-2">
                            <div className="grid gap-2 flex-1">
                                <Label>Producto</Label>
                                <Select value={currentProduct} onValueChange={setCurrentProduct}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Buscar producto..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <CreateProductDialog onSuccess={handleNewProduct} />
                        </div>
                        <div className="flex gap-4">
                            <div className="grid gap-2">
                                <Label>Cantidad</Label>
                                <Input type="number" min="1" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} />
                            </div>
                            <div className="grid gap-2 flex-1">
                                <Label>Costo Unit.</Label>
                                <Input type="number" min="0" step="100" value={currentCost} onChange={e => setCurrentCost(Number(e.target.value))} />
                            </div>
                            <div className="flex items-end pb-0.5">
                                <Button variant="secondary" onClick={addItem} type="button">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-right">Cant.</TableHead>
                                <TableHead className="text-right">Costo Unit.</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, idx) => {
                                const prod = products.find((p: any) => p.id === item.productId)
                                return (
                                    <TableRow key={idx}>
                                        <TableCell>{prod?.name}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">${item.unitCost.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">${(item.quantity * item.unitCost).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {items.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        Agregue productos a la compra
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex justify-between items-center bg-card p-6 border rounded-xl shadow-sm">
                <div className="text-lg">Total Compra:</div>
                <div className="text-3xl font-bold text-primary">${total.toLocaleString()}</div>
            </div>

            <div className="flex justify-end">
                <Button size="lg" onClick={handleSubmit} disabled={loading}>
                    {loading ? "Procesando..." : "Registrar Compra"}
                </Button>
            </div>
        </div>
    )
}
