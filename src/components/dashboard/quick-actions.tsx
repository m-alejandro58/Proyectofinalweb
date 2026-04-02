"use client"

import { useState } from "react"
import { ShoppingCart, PackagePlus, Users, Package, Calculator } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProcurementSimulatorDialog } from "@/components/dashboard/procurement-simulator"

export function DashboardQuickActions() {
    const [simulatorOpen, setSimulatorOpen] = useState(false)

    return (
        <>
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
                <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setSimulatorOpen(true)}
                    className="border-violet-500/40 text-violet-700 hover:bg-violet-50 hover:text-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/30"
                >
                    <Calculator className="mr-2 h-5 w-5" /> Viabilidad IA
                </Button>
            </div>

            <ProcurementSimulatorDialog
                open={simulatorOpen}
                onOpenChange={setSimulatorOpen}
            />
        </>
    )
}
