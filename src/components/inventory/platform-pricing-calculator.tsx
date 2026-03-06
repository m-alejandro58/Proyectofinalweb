"use client"

import { useState, useMemo, useTransition } from "react"
import { ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    calculatePublishPrice,
    DEFAULT_PLATFORMS,
    COMMISSION_OPTIONS,
    type PlatformSettings,
} from "@/lib/pricing"
import { updateProductPublishStatus } from "@/app/actions/inventory"

// Colores / iconos por plataforma para distinguirlas visualmente
const PLATFORM_STYLES: Record<string, { emoji: string; accent: string }> = {
    mercadolibre: { emoji: "🟡", accent: "border-yellow-500/40" },
    luegopago: { emoji: "🟢", accent: "border-green-500/40" },
    rappi: { emoji: "🟠", accent: "border-orange-500/40" },
    web: { emoji: "🌐", accent: "border-blue-500/40" },
    facebook: { emoji: "🔵", accent: "border-indigo-500/40" },
}

/** Mapa de platform ID → campo booleano del producto */
const PLATFORM_PUBLISH_KEY: Record<string, string> = {
    mercadolibre: "isPublishedML",
    luegopago: "isPublishedLP",
    rappi: "isPublishedRappi",
    web: "isPublishedWeb",
    facebook: "isPublishedFB",
}

export interface PublishStatus {
    isPublishedML: boolean
    isPublishedLP: boolean
    isPublishedRappi: boolean
    isPublishedWeb: boolean
    isPublishedFB: boolean
}

interface PlatformPricingCalculatorProps {
    /** Costo de compra inyectado externamente (desde formulario padre) */
    costPrice?: number
    /** ID del producto (para persistir estado de publicación) */
    productId?: string
    /** Estado actual de publicación del producto */
    publishStatus?: PublishStatus
}

export function PlatformPricingCalculator({
    costPrice: externalCost,
    productId,
    publishStatus,
}: PlatformPricingCalculatorProps) {
    // ── Estado ──────────────────────────────────────────────
    const [internalCost, setInternalCost] = useState("")
    const [margin, setMargin] = useState("20")
    const [published, setPublished] = useState<Record<string, boolean>>(() => {
        if (!publishStatus) return {}
        return {
            mercadolibre: publishStatus.isPublishedML,
            luegopago: publishStatus.isPublishedLP,
            rappi: publishStatus.isPublishedRappi,
            web: publishStatus.isPublishedWeb,
            facebook: publishStatus.isPublishedFB,
        }
    })
    const [platformsData, setPlatformsData] = useState<PlatformSettings[]>(DEFAULT_PLATFORMS)
    const [expandedBreakdown, setExpandedBreakdown] = useState<Record<string, boolean>>({})
    const [isPending, startTransition] = useTransition()

    const costPrice = externalCost ?? (Number(internalCost) || 0)
    const desiredMargin = Number(margin) || 0

    // ── Cálculos ────────────────────────────────────────────
    const results = useMemo(() => {
        if (costPrice <= 0) return []
        return platformsData.map((platform) => ({
            platform,
            ...calculatePublishPrice(costPrice, desiredMargin, platform),
        }))
    }, [costPrice, desiredMargin, platformsData])

    // ── Handlers ────────────────────────────────────────────
    const fmt = (n: number) =>
        "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 0 })

    const togglePublished = (id: string) => {
        const newValue = !(published[id] ?? false)
        setPublished((prev) => ({ ...prev, [id]: newValue }))

        // Persist to DB if productId is available
        if (productId) {
            startTransition(async () => {
                await updateProductPublishStatus(productId, id, newValue)
            })
        }
    }

    const toggleBreakdown = (id: string) =>
        setExpandedBreakdown((prev) => ({ ...prev, [id]: !prev[id] }))

    const updatePlatformField = (
        index: number,
        field: "fixedShippingCost" | "extraTaxes" | "commissionPercent",
        value: string | number,
    ) => {
        setPlatformsData((prev) => {
            const updated = [...prev]
            updated[index] = {
                ...updated[index],
                [field]: typeof value === "string" ? Number(value) || 0 : value,
            }
            return updated
        })
    }

    // ── Render ──────────────────────────────────────────────
    return (
        <div className="space-y-5">
            {/* ── Inputs ──────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Costo de compra (solo si no viene por prop) */}
                {externalCost === undefined && (
                    <div className="space-y-1.5">
                        <Label htmlFor="calc-cost" className="text-sm font-medium">
                            Costo de Compra
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                $
                            </span>
                            <Input
                                id="calc-cost"
                                type="number"
                                min="0"
                                step="any"
                                placeholder="Ej. 100000"
                                className="pl-7"
                                value={internalCost}
                                onChange={(e) => setInternalCost(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* Margen deseado */}
                <div className="space-y-1.5">
                    <Label htmlFor="calc-margin" className="text-sm font-medium">
                        Margen de Ganancia Deseado
                    </Label>
                    <div className="relative">
                        <Input
                            id="calc-margin"
                            type="number"
                            min="0"
                            max="500"
                            step="1"
                            placeholder="Ej. 20"
                            className="pr-8"
                            value={margin}
                            onChange={(e) => setMargin(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            %
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Resultados por plataforma ────────────────── */}
            {results.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {results.map(({ platform, publishPrice, netProfit, breakdown }, index) => {
                        const style = PLATFORM_STYLES[platform.id] ?? {
                            emoji: "📦",
                            accent: "border-border",
                        }
                        const isPublished = published[platform.id] ?? false
                        const isExpanded = expandedBreakdown[platform.id] ?? false

                        return (
                            <Card
                                key={platform.id}
                                className={`relative overflow-hidden border-l-4 transition-all duration-200 ${style.accent
                                    } ${isPublished ? "opacity-60" : ""}`}
                            >
                                <CardHeader className="pb-2 pt-3 px-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                                            <span>{style.emoji}</span>
                                            {platform.name}
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-muted-foreground">
                                                {isPending ? "Guardando…" : "Publicado"}
                                            </span>
                                            <Switch
                                                checked={isPublished}
                                                onCheckedChange={() =>
                                                    togglePublished(platform.id)
                                                }
                                                disabled={isPending}
                                            />
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="px-4 pb-3 pt-0 space-y-2">
                                    {/* Precio sugerido */}
                                    <div>
                                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                                            Precio Sugerido
                                        </p>
                                        <p className="text-xl font-bold tracking-tight">
                                            {fmt(publishPrice)}
                                        </p>
                                    </div>

                                    {/* Ganancia neta */}
                                    <div className="flex items-center gap-2">
                                        <p className="text-[11px] text-muted-foreground">
                                            Ganancia Neta:
                                        </p>
                                        <Badge
                                            variant={
                                                netProfit >= 0
                                                    ? "default"
                                                    : "destructive"
                                            }
                                            className="text-xs px-1.5 py-0"
                                        >
                                            {fmt(netProfit)}
                                        </Badge>
                                    </div>

                                    {/* ── Editable fields ────────────── */}
                                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-dashed border-muted-foreground/20">
                                        {/* Comisión — Select */}
                                        <div className="space-y-0.5">
                                            <label className="text-[10px] text-muted-foreground/70">
                                                Comisión
                                            </label>
                                            <Select
                                                value={String(platform.commissionPercent)}
                                                onValueChange={(val) =>
                                                    updatePlatformField(
                                                        index,
                                                        "commissionPercent",
                                                        parseFloat(val),
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="h-7 text-xs px-2">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {COMMISSION_OPTIONS.map((opt) => (
                                                        <SelectItem
                                                            key={opt}
                                                            value={String(opt)}
                                                        >
                                                            {opt}%
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Envío — Input */}
                                        <div className="space-y-0.5">
                                            <label className="text-[10px] text-muted-foreground/70">
                                                Envío
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 text-[10px]">
                                                    $
                                                </span>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    className="h-7 text-xs pl-4 pr-1 py-0"
                                                    value={platform.fixedShippingCost}
                                                    onChange={(e) =>
                                                        updatePlatformField(
                                                            index,
                                                            "fixedShippingCost",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>

                                        {/* Imp. Extra — Input */}
                                        <div className="space-y-0.5">
                                            <label className="text-[10px] text-muted-foreground/70">
                                                Imp. Extra
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 text-[10px]">
                                                    $
                                                </span>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    min="0"
                                                    className="h-7 text-xs pl-4 pr-1 py-0"
                                                    value={platform.extraTaxes}
                                                    onChange={(e) =>
                                                        updatePlatformField(
                                                            index,
                                                            "extraTaxes",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Botón desglose ─────────────── */}
                                    <button
                                        type="button"
                                        onClick={() => toggleBreakdown(platform.id)}
                                        className="flex items-center gap-1 text-[10px] text-muted-foreground/70 hover:text-muted-foreground transition-colors w-full"
                                    >
                                        <ChevronDown
                                            className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                                                }`}
                                        />
                                        {isExpanded ? "Ocultar" : "Ver"} desglose
                                        {platform.chargesIvaOnCommission && (
                                            <span className="ml-auto text-[9px] opacity-60">
                                                IVA s/comisión
                                            </span>
                                        )}
                                    </button>

                                    {/* ── Desglose matemático ────────── */}
                                    {isExpanded && (
                                        <div className="rounded-md bg-muted/30 border border-dashed border-muted-foreground/15 px-3 py-2 space-y-0.5 text-xs text-muted-foreground font-mono">
                                            <div className="flex justify-between">
                                                <span>Precio Sugerido</span>
                                                <span className="font-semibold text-foreground">
                                                    {fmt(publishPrice)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-red-400/80">
                                                <span>
                                                    − Comisión ({platform.commissionPercent}%)
                                                </span>
                                                <span>−{fmt(breakdown.commissionAmount)}</span>
                                            </div>
                                            {breakdown.ivaOnCommission > 0 && (
                                                <div className="flex justify-between text-red-400/80">
                                                    <span>− IVA s/Comisión (19%)</span>
                                                    <span>−{fmt(breakdown.ivaOnCommission)}</span>
                                                </div>
                                            )}
                                            {breakdown.shippingCost !== 0 && (
                                                <div className="flex justify-between text-red-400/80">
                                                    <span>− Envío</span>
                                                    <span>
                                                        {breakdown.shippingCost < 0 ? "+" : "−"}
                                                        {fmt(Math.abs(breakdown.shippingCost))}
                                                    </span>
                                                </div>
                                            )}
                                            {breakdown.extraTaxesAmount > 0 && (
                                                <div className="flex justify-between text-red-400/80">
                                                    <span>− Imp. Extra</span>
                                                    <span>−{fmt(breakdown.extraTaxesAmount)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-red-400/80">
                                                <span>
                                                    − Banco ({platform.bankTaxPercent}%)
                                                </span>
                                                <span>−{fmt(breakdown.bankTaxAmount)}</span>
                                            </div>
                                            <div className="flex justify-between text-red-400/80">
                                                <span>− Costo Artículo</span>
                                                <span>−{fmt(costPrice)}</span>
                                            </div>
                                            <div className="border-t border-muted-foreground/20 mt-1 pt-1 flex justify-between font-semibold">
                                                <span>= Ganancia Real</span>
                                                <span
                                                    className={
                                                        breakdown.realNetProfit >= 0
                                                            ? "text-green-400"
                                                            : "text-red-400"
                                                    }
                                                >
                                                    {fmt(breakdown.realNetProfit)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* ── Empty state ─────────────────────────────── */}
            {costPrice <= 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                    Ingresa un <strong>costo de compra</strong> para calcular los
                    precios de publicación sugeridos.
                </div>
            )}
        </div>
    )
}
