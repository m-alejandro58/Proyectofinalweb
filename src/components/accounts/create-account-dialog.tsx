"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createFinancialAccount } from "@/app/actions/accounts"

export function CreateAccountDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)

        const formData = new FormData(event.currentTarget)
        const res = await createFinancialAccount(formData)

        setLoading(false)
        if (res.success) {
            setOpen(false)
        } else {
            alert(res.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" /> Nueva Cuenta
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Registrar Cuenta Financiera</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Nombre</Label>
                            <Input name="name" placeholder="Ej. Bancolombia Ahorros" required />
                        </div>
                        <div className="grid gap-2">
                            <Label>Tipo</Label>
                            <Select name="type" defaultValue="BANK">
                                <SelectTrigger>
                                    <SelectValue placeholder="Tipo de cuenta" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BANK">Cuenta Bancaria</SelectItem>
                                    <SelectItem value="CASH">Efectivo / Caja</SelectItem>
                                    <SelectItem value="CREDIT">Tarjeta de Crédito</SelectItem>
                                    <SelectItem value="RECEIVABLE">Cuenta por Cobrar (Sistecredito/Plat.)</SelectItem>
                                    <SelectItem value="LOAN">Préstamo / Deuda</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Saldo Inicial / Cupo</Label>
                            <Input name="balance" type="number" step="0.01" defaultValue="0" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Límite de Crédito (Opcional)</Label>
                            <Input name="creditLimit" type="number" step="0.01" placeholder="Solo para TC" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Crear Cuenta"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
