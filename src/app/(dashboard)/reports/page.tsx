import { Suspense } from "react"
import { getReportData, ReportFilters as FilterType } from "@/app/actions/reports"
import { ReportFilters } from "@/components/reports/report-filters"
import { MetricCard } from "@/components/reports/metric-card"
import { ReportsCharts } from "@/components/reports/charts"
import { TransactionsTable } from "@/components/reports/transactions-table"
import { DollarSign, ShoppingBag, Truck, Package, Users, TrendingUp, CreditCard, Receipt } from "lucide-react"
import { ExportButton } from "@/components/export-buttons"

export default async function ReportsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | undefined }>
}) {

    const resolvedSearchParams = await searchParams

    const from = resolvedSearchParams.from ? new Date(resolvedSearchParams.from) : undefined
    const to = resolvedSearchParams.to ? new Date(resolvedSearchParams.to) : undefined
    const platform = resolvedSearchParams.platform
    const paymentMethod = resolvedSearchParams.paymentMethod

    const filters: FilterType = { from, to, platform, paymentMethod }

    const { success, data, error } = await getReportData(filters)

    if (!success || !data) {
        return (
            <div className="p-8 text-center text-red-500">
                <h2 className="text-xl font-bold">Error generando reporte</h2>
                <p>{error}</p>
            </div>
        )
    }

    const { summary, charts } = data

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)

    return (
        <div className="flex flex-col gap-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Reportes y Estadísticas</h1>
                <p className="text-muted-foreground">Análisis detallado del rendimiento de tu negocio.</p>
            </div>

            <Suspense fallback={<div>Cargando filtros...</div>}>
                <ReportFilters />
            </Suspense>

            {/* SUMMARY CARDS ROW 1: SALES & PROFIT */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Ventas Totales"
                    value={formatCurrency(summary.totalSales)}
                    icon={DollarSign}
                    className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                    valueClassName="text-blue-700 dark:text-blue-400"
                />
                <MetricCard
                    title="Ganancia Neta Estimate"
                    value={formatCurrency(summary.totalProfit)}
                    subValue="Despúes de gastos e impuestos"
                    icon={TrendingUp}
                    className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                    valueClassName="text-green-700 dark:text-green-400"
                />
                <MetricCard
                    title="Comisiones Plataforma"
                    value={formatCurrency(summary.totalCommissions)}
                    icon={CreditCard}
                />
                <MetricCard
                    title="Gastos de Envío"
                    value={formatCurrency(summary.totalShipping)}
                    icon={Truck}
                />
                <MetricCard
                    title="Gastos Operativos"
                    value={formatCurrency(summary.totalExpenses)}
                    subValue={`${summary.expensesByCategory.length} categorías`}
                    icon={Receipt}
                    className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
                    valueClassName="text-orange-700 dark:text-orange-400"
                />
            </div>

            {/* PLATFORM COSTS BREAKDOWN */}
            {summary.platformBreakdown.length > 0 && (
                <div className="mt-4 border p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-muted-foreground" />
                        Costos por Plataforma
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                        {summary.platformBreakdown.map(p => (
                            <div key={p.name} className="flex flex-col gap-1 p-3 rounded-lg border bg-background">
                                <span className="text-sm font-bold capitalize">{p.name.toLowerCase()}</span>
                                <div className="flex justify-between text-xs mt-1">
                                    <span className="text-muted-foreground">Comisiones:</span>
                                    <span className="font-mono text-rose-600 dark:text-rose-400">{formatCurrency(p.commissions)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Envíos:</span>
                                    <span className="font-mono text-rose-600 dark:text-rose-400">{formatCurrency(p.shipping)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* EXPENSES SEGMENTATION */}
            {summary.expensesByCategory.length > 0 && (
                <div className="border p-4 rounded-xl bg-orange-50/40 dark:bg-orange-950/10">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-orange-500" />
                        Gastos Operativos — Segmentación por Categoría
                        <span className="ml-auto text-sm font-normal text-muted-foreground">
                            Total: {formatCurrency(summary.totalExpenses)}
                        </span>
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-muted-foreground">
                                    <th className="text-left pb-2 font-medium">Categoría</th>
                                    <th className="text-right pb-2 font-medium"># Gastos</th>
                                    <th className="text-right pb-2 font-medium">Monto</th>
                                    <th className="text-right pb-2 font-medium">% del Total</th>
                                    <th className="text-left pb-2 font-medium pl-4">Proporción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.expensesByCategory.map((exp) => {
                                    const pct = summary.totalExpenses > 0 ? (exp.amount / summary.totalExpenses) * 100 : 0
                                    return (
                                        <tr key={exp.category} className="border-b last:border-0 hover:bg-orange-50 dark:hover:bg-orange-950/20">
                                            <td className="py-2 font-medium capitalize">{exp.category}</td>
                                            <td className="py-2 text-right text-muted-foreground">{exp.count}</td>
                                            <td className="py-2 text-right font-mono font-semibold text-orange-700 dark:text-orange-400">
                                                {formatCurrency(exp.amount)}
                                            </td>
                                            <td className="py-2 text-right text-muted-foreground">{pct.toFixed(1)}%</td>
                                            <td className="py-2 pl-4">
                                                <div className="h-2 rounded-full bg-orange-100 dark:bg-orange-900 overflow-hidden w-32">
                                                    <div
                                                        className="h-full bg-orange-400 dark:bg-orange-500 rounded-full"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 font-bold">
                                    <td className="pt-2">TOTAL</td>
                                    <td className="pt-2 text-right text-muted-foreground">
                                        {summary.expensesByCategory.reduce((s, e) => s + e.count, 0)}
                                    </td>
                                    <td className="pt-2 text-right font-mono text-orange-700 dark:text-orange-400">
                                        {formatCurrency(summary.totalExpenses)}
                                    </td>
                                    <td className="pt-2 text-right">100%</td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* SUMMARY CARDS ROW 2: OPERATIONS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Unidades Vendidas"
                    value={summary.totalUnitsSold}
                    icon={Package}
                />
                <MetricCard
                    title="Nuevos Clientes"
                    value={summary.newClients}
                    icon={Users}
                />
                <MetricCard
                    title="Compras (Abastecimiento)"
                    value={summary.totalPurchases}
                    icon={ShoppingBag}
                />
                {/* Placeholder for ROI or Margin */}
                <MetricCard
                    title="Margen Neto"
                    value={summary.totalSales > 0 ? `${((summary.totalProfit / summary.totalSales) * 100).toFixed(1)}%` : "0%"}
                    icon={TrendingUp}
                />
            </div>

            {/* CHARTS */}
            <ReportsCharts
                salesOverTime={charts.salesOverTime}
                salesByPlatform={charts.salesByPlatform}
                salesByPaymentMethod={charts.salesByPaymentMethod}
            />

            {/* DETAILED TRANSACTIONS TABLE */}
            <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Detalle de Ventas</h2>
                    <ExportButton table="transactions" label="Exportar Reporte CSV" />
                </div>
                <TransactionsTable data={data.transactions} />
            </div>

        </div>
    )
}
