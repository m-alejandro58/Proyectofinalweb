"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { changePassword } from "@/app/actions/auth"

export function ChangePasswordDialog({ userId, username }: { userId: string, username: string }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [newPass, setNewPass] = useState("")
    const [confirmPass, setConfirmPass] = useState("")

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (newPass !== confirmPass) {
            alert("Las contraseñas no coinciden")
            return
        }
        setLoading(true)
        const res = await changePassword(userId, newPass)
        if (res.success) {
            alert("Contraseña actualizada correctamente")
            setOpen(false)
            setNewPass("")
            setConfirmPass("")
            router.refresh()
        } else {
            alert(res.error)
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val)
            if (!val) { setNewPass(""); setConfirmPass("") }
        }}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-blue-600">
                    <KeyRound className="h-4 w-4 mr-1" /> Contraseña
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Cambiar Contraseña</DialogTitle>
                    <DialogDescription>Cambiando contraseña de: <strong>{username}</strong></DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Nueva</Label>
                            <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="col-span-3" required autoComplete="off" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Confirmar</Label>
                            <Input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="col-span-3" required autoComplete="off" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Cambiando..." : "Cambiar Contraseña"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
