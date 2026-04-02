"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    TrendingDown, TrendingUp, BarChart3, RefreshCw, ExternalLink, AlertTriangle, Store,
} from "lucide-react"
import {
    analyzeMarketPrices,
    type MarketAnalysisResult,
    type MarketPriceStats,
} from "@/app/actions/market-analyst"
import { toast } from "sonner"

// ── Currency formatter (es-CO) ──────────────────────────────
const formatCOP = (price: number) =>
    new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
    }).format(price)

// ── Price Card ──────────────────────────────────────────────
function PriceCard({
    label, value, icon: Icon, color,
}: {
    label: string; value: number; icon: React.ElementType; color: string
}) {
    return (
        <Card className="flex-1">
            <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                    {label}
                </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
                <p className={`text-lg font-bold ${color}`}>{formatCOP(value)}</p>
            </CardContent>
        </Card>
    )
}

// ── Loading skeleton ────────────────────────────────────────
function AnalystSkeleton() {
    return (
        <div className="space-y-5 py-2">
            <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-blue-500 animate-pulse" />
                <p className="text-sm text-muted-foreground animate-pulse">
                    Rastreando precios en retailers de Colombia...
                </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2 p-4 border rounded-lg">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-6 w-24" />
                    </div>
                ))}
            </div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-32 w-full rounded-lg" />
        </div>
    )
}

// ── Main Dialog ─────────────────────────────────────────────
export function MarketAnalystDialog({
    open,
    onOpenChange,
    productName,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    productName: string
}) {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<MarketAnalysisResult | null>(null)
    const isRunning = useRef(false)

    const analyze = useCallback(async () => {
        if (isRunning.current) return
        isRunning.current = true
        setLoading(true)
        setResult(null)

        try {
            // Direct server action call — SerpApi runs server-side
            const res = await analyzeMarketPrices(productName, null)
            setResult(res)

            if (res.success) {
                const label = res.stats?.isSimulated
                    ? "Análisis con precios estimados"
                    : `${res.stats?.count} productos encontrados`
                toast.success(label)
            } else {
                toast.error(res.error || "Error en el análisis")
            }
        } catch {
            setResult({ success: false, error: "Error inesperado al analizar el mercado" })
            toast.error("Error inesperado")
        } finally {
            setLoading(false)
            isRunning.current = false
        }
    }, [productName])

    // Auto-run on open
    useEffect(() => {
        if (open && productName && !result && !loading && !isRunning.current) {
            analyze()
        }
        if (!open) {
            setResult(null)
            setLoading(false)
            isRunning.current = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, productName])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-500" />
                        Analista de Mercado IA
                    </DialogTitle>
                    <DialogDescription>
                        Rastreo de precios en retailers de Colombia para{" "}
                        <strong>{productName}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0">
                    {loading && <AnalystSkeleton />}

                    {!loading && result && !result.success && (
                        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                            <p className="text-sm text-destructive">{result.error}</p>
                            <Button variant="outline" size="sm" onClick={analyze}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reintentar
                            </Button>
                        </div>
                    )}

                    {!loading && result?.success && result.stats && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* KPI Cards */}
                            <div className="grid grid-cols-3 gap-3">
                                <PriceCard label="Precio Más Bajo" value={result.stats.min} icon={TrendingDown} color="text-green-600" />
                                <PriceCard label="Promedio del Mercado" value={result.stats.avg} icon={BarChart3} color="text-blue-600" />
                                <PriceCard label="Precio Más Alto" value={result.stats.max} icon={TrendingUp} color="text-red-600" />
                            </div>

                            {/* Simulated warning */}
                            {result.stats.isSimulated && (
                                <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-700 dark:text-yellow-400">
                                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <strong>Precios estimados.</strong> No se pudo conectar con Google Shopping. Los valores son aproximaciones algorítmicas.
                                    </div>
                                </div>
                            )}

                            {/* Real data count badge */}
                            {!result.stats.isSimulated && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="bg-muted px-2 py-1 rounded-md font-medium">
                                        ✅ {result.stats.count} resultados analizados de Google Shopping Colombia
                                    </span>
                                </div>
                            )}

                            {/* Gemini Report */}
                            {result.report && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">📊 Reporte Estratégico IA</h4>
                                    <div className="bg-muted/50 border rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap">
                                        {result.report}
                                    </div>
                                </div>
                            )}

                            {/* Top listings with source */}
                            {result.stats.listings.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">🔍 Resultados de referencia</h4>
                                    <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                                        {result.stats.listings.map((item, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 text-xs p-2 rounded-md bg-muted/30 hover:bg-muted/60 transition-colors"
                                            >
                                                <span className="truncate flex-1" title={item.title}>
                                                    {item.title}
                                                </span>
                                                <span className="flex items-center gap-1 text-muted-foreground whitespace-nowrap flex-shrink-0">
                                                    <Store className="h-3 w-3" />
                                                    {item.source}
                                                </span>
                                                <span className="font-mono font-semibold whitespace-nowrap">
                                                    {formatCOP(item.price)}
                                                </span>
                                                {item.permalink && (
                                                    <a
                                                        href={item.permalink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 hover:text-blue-700 flex-shrink-0"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-shrink-0 gap-2 sm:gap-2 border-t pt-3">
                    {result?.success && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={analyze}
                            disabled={loading}
                            className="gap-1.5"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            Reanalizar
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
