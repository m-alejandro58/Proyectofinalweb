"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Package, Archive } from "lucide-react"
import { createCustomerOrder } from "@/app/actions/customer-orders"
import { getContacts } from "@/app/actions/contacts"
import { getProducts } from "@/app/actions/inventory"

type Props = {
    accounts: any[]
}

export function CreateOrderDialog({ accounts }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Data
    const [clients, setClients] = useState<any[]>([])
    const [providers, setProviders] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])

    // Form State
    const [type, setType] = useState<"CUSTOM" | "LAYAWAY">("CUSTOM")
    const [clientId, setClientId] = useState("")
    const [description, setDescription] = useState("")
    const [productId, setProductId] = useState("")
    const [quantity, setQuantity] = useState(1)
    const [agreedPrice, setAgreedPrice] = useState(0)
    const [estimatedCost, setEstimatedCost] = useState(0)
    const [providerId, setProviderId] = useState("")
    const [expectedArrival, setExpectedArrival] = useState("")
    const [notes, setNotes] = useState("")

    // Initial payment
    const [hasAdvance, setHasAdvance] = useState(false)
    const [advanceAmount, setAdvanceAmount] = useState(0)
    const [advanceMethod, setAdvanceMethod] = useState("Efectivo")
    const [advanceAccountId, setAdvanceAccountId] = useState("")

    useEffect(() => {
        if (open) {
            // Load contacts and products
            getContacts().then(res => {
                if (res.success && res.data) {
                    setClients(res.data.filter((c: any) => c.type === "CLIENT" || c.type === "BOTH"))
                    setProviders(res.data.filter((c: any) => c.type === "PROVIDER" || c.type === "BOTH"))
                }
            })
            getProducts().then(res => {
                if (res.success && res.data) {
                    setProducts(res.data)
                }
            })
        }
    }, [open])

    // Auto-fill product name if LAYAWAY
    useEffect(() => {
        if (type === "LAYAWAY" && productId) {
            const prod = products.find((p: any) => p.id === productId)
            if (prod) {
                setDescription(prod.name)
            }
        }
    }, [productId, type, products])

    const resetForm = () => {
        setType("CUSTOM")
        setClientId("")
        setDescription("")
        setProductId("")
        setQuantity(1)
        setAgreedPrice(0)
        setEstimatedCost(0)
        setProviderId("")
        setExpectedArrival("")
        setNotes("")
        setHasAdvance(false)
        setAdvanceAmount(0)
        setAdvanceMethod("Efectivo")
        setAdvanceAccountId("")
    }

    const handleSubmit = async () => {
        if (!clientId || !description || agreedPrice <= 0) {
            alert("Complete los campos requeridos: cliente, descripción y precio.")
            return
        }

        if (type === "LAYAWAY" && !productId) {
            alert("Debe seleccionar un producto para apartar.")
            return
        }

        if (hasAdvance && (!advanceAccountId || advanceAmount <= 0)) {
            alert("Complete los datos del abono inicial.")
            return
        }

        setLoading(true)

        const res = await createCustomerOrder({
            type,
            clientId,
            description,
            productId: productId || undefined,
            quantity,
            agreedPrice,
            estimatedCost: estimatedCost || undefined,
            providerId: providerId || undefined,
            expectedArrival: expectedArrival || undefined,
            notes: notes || undefined,
            initialPayment: hasAdvance ? {
                amount: advanceAmount,
                method: advanceMethod,
                accountId: advanceAccountId,
            } : undefined,
        })

        if (res.success) {
            setOpen(false)
            resetForm()
            router.refresh()
        } else {
            alert(res.error)
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Nuevo Pedido / Apartado</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Crear Pedido o Apartado</DialogTitle>
                    <DialogDescription>Registre un pedido especial de proveedor o separe un producto en existencia.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Type Selector */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setType("CUSTOM")}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${type === "CUSTOM" ? "border-blue-500 bg-blue-500/10" : "border-border hover:border-blue-500/50"
                                }`}
                        >
                            <Package className={`h-5 w-5 ${type === "CUSTOM" ? "text-blue-500" : "text-muted-foreground"}`} />
                            <div className="text-left">
                                <p className={`font-medium text-sm ${type === "CUSTOM" ? "text-blue-500" : ""}`}>Pedido Especial</p>
                                <p className="text-xs text-muted-foreground">Pedir a proveedor</p>
                            </div>
                        </button>
                        <button
                            onClick={() => setType("LAYAWAY")}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${type === "LAYAWAY" ? "border-purple-500 bg-purple-500/10" : "border-border hover:border-purple-500/50"
                                }`}
                        >
                            <Archive className={`h-5 w-5 ${type === "LAYAWAY" ? "text-purple-500" : "text-muted-foreground"}`} />
                            <div className="text-left">
                                <p className={`font-medium text-sm ${type === "LAYAWAY" ? "text-purple-500" : ""}`}>Apartado</p>
                                <p className="text-xs text-muted-foreground">Separar de inventario</p>
                            </div>
                        </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Client */}
                        <div className="grid gap-2">
                            <Label>Cliente *</Label>
                            <Select value={clientId} onValueChange={setClientId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Product (LAYAWAY) */}
                        {type === "LAYAWAY" && (
                            <div className="grid gap-2">
                                <Label>Producto a Separar *</Label>
                                <Select value={productId} onValueChange={setProductId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione producto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.filter((p: any) => p.stockTotal > 0).map((p: any) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} (Stock: {p.stockTotal})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Supplier (CUSTOM) */}
                        {type === "CUSTOM" && (
                            <div className="grid gap-2">
                                <Label>Proveedor</Label>
                                <Select value={providerId} onValueChange={setProviderId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione proveedor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {providers.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Product (CUSTOM - optional, for inventory tracking) */}
                        {type === "CUSTOM" && (
                            <div className="grid gap-2">
                                <Label>Producto (para inventario)</Label>
                                <Select value={productId} onValueChange={(v) => {
                                    setProductId(v)
                                    const prod = products.find((p: any) => p.id === v)
                                    if (prod && !description) setDescription(prod.name)
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione producto..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map((p: any) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Al llegar, se agregará al inventario de este producto.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="grid gap-2">
                        <Label>Descripción del producto *</Label>
                        <Textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder={type === "CUSTOM" ? "¿Qué producto necesita el cliente?" : "Nombre o descripción del producto separado"}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="grid gap-2">
                            <Label>Cantidad</Label>
                            <Input type="number" min={1} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Precio Acordado *</Label>
                            <Input type="number" min={0} value={agreedPrice || ""} onChange={e => setAgreedPrice(parseFloat(e.target.value) || 0)} placeholder="$0" />
                        </div>
                        {type === "CUSTOM" && (
                            <div className="grid gap-2">
                                <Label>Costo Estimado</Label>
                                <Input type="number" min={0} value={estimatedCost || ""} onChange={e => setEstimatedCost(parseFloat(e.target.value) || 0)} placeholder="$0" />
                            </div>
                        )}
                    </div>

                    {type === "CUSTOM" && (
                        <div className="grid gap-2">
                            <Label>Fecha Est. de Llegada</Label>
                            <Input type="date" value={expectedArrival} onChange={e => setExpectedArrival(e.target.value)} />
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label>Notas</Label>
                        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionales..." />
                    </div>

                    {/* Initial Payment Section */}
                    <div className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="hasAdvance"
                                checked={hasAdvance}
                                onChange={e => setHasAdvance(e.target.checked)}
                                className="rounded"
                            />
                            <Label htmlFor="hasAdvance" className="cursor-pointer">Registrar abono inicial</Label>
                        </div>

                        {hasAdvance && (
                            <div className="grid gap-3 md:grid-cols-3 pt-2">
                                <div className="grid gap-2">
                                    <Label className="text-xs">Monto del Abono</Label>
                                    <Input type="number" min={0} value={advanceAmount || ""} onChange={e => setAdvanceAmount(parseFloat(e.target.value) || 0)} placeholder="$0" />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs">Método de Pago</Label>
                                    <Select value={advanceMethod} onValueChange={setAdvanceMethod}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Efectivo">Efectivo</SelectItem>
                                            <SelectItem value="Transferencia">Transferencia</SelectItem>
                                            <SelectItem value="Crédito">Tarjeta Crédito</SelectItem>
                                            <SelectItem value="Nequi">Nequi</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs">Cuenta Destino</Label>
                                    <Select value={advanceAccountId} onValueChange={setAdvanceAccountId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="¿Dónde entra?" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map((a: any) => (
                                                <SelectItem key={a.id} value={a.id}>{a.name} ({a.type})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Creando..." : type === "CUSTOM" ? "Crear Pedido" : "Separar Producto"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
