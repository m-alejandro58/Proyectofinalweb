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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { createProviderClaim } from "@/app/actions/provider-claims"
import { getContacts } from "@/app/actions/contacts"
import { getProducts } from "@/app/actions/inventory"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const CLAIM_TYPES = [
    { value: "SWAP", label: "Swap (Recompra + Devolución)", description: "Compras uno nuevo, devuelves el malo, recibes reembolso" },
    { value: "REPLACEMENT", label: "Reemplazo Directo", description: "Proveedor envía uno nuevo a cambio del malo" },
    { value: "REFUND", label: "Reembolso Directo", description: "Devuelves al proveedor y recibes el dinero" },
]

const REASONS = [
    { value: "DEFECTO_FABRICA", label: "Defecto de fábrica" },
    { value: "GARANTIA", label: "Garantía" },
    { value: "PRODUCTO_DAÑADO", label: "Producto dañado" },
    { value: "OTRO", label: "Otro" },
]

interface CreateClaimDialogProps {
    // Pre-fill props when creating from a customer return
    prefillData?: {
        customerReturnId: string
        productName: string
        productId?: string
        quantity: number
    }
}

export function CreateClaimDialog({ prefillData }: CreateClaimDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [providers, setProviders] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])

    // Form state
    const [type, setType] = useState<string>("SWAP")
    const [productName, setProductName] = useState(prefillData?.productName || "")
    const [productId, setProductId] = useState(prefillData?.productId || "")
    const [providerId, setProviderId] = useState("")
    const [reason, setReason] = useState("")
    const [quantity, setQuantity] = useState(prefillData?.quantity || 1)
    const [notes, setNotes] = useState("")

    useEffect(() => {
        if (open) {
            loadData()
            // Re-apply prefill data when dialog opens  
            if (prefillData) {
                setProductName(prefillData.productName)
                setProductId(prefillData.productId || "")
                setQuantity(prefillData.quantity)
            }
        }
    }, [open])

    const loadData = async () => {
        try {
            const [contactsRes, productsRes] = await Promise.all([
                getContacts(),
                getProducts(),
            ])

            if (contactsRes.success && contactsRes.data) {
                setProviders(contactsRes.data.filter((c: any) => c.type === "PROVIDER"))
            }
            if (productsRes.success && productsRes.data) {
                setProducts(productsRes.data)
            }
        } catch (error) {
            console.error("Error loading data:", error)
        }
    }

    const handleSubmit = async () => {
        if (!productName || !providerId || !reason) {
            toast.error("Completa los campos requeridos: producto, proveedor y razón")
            return
        }

        setLoading(true)
        try {
            const result = await createProviderClaim(
                type as "SWAP" | "REPLACEMENT" | "REFUND",
                productName,
                providerId,
                reason,
                quantity,
                productId || undefined,
                prefillData?.customerReturnId,
                undefined,
                notes || undefined
            )

            if (result.success) {
                toast.success("Reclamación creada exitosamente")
                setOpen(false)
                resetForm()
                router.refresh()
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Error al crear reclamación")
        }
        setLoading(false)
    }

    const resetForm = () => {
        if (!prefillData) {
            setProductName("")
            setProductId("")
            setQuantity(1)
        }
        setType("SWAP")
        setProviderId("")
        setReason("")
        setNotes("")
    }

    const handleProductSelect = (id: string) => {
        setProductId(id)
        const product = products.find(p => p.id === id)
        if (product) {
            setProductName(product.name)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {prefillData ? (
                    <Button variant="outline" size="sm">
                        Reclamar al Proveedor
                    </Button>
                ) : (
                    <Button>
                        <Plus className="h-4 w-4 mr-2" /> Nueva Reclamación
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Nueva Reclamación a Proveedor</DialogTitle>
                    <DialogDescription>
                        Registra un reclamo por garantía o devolución a un proveedor
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Claim Type */}
                    <div className="space-y-2">
                        <Label>Tipo de Reclamación *</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CLAIM_TYPES.map(ct => (
                                    <SelectItem key={ct.value} value={ct.value}>
                                        <div>
                                            <div className="font-medium">{ct.label}</div>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {CLAIM_TYPES.find(ct => ct.value === type)?.description}
                        </p>
                    </div>

                    {/* Product */}
                    <div className="space-y-2">
                        <Label>Producto *</Label>
                        {prefillData ? (
                            <Input value={productName} disabled />
                        ) : (
                            <>
                                <Select value={productId} onValueChange={handleProductSelect}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar producto del inventario..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map((p: any) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} {p.brand ? `(${p.brand})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    placeholder="O escribe el nombre del producto..."
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                />
                            </>
                        )}
                    </div>

                    {/* Provider */}
                    <div className="space-y-2">
                        <Label>Proveedor *</Label>
                        <Select value={providerId} onValueChange={setProviderId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar proveedor..." />
                            </SelectTrigger>
                            <SelectContent>
                                {providers.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                        <Label>Razón *</Label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar razón..." />
                            </SelectTrigger>
                            <SelectContent>
                                {REASONS.map(r => (
                                    <SelectItem key={r.value} value={r.value}>
                                        {r.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Quantity */}
                        <div className="space-y-2">
                            <Label>Cantidad</Label>
                            <Input
                                type="number"
                                min={1}
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                disabled={!!prefillData}
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Notas</Label>
                        <Textarea
                            placeholder="Detalles adicionales sobre la reclamación..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {prefillData && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm">
                            <strong>Vinculado a devolución de cliente</strong>
                            <p className="text-muted-foreground mt-1">
                                Esta reclamación se creará vinculada a la devolución del cliente.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Creando..." : "Crear Reclamación"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
