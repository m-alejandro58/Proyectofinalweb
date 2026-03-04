"use client"

import { useState, useEffect, useMemo, useRef } from "react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createSale } from "@/app/actions/sales"
import { Plus, Trash2, Calculator, Info } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { CreateContactDialog } from "@/components/contacts/create-contact-dialog"
import { Combobox } from "@/components/ui/combobox"

type SaleItem = {
    productId: string
    quantity: number
    unitPrice: number
    warranty: number
    serial: string
    itemFee: number       // per-item platform commission
    itemShipping: number  // per-item shipping cost
}

type Props = {
    clients: any[]
    accounts: any[]
    products: any[]
}

// Platform commission rates
const PLATFORM_FEE_RATES: Record<string, number> = {
    MERCADOLIBRE: 0.155,
    RAPPI: 0.1,
    WEBSITE: 0.05,
    LUEGOPAGO: 0.08,
    PRESENCIAL: 0,
    FACEBOOK: 0,
    WHATSAPP: 0,
}

export function CreateSaleForm({ clients: initialClients, accounts, products }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [items, setItems] = useState<SaleItem[]>([])

    // Local clients state
    const [clients, setClients] = useState(initialClients)

    // Header State
    const [clientId, setClientId] = useState("")
    const [accountId, setAccountId] = useState("")
    const [invoice, setInvoice] = useState("")
    const [channel, setChannel] = useState("PRESENCIAL")
    const [paymentMethod, setPaymentMethod] = useState("")

    // Calculator State (all derived from items)
    const [taxes, setTaxes] = useState(0)

    // Line Input State
    const [currentProduct, setCurrentProduct] = useState("")
    const [currentQty, setCurrentQty] = useState(1)
    const [currentPrice, setCurrentPrice] = useState(0)
    const [currentWarranty, setCurrentWarranty] = useState(12)
    const [currentSerial, setCurrentSerial] = useState("")
    const [currentFee, setCurrentFee] = useState(0)
    const [currentShipping, setCurrentShipping] = useState(0)

    // Product search state
    const [productSearch, setProductSearch] = useState("")
    const [showResults, setShowResults] = useState(false)

    // Per-item mode toggle (shown when channel has commission)
    const hasCommission = (PLATFORM_FEE_RATES[channel] ?? 0) > 0

    // Filter products by search query
    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return products
        const q = productSearch.toLowerCase()
        return products.filter((p: any) =>
            p.name?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            p.brand?.toLowerCase().includes(q) ||
            p.category?.toLowerCase().includes(q)
        )
    }, [productSearch, products])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target.closest(".product-search-container")) {
                setShowResults(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    const handleNewClient = (newClient: any) => {
        setClients([...clients, newClient])
        setClientId(newClient.id)
    }

    // Auto-calculate fee for current item when price/channel changes
    useEffect(() => {
        const rate = PLATFORM_FEE_RATES[channel] ?? 0
        setCurrentFee(Math.round(currentPrice * currentQty * rate))
    }, [currentPrice, currentQty, channel])

    // Derived totals from items
    const grossAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    const totalPlatformFee = items.reduce((s, i) => s + i.itemFee, 0)
    const totalShipping = items.reduce((s, i) => s + i.itemShipping, 0)
    const netAmount = grossAmount - totalPlatformFee - totalShipping - taxes

    const addItem = () => {
        if (!currentProduct || currentQty <= 0 || currentPrice <= 0) return

        const prod = products.find((p: any) => p.id === currentProduct)
        if (prod && currentQty > prod.stockTotal) {
            alert(`¡Error! Stock insuficiente. Solo hay ${prod.stockTotal} unidades disponibles.`)
            return
        }

        setItems([...items, {
            productId: currentProduct,
            quantity: currentQty,
            unitPrice: currentPrice,
            warranty: currentWarranty,
            serial: currentSerial,
            itemFee: currentFee,
            itemShipping: currentShipping,
        }])

        // Reset
        setCurrentProduct("")
        setProductSearch("")
        setCurrentQty(1)
        setCurrentPrice(0)
        setCurrentWarranty(12)
        setCurrentSerial("")
        setCurrentFee(0)
        setCurrentShipping(0)
    }

    const removeItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx))
    }

    const updateItemFee = (idx: number, fee: number) => {
        setItems(items.map((item, i) => i === idx ? { ...item, itemFee: fee } : item))
    }

    const updateItemShipping = (idx: number, shipping: number) => {
        setItems(items.map((item, i) => i === idx ? { ...item, itemShipping: shipping } : item))
    }

    const handleSubmit = async () => {
        if (!clientId || !accountId || items.length === 0) {
            alert("Complete los campos requeridos")
            return
        }

        setLoading(true)
        const res = await createSale(
            clientId,
            accountId,
            channel,
            grossAmount,
            totalPlatformFee,
            totalShipping,
            taxes,
            items.map(i => ({
                productId: i.productId,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                warrantyMonths: i.warranty,
                serialNumber: i.serial
            })),
            invoice,
            paymentMethod || undefined
        )

        if (res.success) {
            router.push("/sales")
            router.refresh()
        } else {
            alert(res.error)
            setLoading(false)
        }
    }

    const fmt = (n: number) => n.toLocaleString("es-CO")

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Datos de Venta y Cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="flex gap-2 items-end">
                            <div className="grid gap-2 flex-1">
                                <Label>Cliente</Label>
                                <Combobox
                                    items={clients.map((c: any) => ({ value: c.id, label: c.name }))}
                                    value={clientId}
                                    onChange={setClientId}
                                    placeholder="Buscar cliente..."
                                />
                            </div>
                            <CreateContactDialog onSuccess={handleNewClient} />
                        </div>

                        <div className="grid gap-2">
                            <Label>Canal de Venta</Label>
                            <Select value={channel} onValueChange={setChannel}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PRESENCIAL">Presencial / Local</SelectItem>
                                    <SelectItem value="MERCADOLIBRE">MercadoLibre</SelectItem>
                                    <SelectItem value="FACEBOOK">Facebook Marketplace</SelectItem>
                                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                                    <SelectItem value="WEBSITE">Sitio Web</SelectItem>
                                    <SelectItem value="LUEGOPAGO">LuegoPago</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Medio de Pago</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Ej. Efectivo, Transferencia..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                                    <SelectItem value="TRANSFERENCIA">Transferencia / Bancolombia / Nequi</SelectItem>
                                    <SelectItem value="TARJETA_CREDITO">Tarjeta de Crédito / Débito</SelectItem>
                                    <SelectItem value="SISTECREDITO">SisteCredito</SelectItem>
                                    <SelectItem value="MERCADOPAGO">Mercado Pago / Link de Pago</SelectItem>
                                    <SelectItem value="OTRO">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Cuenta de Depósito</Label>
                            <Select onValueChange={setAccountId} value={accountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="¿Dónde entra el dinero?" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(a => (
                                        <SelectItem key={a.id} value={a.id}>{a.name} ({a.type})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Factura / Ref (Opcional)</Label>
                            <Input value={invoice} onChange={e => setInvoice(e.target.value)} placeholder="N° Factura..." />
                        </div>
                    </CardContent>
                </Card>

                {/* Financial Calculator — now derived from item-level fees */}
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center text-primary">
                            <span>Calculadora Financiera</span>
                            <Calculator />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {hasCommission && (
                            <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-2.5 text-xs text-blue-700 dark:text-blue-300">
                                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                <span>
                                    Comisión y envío se calculan <strong>por artículo</strong>.
                                    Edítalos en la tabla de productos.
                                    Tasa {channel}: <strong>{((PLATFORM_FEE_RATES[channel] ?? 0) * 100).toFixed(1)}%</strong>
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between text-lg">
                            <span>Venta Bruta:</span>
                            <span className="font-bold">${fmt(grossAmount)}</span>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-destructive">
                                <span>Comisión plataforma:</span>
                                <span className="font-medium">-${fmt(totalPlatformFee)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Costo de envío:</span>
                                <span>-${fmt(totalShipping)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <Label className="text-xs">Otras Retenciones / Impuestos</Label>
                                <Input
                                    type="number"
                                    className="h-7 w-32 text-right"
                                    value={taxes}
                                    onChange={e => setTaxes(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-2 flex justify-between text-xl font-bold">
                            <span>Ganancia Neta:</span>
                            <span className={netAmount > 0 ? "text-green-600" : "text-red-500"}>
                                ${fmt(netAmount)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Products */}
            <Card>
                <CardHeader>
                    <CardTitle>Productos</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 bg-muted/20 pb-6">
                    {/* PRODUCT SEARCH */}
                    <div className="grid gap-1 relative product-search-container">
                        <Label>Buscar Producto (nombre, SKU, marca...)</Label>
                        <Input
                            placeholder="Escriba para buscar..."
                            value={productSearch}
                            onChange={e => {
                                setProductSearch(e.target.value)
                                setShowResults(true)
                                setCurrentProduct("")
                            }}
                            onFocus={() => setShowResults(true)}
                            className="font-medium"
                            autoComplete="off"
                        />
                        {showResults && productSearch.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[250px] overflow-y-auto bg-popover border rounded-md shadow-lg">
                                {filteredProducts.length === 0 ? (
                                    <div className="p-3 text-sm text-muted-foreground text-center">Sin resultados para &quot;{productSearch}&quot;</div>
                                ) : (
                                    filteredProducts.map((p: any) => {
                                        const isOut = p.stockTotal <= 0
                                        const isLow = p.stockTotal <= 2 && p.stockTotal > 0
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                disabled={isOut}
                                                className={`w-full text-left px-3 py-2 hover:bg-accent flex justify-between items-center text-sm border-b last:border-b-0 ${isOut ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                                                onClick={() => {
                                                    setCurrentProduct(p.id)
                                                    setProductSearch(`${p.name} ${p.sku ? `(${p.sku})` : ""}`)
                                                    setShowResults(false)
                                                }}
                                            >
                                                <div>
                                                    <span className="font-medium">{p.name}</span>
                                                    {p.sku && <span className="ml-2 text-xs text-muted-foreground font-mono">{p.sku}</span>}
                                                    {p.brand && <span className="ml-2 text-xs text-muted-foreground">• {p.brand}</span>}
                                                </div>
                                                <span className={`text-xs font-bold ${isOut ? "text-red-500" : isLow ? "text-orange-500" : "text-green-600"}`}>
                                                    {isOut ? "AGOTADO" : isLow ? `¡Últimas ${p.stockTotal}!` : `Stock: ${p.stockTotal}`}
                                                </span>
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {/* DETAILS ROW — now includes per-item fee and shipping */}
                    <div className="grid grid-cols-7 gap-2 items-end">
                        <div className="grid gap-1">
                            <Label className="text-xs">Cant.</Label>
                            <Input type="number" min="1" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} />
                        </div>
                        <div className="grid gap-1 col-span-2">
                            <Label className="text-xs">Precio Unit.</Label>
                            <Input type="number" min="0" value={currentPrice} onChange={e => setCurrentPrice(Number(e.target.value))} />
                        </div>
                        <div className="grid gap-1">
                            <Label className="text-xs">Garantía (m)</Label>
                            <Input type="number" min="0" value={currentWarranty} onChange={e => setCurrentWarranty(Number(e.target.value))} />
                        </div>
                        <div className="grid gap-1">
                            <Label className="text-xs text-destructive">Comisión</Label>
                            <Input
                                type="number" min="0"
                                value={currentFee}
                                onChange={e => setCurrentFee(Number(e.target.value))}
                                className="border-destructive/40"
                            />
                        </div>
                        <div className="grid gap-1">
                            <Label className="text-xs text-muted-foreground">Envío</Label>
                            <Input
                                type="number" min="0"
                                value={currentShipping}
                                onChange={e => setCurrentShipping(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <Button onClick={addItem} type="button" className="w-full">
                                <Plus className="h-4 w-4 mr-1" /> Agregar
                            </Button>
                        </div>
                    </div>
                </CardContent>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead>Serial</TableHead>
                                <TableHead className="text-right">Cant.</TableHead>
                                <TableHead className="text-right">Precio</TableHead>
                                <TableHead className="text-right text-destructive">Comisión</TableHead>
                                <TableHead className="text-right">Envío</TableHead>
                                <TableHead className="text-right font-semibold">Neto</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, idx) => {
                                const prod = products.find((p: any) => p.id === item.productId)
                                const subtotal = item.quantity * item.unitPrice
                                const netLine = subtotal - item.itemFee - item.itemShipping
                                return (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">{prod?.name}</TableCell>
                                        <TableCell className="text-muted-foreground text-xs">{item.serial || "—"}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">${fmt(subtotal)}</TableCell>
                                        <TableCell className="text-right text-destructive">
                                            <Input
                                                type="number" min="0"
                                                value={item.itemFee}
                                                onChange={e => updateItemFee(idx, Number(e.target.value))}
                                                className="h-7 w-24 text-right ml-auto border-destructive/40 text-destructive"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                type="number" min="0"
                                                value={item.itemShipping}
                                                onChange={e => updateItemShipping(idx, Number(e.target.value))}
                                                className="h-7 w-24 text-right ml-auto"
                                            />
                                        </TableCell>
                                        <TableCell className={`text-right font-bold ${netLine < 0 ? "text-red-500" : "text-green-600"}`}>
                                            ${fmt(netLine)}
                                        </TableCell>
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
                                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                        Agregue productos a la venta
                                    </TableCell>
                                </TableRow>
                            )}
                            {/* Totals row */}
                            {items.length > 0 && (
                                <TableRow className="bg-muted/30 font-semibold">
                                    <TableCell colSpan={3}>TOTALES</TableCell>
                                    <TableCell className="text-right">${fmt(grossAmount)}</TableCell>
                                    <TableCell className="text-right text-destructive">-${fmt(totalPlatformFee)}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">-${fmt(totalShipping)}</TableCell>
                                    <TableCell className={`text-right ${netAmount < 0 ? "text-red-500" : "text-green-600"}`}>
                                        ${fmt(netAmount - taxes > 0 ? netAmount : 0)}
                                    </TableCell>
                                    <TableCell />
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
                <Button size="lg" onClick={handleSubmit} disabled={loading} className="w-full md:w-auto">
                    {loading ? "Registrando Venta..." : "Confirmar Venta"}
                </Button>
            </div>
        </div>
    )
}
