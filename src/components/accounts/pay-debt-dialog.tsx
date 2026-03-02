"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { CreditCard, ArrowRight } from "lucide-react"
import { payDebt } from "@/app/actions/accounts"

type Props = { accounts: any[] }

export function PayDebtDialog({ accounts }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const [debtId, setDebtId] = useState("")
    const [sourceId, setSourceId] = useState("")
    const [amount, setAmount] = useState(0)
    const [description, setDescription] = useState("")

    const debtAccounts = accounts.filter(a => a.type === "CREDIT" || a.type === "LOAN")
    const sourceAccounts = accounts.filter(a => a.type === "CASH" || a.type === "BANK")

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

    const selectedDebt = accounts.find(a => a.id === debtId)
    const selectedSource = accounts.find(a => a.id === sourceId)

    const handleSubmit = async () => {
        if (!debtId || !sourceId || amount <= 0) {
            alert("Complete todos los campos")
            return
        }
        if (selectedSource && amount > selectedSource.balance) {
            if (!confirm(`¿Continuar? La cuenta origen solo tiene ${formatCurrency(selectedSource.balance)} y el pago es de ${formatCurrency(amount)}.`)) return
        }
        setLoading(true)
        const res = await payDebt(debtId, sourceId, amount, description)
        if (res.success) {
            setOpen(false)
            setDebtId(""); setSourceId(""); setAmount(0); setDescription("")
            router.refresh()
        } else {
            alert(res.error)
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <CreditCard className="h-4 w-4" /> Pagar Deuda
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" /> Pago a Tarjeta / Préstamo
                    </DialogTitle>
                    <DialogDescription>
                        Registra un pago a una deuda desde tu efectivo, Nequi u otra cuenta bancaria.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Deuda a pagar</Label>
                        <Select value={debtId} onValueChange={setDebtId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione tarjeta o préstamo..." />
                            </SelectTrigger>
                            <SelectContent>
                                {debtAccounts.map(a => (
                                    <SelectItem key={a.id} value={a.id}>
                                        <div className="flex flex-col">
                                            <span>{a.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                Deuda: {formatCurrency(Math.abs(a.balance))}
                                                {a.creditLimit ? ` / Cupo: ${formatCurrency(a.creditLimit)}` : ""}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedDebt && (
                            <p className="text-xs text-muted-foreground">
                                Saldo actual: <strong className="text-red-500">{formatCurrency(selectedDebt.balance)}</strong>
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label>Cuenta origen del pago</Label>
                        <Select value={sourceId} onValueChange={setSourceId}>
                            <SelectTrigger>
                                <SelectValue placeholder="¿Con qué pagarás?" />
                            </SelectTrigger>
                            <SelectContent>
                                {sourceAccounts.map(a => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.name} — {formatCurrency(a.balance)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Monto a pagar</Label>
                        <Input
                            type="number"
                            min={1}
                            value={amount || ""}
                            onChange={e => setAmount(Number(e.target.value))}
                            placeholder="Ej: 500000"
                        />
                        {selectedDebt && amount > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Saldo después del pago: <strong>{formatCurrency(selectedDebt.balance + amount)}</strong>
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label>Descripción (opcional)</Label>
                        <Textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Ej: Pago quincenal tarjeta 6252..."
                            rows={2}
                        />
                    </div>

                    {/* Summary */}
                    {debtId && sourceId && amount > 0 && (
                        <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                            <p className="font-semibold">Resumen:</p>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{selectedSource?.name}</span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="font-medium">{selectedDebt?.name}</span>
                            </div>
                            <p className="text-lg font-bold">{formatCurrency(amount)}</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="gap-2">
                        <CreditCard className="h-4 w-4" />
                        {loading ? "Registrando..." : "Confirmar Pago"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
