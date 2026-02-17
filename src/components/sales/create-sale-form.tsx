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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createSale } from "@/app/actions/sales"
import { Plus, Trash2, Calculator } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { CreateContactDialog } from "@/components/contacts/create-contact-dialog"

type Props = {
    clients: any[]
    accounts: any[]
    products: any[]
}

export function CreateSaleForm({ clients: initialClients, accounts, products }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [items, setItems] = useState<{ productId: string, quantity: number, unitPrice: number, warranty: number, serial: string }[]>([])

    // Local clients state
    const [clients, setClients] = useState(initialClients)

    // Header State
    const [clientId, setClientId] = useState("")
    const [accountId, setAccountId] = useState("")
    const [invoice, setInvoice] = useState("")
    const [channel, setChannel] = useState("PRESENCIAL")
    const [paymentMethod, setPaymentMethod] = useState("")

    // Calculator State
    const [grossAmount, setGrossAmount] = useState(0) // Total Sale Price
    const [shippingCost, setShippingCost] = useState(0)
    const [taxes, setTaxes] = useState(0)
    const [platformFee, setPlatformFee] = useState(0)
    const [netAmount, setNetAmount] = useState(0)

    // Line Input State
    const [currentProduct, setCurrentProduct] = useState("")
    const [currentQty, setCurrentQty] = useState(1)
    const [currentPrice, setCurrentPrice] = useState(0)
    const [currentWarranty, setCurrentWarranty] = useState(12)
    const [currentSerial, setCurrentSerial] = useState("")

    const handleNewClient = (newClient: any) => {
        setClients([...clients, newClient])
        setClientId(newClient.id)
    }

    // Update calculator when items change
    useEffect(() => {
        const total = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0)
        setGrossAmount(total)
    }, [items])

    // Recalculate Fees when Channel or Gross changes
    useEffect(() => {
        let fee = 0
        if (channel === "MERCADOLIBRE") {
            // 15.5% + Envío (approx handled separately?)
            fee = Math.round(grossAmount * 0.155)
        } else if (channel === "RAPPI") {
            fee = Math.round(grossAmount * 0.1)
        } else if (channel === "WEBSITE") {
            fee = Math.round(grossAmount * 0.05)
        } else if (channel === "LUEGOPAGO") {
            fee = Math.round(grossAmount * 0.08)
        } else {
            fee = 0
        }
        setPlatformFee(fee)
        // Reset payment method if channel changes away from LUEGOPAGO
        if (channel !== "LUEGOPAGO") {
            setPaymentMethod("")
        }
    }, [grossAmount, channel])

    // Calculate Net
    useEffect(() => {
        setNetAmount(grossAmount - platformFee - shippingCost - taxes)
    }, [grossAmount, platformFee, shippingCost, taxes])

    const addItem = () => {
        if (!currentProduct || currentQty <= 0 || currentPrice <= 0) return

        // Check stock locally
        const prod = products.find((p: any) => p.id === currentProduct)

        if (prod) {
            if (currentQty > prod.stockTotal) {
                alert(`¡Error! Stock insuficiente. Solo hay ${prod.stockTotal} unidades disponibles.`)
                return
            }
        }

        setItems([...items, {
            productId: currentProduct,
            quantity: currentQty,
            unitPrice: currentPrice,
            warranty: currentWarranty,
            serial: currentSerial
        }])

        // Reset
        setCurrentProduct("")
        setCurrentQty(1)
        setCurrentPrice(0)
        setCurrentSerial("")
    }

    const removeItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx))
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
            platformFee,
            shippingCost,
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

    const onProductSelect = (id: string) => {
        setCurrentProduct(id)
    }

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
                                <Select onValueChange={setClientId} value={clientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione Cliente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <CreateContactDialog onSuccess={handleNewClient} />
                        </div>

                        <div className="grid gap-2">
                            <Label>Canal de Venta</Label>
                            <Select value={channel} onValueChange={setChannel}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
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
                        {channel === "LUEGOPAGO" && (
                            <div className="grid gap-2">
                                <Label>Método de Pago (LuegoPago)</Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione método" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SISTECREDITO">SisteCredito (60 días)</SelectItem>
                                        <SelectItem value="NORMAL">Pago Normal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
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

                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center text-primary">
                            <span>Calculadora Financiera</span>
                            <Calculator />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between text-lg">
                            <span>Venta Bruta:</span>
                            <span className="font-bold">${grossAmount.toLocaleString()}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-1">
                                <Label className="text-xs">Comisión ({channel}) - Editable</Label>
                                <Input
                                    type="number"
                                    className="h-8 text-destructive font-medium"
                                    value={platformFee}
                                    onChange={e => setPlatformFee(Number(e.target.value))}
                                />
                            </div>
                            <div className="grid gap-1">
                                <Label className="text-xs">Costo Envío - Editable</Label>
                                <Input
                                    type="number"
                                    className="h-8"
                                    value={shippingCost}
                                    onChange={e => setShippingCost(Number(e.target.value))}
                                />
                            </div>
                        </div>
                        <div className="grid gap-1">
                            <Label className="text-xs">Otras Retenciones / Impuestos</Label>
                            <Input
                                type="number"
                                className="h-8"
                                value={taxes}
                                onChange={e => setTaxes(Number(e.target.value))}
                            />
                        </div>
                        <div className="border-t pt-4 mt-4 flex justify-between text-xl font-bold">
                            <span>Ganancia Neta:</span>
                            <span className={netAmount > 0 ? "text-green-600" : "text-red-500"}>
                                ${netAmount.toLocaleString()}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Productos</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 bg-muted/20 pb-6">
                    <div className="grid grid-cols-6 gap-2 items-end">
                        <div className="col-span-2 grid gap-1 min-w-0">
                            <Label>Producto</Label>
                            <Select value={currentProduct} onValueChange={onProductSelect}>
                                <SelectTrigger className="w-full truncate">
                                    <span className="truncate">
                                        <SelectValue placeholder="Buscar producto..." />
                                    </span>
                                </SelectTrigger>
                                <SelectContent className="max-w-[400px]">
                                    {products.map((p: any) => {
                                        const isLowStock = p.stockTotal <= 2 && p.stockTotal > 0
                                        const isOut = p.stockTotal <= 0
                                        return (
                                            <SelectItem key={p.id} value={p.id} disabled={isOut} className={isOut ? "text-muted-foreground" : ""}>
                                                {p.name}
                                                <span className={`ml-2 text-xs ${isOut ? "text-red-500 font-bold" : isLowStock ? "text-orange-500 font-bold" : "text-muted-foreground"}`}>
                                                    ({isOut ? "AGOTADO" : isLowStock ? `¡Últimas ${p.stockTotal}!` : `Stock: ${p.stockTotal}`})
                                                </span>
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1">
                            <Label>Cant.</Label>
                            <Input type="number" min="1" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} />
                        </div>
                        <div className="grid gap-1">
                            <Label>Precio Unit.</Label>
                            <Input type="number" min="0" value={currentPrice} onChange={e => setCurrentPrice(Number(e.target.value))} />
                        </div>
                        <div className="grid gap-1">
                            <Label>Serial / Garantía</Label>
                            <Input placeholder="SN123..." value={currentSerial} onChange={e => setCurrentSerial(e.target.value)} />
                        </div>
                        <div>
                            <Button onClick={addItem} type="button" className="w-full">
                                <Plus className="h-4 w-4" />
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
                                <TableHead className="text-right">Garantía</TableHead>
                                <TableHead className="text-right">Cant.</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, idx) => {
                                const prod = products.find((p: any) => p.id === item.productId)
                                return (
                                    <TableRow key={idx}>
                                        <TableCell>{prod?.name}</TableCell>
                                        <TableCell>{item.serial || "-"}</TableCell>
                                        <TableCell className="text-right">{item.warranty} mes</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">${(item.quantity * item.unitPrice).toLocaleString()}</TableCell>
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
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        Agregue productos a la venta
                                    </TableCell>
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
