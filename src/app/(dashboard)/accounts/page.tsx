import { getFinancialAccounts } from "@/app/actions/accounts"
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog"
import { TransferDialog } from "@/components/accounts/transfer-dialog"
import { EditAccountDialog } from "@/components/accounts/edit-account-dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Wallet, Building2, Banknote } from "lucide-react"

export default async function AccountsPage() {
    const { data: accounts } = await getFinancialAccounts()

    const getIcon = (type: string) => {
        switch (type) {
            case "CREDIT": return <CreditCard className="h-5 w-5" />
            case "BANK": return <Building2 className="h-5 w-5" />
            case "RECEIVABLE": return <Banknote className="h-5 w-5" />
            default: return <Wallet className="h-5 w-5" />
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount)
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Cuentas Financieras</h1>
                    <p className="text-muted-foreground">Gestiona tus bancos, efectivo, tarjetas y cuentas por cobrar.</p>
                </div>
                <div className="flex gap-2">
                    <TransferDialog accounts={accounts || []} />
                    <CreateAccountDialog />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {accounts?.map((acc: any) => (
                    <Card key={acc.id} className="relative overflow-hidden">
                        {/* Decorational background element could go here */}
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {acc.name}
                            </CardTitle>
                            <div className="flex items-center gap-1">
                                <EditAccountDialog account={acc} />
                                <div className="text-muted-foreground">
                                    {getIcon(acc.type)}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(acc.balance)}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {acc.type === 'CREDIT' || acc.type === 'LOAN'
                                    ? `Cupo: ${formatCurrency(acc.creditLimit || 0)}`
                                    : acc.description || acc.type}
                            </p>
                            <div className="mt-4">
                                <Badge variant={acc.type === 'CREDIT' ? 'outline' : 'secondary'}>
                                    {acc.type}
                                </Badge>
                            </div>

                            {/* Progress bar for credit usage could be added here */}
                            {(acc.type === 'CREDIT' || acc.type === 'LOAN') && acc.creditLimit && (
                                <div className="mt-3 h-1 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary"
                                        style={{ width: `${(Math.abs(acc.balance) / acc.creditLimit) * 100}%` }}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}

                {(!accounts || accounts.length === 0) && (
                    <div className="col-span-full text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
                        No tienes cuentas registradas. Crea una para comenzar.
                    </div>
                )}
            </div>
        </div>
    )
}
