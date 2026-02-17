import { Suspense } from "react"
import { getReportData, ReportFilters as FilterType } from "@/app/actions/reports"
import { ReportFilters } from "@/components/reports/report-filters"
import { MetricCard } from "@/components/reports/metric-card"
import { ReportsCharts } from "@/components/reports/charts"
import { TransactionsTable } from "@/components/reports/transactions-table"
import { DollarSign, ShoppingBag, Truck, Package, Users, TrendingUp, CreditCard } from "lucide-react"

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
            </div>

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
                <h2 className="text-xl font-bold mb-4">Detalle de Ventas</h2>
                <TransactionsTable data={data.transactions} />
            </div>

        </div>
    )
}
