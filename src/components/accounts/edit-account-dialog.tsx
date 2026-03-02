"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import { Pencil } from "lucide-react"
import { updateFinancialAccount } from "@/app/actions/accounts"

type Props = {
    account: any
}

export function EditAccountDialog({ account }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState(account.name)
    const [creditLimit, setCreditLimit] = useState(account.creditLimit || 0)
    const [image, setImage] = useState(account.image || "")

    const isCreditOrLoan = ["CREDIT", "LOAN"].includes(account.type)

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount)

    const handleSubmit = async () => {
        if (!name.trim()) {
            alert("El nombre no puede estar vacío.")
            return
        }

        setLoading(true)
        const res = await updateFinancialAccount(account.id, {
            name: name.trim(),
            creditLimit: isCreditOrLoan ? creditLimit : undefined,
            image: image.trim() || undefined,
        })

        if (res.success) {
            setOpen(false)
            router.refresh()
        } else {
            alert(res.error)
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={(v) => {
            setOpen(v)
            if (v) {
                setName(account.name)
                setCreditLimit(account.creditLimit || 0)
                setImage(account.image || "")
            }
        }}>
            <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7">
                    <Pencil className="h-3.5 w-3.5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar Cuenta</DialogTitle>
                    <DialogDescription>
                        Modifica el nombre{isCreditOrLoan ? " y el cupo/monto del crédito" : ""} de esta cuenta.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Nombre de la cuenta</Label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Nombre..."
                        />
                    </div>

                    {isCreditOrLoan && (
                        <div className="grid gap-2">
                            <Label>
                                {account.type === "CREDIT" ? "Cupo de Crédito" : "Monto del Préstamo"}
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                value={creditLimit || ""}
                                onChange={e => setCreditLimit(parseFloat(e.target.value) || 0)}
                                placeholder="$0"
                            />
                            <p className="text-xs text-muted-foreground">
                                Actual: {formatCurrency(account.creditLimit || 0)}
                                {account.type === "CREDIT" && ` | Usado: ${formatCurrency(Math.abs(account.balance))}`}
                            </p>
                        </div>
                    )}

                    <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                        <p><strong>Tipo:</strong> {account.type}</p>
                        <p><strong>Saldo actual:</strong> {formatCurrency(account.balance)}</p>
                    </div>

                    <div className="grid gap-2">
                        <Label>Imagen de la tarjeta (ruta)</Label>
                        <Input
                            value={image}
                            onChange={e => setImage(e.target.value)}
                            placeholder="/cards/nombre-imagen.avif"
                        />
                        <p className="text-xs text-muted-foreground">Coloque la imagen en public/cards/ y escriba la ruta aquí.</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
