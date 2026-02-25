import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Image from "next/image"
import { ReceiptActions } from "@/components/sales/receipt-actions"

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const sale = await prisma.sale.findUnique({
        where: { id },
        include: {
            client: true,
            items: true,
            depositAccount: true
        }
    })

    if (!sale) {
        notFound()
    }

    // Attempt to parse out some name/address string parts for the client if available
    const clientName = sale.client?.name || "Cliente Final"
    const clientGovId = sale.client?.govId || "No registrado"
    const clientPhone = sale.client?.phone || "No registrado"
    const clientAddress = sale.client?.address || "Dirección no registrada"

    // Auto-trigger print on load
    const printScript = `window.print();`

    return (
        <div className="bg-white min-h-screen text-black flex justify-center py-10 print:py-0 print:bg-white">
            {/* Auto-print script */}
            <script dangerouslySetInnerHTML={{ __html: printScript }} />

            <div className="w-[800px] bg-white p-8 shadow-lg print:shadow-none print:w-full print:p-0">
                {/* HEADER */}
                <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6 mb-6">
                    <div className="flex flex-col gap-1">
                        <div className="w-48 mb-2">
                            <img
                                src="/logo-color.png"
                                alt="Hardsoft Technology"
                                className="w-full h-auto object-contain object-left"
                            />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-2">HARDSOFT TECHNOLOGY</h1>
                        <p className="text-sm text-slate-600">CARRERA 9 BIS # 2-02 PEREIRA/RISARALDA</p>
                        <p className="text-sm text-slate-600">Tel: 3246472439</p>
                        <p className="text-sm text-slate-600">Email: ventas@hardsofttechnology.com</p>
                        <p className="text-xs text-slate-500 mt-1 font-medium">No Responsable de IVA</p>
                    </div>

                    <div className="text-right flex flex-col items-end">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Remisión de Venta</h2>
                        <div className="mt-4 bg-slate-50 p-3 rounded-md border border-slate-200 min-w-[200px] text-left">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                <span className="font-semibold text-slate-600">No. Remisión:</span>
                                <span className="font-bold text-slate-900 text-right">{sale.invoiceNumber}</span>

                                <span className="font-semibold text-slate-600">Fecha:</span>
                                <span className="text-right">{new Date(sale.date).toLocaleDateString('es-CO')}</span>

                                <span className="font-semibold text-slate-600">Método Pago:</span>
                                <span className="text-right">{sale.paymentMethod || sale.depositAccount?.name || 'No especificado'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CLIENT INFO */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Facturar a</h3>
                        <p className="font-bold text-slate-800">{clientName}</p>
                        <p className="text-sm text-slate-600 mt-1">CC/NIT: {clientGovId}</p>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Información de Contacto</h3>
                        <p className="text-sm text-slate-600">{clientAddress}</p>
                        <p className="text-sm text-slate-600 mt-1">Tel: {clientPhone}</p>
                    </div>
                </div>

                {/* ITEMS TABLE */}
                <div className="mb-8">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800 text-white text-sm">
                                <th className="py-3 px-4 rounded-tl-md font-medium">Concepto</th>
                                <th className="py-3 px-4 font-medium">Garantía</th>
                                <th className="py-3 px-4 text-center font-medium w-24">Cant.</th>
                                <th className="py-3 px-4 text-right font-medium w-32">Precio Unit.</th>
                                <th className="py-3 px-4 rounded-tr-md text-right font-medium w-32">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {sale.items.map((item, idx) => (
                                <tr key={item.id} className={idx % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                                    <td className="py-3 px-4 border-b border-slate-100">
                                        <p className="font-medium text-slate-800">{item.productName}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">S/N: {item.serialNumber || 'N/A'}</p>
                                    </td>
                                    <td className="py-3 px-4 border-b border-slate-100 text-slate-600">
                                        {item.warrantyEnd ?
                                            Math.round((new Date(item.warrantyEnd).getTime() - new Date(sale.date).getTime()) / (1000 * 60 * 60 * 24 * 30)) + " meses"
                                            : "N/A"
                                        }
                                    </td>
                                    <td className="py-3 px-4 border-b border-slate-100 text-center font-medium">
                                        {item.quantity}
                                    </td>
                                    <td className="py-3 px-4 border-b border-slate-100 text-right tabular-nums">
                                        ${item.unitPrice.toLocaleString('es-CO')}
                                    </td>
                                    <td className="py-3 px-4 border-b border-slate-100 text-right tabular-nums font-medium">
                                        ${(item.quantity * item.unitPrice).toLocaleString('es-CO')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* TOTALS */}
                <div className="flex justify-end mb-12">
                    <div className="w-64">
                        <div className="flex justify-between py-3 text-lg font-bold text-slate-900 border-b-2 border-t-2 border-slate-800">
                            <span>Total Venta:</span>
                            <span className="tabular-nums">${sale.grossAmount.toLocaleString('es-CO')}</span>
                        </div>
                    </div>
                </div>

                {/* FOOTER & TERMS */}
                <div className="border-t border-slate-200 pt-6 mt-12 grid grid-cols-2 gap-8 text-sm">
                    <div>
                        <h4 className="font-bold text-slate-800 mb-2">Términos de Garantía</h4>
                        <ul className="text-slate-600 text-xs space-y-1 list-disc pl-4">
                            <li>La garantía cubre únicamente defectos de fábrica durante el periodo especificado por producto.</li>
                            <li>No cubre daños por mal uso, golpes, humedad, altibajos de voltaje o mala manipulación del usuario.</li>
                            <li>Para tramitar garantías es indispensable presentar este documento y el producto en buen estado con sus empaques y accesorios originales.</li>
                            <li>Los tiempos de respuesta de garantía están sujetos a las políticas de cada fabricante.</li>
                        </ul>
                    </div>
                    <div className="flex flex-col justify-end items-center pb-4">
                        <div className="w-48 border-b border-slate-400 mb-2"></div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Firma de Recibido / Aceptación</p>
                    </div>
                </div>

                <div className="text-center mt-8 text-xs text-slate-400">
                    <p>Gracias por su compra en HARDSOFT TECHNOLOGY</p>
                </div>
            </div>

            {/* Action buttons (hidden in print) - extracted to Client Component */}
            <ReceiptActions />
        </div>
    )
}
