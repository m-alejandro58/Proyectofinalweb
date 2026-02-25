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
import { ArrowRight, DollarSign } from "lucide-react"
import { advanceClaimStatus } from "@/app/actions/provider-claims"
import { getFinancialAccounts } from "@/app/actions/accounts"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Status flows per type
const STATUS_FLOWS: Record<string, string[]> = {
    SWAP: ["INITIATED", "REORDERED", "REPLACEMENT_RECEIVED", "RETURNED_TO_PROVIDER", "REFUNDED", "CLOSED"],
    REPLACEMENT: ["INITIATED", "RETURNED_TO_PROVIDER", "REPLACEMENT_RECEIVED", "CLOSED"],
    REFUND: ["INITIATED", "RETURNED_TO_PROVIDER", "REFUNDED", "CLOSED"],
}

const STATUS_LABELS: Record<string, string> = {
    INITIATED: "Iniciado",
    REORDERED: "Recomprado",
    REPLACEMENT_RECEIVED: "Reemplazo Recibido",
    RETURNED_TO_PROVIDER: "Devuelto al Proveedor",
    REFUNDED: "Reembolsado",
    CLOSED: "Cerrado",
}

const STEP_DESCRIPTIONS: Record<string, string> = {
    REORDERED: "Registrar que se recompró el producto nuevo (igual al defectuoso)",
    REPLACEMENT_RECEIVED: "Confirmar que el producto de reemplazo llegó",
    RETURNED_TO_PROVIDER: "Confirmar que el producto defectuoso fue devuelto al proveedor",
    REFUNDED: "Registrar el reembolso recibido del proveedor",
    CLOSED: "Cerrar esta reclamación como completada",
}

export function AdvanceClaimDialog({ claim }: { claim: any }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [accounts, setAccounts] = useState<any[]>([])

    // Dynamic form data
    const [reorderAmount, setReorderAmount] = useState("")
    const [refundAmount, setRefundAmount] = useState("")
    const [refundAccountId, setRefundAccountId] = useState("")
    const [notes, setNotes] = useState("")

    const flow = STATUS_FLOWS[claim.type] || []
    const currentIndex = flow.indexOf(claim.status)
    const nextStatus = currentIndex >= 0 && currentIndex < flow.length - 1 ? flow[currentIndex + 1] : null

    const needsRefundData = nextStatus === "REFUNDED"
    const needsReorderData = nextStatus === "REORDERED"

    useEffect(() => {
        if (open && needsRefundData) {
            loadAccounts()
        }
    }, [open, needsRefundData])

    const loadAccounts = async () => {
        try {
            const result = await getFinancialAccounts()
            if (result.success && result.data) {
                setAccounts(result.data)
            }
        } catch (error) {
            console.error("Error loading accounts:", error)
        }
    }

    if (!nextStatus) return null

    const handleAdvance = async () => {
        // Validate required fields
        if (needsRefundData && (!refundAmount || !refundAccountId)) {
            toast.error("Ingresa el monto del reembolso y selecciona la cuenta destino")
            return
        }

        setLoading(true)
        try {
            const result = await advanceClaimStatus(claim.id, {
                reorderAmount: reorderAmount ? parseFloat(reorderAmount) : undefined,
                refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
                refundAccountId: refundAccountId || undefined,
                notes: notes || undefined,
            })

            if (result.success) {
                toast.success(result.message)
                setOpen(false)
                router.refresh()
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Error al avanzar reclamación")
        }
        setLoading(false)
    }

    // Progress indicator
    const progress = ((currentIndex + 1) / flow.length) * 100

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Avanzar
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Avanzar Reclamación</DialogTitle>
                    <DialogDescription>
                        {claim.productName} — {claim.provider?.name}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Progress bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{STATUS_LABELS[claim.status]}</span>
                            <span>→ {STATUS_LABELS[nextStatus]}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                            <div
                                className="bg-primary rounded-full h-2 transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Step description */}
                    <div className="bg-muted p-3 rounded-md text-sm">
                        {STEP_DESCRIPTIONS[nextStatus]}
                    </div>

                    {/* Step-specific fields */}
                    {needsReorderData && (
                        <div className="space-y-2">
                            <Label>Monto de Recompra (opcional)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="0.00"
                                    className="pl-8"
                                    value={reorderAmount}
                                    onChange={(e) => setReorderAmount(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Cuánto costó la recompra del producto nuevo
                            </p>
                        </div>
                    )}

                    {needsRefundData && (
                        <>
                            <div className="space-y-2">
                                <Label>Monto del Reembolso *</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="0.00"
                                        className="pl-8"
                                        value={refundAmount}
                                        onChange={(e) => setRefundAmount(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Cuenta Destino del Reembolso *</Label>
                                <Select value={refundAccountId} onValueChange={setRefundAccountId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar cuenta..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.map((acc: any) => (
                                            <SelectItem key={acc.id} value={acc.id}>
                                                {acc.name} ({acc.type}) — ${acc.balance.toLocaleString()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Ej: Saldo Amazon, cuenta bancaria, etc.
                                </p>
                            </div>
                        </>
                    )}

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Notas (opcional)</Label>
                        <Textarea
                            placeholder="Comentarios adicionales..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleAdvance} disabled={loading}>
                        {loading ? "Procesando..." : `Avanzar a "${STATUS_LABELS[nextStatus]}"`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
