import { getContacts } from "@/app/actions/contacts"
import { getFinancialAccounts } from "@/app/actions/accounts"
import { getProducts } from "@/app/actions/inventory"
import { CreatePurchaseForm } from "@/components/purchases/create-purchase-form"

export default async function NewPurchasePage({
    searchParams,
}: {
    searchParams: Promise<{ productId?: string }>
}) {
    const params = await searchParams
    const [contactsRes, accountsRes, productsRes] = await Promise.all([
        getContacts("PROVIDER"),
        getFinancialAccounts(),
        getProducts()
    ])

    return (
        <div className="max-w-4xl mx-auto py-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Nueva Compra</h1>
                <p className="text-muted-foreground">Registra ingreso de mercancía y egreso de dinero (o deuda).</p>
            </div>

            <CreatePurchaseForm
                providers={contactsRes.data || []}
                accounts={accountsRes.data || []}
                products={productsRes.data || []}
                initialProductId={params.productId}
            />
        </div>
    )
}

