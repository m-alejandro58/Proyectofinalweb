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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, X } from "lucide-react"
import { processReturn } from "@/app/actions/returns"
import { getFinancialAccounts } from "@/app/actions/accounts"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function ProcessReturnDialog({ returnData }: { returnData: any }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [refundAccountId, setRefundAccountId] = useState("")
    const [loading, setLoading] = useState(false)
    const [accounts, setAccounts] = useState<any[]>([])

    useEffect(() => {
        if (open) {
            // Cargar cuentas cuando se abre el diálogo
            loadAccounts()
        }
    }, [open])

    const loadAccounts = async () => {
        try {
            const result = await getFinancialAccounts()
            if (result.success && result.data) {
                // Filtrar solo cuentas de efectivo/banco que puedan hacer reembolsos
                const validAccounts = result.data.filter((acc: any) =>
                    acc.type === 'CASH' || acc.type === 'BANK'
                )
                setAccounts(validAccounts)
            }
        } catch (error) {
            console.error("Error loading accounts:", error)
            toast.error("Error al cargar cuentas financieras")
        }
    }

    const handleApprove = async () => {
        console.log("handleApprove clicked!", { refundAccountId })

        if (!refundAccountId) {
            toast.error("Selecciona una cuenta para el reembolso")
            return
        }

        setLoading(true)
        console.log("About to call processReturn...")

        try {
            const result = await processReturn(returnData.id, true, refundAccountId)
            console.log("processReturn result:", result)

            if (result.success) {
                toast.success(result.message)
                setOpen(false)
                router.refresh()
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            console.error("Exception in handleApprove:", error)
            toast.error("Error al procesar devolución")
        }
        setLoading(false)
    }

    const handleReject = async () => {
        setLoading(true)
        try {
            const result = await processReturn(returnData.id, false)
            if (result.success) {
                toast.success(result.message)
                setOpen(false)
                router.refresh()
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Error al rechazar devolución")
        }
        setLoading(false)
    }

    const getAccountBalance = (accountId: string) => {
        const account = accounts.find(acc => acc.id === accountId)
        return account ? account.balance : 0
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">Procesar</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Procesar Devolución</DialogTitle>
                    <DialogDescription>
                        Revisa y aprueba o rechaza esta devolución
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                        <div><strong>Cliente:</strong> {returnData.sale.client?.name || 'Casual'}</div>
                        <div><strong>Fecha Solicitud:</strong> {new Date(returnData.requestedAt).toLocaleDateString()}</div>
                        <div><strong>Motivo:</strong> {returnData.reason}</div>
                        {returnData.notes && <div><strong>Notas:</strong> {returnData.notes}</div>}
                        <div className="pt-2 border-t">
                            <strong>Items a devolver:</strong>
                            <ul className="mt-2 space-y-1">
                                {returnData.items.map((item: any) => (
                                    <li key={item.id} className="ml-4">
                                        • {item.productName} x{item.quantity} - Condición: {item.productCondition}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="pt-2 border-t">
                            <strong className="text-lg">Monto a Reembolsar: ${returnData.refundAmount.toLocaleString()}</strong>
                        </div>
                    </div>

                    <div>
                        <Label>Cuenta de Reembolso</Label>
                        <Select value={refundAccountId} onValueChange={setRefundAccountId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona cuenta..." />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.length === 0 ? (
                                    <SelectItem value="none" disabled>No hay cuentas disponibles</SelectItem>
                                ) : (
                                    accounts.map((account) => (
                                        <SelectItem key={account.id} value={account.id}>
                                            {account.name} - ${account.balance.toLocaleString()}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        {refundAccountId && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Balance actual: ${getAccountBalance(refundAccountId).toLocaleString()}
                                <br />
                                Balance después: ${(getAccountBalance(refundAccountId) - returnData.refundAmount).toLocaleString()}
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="destructive" onClick={handleReject} disabled={loading}>
                        <X className="h-4 w-4 mr-2" />
                        Rechazar
                    </Button>
                    <Button onClick={handleApprove} disabled={loading || !refundAccountId}>
                        <Check className="h-4 w-4 mr-2" />
                        {loading ? "Procesando..." : "Aprobar y Reembolsar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
