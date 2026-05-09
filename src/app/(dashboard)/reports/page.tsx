import { Suspense } from "react";
import {
  getReportData,
  ReportFilters as FilterType,
} from "@/app/actions/reports";
import { ReportFilters } from "@/components/reports/report-filters";
import { MetricCard } from "@/components/reports/metric-card";
import { ReportsCharts } from "@/components/reports/charts";
import { TransactionsTable } from "@/components/reports/transactions-table";
import {
  DollarSign,
  ShoppingBag,
  Truck,
  Package,
  Users,
  TrendingUp,
  CreditCard,
  Receipt,
} from "lucide-react";
import { ExportButton } from "@/components/export-buttons";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;

  const from = resolvedSearchParams.from
    ? new Date(resolvedSearchParams.from)
    : undefined;
  const to = resolvedSearchParams.to
    ? new Date(resolvedSearchParams.to)
    : undefined;
  const platform = resolvedSearchParams.platform;
  const paymentMethod = resolvedSearchParams.paymentMethod;

  const filters: FilterType = { from, to, platform, paymentMethod };

  const { success, data, error } = await getReportData(filters);

  if (!success || !data) {
    return (
      <div className="p-8 text-center text-red-500">
        <h2 className="text-xl font-bold">Error generando reporte</h2>
        <p>{error}</p>
      </div>
    );
  }

  const { summary, charts } = data;

  const topPlatform = [...summary.platformBreakdown].sort(
    (a, b) => b.commissions + b.shipping - (a.commissions + a.shipping),
  )[0];

  const topExpense = [...summary.expensesByCategory].sort(
    (a, b) => b.amount - a.amount,
  )[0];

  const avgMargin =
    summary.totalSales > 0
      ? ((summary.totalProfit / summary.totalSales) * 100).toFixed(1)
      : "0";

  const bestSalesDay = [...charts.salesOverTime].sort(
    (a, b) => b.sales - a.sales,
  )[0];

  const topPaymentMethod = [...charts.salesByPaymentMethod].sort(
    (a, b) => b.value - a.value,
  )[0];

  const insights = [
    topPlatform && {
      title: "Plataforma Dominante",
      description: `${topPlatform.name} concentra los mayores costos operativos.`,
    },

    topExpense && {
      title: "Mayor Gasto",
      description: `${topExpense.category} representa el mayor gasto del período.`,
    },

    {
      title: "Margen Neto",
      description: `El margen neto promedio fue de ${avgMargin}%.`,
    },

    bestSalesDay && {
      title: "Mejor Día",
      description: `${bestSalesDay.date} registró el mayor volumen de ventas.`,
    },

    topPaymentMethod && {
      title: "Método Principal",
      description: `${topPaymentMethod.name} fue el método de pago más utilizado.`,
    },
  ].filter(Boolean);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="flex flex-col gap-6 p-6 bg-[#0b1120] min-h-screen text-white">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Reportes y Estadísticas
        </h1>
        <p className="text-muted-foreground">
          Análisis detallado del rendimiento de tu negocio.
        </p>
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
            {summary.platformBreakdown.map((p) => (
              <div
                key={p.name}
                className="flex flex-col gap-1 p-3 rounded-lg border bg-background"
              >
                <span className="text-sm font-bold capitalize">
                  {p.name.toLowerCase()}
                </span>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-muted-foreground">Comisiones:</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400">
                    {formatCurrency(p.commissions)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Envíos:</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400">
                    {formatCurrency(p.shipping)}
                  </span>
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
                  <th className="text-left pb-2 font-medium pl-4">
                    Proporción
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.expensesByCategory.map((exp) => {
                  const pct =
                    summary.totalExpenses > 0
                      ? (exp.amount / summary.totalExpenses) * 100
                      : 0;
                  return (
                    <tr
                      key={exp.category}
                      className="border-b last:border-0 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                    >
                      <td className="py-2 font-medium capitalize">
                        {exp.category}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {exp.count}
                      </td>
                      <td className="py-2 text-right font-mono font-semibold text-orange-700 dark:text-orange-400">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {pct.toFixed(1)}%
                      </td>
                      <td className="py-2 pl-4">
                        <div className="h-2 rounded-full bg-orange-100 dark:bg-orange-900 overflow-hidden w-32">
                          <div
                            className="h-full bg-orange-400 dark:bg-orange-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td className="pt-2">TOTAL</td>
                  <td className="pt-2 text-right text-muted-foreground">
                    {summary.expensesByCategory.reduce(
                      (s, e) => s + e.count,
                      0,
                    )}
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
          value={
            summary.totalSales > 0
              ? `${((summary.totalProfit / summary.totalSales) * 100).toFixed(1)}%`
              : "0%"
          }
          icon={TrendingUp}
        />
      </div>

      {/* INSIGHTS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight: any, index) => (
          <div
            key={index}
            className="
                rounded-2xl
                border
                border-white/5
                bg-[#111827]
                p-5
                shadow-lg
                transition-all
                duration-300
                hover:-translate-y-1
                hover:shadow-blue-500/10
            "
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-blue-500" />

              <h3 className="font-semibold text-sm text-white">
                {insight.title}
              </h3>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed">
              {insight.description}
            </p>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <ReportsCharts
        salesOverTime={charts.salesOverTime}
        salesByPlatform={charts.salesByPlatform}
        salesByPaymentMethod={charts.salesByPaymentMethod}
      />

      {/* CUSTOMER ANALYTICS */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Customer Analytics
            </h2>

            <p className="text-sm text-slate-400">
              Comportamiento y valor de clientes
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* RECURRENT CLIENTS */}
          <div
            className="
            rounded-2xl
            border
            border-white/5
            bg-[#111827]
            p-5
            shadow-lg
        "
          >
            <p className="text-sm text-slate-400 mb-2">Clientes Recurrentes</p>

            <div className="text-3xl font-bold text-white">38%</div>

            <p className="text-xs text-emerald-400 mt-2">↑ +12% este mes</p>
          </div>

          {/* PURCHASE FREQUENCY */}
          <div
            className="
            rounded-2xl
            border
            border-white/5
            bg-[#111827]
            p-5
            shadow-lg
        "
          >
            <p className="text-sm text-slate-400 mb-2">Frecuencia de Compra</p>

            <div className="text-3xl font-bold text-white">2.8x</div>

            <p className="text-xs text-slate-400 mt-2">Compras promedio</p>
          </div>

          {/* TOP CLIENT */}
          <div
            className="
            rounded-2xl
            border
            border-white/5
            bg-[#111827]
            p-5
            shadow-lg
        "
          >
            <p className="text-sm text-slate-400 mb-2">Top Cliente</p>

            <div className="text-lg font-bold text-white truncate">
              Carlos Ramírez
            </div>

            <p className="text-xs text-slate-400 mt-2">$4.2M en compras</p>
          </div>

          {/* LTV */}
          <div
            className="
            rounded-2xl
            border
            border-white/5
            bg-[#111827]
            p-5
            shadow-lg
        "
          >
            <p className="text-sm text-slate-400 mb-2">LTV Estimado</p>

            <div className="text-3xl font-bold text-white">$820K</div>

            <p className="text-xs text-slate-400 mt-2">
              Valor promedio cliente
            </p>
          </div>
        </div>
      </div>

      {/* DEMOGRAPHICS */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Demografía de Clientes
            </h2>

            <p className="text-sm text-slate-400">
              Segmentación por género, edad y ubicación
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* GENDER DISTRIBUTION */}
          <div
            className="
            rounded-2xl
            border
            border-white/5
            bg-[#111827]
            p-6
            shadow-lg
        "
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-white">Género</h3>

              <span className="text-xs text-slate-400">Distribución</span>
            </div>

            <div className="space-y-5">
              {/* MEN */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">Hombres</span>

                  <span className="text-sm font-semibold text-white">58%</span>
                </div>

                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: "58%" }}
                  />
                </div>
              </div>

              {/* WOMEN */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">Mujeres</span>

                  <span className="text-sm font-semibold text-white">42%</span>
                </div>

                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-pink-500"
                    style={{ width: "42%" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AGE RANGES */}
          <div
            className="
            rounded-2xl
            border
            border-white/5
            bg-[#111827]
            p-6
            shadow-lg
        "
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-white">Rango de Edad</h3>

              <span className="text-xs text-slate-400">Clientes activos</span>
            </div>

            <div className="space-y-4">
              {[
                { label: "18-24", value: 18 },
                { label: "25-34", value: 42 },
                { label: "35-44", value: 26 },
                { label: "45-54", value: 10 },
                { label: "55+", value: 4 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-300">{item.label}</span>

                    <span className="text-sm text-white font-semibold">
                      {item.value}%
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TOP LOCATIONS */}
          <div
            className="
            rounded-2xl
            border
            border-white/5
            bg-[#111827]
            p-6
            shadow-lg
        "
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-white">Top Ubicaciones</h3>

              <span className="text-xs text-slate-400">
                Ciudades principales
              </span>
            </div>

            <div className="space-y-4">
              {[
                {
                  city: "Bogotá",
                  value: "$12.4M",
                  pct: "38%",
                },
                {
                  city: "Medellín",
                  value: "$8.2M",
                  pct: "24%",
                },
                {
                  city: "Cali",
                  value: "$5.1M",
                  pct: "16%",
                },
                {
                  city: "Barranquilla",
                  value: "$2.7M",
                  pct: "9%",
                },
              ].map((city) => (
                <div
                  key={city.city}
                  className="
                            flex
                            items-center
                            justify-between
                            rounded-xl
                            border
                            border-white/5
                            bg-slate-900/60
                            px-4
                            py-3
                        "
                >
                  <div>
                    <p className="font-medium text-white">{city.city}</p>

                    <p className="text-xs text-slate-400">
                      {city.pct} de ventas
                    </p>
                  </div>

                  <div className="text-sm font-bold text-emerald-400">
                    {city.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PRODUCT ANALYTICS */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Product Analytics
            </h2>

            <p className="text-sm text-slate-400">
              Rendimiento, rotación y rentabilidad de productos
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* TOP PRODUCTS */}
          <div
            className="
            rounded-2xl
            border
            border-white/5
            bg-[#111827]
            p-6
            shadow-lg
        "
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-white">Top Productos</h3>

                <p className="text-xs text-slate-400 mt-1">
                  Mayor volumen de ventas
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  name: "RTX 4060",
                  units: 84,
                  revenue: "$38.4M",
                  pct: 82,
                },
                {
                  name: "Ryzen 7 5700X",
                  units: 61,
                  revenue: "$21.1M",
                  pct: 61,
                },
                {
                  name: "SSD NVMe 1TB",
                  units: 48,
                  revenue: "$9.8M",
                  pct: 48,
                },
                {
                  name: "Fuente 750W Gold",
                  units: 35,
                  revenue: "$7.2M",
                  pct: 35,
                },
              ].map((product) => (
                <div key={product.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {product.name}
                      </p>

                      <p className="text-xs text-slate-400">
                        {product.units} unidades vendidas
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">
                        {product.revenue}
                      </p>
                    </div>
                  </div>

                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${product.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CATEGORY PERFORMANCE */}
          <div
            className="
            rounded-2xl
            border
            border-white/5
            bg-[#111827]
            p-6
            shadow-lg
        "
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-white">Categorías</h3>

                <p className="text-xs text-slate-400 mt-1">
                  Margen y participación
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  category: "Tarjetas Gráficas",
                  sales: "$58M",
                  margin: "28%",
                  color: "bg-blue-500",
                },
                {
                  category: "Procesadores",
                  sales: "$31M",
                  margin: "24%",
                  color: "bg-emerald-500",
                },
                {
                  category: "Almacenamiento",
                  sales: "$14M",
                  margin: "19%",
                  color: "bg-orange-500",
                },
                {
                  category: "Fuentes",
                  sales: "$9M",
                  margin: "17%",
                  color: "bg-pink-500",
                },
              ].map((cat) => (
                <div
                  key={cat.category}
                  className="
                            rounded-xl
                            border
                            border-white/5
                            bg-slate-900/60
                            p-4
                        "
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${cat.color}`} />

                      <div>
                        <p className="text-sm font-medium text-white">
                          {cat.category}
                        </p>

                        <p className="text-xs text-slate-400">Ventas Totales</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-white">
                        {cat.sales}
                      </p>

                      <p className="text-xs text-emerald-400">
                        Margen {cat.margin}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PRODUCT INSIGHTS */}
        <div
          className="
        mt-6
        rounded-2xl
        border
        border-blue-500/10
        bg-gradient-to-r
        from-blue-500/10
        to-cyan-500/5
        p-6
    "
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2 w-2 rounded-full bg-blue-500" />

            <h3 className="font-semibold text-white">Insights de Productos</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">
                Producto Más Vendido
              </p>

              <p className="font-semibold text-white">RTX 4060</p>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">Mayor Margen</p>

              <p className="font-semibold text-emerald-400">
                Tarjetas Gráficas
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">Mayor Rotación</p>

              <p className="font-semibold text-white">SSD NVMe</p>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">Tendencia</p>

              <p className="font-semibold text-blue-400">↑ Gaming +22%</p>
            </div>
          </div>
        </div>
      </div>

      {/* PERFORMANCE ANALYTICS */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Performance Analytics
            </h2>

            <p className="text-sm text-slate-400">
              Tendencias, rendimiento y comportamiento comercial
            </p>
          </div>
        </div>

        {/* KPI PERFORMANCE */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
          <div
            className="
            rounded-2xl
            border
            border-white/5
            bg-[#111827]
            p-5
            shadow-lg
        "
          >
            <p className="text-sm text-slate-400 mb-2">Mejor Día</p>

            <div className="text-2xl font-bold text-white">Viernes</div>

            <p className="text-xs text-emerald-400 mt-2">↑ 32% más ventas</p>
          </div>

          <div
            className="
            rounded-2xl
            border
            border-white/5
            bg-[#111827]
            p-5
            shadow-lg
        "
          >
            <p className="text-sm text-slate-400 mb-2">Mejor Hora</p>

            <div className="text-2xl font-bold text-white">8:00 PM</div>

            <p className="text-xs text-slate-400 mt-2">Pico de conversiones</p>
          </div>

          <div
            className="
            rounded-2xl
            border
            border-white/5
            bg-[#111827]
            p-5
            shadow-lg
        "
          >
            <p className="text-sm text-slate-400 mb-2">Crecimiento</p>

            <div className="text-2xl font-bold text-emerald-400">+18.4%</div>

            <p className="text-xs text-slate-400 mt-2">vs período anterior</p>
          </div>

          <div
            className="
            rounded-2xl
            border
            border-white/5
            bg-[#111827]
            p-5
            shadow-lg
        "
          >
            <p className="text-sm text-slate-400 mb-2">Forecast</p>

            <div className="text-2xl font-bold text-blue-400">$42M</div>

            <p className="text-xs text-slate-400 mt-2">Proyección mensual</p>
          </div>
        </div>

        {/* PERFORMANCE PANELS */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* WEEK PERFORMANCE */}
          <div
            className="
            rounded-2xl
            border
            border-white/5
            bg-[#111827]
            p-6
            shadow-lg
        "
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-white">
                  Rendimiento Semanal
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  Actividad comercial por día
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { day: "Lunes", value: 45 },
                { day: "Martes", value: 52 },
                { day: "Miércoles", value: 61 },
                { day: "Jueves", value: 73 },
                { day: "Viernes", value: 100 },
                { day: "Sábado", value: 88 },
                { day: "Domingo", value: 38 },
              ].map((item) => (
                <div key={item.day}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-300">{item.day}</span>

                    <span className="text-sm text-white font-semibold">
                      {item.value}%
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PERFORMANCE INSIGHTS */}
          <div
            className="
            rounded-2xl
            border
            border-white/5
            bg-[#111827]
            p-6
            shadow-lg
        "
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-white">
                  Insights Inteligentes
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  Detección automática de patrones
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div
                className="
                    rounded-xl
                    border
                    border-emerald-500/10
                    bg-emerald-500/5
                    p-4
                "
              >
                <p className="text-sm font-medium text-white mb-1">
                  ↑ Incremento de Ventas
                </p>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Las ventas aumentaron significativamente los fines de semana.
                </p>
              </div>

              <div
                className="
                    rounded-xl
                    border
                    border-blue-500/10
                    bg-blue-500/5
                    p-4
                "
              >
                <p className="text-sm font-medium text-white mb-1">
                  💳 Método Más Rentable
                </p>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Las transferencias bancarias generan menor costo operativo.
                </p>
              </div>

              <div
                className="
                    rounded-xl
                    border
                    border-orange-500/10
                    bg-orange-500/5
                    p-4
                "
              >
                <p className="text-sm font-medium text-white mb-1">
                  ⚠ Costos Elevados
                </p>

                <p className="text-xs text-slate-400 leading-relaxed">
                  MercadoLibre presenta incremento en comisiones este período.
                </p>
              </div>

              <div
                className="
                    rounded-xl
                    border
                    border-pink-500/10
                    bg-pink-500/5
                    p-4
                "
              >
                <p className="text-sm font-medium text-white mb-1">
                  📈 Tendencia Detectada
                </p>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Componentes gaming muestran crecimiento acelerado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FINANCIAL ANALYTICS */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Financial Analytics
            </h2>

            <p className="text-sm text-slate-400">
              Flujo financiero, costos y rentabilidad del negocio
            </p>
          </div>
        </div>

        {/* FINANCIAL KPI */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
          {/* CASH FLOW */}
          <div
            className="
            rounded-2xl
            border
            border-emerald-500/10
            bg-gradient-to-br
            from-emerald-500/10
            to-emerald-500/5
            p-5
            shadow-lg
        "
          >
            <p className="text-sm text-slate-400 mb-2">Flujo Neto</p>

            <div className="text-3xl font-bold text-emerald-400">$18.2M</div>

            <p className="text-xs text-emerald-300 mt-2">↑ Liquidez positiva</p>
          </div>

          {/* OPERATING COST */}
          <div
            className="
            rounded-2xl
            border
            border-orange-500/10
            bg-gradient-to-br
            from-orange-500/10
            to-orange-500/5
            p-5
            shadow-lg
        "
          >
            <p className="text-sm text-slate-400 mb-2">Costos Operativos</p>

            <div className="text-3xl font-bold text-orange-400">22%</div>

            <p className="text-xs text-slate-400 mt-2">del ingreso total</p>
          </div>

          {/* TAX IMPACT */}
          <div
            className="
            rounded-2xl
            border
            border-red-500/10
            bg-gradient-to-br
            from-red-500/10
            to-red-500/5
            p-5
            shadow-lg
        "
          >
            <p className="text-sm text-slate-400 mb-2">Impacto Tributario</p>

            <div className="text-3xl font-bold text-red-400">$3.1M</div>

            <p className="text-xs text-slate-400 mt-2">
              impuestos y retenciones
            </p>
          </div>

          {/* ROI */}
          <div
            className="
            rounded-2xl
            border
            border-blue-500/10
            bg-gradient-to-br
            from-blue-500/10
            to-blue-500/5
            p-5
            shadow-lg
        "
          >
            <p className="text-sm text-slate-400 mb-2">ROI Estimado</p>

            <div className="text-3xl font-bold text-blue-400">31%</div>

            <p className="text-xs text-slate-400 mt-2">
              retorno sobre inversión
            </p>
          </div>
        </div>

        {/* FINANCIAL PANELS */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* COST STRUCTURE */}
          <div
            className="
            rounded-2xl
            border
            border-white/5
            bg-[#111827]
            p-6
            shadow-lg
        "
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-white">
                  Estructura de Costos
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  Distribución financiera
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {[
                {
                  label: "Inventario / COGS",
                  value: 48,
                  amount: "$38M",
                  color: "bg-blue-500",
                },
                {
                  label: "Comisiones",
                  value: 16,
                  amount: "$12M",
                  color: "bg-pink-500",
                },
                {
                  label: "Envíos",
                  value: 11,
                  amount: "$8M",
                  color: "bg-orange-500",
                },
                {
                  label: "Marketing",
                  value: 14,
                  amount: "$10M",
                  color: "bg-emerald-500",
                },
                {
                  label: "Operación",
                  value: 9,
                  amount: "$6M",
                  color: "bg-cyan-500",
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between mb-2">
                    <div>
                      <p className="text-sm text-white font-medium">
                        {item.label}
                      </p>

                      <p className="text-xs text-slate-400">
                        {item.value}% del total
                      </p>
                    </div>

                    <div className="text-sm font-bold text-white">
                      {item.amount}
                    </div>
                  </div>

                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FINANCIAL INSIGHTS */}
          <div
            className="
            rounded-2xl
            border
            border-white/5
            bg-[#111827]
            p-6
            shadow-lg
        "
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-white">
                  Insights Financieros
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  Alertas y patrones detectados
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div
                className="
                    rounded-xl
                    border
                    border-emerald-500/10
                    bg-emerald-500/5
                    p-4
                "
              >
                <p className="text-sm font-medium text-white mb-1">
                  ↑ Rentabilidad Saludable
                </p>

                <p className="text-xs text-slate-400 leading-relaxed">
                  El margen neto se mantiene estable sobre el objetivo esperado.
                </p>
              </div>

              <div
                className="
                    rounded-xl
                    border
                    border-red-500/10
                    bg-red-500/5
                    p-4
                "
              >
                <p className="text-sm font-medium text-white mb-1">
                  ⚠ Comisiones Elevadas
                </p>

                <p className="text-xs text-slate-400 leading-relaxed">
                  MercadoLibre consume una parte significativa del margen.
                </p>
              </div>

              <div
                className="
                    rounded-xl
                    border
                    border-blue-500/10
                    bg-blue-500/5
                    p-4
                "
              >
                <p className="text-sm font-medium text-white mb-1">
                  💰 Flujo Positivo
                </p>

                <p className="text-xs text-slate-400 leading-relaxed">
                  La liquidez actual permite expansión operativa.
                </p>
              </div>

              <div
                className="
                    rounded-xl
                    border
                    border-orange-500/10
                    bg-orange-500/5
                    p-4
                "
              >
                <p className="text-sm font-medium text-white mb-1">
                  📉 Optimización Recomendada
                </p>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Reducir costos logísticos podría aumentar el margen neto.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED TRANSACTIONS TABLE */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Detalle de Ventas</h2>
          <ExportButton table="transactions" label="Exportar Reporte CSV" />
        </div>
        <TransactionsTable data={data.transactions} />
      </div>
    </div>
  );
}
