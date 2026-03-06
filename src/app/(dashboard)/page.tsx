import { getDashboardMetrics, getOperationsMetrics } from "@/app/actions/dashboard"
import { FinancialDashboard } from "@/components/dashboard/financial-overview"
import { OperationsOverview } from "@/components/dashboard/operations-overview"
import { ShoppingCart, PackagePlus, Users, Package } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function Home() {
  const [result, opsResult] = await Promise.all([
    getDashboardMetrics(),
    getOperationsMetrics(),
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
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Link href="/sales/new">
          <Button size="lg" className="bg-green-600 hover:bg-green-700">
            <ShoppingCart className="mr-2 h-5 w-5" /> Nueva Venta
          </Button>
        </Link>
        <Link href="/purchases/new">
          <Button size="lg" variant="secondary">
            <PackagePlus className="mr-2 h-5 w-5" /> Registrar Compra
          </Button>
        </Link>
        <Link href="/contacts">
          <Button size="lg" variant="outline">
            <Users className="mr-2 h-5 w-5" /> Clientes / Prov.
          </Button>
        </Link>
        <Link href="/inventory">
          <Button size="lg" variant="ghost">
            <Package className="mr-2 h-5 w-5" /> Inventario
          </Button>
        </Link>
      </div>

      <FinancialDashboard metrics={metrics} />

      {/* Operations & Inventory Section */}
      {opsResult.success && opsResult.data && (
        <OperationsOverview data={opsResult.data} />
      )}
    </div>
  );
}
