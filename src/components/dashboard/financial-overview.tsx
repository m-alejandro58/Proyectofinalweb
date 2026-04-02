"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, CreditCard, TrendingUp, TrendingDown, Activity, ShoppingCart, Package, Truck, Wallet, Building2, Landmark } from "lucide-react"

export function FinancialDashboard({ metrics }: { metrics: any }) {

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount)
    }

    return (
        <div className="space-y-6">
            {/* Top Row: Key Financials */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-blue-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-100">Ventas (Mes)</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-100" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(metrics.sales.total)}</div>
                        <p className="text-xs text-blue-200">{metrics.sales.itemsSold} unidades vendidas</p>
                    </CardContent>
                </Card>

                <Card className="bg-sky-500 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-sky-100">Liquidez (Disponible)</CardTitle>
                        <Wallet className="h-4 w-4 text-sky-100" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(metrics.financials.liquidity)}</div>
                        <p className="text-xs text-sky-200">En Caja y Bancos</p>
                    </CardContent>
                </Card>

                <Card className="bg-indigo-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-100">Valor Inventario</CardTitle>
                        <Package className="h-4 w-4 text-indigo-100" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(metrics.inventory.totalValue)}</div>
                        <p className="text-xs text-indigo-200">{metrics.inventory.productCount} productos diferentes</p>
                    </CardContent>
                </Card>

                <Card className="bg-rose-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-rose-100">Deuda Total</CardTitle>
                        <CreditCard className="h-4 w-4 text-rose-100" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(metrics.financials.debt)}</div>
                        <p className="text-xs text-rose-200">Tarjetas y Préstamos</p>
                    </CardContent>
                </Card>
            </div>

            {/* Patrimonio Total */}
            <div className="grid gap-4 grid-cols-1">
                {(() => {
                    const fixedAssetsValue = metrics.fixedAssets?.totalCurrentValue ?? 0
                    const patrimonio = metrics.financials.liquidity + metrics.inventory.totalValue + fixedAssetsValue
                    const deprPct = metrics.fixedAssets?.totalPurchaseValue > 0
                        ? ((1 - fixedAssetsValue / metrics.fixedAssets.totalPurchaseValue) * 100).toFixed(1)
                        : null
                    return (
                        <Card className="border-2 border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50 via-yellow-50 to-white dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-transparent">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                                    <Landmark className="h-5 w-5" />
                                    Patrimonio Empresarial Estimado
                                    <span className="ml-auto text-2xl font-bold text-amber-900 dark:text-amber-200">
                                        {formatCurrency(patrimonio)}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Wallet className="h-3 w-3" /> Liquidez (Caja + Bancos)
                                        </span>
                                        <span className="font-semibold text-sky-700 dark:text-sky-400">{formatCurrency(metrics.financials.liquidity)}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Package className="h-3 w-3" /> Inventario (Costo)
                                        </span>
                                        <span className="font-semibold text-indigo-700 dark:text-indigo-400">{formatCurrency(metrics.inventory.totalValue)}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Building2 className="h-3 w-3" /> Activos Fijos (PP&amp;E)
                                        </span>
                                        <span className="font-semibold text-amber-700 dark:text-amber-400">{formatCurrency(fixedAssetsValue)}</span>
                                        {deprPct && (
                                            <span className="text-[10px] text-orange-500">{metrics.fixedAssets?.count ?? 0} activos · depr. {deprPct}%</span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })()}
            </div>

            {/* Middle Row: Profitability & Breakdown */}
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">

                {/* Channel Breakdown */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Canales de Ventas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(metrics.sales.byChannel || {}).map(([channel, total]: [string, any]) => (
                                <div key={channel} className="flex items-center">
                                    <div className="w-full space-y-1">
                                        <div className="flex justify-between">
                                            <p className="text-sm font-medium capitalize">{channel.toLowerCase()}</p>
                                            <span className="text-sm font-bold">{formatCurrency(total)}</span>
                                        </div>
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${(total / metrics.sales.total) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {Object.keys(metrics.sales.byChannel || {}).length === 0 && (
                                <p className="text-muted-foreground text-sm">No hay ventas registradas.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Profit Analysis */}
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Análisis de Rentabilidad</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <div className="flex flex-col gap-2 p-4 rounded-lg bg-green-50 border border-green-100 dark:bg-green-900/20 dark:border-green-900">
                            <span className="text-sm font-medium text-muted-foreground">Ganancia Bruta</span>
                            <span className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(metrics.profitability.gross)}</span>
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Margen: {metrics.profitability.margins.gross.toFixed(1)}%</span>
                        </div>
                        <div className="flex flex-col gap-2 p-4 rounded-lg bg-blue-50 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-900">
                            <span className="text-sm font-medium text-muted-foreground">Ganancia Operativa</span>
                            <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(metrics.profitability.operating)}</span>
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Margen: {metrics.profitability.margins.operating.toFixed(1)}%</span>
                        </div>
                        <div className="flex flex-col gap-2 p-4 rounded-lg bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/40 dark:border-emerald-800">
                            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Ganancia Neta</span>
                            <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">{formatCurrency(metrics.profitability.net)}</span>
                            <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">Margen: {metrics.profitability.margins.net.toFixed(1)}%</span>
                        </div>

                        <div className="col-span-3 lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Gastos Operativos (Ads/Admin)</span>
                                <p className="font-semibold text-destructive">- {formatCurrency(metrics.costs.operatingExpenses)}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Comisiones y Envíos</span>
                                <p className="font-semibold text-destructive">- {formatCurrency(metrics.costs.platformFees + metrics.costs.shipping)}</p>
                            </div>
                            <div className="space-y-1 col-span-2">
                                <span className="text-xs text-muted-foreground">Impuestos y Provisiones (Estimado)</span>
                                <div className="text-xs grid grid-cols-3 gap-2 mt-1">
                                    <span>GMF (4x1000): <span className="font-mono">{formatCurrency(metrics.costs.taxProvisions?.gmf || 0)}</span></span>
                                    <span>ICA: <span className="font-mono">{formatCurrency(metrics.costs.taxProvisions?.ica || 0)}</span></span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
