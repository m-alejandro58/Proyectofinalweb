"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { receiveBatch } from "@/app/actions/receive-stock"
import { CheckCircle2 } from "lucide-react"

export function ReceiveStockButton({ batchId }: { batchId: string }) {
    const [loading, setLoading] = useState(false)

    const handleReceive = async () => {
        if (!confirm("¿Confirmar que esta mercancía ha llegado a bodega?")) return
        setLoading(true)
        const res = await receiveBatch(batchId)
        setLoading(false)
        if (!res.success) alert(res.error)
    }

    return (
        <Button size="sm" variant="outline" className="h-6 text-xs gap-1 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white" onClick={handleReceive} disabled={loading}>
            <CheckCircle2 className="h-3 w-3" />
            {loading ? "..." : "Recibir en Bodega"}
        </Button>
    )
}
