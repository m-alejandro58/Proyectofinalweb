import { getProviderClaims, getClaimsSummary } from "@/app/actions/provider-claims"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ShieldAlert, Clock, CheckCircle2, DollarSign } from "lucide-react"
import { CreateClaimDialog } from "@/components/claims/create-claim-dialog"
import { AdvanceClaimDialog } from "@/components/claims/advance-claim-dialog"
import { DeleteClaimButton } from "@/components/claims/delete-claim-button"

const STATUS_LABELS: Record<string, string> = {
    INITIATED: "Iniciado",
    REORDERED: "Recomprado",
    REPLACEMENT_RECEIVED: "Reemplazo Recibido",
    RETURNED_TO_PROVIDER: "Devuelto al Proveedor",
    REFUNDED: "Reembolsado",
    CLOSED: "Cerrado",
}

const TYPE_LABELS: Record<string, string> = {
    SWAP: "Swap",
    REPLACEMENT: "Reemplazo",
    REFUND: "Reembolso",
}

const REASON_LABELS: Record<string, string> = {
    DEFECTO_FABRICA: "Defecto de fábrica",
    GARANTIA: "Garantía",
    PRODUCTO_DAÑADO: "Producto dañado",
    OTRO: "Otro",
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
        case "INITIATED": return "outline"
        case "REORDERED": return "secondary"
        case "REPLACEMENT_RECEIVED": return "secondary"
        case "RETURNED_TO_PROVIDER": return "default"
        case "REFUNDED": return "default"
        case "CLOSED": return "outline"
        default: return "default"
    }
}

function getTypeVariant(type: string): "default" | "secondary" | "destructive" | "outline" {
    switch (type) {
        case "SWAP": return "destructive"
        case "REPLACEMENT": return "secondary"
        case "REFUND": return "default"
        default: return "default"
    }
}

export default async function ClaimsPage() {
    const [claimsRes, summaryRes] = await Promise.all([
        getProviderClaims(),
        getClaimsSummary(),
    ])

    const claims = claimsRes.data || []
    const summary = summaryRes.data || { total: 0, active: 0, pendingRefund: 0, closed: 0, totalRefunded: 0 }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reclamaciones a Proveedores</h1>
                    <p className="text-muted-foreground">Gestión de garantías, swaps y devoluciones con proveedores.</p>
                </div>
                <CreateClaimDialog />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total</p>
                                <p className="text-2xl font-bold">{summary.total}</p>
                            </div>
                            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Activas</p>
                                <p className="text-2xl font-bold text-orange-500">{summary.active}</p>
                            </div>
                            <Clock className="h-8 w-8 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Completadas</p>
                                <p className="text-2xl font-bold text-green-500">{summary.closed}</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Reembolsado</p>
                                <p className="text-2xl font-bold text-blue-500">${summary.totalRefunded.toLocaleString()}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Claims Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead>Proveedor</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Razón</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Reembolso</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {claims.map((claim: any) => (
                                <TableRow key={claim.id}>
                                    <TableCell className="text-sm">
                                        {new Date(claim.initiatedAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="font-medium max-w-[200px] truncate" title={claim.productName}>
                                        <div>
                                            <div>{claim.productName}</div>
                                            {claim.quantity > 1 && (
                                                <span className="text-xs text-muted-foreground">x{claim.quantity}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{claim.provider?.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={getTypeVariant(claim.type)}>
                                            {TYPE_LABELS[claim.type] || claim.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {REASON_LABELS[claim.reason] || claim.reason}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(claim.status)}>
                                            {STATUS_LABELS[claim.status] || claim.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {claim.refundAmount ? (
                                            <span className="font-bold text-green-600">
                                                ${claim.refundAmount.toLocaleString()}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {claim.status !== "CLOSED" ? (
                                                <AdvanceClaimDialog claim={claim} />
                                            ) : (
                                                <span className="text-sm text-green-600">✓ Cerrado</span>
                                            )}
                                            <DeleteClaimButton claim={claim} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {claims.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        No hay reclamaciones registradas.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Legend */}
            <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex gap-4 flex-wrap">
                    <span><Badge variant="destructive" className="text-xs mr-1">Swap</Badge> Recompra + devolución del defectuoso</span>
                    <span><Badge variant="secondary" className="text-xs mr-1">Reemplazo</Badge> Proveedor envía uno nuevo</span>
                    <span><Badge variant="default" className="text-xs mr-1">Reembolso</Badge> Devolución + dinero de vuelta</span>
                </div>
            </div>
        </div>
    )
}
