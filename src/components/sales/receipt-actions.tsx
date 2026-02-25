"use client"

export function ReceiptActions() {
    return (
        <div className="fixed bottom-8 right-8 print:hidden flex gap-4">
            <button
                onClick={() => window.close()}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md shadow-sm text-sm font-medium transition-colors"
            >
                Cerrar
            </button>
            <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-cyan-600 text-white hover:bg-cyan-700 rounded-md shadow-sm text-sm font-medium transition-colors flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Imprimir Documento
            </button>
        </div>
    )
}
