import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"

// CSV Export for: contacts, products, sales, returns, purchases
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const table = searchParams.get("table")

    if (!table) {
        return NextResponse.json({ error: "Tabla no especificada" }, { status: 400 })
    }

    const sessionId = (await cookies()).get("auth_session")?.value
    if (!sessionId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: sessionId } })
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Acceso denegado. Solo administradores pueden exportar datos." }, { status: 403 })
    }

    try {
        let csvContent = ""
        let filename = ""

        switch (table) {
            case "clients": {
                const data = await prisma.contact.findMany({ where: { type: "CLIENT" }, orderBy: { createdAt: "desc" } })
                csvContent = "Nombre,Documento,Email,Telefono,Direccion,Ciudad,Departamento,Notas,Creado\n"
                data.forEach(r => {
                    csvContent += `"${r.name}","${r.govId || ''}","${r.email || ''}","${r.phone || ''}","${r.address || ''}","${r.city || ''}","${r.department || ''}","${(r.notes || '').replace(/"/g, '""')}","${r.createdAt.toISOString()}"\n`
                })
                filename = "clientes.csv"
                break
            }
            case "providers": {
                const data = await prisma.contact.findMany({ where: { type: "PROVIDER" }, orderBy: { createdAt: "desc" } })
                csvContent = "Nombre,Documento,Email,Telefono,Direccion,Ciudad,Departamento,Notas,Creado\n"
                data.forEach(r => {
                    csvContent += `"${r.name}","${r.govId || ''}","${r.email || ''}","${r.phone || ''}","${r.address || ''}","${r.city || ''}","${r.department || ''}","${(r.notes || '').replace(/"/g, '""')}","${r.createdAt.toISOString()}"\n`
                })
                filename = "proveedores.csv"
                break
            }
            case "inventory": {
                const data = await prisma.product.findMany({
                    include: { batches: { where: { quantity: { gt: 0 } } } },
                    orderBy: { name: "asc" }
                })
                csvContent = "Nombre,SKU,Categoria,Subcategoria,Marca,Stock Total,Stock FULL,Stock Disponible,Costo Promedio\n"
                data.forEach(r => {
                    const avgCost = r.batches.length > 0
                        ? r.batches.reduce((s, b) => s + b.unitCost * b.quantity, 0) / r.batches.reduce((s, b) => s + b.quantity, 0)
                        : 0
                    csvContent += `"${r.name}","${r.sku || ''}","${r.category || ''}","${r.subcategory || ''}","${r.brand || ''}",${r.stockTotal},${r.stockFull},${r.stockTotal - r.stockFull},${avgCost.toFixed(2)}\n`
                })
                filename = "inventario.csv"
                break
            }
            case "sales": {
                const data = await prisma.sale.findMany({
                    include: { client: true, items: true, depositAccount: true },
                    orderBy: { date: "desc" }
                })
                csvContent = "Fecha,Factura,Cliente,Canal,Medio Pago,Bruto,Comision,Envio,Impuestos,Neto,Cuenta Deposito,Productos\n"
                data.forEach(r => {
                    const itemsList = r.items.map(i => `${i.productName} x${i.quantity}`).join("; ")
                    csvContent += `"${r.date.toISOString()}","${r.invoiceNumber || ''}","${r.client?.name || 'Casual'}","${r.channel || ''}","${r.paymentMethod || ''}",${r.grossAmount},${r.platformFee || 0},${r.shippingCost || 0},${r.taxes || 0},${r.netAmount || 0},"${r.depositAccount?.name || ''}","${itemsList}"\n`
                })
                filename = "ventas.csv"
                break
            }
            case "returns": {
                const data = await prisma.return.findMany({
                    include: { sale: { include: { client: true } }, items: true },
                    orderBy: { createdAt: "desc" }
                })
                csvContent = "Fecha,Venta Original,Cliente,Razon,Estado,Monto Reembolso,Productos\n"
                data.forEach(r => {
                    const itemsList = r.items.map((i: any) => `${i.productName} x${i.quantity}`).join("; ")
                    csvContent += `"${r.createdAt.toISOString()}","${r.sale?.invoiceNumber || r.saleId}","${r.sale?.client?.name || ''}","${r.reason}","${r.status}",${r.refundAmount || 0},"${itemsList}"\n`
                })
                filename = "devoluciones.csv"
                break
            }
            case "transactions": {
                // Full financial transactions report
                const sales = await prisma.sale.findMany({
                    include: { client: true, items: true },
                    orderBy: { date: "desc" }
                })
                csvContent = "Fecha,Factura,Cliente,Canal,Medio Pago,Venta Total,Costo (COGS),Comision,Envio,Impuestos,Utilidad Neta,% Margen\n"
                sales.forEach(s => {
                    const cogs = s.items.reduce((sum, i) => sum + ((i.unitCost || 0) * i.quantity), 0)
                    const comm = s.platformFee || 0
                    const ship = s.shippingCost || 0
                    const tax = s.taxes || 0
                    const gmf = s.grossAmount * 0.004
                    const opProfit = s.grossAmount - cogs - comm - ship
                    const ica = opProfit > 0 ? opProfit * 0.01 : 0
                    const totalTax = tax + gmf + ica
                    const net = s.grossAmount - cogs - comm - ship - totalTax
                    const margin = s.grossAmount > 0 ? (net / s.grossAmount) * 100 : 0
                    csvContent += `"${s.date.toISOString()}","${s.invoiceNumber || ''}","${s.client?.name || 'Casual'}","${s.channel || ''}","${s.paymentMethod || ''}",${s.grossAmount},${cogs},${comm},${ship},${totalTax.toFixed(0)},${net.toFixed(0)},${margin.toFixed(1)}%\n`
                })
                filename = "reporte_financiero.csv"
                break
            }
            default:
                return NextResponse.json({ error: "Tabla no válida" }, { status: 400 })
        }

        // Add BOM for Excel UTF-8 compatibility
        const bom = "\ufeff"
        const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" })
        const buffer = Buffer.from(await blob.arrayBuffer())

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        })
    } catch (error) {
        console.error("Export error:", error)
        return NextResponse.json({ error: "Error al exportar datos" }, { status: 500 })
    }
}
