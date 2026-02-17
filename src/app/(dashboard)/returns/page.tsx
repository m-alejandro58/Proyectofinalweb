import { getReturns } from "@/app/actions/returns"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreateReturnDialog } from "@/components/returns/create-return-dialog"
import { ProcessReturnDialog } from "@/components/returns/process-return-dialog"

export default async function ReturnsPage() {
    const { data: returns } = await getReturns()

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'default'
            case 'APPROVED': return 'secondary'
            case 'COMPLETED': return 'default' // Changed from 'success'
            case 'REJECTED': return 'destructive'
            default: return 'default'
        }
    }

    const getReasonLabel = (reason: string) => {
        const labels: Record<string, string> = {
            'CHANGE_OF_MIND': 'Cambio de opinión',
            'DEFECTIVE': 'Defectuoso',
            'WARRANTY': 'Garantía',
            'WRONG_ITEM': 'Artículo incorrecto',
            'OTHER': 'Otro'
        }
        return labels[reason] || reason
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Devoluciones</h1>
                    <p className="text-muted-foreground">Gestión de productos devueltos y reembolsos.</p>
                </div>
                <CreateReturnDialog />
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {returns?.map((r: any) => (
                                <TableRow key={r.id}>
                                    <TableCell className="text-sm">
                                        {new Date(r.requestedAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {r.sale.client?.name || 'Cliente Casual'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{getReasonLabel(r.reason)}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusColor(r.status)}>{r.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-red-600">
                                        ${r.refundAmount.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {r.status === 'PENDING' && <ProcessReturnDialog returnData={r} />}
                                        {r.status === 'COMPLETED' && <span className="text-sm text-green-600">✓ Procesado</span>}
                                        {r.status === 'REJECTED' && <span className="text-sm text-red-600">✗ Rechazado</span>}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!returns || returns.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No hay devoluciones registradas.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
