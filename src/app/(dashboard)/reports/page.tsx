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
import { ColombiaSalesMap } from "@/components/reports/colombia-sales-map";

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

      {/* ============================= DYNAMIC ANALYTICS ============================= */}

      {(() => {
        const totalTransactions = data.transactions.length;

        const recurrentClientsMap: Record<string, number> = {};
        data.transactions.forEach((t) => {
          recurrentClientsMap[t.clientName] =
            (recurrentClientsMap[t.clientName] || 0) + 1;
        });

        const recurrentClients = Object.values(recurrentClientsMap).filter(
          (v) => v > 1,
        ).length;

        const recurrentPct =
          totalTransactions > 0
            ? ((recurrentClients / totalTransactions) * 100).toFixed(0)
            : "0";

        const purchaseFrequency =
          Object.keys(recurrentClientsMap).length > 0
            ? (
                totalTransactions / Object.keys(recurrentClientsMap).length
              ).toFixed(1)
            : "0";

        const topClientEntry = Object.entries(recurrentClientsMap).sort(
          (a, b) => b[1] - a[1],
        )[0];

        const topClientSales = data.transactions
          .filter((t) => t.clientName === topClientEntry?.[0])
          .reduce((sum, t) => sum + t.grossAmount, 0);

        const ltv =
          Object.keys(recurrentClientsMap).length > 0
            ? summary.totalSales / Object.keys(recurrentClientsMap).length
            : 0;

        const salesByWeekDay: Record<string, number> = {
          Lunes: 0,
          Martes: 0,
          Miércoles: 0,
          Jueves: 0,
          Viernes: 0,
          Sábado: 0,
          Domingo: 0,
        };

        data.transactions.forEach((t) => {
          const day = new Date(t.date).toLocaleDateString("es-CO", {
            weekday: "long",
          });

          const formatted =
            day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();

          if (salesByWeekDay[formatted] !== undefined) {
            salesByWeekDay[formatted] += t.grossAmount;
          }
        });

        const maxWeekSales = Math.max(...Object.values(salesByWeekDay));

        const bestDay = Object.entries(salesByWeekDay).sort(
          (a, b) => b[1] - a[1],
        )[0];

        const operatingCostPct =
          summary.totalSales > 0
            ? (
                ((summary.totalCommissions +
                  summary.totalShipping +
                  summary.totalExpenses) /
                  summary.totalSales) *
                100
              ).toFixed(0)
            : "0";

        const taxImpact = data.transactions.reduce(
          (sum, t) => sum + t.taxes + t.gmf + t.ica,
          0,
        );

        const roi =
          summary.totalExpenses > 0
            ? ((summary.totalProfit / summary.totalExpenses) * 100).toFixed(0)
            : "0";

        const totalCOGS = data.transactions.reduce((s, t) => s + t.cogs, 0);

        const costStructure = [
          {
            label: "Inventario / COGS",
            value:
              summary.totalSales > 0
                ? (totalCOGS / summary.totalSales) * 100
                : 0,
            amount: totalCOGS,
            color: "bg-blue-500",
          },
          {
            label: "Comisiones",
            value:
              summary.totalSales > 0
                ? (summary.totalCommissions / summary.totalSales) * 100
                : 0,
            amount: summary.totalCommissions,
            color: "bg-pink-500",
          },
          {
            label: "Envíos",
            value:
              summary.totalSales > 0
                ? (summary.totalShipping / summary.totalSales) * 100
                : 0,
            amount: summary.totalShipping,
            color: "bg-orange-500",
          },
          {
            label: "Operación",
            value:
              summary.totalSales > 0
                ? (summary.totalExpenses / summary.totalSales) * 100
                : 0,
            amount: summary.totalExpenses,
            color: "bg-emerald-500",
          },
        ];

        return (
          <>
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
                <div className="rounded-2xl border border-white/5 bg-[#111827] p-5 shadow-lg">
                  <p className="text-sm text-slate-400 mb-2">
                    Clientes Recurrentes
                  </p>

                  <div className="text-3xl font-bold text-white">
                    {recurrentPct}%
                  </div>

                  <p className="text-xs text-emerald-400 mt-2">
                    {recurrentClients} clientes frecuentes
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-[#111827] p-5 shadow-lg">
                  <p className="text-sm text-slate-400 mb-2">
                    Frecuencia de Compra
                  </p>

                  <div className="text-3xl font-bold text-white">
                    {purchaseFrequency}x
                  </div>

                  <p className="text-xs text-slate-400 mt-2">
                    Compras promedio cliente
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-[#111827] p-5 shadow-lg">
                  <p className="text-sm text-slate-400 mb-2">Top Cliente</p>

                  <div className="text-lg font-bold text-white truncate">
                    {topClientEntry?.[0] || "N/A"}
                  </div>

                  <p className="text-xs text-slate-400 mt-2">
                    {formatCurrency(topClientSales)} en compras
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-[#111827] p-5 shadow-lg">
                  <p className="text-sm text-slate-400 mb-2">LTV Estimado</p>

                  <div className="text-3xl font-bold text-white">
                    {formatCurrency(ltv)}
                  </div>

                  <p className="text-xs text-slate-400 mt-2">
                    Valor promedio cliente
                  </p>
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
                    Tendencias y comportamiento comercial
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
                <div className="rounded-2xl border border-white/5 bg-[#111827] p-5 shadow-lg">
                  <p className="text-sm text-slate-400 mb-2">Mejor Día</p>

                  <div className="text-2xl font-bold text-white">
                    {bestDay?.[0] || "N/A"}
                  </div>

                  <p className="text-xs text-emerald-400 mt-2">
                    {formatCurrency(bestDay?.[1] || 0)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-[#111827] p-5 shadow-lg">
                  <p className="text-sm text-slate-400 mb-2">Ticket Promedio</p>

                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(
                      totalTransactions > 0
                        ? summary.totalSales / totalTransactions
                        : 0,
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-2">
                    Valor promedio venta
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-[#111827] p-5 shadow-lg">
                  <p className="text-sm text-slate-400 mb-2">Margen Neto</p>

                  <div className="text-2xl font-bold text-emerald-400">
                    {avgMargin}%
                  </div>

                  <p className="text-xs text-slate-400 mt-2">
                    Rentabilidad actual
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-[#111827] p-5 shadow-lg">
                  <p className="text-sm text-slate-400 mb-2">Forecast</p>

                  <div className="text-2xl font-bold text-blue-400">
                    {formatCurrency(summary.totalSales * 1.15)}
                  </div>

                  <p className="text-xs text-slate-400 mt-2">
                    Proyección estimada
                  </p>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                {/* WEEK PERFORMANCE */}
                <div className="rounded-2xl border border-white/5 bg-[#111827] p-6 shadow-lg">
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
                    {Object.entries(salesByWeekDay).map(([day, value]) => {
                      const pct =
                        maxWeekSales > 0 ? (value / maxWeekSales) * 100 : 0;

                      return (
                        <div key={day}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-slate-300">
                              {day}
                            </span>

                            <span className="text-sm text-white font-semibold">
                              {formatCurrency(value)}
                            </span>
                          </div>

                          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* FINANCIAL */}
                <div className="rounded-2xl border border-white/5 bg-[#111827] p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-semibold text-white">
                        Estructura Financiera
                      </h3>

                      <p className="text-xs text-slate-400 mt-1">
                        Distribución de costos
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {costStructure.map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between mb-2">
                          <div>
                            <p className="text-sm text-white font-medium">
                              {item.label}
                            </p>

                            <p className="text-xs text-slate-400">
                              {item.value.toFixed(1)}% del total
                            </p>
                          </div>

                          <div className="text-sm font-bold text-white">
                            {formatCurrency(item.amount)}
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
              </div>
            </div>

            {/* FINANCIAL KPI */}
            <div className="mt-8">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-emerald-500/10 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-5 shadow-lg">
                  <p className="text-sm text-slate-400 mb-2">Flujo Neto</p>

                  <div className="text-3xl font-bold text-emerald-400">
                    {formatCurrency(summary.totalProfit)}
                  </div>

                  <p className="text-xs text-emerald-300 mt-2">
                    Liquidez actual
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-500/10 bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-5 shadow-lg">
                  <p className="text-sm text-slate-400 mb-2">
                    Costos Operativos
                  </p>

                  <div className="text-3xl font-bold text-orange-400">
                    {operatingCostPct}%
                  </div>

                  <p className="text-xs text-slate-400 mt-2">
                    del ingreso total
                  </p>
                </div>

                <div className="rounded-2xl border border-red-500/10 bg-gradient-to-br from-red-500/10 to-red-500/5 p-5 shadow-lg">
                  <p className="text-sm text-slate-400 mb-2">
                    Impacto Tributario
                  </p>

                  <div className="text-3xl font-bold text-red-400">
                    {formatCurrency(taxImpact)}
                  </div>

                  <p className="text-xs text-slate-400 mt-2">
                    impuestos y retenciones
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-500/10 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-5 shadow-lg">
                  <p className="text-sm text-slate-400 mb-2">ROI Estimado</p>

                  <div className="text-3xl font-bold text-blue-400">{roi}%</div>

                  <p className="text-xs text-slate-400 mt-2">
                    retorno sobre inversión
                  </p>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ============================= VENTAS POR CIUDAD ============================= */}

      <ColombiaSalesMap data={data.demographics.topLocations} />

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
