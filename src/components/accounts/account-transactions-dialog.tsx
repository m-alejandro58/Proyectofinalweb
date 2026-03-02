"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { History, ArrowRight, ArrowLeft } from "lucide-react"
import { getAccountTransactions } from "@/app/actions/accounts"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

type Props = {
    account: any
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
    TRANSFER: { label: "Transferencia", color: "secondary" },
    CASHBACK: { label: "Cashback", color: "outline" },
    DEBT_PAYMENT: { label: "Pago Deuda", color: "outline" },
    ADJUSTMENT: { label: "Ajuste", color: "secondary" },
}

export function AccountTransactionsDialog({ account }: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [transactions, setTransactions] = useState<any[]>([])

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

    const handleOpen = async (v: boolean) => {
        setOpen(v)
        if (v) {
            setLoading(true)
            const res = await getAccountTransactions(account.id)
            if (res.success) setTransactions(res.data || [])
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Ver historial">
                    <History className="h-3.5 w-3.5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Historial — {account.name}
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Cargando historial...</div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
                        No hay transacciones registradas para esta cuenta.
                    </div>
                ) : (
                    <div className="max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead>Origen → Destino</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((tx: any) => {
                                    const isIncoming = tx.toAccountId === account.id
                                    const meta = TYPE_LABELS[tx.type] || { label: tx.type, color: "secondary" }
                                    return (
                                        <TableRow key={tx.id}>
                                            <TableCell className="text-xs whitespace-nowrap">
                                                {new Date(tx.createdAt).toLocaleDateString("es-CO", {
                                                    day: "2-digit", month: "short", year: "numeric"
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={meta.color as any} className="text-[10px] whitespace-nowrap">
                                                    {meta.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs max-w-[150px] truncate">
                                                {tx.description}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <span className="max-w-[80px] truncate">{tx.fromAccount?.name || "—"}</span>
                                                    <ArrowRight className="h-3 w-3 flex-shrink-0" />
                                                    <span className="max-w-[80px] truncate">{tx.toAccount?.name || "—"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                <span className={isIncoming ? "text-green-600" : "text-red-500"}>
                                                    {isIncoming ? "+" : "-"}{formatCurrency(tx.amount)}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
