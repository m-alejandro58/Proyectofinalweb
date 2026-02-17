"use client"

import { useState } from "react"
import { checkCredentials } from "@/app/actions/auth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Lock, ShieldAlert } from "lucide-react"
import Image from "next/image"

interface InactivityLockScreenProps {
    userName: string | null
    onUnlock: () => void
}

export function InactivityLockScreen({ userName, onUnlock }: InactivityLockScreenProps) {
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!password.trim()) return

        setLoading(true)
        setError("")

        try {
            const result = await checkCredentials(password)
            if (result.success) {
                setPassword("")
                setError("")
                onUnlock()
            } else {
                setError(result.error || "Error al verificar credenciales")
            }
        } catch {
            setError("Error de conexión")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            {/* Animated background pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-500/5 to-transparent rounded-full animate-pulse" />
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-500/5 to-transparent rounded-full animate-pulse delay-1000" />
            </div>

            <Card className="w-[380px] border-slate-800 bg-slate-950/95 text-slate-100 shadow-2xl shadow-cyan-500/10 relative">
                <CardHeader className="flex flex-col items-center pb-2">
                    <div className="mb-2 relative">
                        <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-cyan-500/30 flex items-center justify-center mb-3 animate-pulse">
                            <ShieldAlert className="w-10 h-10 text-cyan-500" />
                        </div>
                    </div>
                    <div className="mb-3 relative w-24 h-24">
                        <Image
                            src="/logo.png"
                            alt="HardSoft Logo"
                            fill
                            className="object-contain opacity-60"
                            priority
                        />
                    </div>
                    <CardTitle className="text-xl text-center text-white">
                        Sesión Bloqueada
                    </CardTitle>
                    <CardDescription className="text-center text-slate-400 mt-1">
                        <span className="block text-amber-400/80 text-xs font-medium mb-1">
                            ⏱ Inactividad detectada
                        </span>
                        {userName ? (
                            <>Hola <span className="text-cyan-400 font-medium">{userName}</span>, ingrese su contraseña para continuar</>
                        ) : (
                            "Ingrese su contraseña para desbloquear"
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="lock-password" className="text-slate-200">
                                Contraseña
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    id="lock-password"
                                    type="password"
                                    placeholder="Ingrese su contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-9 bg-slate-900 border-slate-800 focus-visible:ring-cyan-500"
                                    autoFocus
                                    required
                                />
                            </div>
                        </div>
                        {error && (
                            <p className="text-sm text-red-400 text-center bg-red-500/10 rounded-md py-1.5 border border-red-500/20">
                                {error}
                            </p>
                        )}
                        <Button
                            type="submit"
                            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white transition-all"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Verificando...
                                </span>
                            ) : (
                                "Desbloquear"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
