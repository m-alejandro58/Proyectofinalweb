import { getContacts } from "@/app/actions/contacts"
import { getFinancialAccounts } from "@/app/actions/accounts"
import { getProductsForSale } from "@/app/actions/inventory"
import { CreateSaleForm } from "@/components/sales/create-sale-form"

export default async function NewSalePage() {
    const [contactsRes, accountsRes, productsRes] = await Promise.all([
        getContacts("CLIENT"),
        getFinancialAccounts(),
        getProductsForSale()
    ])

    return (
        <div className="max-w-4xl mx-auto py-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Nueva Venta</h1>
                <p className="text-muted-foreground">Facturación y cálculo de rentabilidad.</p>
            </div>

            <CreateSaleForm
                clients={contactsRes.data || []}
                accounts={accountsRes.data || []}
                products={productsRes.data || []}
            />
        </div>
    )
}
