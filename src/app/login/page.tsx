"use client"

import { useState, useEffect } from "react"
import { login, createInitialUser } from "@/app/actions/auth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Lock, User } from "lucide-react"
import Image from "next/image"

// Determine the first available route for a user based on their permissions
function getFirstRoute(user: any): string {
    if (user.role === "ADMIN") return "/"
    if (user.canManageFinances) return "/"
    if (user.canSell) return "/sales"
    if (user.canManageInventory) return "/inventory"
    if (user.canManageOrders) return "/orders"
    if (user.canManageContacts) return "/contacts"
    if (user.canManageClaims) return "/claims"
    return "/"
}

export default function LoginPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        createInitialUser()
    }, [])

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)
        setError("")

        const formData = new FormData(event.currentTarget)
        const res = await login(formData)

        if (res.success) {
            // Use permissions from the login response directly — no second server call
            const route = getFirstRoute(res)
            // Use window.location for a full page reload so the cookie is picked up cleanly
            window.location.href = route
        } else {
            setError(res.error || "Error al iniciar sesión")
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900">
            <Card className="w-[350px] border-slate-800 bg-slate-950 text-slate-100">
                <CardHeader className="flex flex-col items-center pb-2">
                    <div className="mb-6 relative w-32 h-32">
                        <Image
                            src="/HardsoftBlack&White.png"
                            alt="HardSoft Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <CardTitle className="text-2xl text-center text-white">HardSoft Login</CardTitle>
                    <CardDescription className="text-center text-slate-400">Ingrese sus credenciales</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="username" className="text-slate-200">Usuario</Label>
                            <div className="relative">
                                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    id="username"
                                    name="username"
                                    placeholder="usuario"
                                    className="pl-9 bg-slate-900 border-slate-800 focus-visible:ring-cyan-500"
                                    required
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password" className="text-slate-200">Contraseña</Label>
                            <div className="relative">
                                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="***"
                                    className="pl-9 bg-slate-900 border-slate-800 focus-visible:ring-cyan-500"
                                    required
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                        <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white" disabled={loading}>
                            {loading ? "Entrando..." : "Iniciar Sesión"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
