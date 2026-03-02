"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Combobox } from "@/components/ui/combobox"
import { CreateContactDialog } from "@/components/contacts/create-contact-dialog"
import { Plus, Package, Archive, Search } from "lucide-react"
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

    // Product search for LAYAWAY (not CUSTOM — CUSTOM is free text)
    const [productSearch, setProductSearch] = useState("")
    const [showProductResults, setShowProductResults] = useState(false)

    // Initial payment
    const [hasAdvance, setHasAdvance] = useState(false)
    const [advanceAmount, setAdvanceAmount] = useState(0)
    const [advanceMethod, setAdvanceMethod] = useState("Efectivo")
    const [advanceAccountId, setAdvanceAccountId] = useState("")

    useEffect(() => {
        if (open) {
            getContacts().then(res => {
                if (res.success && res.data) {
                    setClients(res.data.filter((c: any) => c.type === "CLIENT" || c.type === "BOTH"))
                    setProviders(res.data.filter((c: any) => c.type === "PROVIDER" || c.type === "BOTH"))
                }
            })
            getProducts().then(res => {
                if (res.success && res.data) setProducts(res.data)
            })
        }
    }, [open])

    // Filtered products for LAYAWAY search
    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return products.filter((p: any) => p.stockTotal > 0)
        const q = productSearch.toLowerCase()
        return products.filter((p: any) =>
            p.stockTotal > 0 && (
                p.name?.toLowerCase().includes(q) ||
                p.sku?.toLowerCase().includes(q) ||
                p.brand?.toLowerCase().includes(q)
            )
        )
    }, [productSearch, products])

    // Client combobox items
    const clientItems = clients.map(c => ({ value: c.id, label: c.name }))
    const providerItems = providers.map(p => ({ value: p.id, label: p.name }))

    const handleNewClient = (newClient: any) => {
        setClients(prev => [...prev, newClient])
        setClientId(newClient.id)
    }

    const resetForm = () => {
        setType("CUSTOM")
        setClientId("")
        setDescription("")
        setProductId("")
        setProductSearch("")
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
                            onClick={() => { setType("CUSTOM"); setProductId(""); setProductSearch("") }}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${type === "CUSTOM" ? "border-blue-500 bg-blue-500/10" : "border-border hover:border-blue-500/50"}`}
                        >
                            <Package className={`h-5 w-5 ${type === "CUSTOM" ? "text-blue-500" : "text-muted-foreground"}`} />
                            <div className="text-left">
                                <p className={`font-medium text-sm ${type === "CUSTOM" ? "text-blue-500" : ""}`}>Pedido Especial</p>
                                <p className="text-xs text-muted-foreground">Producto no disponible, pedir a proveedor</p>
                            </div>
                        </button>
                        <button
                            onClick={() => { setType("LAYAWAY"); setDescription("") }}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${type === "LAYAWAY" ? "border-purple-500 bg-purple-500/10" : "border-border hover:border-purple-500/50"}`}
                        >
                            <Archive className={`h-5 w-5 ${type === "LAYAWAY" ? "text-purple-500" : "text-muted-foreground"}`} />
                            <div className="text-left">
                                <p className={`font-medium text-sm ${type === "LAYAWAY" ? "text-purple-500" : ""}`}>Apartado</p>
                                <p className="text-xs text-muted-foreground">Separar producto que ya tengo en bodega</p>
                            </div>
                        </button>
                    </div>

                    {/* ── Cliente (searchable combobox + create new) ── */}
                    <div className="grid gap-2">
                        <Label>Cliente *</Label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Combobox
                                    items={clientItems}
                                    value={clientId}
                                    onChange={setClientId}
                                    placeholder="Buscar cliente..."
                                />
                            </div>
                            <CreateContactDialog onSuccess={handleNewClient} />
                        </div>
                        {clientId && (
                            <p className="text-xs text-green-600">
                                ✓ {clients.find(c => c.id === clientId)?.name}
                            </p>
                        )}
                    </div>

                    {/* ── CUSTOM: Descripción libre del producto ── */}
                    {type === "CUSTOM" && (
                        <div className="space-y-3 rounded-lg border border-blue-200/50 bg-blue-50/30 dark:bg-blue-950/10 p-3">
                            <p className="text-xs font-semibold text-blue-600">📦 Producto a Pedir (no tiene que estar en inventario)</p>
                            <div className="grid gap-2">
                                <Label>Descripción del producto *</Label>
                                <Textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Ej: Audífonos Sony WH-1000XM5 negros, cable USB-C incluido..."
                                    rows={2}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Describe el producto con el mayor detalle posible para el proveedor.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── LAYAWAY: Buscar producto en inventario ── */}
                    {type === "LAYAWAY" && (
                        <div className="space-y-3 rounded-lg border border-purple-200/50 bg-purple-50/30 dark:bg-purple-950/10 p-3">
                            <p className="text-xs font-semibold text-purple-600">📦 Producto a Apartar (debe estar en inventario)</p>
                            <div className="grid gap-2 relative">
                                <Label>Buscar producto *</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        className="pl-9"
                                        placeholder="Nombre, SKU, marca..."
                                        value={productSearch}
                                        onChange={e => {
                                            setProductSearch(e.target.value)
                                            setShowProductResults(true)
                                            setProductId("")
                                            setDescription("")
                                        }}
                                        onFocus={() => setShowProductResults(true)}
                                    />
                                </div>
                                {showProductResults && productSearch.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[200px] overflow-y-auto bg-popover border rounded-md shadow-lg">
                                        {filteredProducts.length === 0 ? (
                                            <div className="p-3 text-sm text-muted-foreground text-center">Sin resultados</div>
                                        ) : (
                                            filteredProducts.map((p: any) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    className="w-full text-left px-3 py-2 hover:bg-accent flex justify-between items-center text-sm border-b last:border-b-0"
                                                    onClick={() => {
                                                        setProductId(p.id)
                                                        setProductSearch(p.name)
                                                        setDescription(p.name)
                                                        setShowProductResults(false)
                                                    }}
                                                >
                                                    <div>
                                                        <span className="font-medium">{p.name}</span>
                                                        {p.sku && <span className="ml-2 text-xs text-muted-foreground font-mono">{p.sku}</span>}
                                                        {p.brand && <span className="ml-2 text-xs text-muted-foreground">• {p.brand}</span>}
                                                    </div>
                                                    <span className="text-xs font-bold text-green-600 ml-2">Stock: {p.stockTotal}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                                {productId && (
                                    <p className="text-xs text-green-600">
                                        ✓ Seleccionado: {products.find(p => p.id === productId)?.name}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Supplier (CUSTOM only) */}
                        {type === "CUSTOM" && (
                            <div className="grid gap-2">
                                <Label>Proveedor</Label>
                                <Combobox
                                    items={providerItems}
                                    value={providerId}
                                    onChange={setProviderId}
                                    placeholder="Buscar proveedor..."
                                />
                            </div>
                        )}

                        {/* Estimated arrival (CUSTOM only) */}
                        {type === "CUSTOM" && (
                            <div className="grid gap-2">
                                <Label>Fecha Est. de Llegada</Label>
                                <Input type="date" value={expectedArrival} onChange={e => setExpectedArrival(e.target.value)} />
                            </div>
                        )}
                    </div>

                    {/* Pricing */}
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
                                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                                        <SelectTrigger><SelectValue placeholder="¿Dónde entra?" /></SelectTrigger>
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
