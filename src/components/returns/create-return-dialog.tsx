"use client"

import { useState } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Search } from "lucide-react"
import { validateReturnEligibility, createReturn } from "@/app/actions/returns"
import { getSales } from "@/app/actions/sales"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function CreateReturnDialog() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState(1) // 1: Search, 2: Select Items, 3: Details, 4: Confirm
    const [searchQuery, setSearchQuery] = useState("")
    const [sale, setSale] = useState<any>(null)
    const [eligibility, setEligibility] = useState<any>(null)
    const [selectedItems, setSelectedItems] = useState<any[]>([])
    const [reason, setReason] = useState("")
    const [notes, setNotes] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSearch = async () => {
        setLoading(true)
        try {
            const result = await getSales()
            if (result.success && result.data) {
                const found = result.data.find((s: any) =>
                    s.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.client?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                )

                if (found) {
                    setSale(found)
                    const eligibilityResult = await validateReturnEligibility(found.id)
                    if (eligibilityResult.success) {
                        setEligibility(eligibilityResult.data)
                        setStep(2)
                    } else {
                        toast.error(eligibilityResult.error)
                    }
                } else {
                    toast.error("Venta no encontrada")
                }
            }
        } catch (error) {
            toast.error("Error al buscar venta")
        }
        setLoading(false)
    }

    const toggleItem = (item: string, checked: boolean) => {
        if (checked) {
            // Find saleItem details
            const saleItem = sale.items.find((i: any) => i.id === item)
            setSelectedItems([...selectedItems, {
                saleItemId: item,
                quantity: saleItem.quantity,
                maxQuantity: saleItem.quantity,
                productName: saleItem.productName,
                productCondition: 'GOOD'
            }])
        } else {
            setSelectedItems(selectedItems.filter((i: any) => i.saleItemId !== item))
        }
    }

    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            toast.error("Selecciona al menos un item")
            return
        }

        if (!reason) {
            toast.error("Selecciona un motivo")
            return
        }

        setLoading(true)
        try {
            const result = await createReturn(sale.id, reason as any, selectedItems, notes)
            if (result.success) {
                toast.success("Devolución creada exitosamente")
                setOpen(false)
                router.refresh()
                // Reset
                setStep(1)
                setSale(null)
                setEligibility(null)
                setSelectedItems([])
                setReason("")
                setNotes("")
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Error al crear devolución")
        }
        setLoading(false)
    }

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>Buscar Venta</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Número de factura o cliente..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <Button onClick={handleSearch} disabled={loading}>
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )

            case 2:
                return (
                    <div className="space-y-4">
                        <div className="bg-muted p-3 rounded-lg text-sm">
                            <div><strong>Cliente:</strong> {sale.client?.name || 'Casual'}</div>
                            <div><strong>Fecha:</strong> {new Date(sale.date).toLocaleDateString()} ({eligibility.daysSinceSale} días)</div>
                            <div>
                                {eligibility.within30Days ? (
                                    <span className="text-green-600">✅ Dentro de 30 días</span>
                                ) : eligibility.hasActiveWarranty ? (
                                    <span className="text-yellow-600">⚠️ Fuera de 30 días (solo garantía)</span>
                                ) : (
                                    <span className="text-red-600">❌ No elegible</span>
                                )}
                            </div>
                        </div>

                        <Label>Items a Devolver</Label>
                        <div className="space-y-2">
                            {sale.items.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-2 border p-2 rounded">
                                    <Checkbox
                                        checked={selectedItems.some(i => i.saleItemId === item.id)}
                                        onCheckedChange={(checked) => toggleItem(item.id, checked as boolean)}
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium">{item.productName}</div>
                                        <div className="text-sm text-muted-foreground">
                                            Cantidad: {item.quantity} | Precio: ${item.unitPrice.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button onClick={() => setStep(3)} disabled={selectedItems.length === 0}>
                            Continuar
                        </Button>
                    </div>
                )

            case 3:
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>Motivo de Devolución</Label>
                            <Select value={reason} onValueChange={setReason}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un motivo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {eligibility.within30Days && (
                                        <SelectItem value="CHANGE_OF_MIND">Cambio de opinión</SelectItem>
                                    )}
                                    <SelectItem value="DEFECTIVE">Defectuoso</SelectItem>
                                    <SelectItem value="WARRANTY">Garantía</SelectItem>
                                    <SelectItem value="WRONG_ITEM">Artículo incorrecto</SelectItem>
                                    <SelectItem value="OTHER">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedItems.map((item, index) => (
                            <div key={item.saleItemId}>
                                <Label>Condición: {item.productName}</Label>
                                <Select
                                    value={item.productCondition}
                                    onValueChange={(value) => {
                                        const updated = [...selectedItems]
                                        updated[index].productCondition = value
                                        setSelectedItems(updated)
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GOOD">Buen estado</SelectItem>
                                        <SelectItem value="DEFECTIVE">Defectuoso</SelectItem>
                                        <SelectItem value="DAMAGED">Dañado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}

                        <div>
                            <Label>Notas (opcional)</Label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Detalles adicionales..."
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep(2)}>Atrás</Button>
                            <Button onClick={handleSubmit} disabled={loading}>
                                {loading ? "Creando..." : "Crear Devolución"}
                            </Button>
                        </div>
                    </div>
                )
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" /> Nueva Devolución
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Nueva Devolución</DialogTitle>
                    <DialogDescription>
                        Proceso de devolución - Paso {step} de 3
                    </DialogDescription>
                </DialogHeader>
                {renderStep()}
            </DialogContent>
        </Dialog>
    )
}
