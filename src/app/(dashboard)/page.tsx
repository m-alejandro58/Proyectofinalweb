import { getDashboardMetrics, getOperationsMetrics, getProductPerformanceMetrics } from "@/app/actions/dashboard"
import { FinancialDashboard } from "@/components/dashboard/financial-overview"
import { OperationsOverview } from "@/components/dashboard/operations-overview"
import { ProductPerformance } from "@/components/dashboard/product-performance"
import { DashboardQuickActions } from "@/components/dashboard/quick-actions"

export default async function Home() {
  const [result, opsResult, perfResult] = await Promise.all([
    getDashboardMetrics(),
    getOperationsMetrics(),
    getProductPerformanceMetrics("all"),
  ])

  if (!result.success) {
    return (
      <div className="p-8 text-center text-red-500">
        <h2 className="text-xl font-bold">Error cargando dashboard</h2>
        <p>{result.error}</p>
      </div>
    )
  }

  const metrics = result.data!

  return (
    <div className="flex flex-col gap-6">
      {/* Quick Actions + Viabilidad IA Dialog */}
      <DashboardQuickActions />

      <FinancialDashboard metrics={metrics} />

      {/* Operations & Inventory Section */}
      {opsResult.success && opsResult.data && (
        <OperationsOverview data={opsResult.data} />
      )}

      {/* Product Performance Section */}
      {perfResult.success && perfResult.data && (
        <ProductPerformance initialData={perfResult.data} />
      )}
    </div>
  );
}
