"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Calculator,
    TrendingUp,
    TrendingDown,
    BarChart3,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Search,
    Truck,
    Percent,
    DollarSign,
    RefreshCw,
    Sparkles,
    ShieldAlert,
    Store,
    ExternalLink,
    CircleHelp,
    Tag,
} from "lucide-react"
import {
    analyzeProcurement,
    type ProcurementAnalysisResult,
    type ProcurementVerdict,
} from "@/app/actions/analyze-procurement"
import { calculateGrossProfit, calculateMarginPercentage } from "@/utils/finance"
import { toast } from "sonner"

// ── Constants ────────────────────────────────────────────────
const COMMISSION_OPTIONS = [
    { value: "0", label: "0% (Sin comisión)" },
    { value: "5", label: "5%" },
    { value: "10.5", label: "10.5%" },
    { value: "12.5", label: "12.5%" },
    { value: "15.5", label: "15.5%" },
    { value: "18.5", label: "18.5%" },
    { value: "19", label: "19%" },
    { value: "21", label: "21%" },
]

const DEFAULT_SHIPPING = 9200
const UVT_THRESHOLD = 2_618_700

const formatCOP = (value: number) =>
    new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
    }).format(value)

// ── Verdict config ───────────────────────────────────────────
const VERDICT_CONFIG: Record<ProcurementVerdict, {
    label: string
    icon: typeof CheckCircle
    bg: string
    text: string
    border: string
    glow: string
}> = {
    PRODUCTO_GANADOR: {
        label: "🏆 PRODUCTO GANADOR",
        icon: CheckCircle,
        bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
        text: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-500/40",
        glow: "shadow-emerald-500/20",
    },
    DESCARTAR: {
        label: "🚫 DESCARTAR",
        icon: XCircle,
        bg: "bg-red-500/10 dark:bg-red-500/20",
        text: "text-red-700 dark:text-red-300",
        border: "border-red-500/40",
        glow: "shadow-red-500/20",
    },
    NEUTRAL: {
        label: "⚠️ EVALUAR CON CAUTELA",
        icon: CircleHelp,
        bg: "bg-amber-500/10 dark:bg-amber-500/20",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-500/40",
        glow: "shadow-amber-500/20",
    },
}

// ══════════════════════════════════════════════════════════════
// ── Dialog Component ────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
export function ProcurementSimulatorDialog({
    open,
    onOpenChange,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    // ── Form State ──
    const [productName, setProductName] = useState("")
    const [supplierCost, setSupplierCost] = useState<number>(0)
    const [salePrice, setSalePrice] = useState<number>(0)
    const [commissionPercent, setCommissionPercent] = useState("15.5")
    const [shippingCost, setShippingCost] = useState<number>(DEFAULT_SHIPPING)

    // ── AI State ──
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<ProcurementAnalysisResult | null>(null)
    const isRunning = useRef(false)

    // ── Real-time calculations ──
    const calc = useMemo(() => {
        const commission = parseFloat(commissionPercent) || 0
        const commissionAmount = Math.round(salePrice * (commission / 100))
        const totalMLCost = commissionAmount + shippingCost
        const netProfit = calculateGrossProfit(salePrice, supplierCost + totalMLCost)
        const netMarginPercent = calculateMarginPercentage(supplierCost + totalMLCost, salePrice)
        const isAboveUVT = salePrice > UVT_THRESHOLD
        const hasValues = supplierCost > 0 && salePrice > 0

        return {
            commissionAmount,
            totalMLCost,
            netProfit: Math.round(netProfit),
            netMarginPercent: Math.round(netMarginPercent * 10) / 10,
            isAboveUVT,
            hasValues,
        }
    }, [salePrice, supplierCost, commissionPercent, shippingCost])

    // ── AI Analysis ──
    const runAnalysis = useCallback(async () => {
        if (isRunning.current) return
        if (!productName.trim()) { toast.error("Ingresa el nombre del producto"); return }
        if (supplierCost <= 0 || salePrice <= 0) { toast.error("Ingresa costo del proveedor y precio de venta"); return }

        isRunning.current = true
        setLoading(true)
        setResult(null)

        try {
            const res = await analyzeProcurement({
                productName: productName.trim(),
                supplierCost,
                salePrice,
                commissionPercent: parseFloat(commissionPercent) || 0,
                shippingCost,
            })
            setResult(res)
            if (res.success) {
                toast.success(res.stats?.isSimulated ? "Análisis con precios estimados" : `${res.stats?.count} productos encontrados`)
            } else {
                toast.error(res.error || "Error en el análisis")
            }
        } catch {
            setResult({ success: false, error: "Error inesperado al analizar viabilidad" })
            toast.error("Error inesperado")
        } finally {
            setLoading(false)
            isRunning.current = false
        }
    }, [productName, supplierCost, salePrice, commissionPercent, shippingCost])

    const verdictConfig = result?.verdict ? VERDICT_CONFIG[result.verdict] : null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                {/* ── Gradient Header ── */}
                <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-violet-600 to-purple-700 text-white px-6 py-5">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjZ3JpZCkiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')] opacity-50" />
                    <DialogHeader className="relative">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm">
                                <Calculator className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold tracking-tight text-white">
                                    Hub de Viabilidad de Compras
                                </DialogTitle>
                                <DialogDescription className="text-blue-100 mt-1">
                                    Simula rentabilidad y analiza el mercado antes de comprar
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                {/* ── Scrollable Content ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                    {/* ── Input Form ── */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2 space-y-1.5">
                            <Label htmlFor="proc-name" className="flex items-center gap-1.5 text-xs">
                                <Search className="h-3.5 w-3.5 text-violet-500" />
                                Nombre del Producto
                            </Label>
                            <Input id="proc-name" placeholder="Ej: AMD Ryzen 5 5600X" value={productName} onChange={e => setProductName(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="proc-cost" className="flex items-center gap-1.5 text-xs">
                                <DollarSign className="h-3.5 w-3.5 text-green-500" />
                                Costo del Proveedor (COP)
                            </Label>
                            <Input id="proc-cost" type="number" placeholder="0" min={0} value={supplierCost || ""} onChange={e => setSupplierCost(Number(e.target.value) || 0)} className="font-mono" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="proc-price" className="flex items-center gap-1.5 text-xs">
                                <Tag className="h-3.5 w-3.5 text-blue-500" />
                                Precio de Venta Estimado (COP)
                            </Label>
                            <Input id="proc-price" type="number" placeholder="0" min={0} value={salePrice || ""} onChange={e => setSalePrice(Number(e.target.value) || 0)} className="font-mono" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1.5 text-xs">
                                <Percent className="h-3.5 w-3.5 text-orange-500" />
                                Comisión Mercado Libre
                            </Label>
                            <Select value={commissionPercent} onValueChange={setCommissionPercent}>
                                <SelectTrigger id="proc-commission" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {COMMISSION_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="proc-shipping" className="flex items-center gap-1.5 text-xs">
                                <Truck className="h-3.5 w-3.5 text-cyan-500" />
                                Costo de Envío (COP)
                            </Label>
                            <Input id="proc-shipping" type="number" min={0} value={shippingCost || ""} onChange={e => setShippingCost(Number(e.target.value) || 0)} className="font-mono" />
                        </div>
                    </div>

                    {/* ── Real-time Output ── */}
                    {calc.hasValues && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-3">
                            {calc.isAboveUVT && (
                                <div className="flex items-start gap-2 p-2.5 rounded-lg text-xs bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
                                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                    <span><strong>⚠️ Sujeto a 19% de IVA.</strong> Supera el umbral de 50 UVT ({formatCOP(UVT_THRESHOLD)}).</span>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-2">
                                <div className="relative overflow-hidden rounded-lg border bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30 p-3 space-y-0.5">
                                    <p className="text-[10px] text-muted-foreground font-medium">Costo Total ML</p>
                                    <p className="text-base font-bold text-orange-700 dark:text-orange-300 font-mono">{formatCOP(calc.totalMLCost)}</p>
                                    <p className="text-[9px] text-muted-foreground">Com. ({formatCOP(calc.commissionAmount)}) + Env. ({formatCOP(shippingCost)})</p>
                                </div>
                                <div className={`relative overflow-hidden rounded-lg border p-3 space-y-0.5 ${calc.netProfit >= 0 ? "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/30" : "bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/30"}`}>
                                    <p className="text-[10px] text-muted-foreground font-medium">Utilidad Neta</p>
                                    <p className={`text-base font-bold font-mono ${calc.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>{formatCOP(calc.netProfit)}</p>
                                </div>
                                <div className={`relative overflow-hidden rounded-lg border p-3 space-y-0.5 ${calc.netMarginPercent >= 15 ? "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/30" : calc.netMarginPercent >= 10 ? "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30" : "bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/30"}`}>
                                    <p className="text-[10px] text-muted-foreground font-medium">Margen Neto</p>
                                    <p className={`text-xl font-bold font-mono ${calc.netMarginPercent >= 15 ? "text-emerald-700 dark:text-emerald-300" : calc.netMarginPercent >= 10 ? "text-amber-700 dark:text-amber-300" : "text-red-700 dark:text-red-300"}`}>{calc.netMarginPercent}%</p>
                                </div>
                            </div>

                            {calc.netMarginPercent < 15 && calc.netMarginPercent >= 0 && (
                                <div className="flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-700 dark:text-red-400">
                                    <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                    <span><strong>⚠️ Margen inferior al 15%.</strong> La rentabilidad podría no justificar los riesgos operativos.</span>
                                </div>
                            )}
                            {calc.netProfit < 0 && (
                                <div className="flex items-start gap-2 p-2.5 bg-red-600/15 border border-red-500/40 rounded-lg text-xs text-red-800 dark:text-red-300">
                                    <XCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                    <span><strong>🚫 Operación a pérdida.</strong> Estás perdiendo {formatCOP(Math.abs(calc.netProfit))} por unidad.</span>
                                </div>
                            )}

                            {/* Breakdown */}
                            <div className="bg-muted/30 rounded-lg p-3 border">
                                <h4 className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Desglose</h4>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Precio de Venta</span><span className="font-mono font-medium">{formatCOP(salePrice)}</span></div>
                                    <div className="flex justify-between text-red-600 dark:text-red-400"><span>− Costo Proveedor</span><span className="font-mono font-medium">{formatCOP(supplierCost)}</span></div>
                                    <div className="flex justify-between text-red-600 dark:text-red-400"><span>− Comisión ML ({commissionPercent}%)</span><span className="font-mono font-medium">{formatCOP(calc.commissionAmount)}</span></div>
                                    <div className="flex justify-between text-red-600 dark:text-red-400"><span>− Envío</span><span className="font-mono font-medium">{formatCOP(shippingCost)}</span></div>
                                    <div className="border-t pt-1.5 flex justify-between font-semibold">
                                        <span>= Utilidad Neta</span>
                                        <span className={`font-mono ${calc.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{formatCOP(calc.netProfit)} ({calc.netMarginPercent}%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── AI Button ── */}
                    <Button
                        id="btn-analyze-procurement"
                        onClick={runAnalysis}
                        disabled={loading || !productName.trim() || supplierCost <= 0 || salePrice <= 0}
                        className="w-full h-11 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold text-sm gap-2 shadow-lg shadow-violet-500/25 transition-all duration-300 hover:shadow-violet-500/40 hover:scale-[1.01] active:scale-[0.99]"
                        size="lg"
                    >
                        {loading ? (
                            <><RefreshCw className="h-4 w-4 animate-spin" /> Analizando mercado con IA...</>
                        ) : (
                            <><Sparkles className="h-4 w-4" /> 📊 Analizar Viabilidad de Compra con IA</>
                        )}
                    </Button>
                    {(!productName.trim() || supplierCost <= 0 || salePrice <= 0) && (
                        <p className="text-[10px] text-muted-foreground text-center -mt-3">
                            Completa nombre, costo y precio de venta para habilitar el análisis
                        </p>
                    )}

                    {/* ── Loading ── */}
                    {loading && (
                        <div className="space-y-3 animate-pulse">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <BarChart3 className="h-4 w-4 text-violet-500 animate-pulse" />
                                Buscando precios en Alkosto, Ktronix, Tauret + Gemini 3.1 Pro...
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="p-3 border rounded-lg space-y-1.5">
                                        <Skeleton className="h-2.5 w-16" />
                                        <Skeleton className="h-5 w-24" />
                                    </div>
                                ))}
                            </div>
                            <Skeleton className="h-28 w-full rounded-lg" />
                        </div>
                    )}

                    {/* ── Error ── */}
                    {!loading && result && !result.success && (
                        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center animate-in fade-in duration-300">
                            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-500/10">
                                <XCircle className="h-5 w-5 text-red-500" />
                            </div>
                            <p className="text-sm text-destructive">{result.error}</p>
                            <Button variant="outline" size="sm" onClick={runAnalysis}>
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reintentar
                            </Button>
                        </div>
                    )}

                    {/* ── AI Results ── */}
                    {!loading && result?.success && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
                            {/* Verdict */}
                            {verdictConfig && (
                                <div className={`relative overflow-hidden rounded-xl border-2 p-4 ${verdictConfig.bg} ${verdictConfig.border} shadow-lg ${verdictConfig.glow}`}>
                                    <div className="absolute -top-4 -right-4 opacity-5">
                                        <verdictConfig.icon className="h-20 w-20" />
                                    </div>
                                    <div className="relative flex items-center gap-2.5 mb-2.5">
                                        <verdictConfig.icon className={`h-6 w-6 ${verdictConfig.text}`} />
                                        <h3 className={`text-lg font-bold tracking-tight ${verdictConfig.text}`}>{verdictConfig.label}</h3>
                                    </div>
                                    {result.calculations && (
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="text-center p-1.5 rounded-md bg-white/50 dark:bg-black/20">
                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Costo ML</p>
                                                <p className="font-bold font-mono text-xs">{formatCOP(result.calculations.totalMLCost)}</p>
                                            </div>
                                            <div className="text-center p-1.5 rounded-md bg-white/50 dark:bg-black/20">
                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Utilidad</p>
                                                <p className="font-bold font-mono text-xs">{formatCOP(result.calculations.netProfit)}</p>
                                            </div>
                                            <div className="text-center p-1.5 rounded-md bg-white/50 dark:bg-black/20">
                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Margen</p>
                                                <p className={`font-bold font-mono text-xs ${result.calculations.netMarginPercent >= 15 ? "text-emerald-600" : "text-red-600"}`}>{result.calculations.netMarginPercent}%</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Market prices */}
                            {result.stats && (
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-semibold flex items-center gap-1.5">
                                            <Store className="h-3.5 w-3.5 text-blue-500" />
                                            Precios del Mercado
                                        </h4>
                                        {!result.stats.isSimulated ? (
                                            <Badge variant="secondary" className="text-[9px]">✅ {result.stats.count} resultados</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-400">⚠️ Estimados</Badge>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="rounded-lg border p-2 text-center">
                                            <TrendingDown className="h-3 w-3 text-green-500 mx-auto mb-0.5" />
                                            <p className="text-[9px] text-muted-foreground">Mínimo</p>
                                            <p className="font-bold font-mono text-xs text-green-600 dark:text-green-400">{formatCOP(result.stats.min)}</p>
                                        </div>
                                        <div className="rounded-lg border p-2 text-center">
                                            <BarChart3 className="h-3 w-3 text-blue-500 mx-auto mb-0.5" />
                                            <p className="text-[9px] text-muted-foreground">Promedio</p>
                                            <p className="font-bold font-mono text-xs text-blue-600 dark:text-blue-400">{formatCOP(result.stats.avg)}</p>
                                        </div>
                                        <div className="rounded-lg border p-2 text-center">
                                            <TrendingUp className="h-3 w-3 text-red-500 mx-auto mb-0.5" />
                                            <p className="text-[9px] text-muted-foreground">Máximo</p>
                                            <p className="font-bold font-mono text-xs text-red-600 dark:text-red-400">{formatCOP(result.stats.max)}</p>
                                        </div>
                                    </div>
                                    {result.stats.listings.length > 0 && (
                                        <div className="space-y-1 max-h-[160px] overflow-y-auto">
                                            {result.stats.listings.map((item, i) => (
                                                <div key={i} className="flex items-center gap-2 text-[11px] p-1.5 rounded bg-muted/30 hover:bg-muted/60 transition-colors">
                                                    <span className="truncate flex-1" title={item.title}>{item.title}</span>
                                                    <span className="flex items-center gap-0.5 text-muted-foreground whitespace-nowrap flex-shrink-0">
                                                        <Store className="h-2.5 w-2.5" />{item.source}
                                                    </span>
                                                    <span className="font-mono font-semibold whitespace-nowrap">{formatCOP(item.price)}</span>
                                                    {item.permalink && (
                                                        <a href={item.permalink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 flex-shrink-0">
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Gemini Report */}
                            {result.report && (
                                <div className="space-y-1.5">
                                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                                        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                                        Análisis del Director de Compras IA
                                    </h4>
                                    <div className="bg-muted/40 backdrop-blur border rounded-lg p-4 text-xs leading-relaxed whitespace-pre-wrap">
                                        {result.report}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button variant="outline" size="sm" onClick={runAnalysis} disabled={loading} className="gap-1.5 text-xs">
                                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Reanalizar
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
