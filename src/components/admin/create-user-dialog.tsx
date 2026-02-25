"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { createUser } from "@/app/actions/auth"

const PERMISSIONS = [
    { key: "canSell", label: "Ventas y Devoluciones" },
    { key: "canManageInventory", label: "Inventario y Compras" },
    { key: "canManageFinances", label: "Finanzas (Cuentas, Gastos, Reportes, Dashboard)" },
    { key: "canManageContacts", label: "Contactos (CRM)" },
    { key: "canManageOrders", label: "Pedidos, Apartados y MercadoLibre FULL" },
    { key: "canManageClaims", label: "Reclamaciones" },
]

export function CreateUserDialog() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [perms, setPerms] = useState<Record<string, boolean>>({
        canSell: false, canManageInventory: false, canManageFinances: false,
        canManageContacts: false, canManageOrders: false, canManageClaims: false
    })

    function togglePerm(key: string) {
        setPerms(prev => ({ ...prev, [key]: !prev[key] }))
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const fd = new FormData(e.currentTarget)
        const res = await createUser({
            username: fd.get("username") as string,
            password: fd.get("password") as string,
            name: fd.get("name") as string,
            ...perms as any
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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <UserPlus className="h-4 w-4" /> Nuevo Usuario
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Crear Usuario Estándar</DialogTitle>
                    <DialogDescription>
                        Asigne permisos específicos. Solo podrá acceder a los módulos seleccionados.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Usuario</Label>
                            <Input name="username" className="col-span-3" required autoComplete="off" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Contraseña</Label>
                            <Input name="password" type="password" className="col-span-3" required autoComplete="off" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Nombre</Label>
                            <Input name="name" className="col-span-3" placeholder="Ej. Juan Pérez" />
                        </div>

                        <div className="border-t pt-4 mt-2">
                            <p className="text-sm font-semibold mb-3">Permisos del usuario:</p>
                            <div className="space-y-3">
                                {PERMISSIONS.map(p => (
                                    <div key={p.key} className="flex items-center gap-3">
                                        <Checkbox
                                            id={p.key}
                                            checked={perms[p.key]}
                                            onCheckedChange={() => togglePerm(p.key)}
                                        />
                                        <Label htmlFor={p.key} className="text-sm cursor-pointer">{p.label}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Creando..." : "Crear Usuario"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
