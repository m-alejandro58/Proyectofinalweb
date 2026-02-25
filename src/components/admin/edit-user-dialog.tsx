"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { updateUser } from "@/app/actions/auth"

const PERMISSIONS = [
    { key: "canSell", label: "Ventas y Devoluciones" },
    { key: "canManageInventory", label: "Inventario y Compras" },
    { key: "canManageFinances", label: "Finanzas (Cuentas, Gastos, Reportes, Dashboard)" },
    { key: "canManageContacts", label: "Contactos (CRM)" },
    { key: "canManageOrders", label: "Pedidos, Apartados y MercadoLibre FULL" },
    { key: "canManageClaims", label: "Reclamaciones" },
]

export function EditUserDialog({ user }: { user: any }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState(user.name || "")
    const [isActive, setIsActive] = useState(user.isActive)
    const [perms, setPerms] = useState<Record<string, boolean>>({
        canSell: user.canSell,
        canManageInventory: user.canManageInventory,
        canManageFinances: user.canManageFinances,
        canManageContacts: user.canManageContacts,
        canManageOrders: user.canManageOrders,
        canManageClaims: user.canManageClaims
    })

    function togglePerm(key: string) {
        setPerms(prev => ({ ...prev, [key]: !prev[key] }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const res = await updateUser(user.id, {
            name: name || undefined,
            isActive,
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

    if (user.role === "ADMIN") return null

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4 mr-1" /> Editar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Editar Usuario: {user.username}</DialogTitle>
                    <DialogDescription>Modifique los permisos y el estado del usuario.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Nombre</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} className="col-span-3" />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Activo</Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Switch checked={isActive} onCheckedChange={setIsActive} />
                                <span className="text-sm text-muted-foreground">
                                    {isActive ? "Usuario puede iniciar sesión" : "Usuario bloqueado"}
                                </span>
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-2">
                            <p className="text-sm font-semibold mb-3">Permisos:</p>
                            <div className="space-y-3">
                                {PERMISSIONS.map(p => (
                                    <div key={p.key} className="flex items-center gap-3">
                                        <Checkbox
                                            id={`edit-${p.key}`}
                                            checked={perms[p.key]}
                                            onCheckedChange={() => togglePerm(p.key)}
                                        />
                                        <Label htmlFor={`edit-${p.key}`} className="text-sm cursor-pointer">{p.label}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
