"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Sparkles, TrendingUp } from "lucide-react"
import { registerCashback } from "@/app/actions/accounts"

type Props = { accounts: any[] }

export function CashbackDialog({ accounts }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const [cardId, setCardId] = useState("")
    const [operatingId, setOperatingId] = useState("")
    const [savingsId, setSavingsId] = useState("")
    const [amount, setAmount] = useState(0)

    const creditCards = accounts.filter(a => a.type === "CREDIT" || a.type === "LOAN")
    const liquidAccounts = accounts.filter(a => a.type === "CASH" || a.type === "BANK")

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

    const handleSubmit = async () => {
        if (!cardId || !operatingId || !savingsId || amount <= 0) {
            alert("Complete todos los campos")
            return
        }
        setLoading(true)
        const res = await registerCashback(cardId, operatingId, savingsId, amount)
        if (res.success) {
            setOpen(false)
            setCardId(""); setOperatingId(""); setSavingsId(""); setAmount(0)
            router.refresh()
        } else {
            alert(res.error)
        }
        setLoading(false)
    }

    const selectedCard = accounts.find(a => a.id === cardId)
    const selectedOp = accounts.find(a => a.id === operatingId)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" /> Cashback
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        Registrar Cashback
                    </DialogTitle>
                    <DialogDescription>
                        El banco abona el cashback a tu tarjeta (reduce la deuda).
                        Tú replicas ese ahorro moviendo el mismo monto de tu cuenta de flujo
                        de caja → cuenta de ahorros.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label className="flex items-center gap-2">
                            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">1</span>
                            Tarjeta que recibe el cashback
                            <span className="text-xs text-muted-foreground font-normal">(la deuda bajará)</span>
                        </Label>
                        <Select value={cardId} onValueChange={setCardId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione tarjeta / préstamo..." />
                            </SelectTrigger>
                            <SelectContent>
                                {creditCards.map(a => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.name} — Saldo: {formatCurrency(a.balance)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Monto del cashback</Label>
                        <Input
                            type="number"
                            min={1}
                            value={amount || ""}
                            onChange={e => setAmount(Number(e.target.value))}
                            placeholder="Ej: 100000"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label className="flex items-center gap-2">
                            <span className="bg-orange-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">2</span>
                            Cuenta de flujo de caja (de donde sale el ahorro)
                            <span className="text-xs text-muted-foreground font-normal">(saldo baja)</span>
                        </Label>
                        <Select value={operatingId} onValueChange={setOperatingId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Ej: Lulo Bank, Nequi, Efectivo..." />
                            </SelectTrigger>
                            <SelectContent>
                                {liquidAccounts.map(a => (
                                    <SelectItem key={a.id} value={a.id} disabled={a.id === savingsId}>
                                        {a.name} — {formatCurrency(a.balance)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label className="flex items-center gap-2">
                            <span className="bg-green-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">3</span>
                            Cuenta de ahorros (destino del dinero)
                            <span className="text-xs text-muted-foreground font-normal">(saldo sube)</span>
                        </Label>
                        <Select value={savingsId} onValueChange={setSavingsId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Ej: Fondo de Ahorro..." />
                            </SelectTrigger>
                            <SelectContent>
                                {liquidAccounts.map(a => (
                                    <SelectItem key={a.id} value={a.id} disabled={a.id === operatingId}>
                                        {a.name} — {formatCurrency(a.balance)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Summary preview */}
                    {cardId && operatingId && savingsId && amount > 0 && (
                        <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                            <p className="font-semibold flex items-center gap-1"><TrendingUp className="h-4 w-4 text-green-500" /> Resumen del movimiento:</p>
                            <p>✅ Deuda <strong>{selectedCard?.name}</strong> ↓ {formatCurrency(amount)}</p>
                            <p>➡️ <strong>{selectedOp?.name}</strong> → <strong>{accounts.find(a => a.id === savingsId)?.name}</strong>: {formatCurrency(amount)}</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        {loading ? "Registrando..." : "Registrar Cashback"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
