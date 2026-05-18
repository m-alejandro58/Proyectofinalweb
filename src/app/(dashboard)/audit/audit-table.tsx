"use client"

import React, { useState, useMemo } from "react"

// ---------------------------------------------------------
// BADGE DE ACCIÓN
// ---------------------------------------------------------

function ActionBadge({ action }: { action: string }) {
    const styles: Record<string, string> = {
        CREATE_PRODUCT: "bg-green-100 text-green-800 border border-green-200",
        UPDATE_PRODUCT: "bg-blue-100 text-blue-800 border border-blue-200",
        DELETE_PRODUCT: "bg-red-100 text-red-800 border border-red-200",
        ADJUST_STOCK:   "bg-yellow-100 text-yellow-800 border border-yellow-200",
    }

    const labels: Record<string, string> = {
        CREATE_PRODUCT: "Creación",
        UPDATE_PRODUCT: "Actualización",
        DELETE_PRODUCT: "Eliminación",
        ADJUST_STOCK:   "Ajuste de stock",
    }

    const style = styles[action] ?? "bg-gray-100 text-gray-800 border border-gray-200"
    const label = labels[action] ?? action

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
            {label}
        </span>
    )
}

// ---------------------------------------------------------
// DETALLE DE VALORES
// ---------------------------------------------------------

function ValuesDetail({ label, values }: { label: string, values: string | null }) {
    if (!values) return null

    let parsed: any
    try {
        parsed = JSON.parse(values)
    } catch {
        return null
    }

    return (
        <div className="mb-2">
            <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
            <div className="bg-muted rounded p-2 text-xs space-y-0.5">
                {Object.entries(parsed).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                        <span className="text-muted-foreground min-w-[100px]">{key}:</span>
                        <span className="font-medium">{String(value)}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ---------------------------------------------------------
// TABLA
// ---------------------------------------------------------

export function AuditTable({ logs }: { logs: any[] }) {
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const [filterAction, setFilterAction] = useState("")
    const [filterEntity, setFilterEntity] = useState("")
    const [filterFrom, setFilterFrom] = useState("")
    const [filterTo, setFilterTo] = useState("")

    const uniqueActions = useMemo(() =>
        Array.from(new Set(logs.map(l => l.action))), [logs])

    const uniqueEntities = useMemo(() =>
        Array.from(new Set(logs.map(l => l.entity))), [logs])

    const filtered = useMemo(() => {
        return logs.filter(log => {
            if (filterAction && log.action !== filterAction) return false
            if (filterEntity && log.entity !== filterEntity) return false

            const ts = new Date(log.timestamp)
            if (filterFrom && ts < new Date(filterFrom)) return false
            if (filterTo) {
                const to = new Date(filterTo)
                to.setHours(23, 59, 59, 999)
                if (ts > to) return false
            }

            return true
        })
    }, [logs, filterAction, filterEntity, filterFrom, filterTo])

    const toggle = (id: string) => {
        setExpandedId(prev => prev === id ? null : id)
    }

    const clearFilters = () => {
        setFilterAction("")
        setFilterEntity("")
        setFilterFrom("")
        setFilterTo("")
    }

    const hasFilters = filterAction || filterEntity || filterFrom || filterTo

    return (
        <div className="space-y-4">

            {/* FILTROS */}
            <div className="flex flex-wrap gap-3 items-end">

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Acción</label>
                    <select
                        value={filterAction}
                        onChange={e => setFilterAction(e.target.value)}
                        className="border rounded px-2 py-1.5 text-sm bg-background"
                    >
                        <option value="">Todas</option>
                        {uniqueActions.map(action => (
                            <option key={action} value={action}>{action}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Entidad</label>
                    <select
                        value={filterEntity}
                        onChange={e => setFilterEntity(e.target.value)}
                        className="border rounded px-2 py-1.5 text-sm bg-background"
                    >
                        <option value="">Todas</option>
                        {uniqueEntities.map(entity => (
                            <option key={entity} value={entity}>{entity}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Desde</label>
                    <input
                        type="date"
                        value={filterFrom}
                        onChange={e => setFilterFrom(e.target.value)}
                        className="border rounded px-2 py-1.5 text-sm bg-background"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Hasta</label>
                    <input
                        type="date"
                        value={filterTo}
                        onChange={e => setFilterTo(e.target.value)}
                        className="border rounded px-2 py-1.5 text-sm bg-background"
                    />
                </div>

                {hasFilters && (
                    <button
                        onClick={clearFilters}
                        className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground underline"
                    >
                        Limpiar filtros
                    </button>
                )}

                <span className="text-xs text-muted-foreground ml-auto self-end pb-2">
                    {filtered.length} de {logs.length} registros
                </span>

            </div>

            {/* TABLA */}
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">

                    <thead className="bg-muted">
                        <tr>
                            <th className="text-left p-3">Fecha</th>
                            <th className="text-left p-3">Acción</th>
                            <th className="text-left p-3">Entidad</th>
                            <th className="text-left p-3">Usuario</th>
                            <th className="text-left p-3">Detalle</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                                    No hay registros con los filtros seleccionados
                                </td>
                            </tr>
                        ) : (
                            filtered.map((log: any) => (
                                <React.Fragment key={log.id}>
                                    <tr
                                        className="border-t hover:bg-muted/40 transition-colors cursor-pointer"
                                        onClick={() => toggle(log.id)}
                                    >
                                        <td className="p-3 text-muted-foreground">
                                            {new Date(log.timestamp).toLocaleString("es-CO")}
                                        </td>

                                        <td className="p-3">
                                            <ActionBadge action={log.action} />
                                        </td>

                                        <td className="p-3 font-medium">
                                            {log.entity}
                                        </td>

                                        <td className="p-3 text-muted-foreground">
                                            {log.user?.name || log.user?.username || "Sistema"}
                                        </td>

                                        <td className="p-3 text-muted-foreground">
                                            {(log.oldValues || log.newValues) && (
                                                <span className="text-xs underline">
                                                    {expandedId === log.id ? "Ocultar" : "Ver cambios"}
                                                </span>
                                            )}
                                        </td>
                                    </tr>

                                    {expandedId === log.id && (
                                        <tr className="bg-muted/20 border-t">
                                            <td colSpan={5} className="p-4">
                                                <ValuesDetail label="Antes" values={log.oldValues} />
                                                <ValuesDetail label="Después" values={log.newValues} />
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>

                </table>
            </div>

        </div>
    )
}