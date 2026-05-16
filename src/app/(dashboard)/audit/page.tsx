import { getAuditLogs } from "@/lib/audit"
import { AuditTable } from "./audit-table"

export default async function AuditPage() {

    const result = await getAuditLogs()

    if (!result.success) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">
                    Registro de Auditoría
                </h1>
                <div className="border rounded-lg p-4 text-red-500">
                    Error cargando registros
                </div>
            </div>
        )
    }

    const logs = result.data || []

    return (
        <div className="p-6 space-y-6">

            <div>
                <h1 className="text-3xl font-bold">
                    Registro de Auditoría
                </h1>
                <p className="text-muted-foreground">
                    Historial de acciones realizadas en el sistema
                </p>
            </div>

            <AuditTable logs={logs} />

        </div>
    )
}