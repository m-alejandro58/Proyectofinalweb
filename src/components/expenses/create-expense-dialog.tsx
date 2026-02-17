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
import { createExpense } from "@/app/actions/expenses"

export function CreateExpenseDialog({ accounts }: { accounts: any[] }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)

        const formData = new FormData(event.currentTarget)
        const res = await createExpense(formData)

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
                <Button className="gap-2" variant="destructive">
                    <Plus className="h-4 w-4" /> Registrar Gasto
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Nuevo Gasto Operativo</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Descripción</Label>
                            <Input name="description" placeholder="Ej. Pago Luz" required />
                        </div>
                        <div className="grid gap-2">
                            <Label>Categoría</Label>
                            <Select name="category" defaultValue="GENERAL">
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GENERAL">General</SelectItem>
                                    <SelectItem value="SERVICIOS">Servicios Públicos</SelectItem>
                                    <SelectItem value="NOMINA">Nómina</SelectItem>
                                    <SelectItem value="ARRIENDO">Arriendo</SelectItem>
                                    <SelectItem value="TRANSPORTE">Transporte / Envíos</SelectItem>
                                    <SelectItem value="IMPUESTOS">Impuestos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Monto</Label>
                            <Input name="amount" type="number" step="0.01" required />
                        </div>
                        <div className="grid gap-2">
                            <Label>Pagado desde</Label>
                            <Select name="accountId" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione cuenta" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(a => (
                                        <SelectItem key={a.id} value={a.id}>{a.name} ({a.type})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Registrar"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
