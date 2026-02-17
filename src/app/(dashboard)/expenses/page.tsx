import { getExpenses } from "@/app/actions/expenses"
import { getFinancialAccounts } from "@/app/actions/accounts"
import { CreateExpenseDialog } from "@/components/expenses/create-expense-dialog"
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

export default async function ExpensesPage() {
    const [expensesRes, accountsRes] = await Promise.all([
        getExpenses(),
        getFinancialAccounts()
    ])

    const expenses = expensesRes.data
    const accounts = accountsRes.data || []

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gastos Operativos</h1>
                    <p className="text-muted-foreground">Control de egresos administrativos.</p>
                </div>
                <CreateExpenseDialog accounts={accounts} />
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Cuenta Origen</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses?.map((e: any) => (
                                <TableRow key={e.id}>
                                    <TableCell className="text-sm">
                                        {e.date.toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {e.description}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{e.category}</Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {e.financialAccount?.name}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-destructive">
                                        -${e.amount.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!expenses || expenses.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No hay gastos registrados.
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
