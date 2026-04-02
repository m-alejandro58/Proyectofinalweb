import { Building2 } from "lucide-react"
import { getAssets } from "@/app/actions/assets"
import { AssetsTable } from "@/components/assets/assets-table"

export const metadata = {
    title: "Activos Fijos (PP&E) | Hardsoft",
    description: "Gestión de Propiedad, Planta y Equipo de la empresa"
}

export default async function AssetsPage() {
    const result = await getAssets()
    const assets = result.success ? (result.data ?? []) : []

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <Building2 className="h-5 w-5" />
                        </div>
                        Activos Fijos — PP&E
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Propiedad, Planta y Equipo de la empresa. Gestiona depreciación y traslados desde inventario.
                    </p>
                </div>
            </div>

            {!result.success && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                    Error al cargar activos: {(result as any).error}
                </div>
            )}

            <AssetsTable initialAssets={assets} />
        </div>
    )
}
