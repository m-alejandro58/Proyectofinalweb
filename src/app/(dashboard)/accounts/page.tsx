import { getFinancialAccounts } from "@/app/actions/accounts"
import { getDeferredPayments } from "@/app/actions/deferred-payments"
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog"
import { TransferDialog } from "@/components/accounts/transfer-dialog"
import { EditAccountDialog } from "@/components/accounts/edit-account-dialog"
import { CashbackDialog } from "@/components/accounts/cashback-dialog"
import { PayDebtDialog } from "@/components/accounts/pay-debt-dialog"
import { AccountTransactionsDialog } from "@/components/accounts/account-transactions-dialog"
import { MarkDisbursedDialog } from "@/components/accounts/mark-disbursed-dialog"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Wallet, Building2, Banknote, Clock, AlertTriangle, Package } from "lucide-react"

export default async function AccountsPage() {
    const [{ data: accounts }, { data: allPayments }] = await Promise.all([
        getFinancialAccounts(),
        getDeferredPayments(),
    ])

    const allAccounts = accounts || []
    const pendingPayments = (allPayments || []).filter((p: any) => p.status === "PENDING")
    const disbursedPayments = (allPayments || []).filter((p: any) => p.status === "DISBURSED")

    // Accounts usable for disbursement destination (non-receivable, non-credit)
    const bankAccounts = allAccounts.filter((a: any) => a.type === "CASH" || a.type === "BANK")

    const getIcon = (type: string) => {
        switch (type) {
            case "CREDIT": return <CreditCard className="h-4 w-4" />
            case "BANK": return <Building2 className="h-4 w-4" />
            case "RECEIVABLE": return <Banknote className="h-4 w-4" />
            default: return <Wallet className="h-4 w-4" />
        }
    }

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount)

    const formatDate = (d: Date | string) =>
        new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })

    const totalPending = pendingPayments.reduce((s: number, p: any) => s + p.amount, 0)
    const now = Date.now()
    const overduePayments = pendingPayments.filter((p: any) => new Date(p.expectedDate).getTime() < now)

    return (
        <div className="flex flex-col gap-6">
            {/* ── Header ── */}
            <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Cuentas Financieras</h1>
                    <p className="text-muted-foreground">Gestiona tus bancos, efectivo, tarjetas y cuentas por cobrar.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <CashbackDialog accounts={allAccounts} />
                    <PayDebtDialog accounts={allAccounts} />
                    <TransferDialog accounts={allAccounts} />
                    <CreateAccountDialog />
                </div>
            </div>

            {/* ── Account Cards ── */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {allAccounts.map((acc: any) => (
                    <div key={acc.id} className="rounded-lg border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        {acc.image ? (
                            <div className="w-full aspect-[16/10] bg-gray-900 overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={acc.image} alt={acc.name} className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className={`w-full aspect-[16/10] flex items-center justify-center relative ${acc.type === "CREDIT" ? "bg-gradient-to-br from-slate-700 to-slate-900" :
                                    acc.type === "BANK" ? "bg-gradient-to-br from-blue-700 to-blue-900" :
                                        acc.type === "CASH" ? "bg-gradient-to-br from-green-700 to-green-900" :
                                            acc.type === "RECEIVABLE" ? "bg-gradient-to-br from-amber-700 to-amber-900" :
                                                "bg-gradient-to-br from-purple-700 to-purple-900"
                                }`}>
                                <div className="text-white/20 scale-[2.5]">{getIcon(acc.type)}</div>
                                <span className="absolute bottom-2 left-3 text-white/40 text-[10px] font-medium tracking-wider uppercase">
                                    {acc.type === "CREDIT" ? "Tarjeta de Crédito" :
                                        acc.type === "BANK" ? "Cuenta Bancaria" :
                                            acc.type === "CASH" ? "Efectivo" :
                                                acc.type === "RECEIVABLE" ? "Por Cobrar" : acc.type}
                                </span>
                            </div>
                        )}
                        <div className="p-3">
                            <div className="flex justify-between items-start">
                                <h3 className="text-xs font-medium text-muted-foreground truncate pr-1">{acc.name}</h3>
                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <AccountTransactionsDialog account={acc} />
                                    <EditAccountDialog account={acc} />
                                </div>
                            </div>
                            <div className="text-lg font-bold mt-0.5">{formatCurrency(acc.balance)}</div>
                            {(acc.type === 'CREDIT' || acc.type === 'LOAN') && acc.creditLimit ? (
                                <>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Cupo: {formatCurrency(acc.creditLimit)}</p>
                                    <div className="mt-1.5 h-1 w-full bg-secondary rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full transition-all"
                                            style={{ width: `${Math.min((Math.abs(acc.balance) / acc.creditLimit) * 100, 100)}%` }} />
                                    </div>
                                </>
                            ) : (
                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{acc.description || acc.type}</p>
                            )}
                            <div className="mt-2">
                                <Badge variant={acc.type === 'CREDIT' ? 'outline' : 'secondary'} className="gap-1 text-[10px] px-1.5 py-0">
                                    {getIcon(acc.type)}{acc.type}
                                </Badge>
                            </div>
                        </div>
                    </div>
                ))}
                {allAccounts.length === 0 && (
                    <div className="col-span-full text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
                        No tienes cuentas registradas. Crea una para comenzar.
                    </div>
                )}
            </div>

            {/* ── Sistecredito / LuegoPago Pending Payments ── */}
            {(pendingPayments.length > 0 || disbursedPayments.length > 0) && (
                <div className="space-y-3">
                    {/* Summary bar */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h2 className="text-xl font-bold">Cobros Sistecredito / LuegoPago</h2>
                            <p className="text-sm text-muted-foreground">
                                Trazabilidad de pagos diferidos — marca cada pago cuando Sistecredito consigna el dinero.
                            </p>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            {totalPending > 0 && (
                                <div className="rounded-lg border px-4 py-2 text-center">
                                    <p className="text-xs text-muted-foreground">Pendiente total</p>
                                    <p className="text-lg font-bold text-amber-500">{formatCurrency(totalPending)}</p>
                                </div>
                            )}
                            {overduePayments.length > 0 && (
                                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 px-4 py-2 text-center">
                                    <p className="text-xs text-red-500">Vencidos</p>
                                    <p className="text-lg font-bold text-red-600">{overduePayments.length}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pending payments */}
                    {pendingPayments.length > 0 && (
                        <div className="rounded-xl border overflow-hidden">
                            <div className="bg-amber-50 dark:bg-amber-950/20 px-4 py-2 border-b flex items-center gap-2">
                                <Clock className="h-4 w-4 text-amber-500" />
                                <span className="font-semibold text-sm">Pendientes de cobro ({pendingPayments.length})</span>
                            </div>
                            <div className="divide-y">
                                {pendingPayments.map((payment: any) => {
                                    const daysRemaining = Math.ceil(
                                        (new Date(payment.expectedDate).getTime() - now) / (1000 * 60 * 60 * 24)
                                    )
                                    const isOverdue = daysRemaining < 0
                                    const items: any[] = payment.sale?.items || []

                                    return (
                                        <div key={payment.id} className={`p-4 flex items-center gap-4 flex-wrap ${isOverdue ? "bg-red-50/50 dark:bg-red-950/10" : ""}`}>
                                            {/* Left: sale info */}
                                            <div className="flex-1 min-w-0 space-y-0.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        #{payment.sale?.invoiceNumber || payment.saleId.slice(0, 8)}
                                                    </span>
                                                    {payment.sale?.client && (
                                                        <span className="text-sm font-medium">{payment.sale.client.name}</span>
                                                    )}
                                                    <Badge variant="secondary" className="text-[10px]">{payment.paymentMethod}</Badge>
                                                    {isOverdue && (
                                                        <Badge variant="destructive" className="text-[10px] gap-1">
                                                            <AlertTriangle className="h-2.5 w-2.5" />
                                                            {Math.abs(daysRemaining)}d vencido
                                                        </Badge>
                                                    )}
                                                </div>
                                                {/* Products */}
                                                {items.length > 0 && (
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Package className="h-3 w-3 flex-shrink-0" />
                                                        <span className="truncate">
                                                            {items.map((i: any) => `${i.quantity}× ${i.productName}`).join(" · ")}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="text-xs text-muted-foreground">
                                                    Venta: {formatDate(payment.saleDate)} · Esperado: {" "}
                                                    <span className={isOverdue ? "text-red-500 font-medium" : "text-amber-600 font-medium"}>
                                                        {formatDate(payment.expectedDate)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right: amount + action */}
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <div className="font-bold">{formatCurrency(payment.amount)}</div>
                                                    {!isOverdue && (
                                                        <div className="text-xs text-muted-foreground">en {daysRemaining}d</div>
                                                    )}
                                                </div>
                                                <MarkDisbursedDialog payment={payment} bankAccounts={bankAccounts} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Recent disbursed */}
                    {disbursedPayments.length > 0 && (
                        <div className="rounded-xl border overflow-hidden">
                            <div className="bg-green-50 dark:bg-green-950/20 px-4 py-2 border-b flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-green-500" />
                                <span className="font-semibold text-sm">Cobros recibidos ({disbursedPayments.length})</span>
                            </div>
                            <div className="divide-y">
                                {disbursedPayments.slice(0, 5).map((payment: any) => {
                                    const items: any[] = payment.sale?.items || []
                                    return (
                                        <div key={payment.id} className="p-4 flex items-center gap-4 flex-wrap opacity-75">
                                            <div className="flex-1 min-w-0 space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        #{payment.sale?.invoiceNumber || payment.saleId.slice(0, 8)}
                                                    </span>
                                                    {payment.sale?.client && (
                                                        <span className="text-sm font-medium">{payment.sale.client.name}</span>
                                                    )}
                                                    <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">✅ Cobrado</Badge>
                                                </div>
                                                {items.length > 0 && (
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Package className="h-3 w-3 flex-shrink-0" />
                                                        <span className="truncate">
                                                            {items.map((i: any) => `${i.quantity}× ${i.productName}`).join(" · ")}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="text-xs text-muted-foreground">
                                                    Cobrado el {payment.disbursedDate ? formatDate(payment.disbursedDate) : "—"}
                                                    {payment.targetAccount && ` → ${payment.targetAccount.name}`}
                                                </div>
                                            </div>
                                            <div className="font-bold text-green-600">{formatCurrency(payment.amount)}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
