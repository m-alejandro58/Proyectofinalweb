"use client"

import { useState } from "react"
import { Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { PlatformPricingCalculator, type PublishStatus } from "./platform-pricing-calculator"

interface PricingCalculatorDialogProps {
    /** Costo de compra inicial para la calculadora */
    initialCostPrice?: number
    /** ID del producto (para persistir estado de publicación) */
    productId?: string
    /** Nombre del producto para mostrar en el título */
    productName?: string
    /** Estado actual de publicación del producto */
    publishStatus?: PublishStatus
    /** Margen guardado en DB */
    savedMarginPercent?: number | null
    /** Configuración de plataformas guardada en DB */
    savedPlatformPricing?: string | null
    /** Elemento que abre el dialog */
    trigger?: React.ReactNode
    /** Modo controlado: estado de apertura externo */
    open?: boolean
    /** Modo controlado: callback de cambio de apertura */
    onOpenChange?: (open: boolean) => void
}

export function PricingCalculatorDialog({
    initialCostPrice,
    productId,
    productName,
    publishStatus,
    savedMarginPercent,
    savedPlatformPricing,
    trigger,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
}: PricingCalculatorDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)

    // Si se pasan open/onOpenChange, usar modo controlado; si no, modo interno.
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const onOpenChange = isControlled
        ? controlledOnOpenChange!
        : setInternalOpen

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Solo renderizar trigger si NO es modo controlado */}
            {!isControlled && (
                <DialogTrigger asChild>
                    {trigger ?? (
                        <Button variant="outline" size="icon" className="h-8 w-8" title="Calculadora de Precios">
                            <Calculator className="h-4 w-4" />
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        {productName ? (
                            <span>
                                Calculadora:{" "}
                                <span className="text-primary">{productName}</span>
                            </span>
                        ) : (
                            "Calculadora de Precios por Plataforma"
                        )}
                    </DialogTitle>
                </DialogHeader>
                <PlatformPricingCalculator
                    costPrice={initialCostPrice}
                    productId={productId}
                    publishStatus={publishStatus}
                    savedMarginPercent={savedMarginPercent}
                    savedPlatformPricing={savedPlatformPricing}
                />
            </DialogContent>
        </Dialog>
    )
}
