import { getPurchases } from "@/app/actions/purchases"
import { getContacts } from "@/app/actions/contacts"
import { getFinancialAccounts } from "@/app/actions/accounts"
import { getProducts } from "@/app/actions/inventory"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
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
import { PurchasesSearch } from "@/components/purchases/purchases-search"
import { EditPurchaseDialog } from "@/components/purchases/edit-purchase-dialog"

export default async function PurchasesPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string }>
}) {
    const { query: queryRaw } = await searchParams
    const query = queryRaw || ""
    
    // Fetch all required data for the page and edit modals
    const [
        purchasesRes,
        contactsRes,
        accountsRes,
        productsRes
    ] = await Promise.all([
        getPurchases(query),
        getContacts("PROVIDER"),
        getFinancialAccounts(),
        getProducts()
    ])

    const purchases = purchasesRes.data
    const providers = contactsRes.data || []
    const accounts = accountsRes.data || []
    const products = productsRes.data || []

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Compras</h1>
                    <p className="text-muted-foreground">Historial de adquisiciones y gastos de inventario.</p>
                </div>
                <div className="flex w-full md:w-auto items-center gap-2">
                    <PurchasesSearch />
                    <Link href="/purchases/new">
                        <Button className="gap-2 shrink-0">
                            <Plus className="h-4 w-4" /> Registrar Compra
                        </Button>
                    </Link>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Proveedor</TableHead>
                                <TableHead>Cuenta Pago</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-center">Items</TableHead>
                                <TableHead className="text-right">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchases?.map((p: any) => (
                                <TableRow key={p.id}>
                                    <TableCell className="text-sm">
                                        {p.date.toLocaleDateString()}
                                        <br />
                                        <span className="text-xs text-muted-foreground">{p.receiptNumber}</span>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {p.provider.name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{p.paymentAccount?.name}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold">
                                        ${p.totalAmount.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground text-xs text-center">
                                        {p.batches.reduce((sum: number, b: any) => sum + b.quantity, 0)} u
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <EditPurchaseDialog 
                                            purchase={p} 
                                            providers={providers} 
                                            accounts={accounts} 
                                            products={products} 
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!purchases || purchases.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        {query ? `No se encontraron compras que coincidan con '${query}'.` : "No hay compras registradas."}
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
