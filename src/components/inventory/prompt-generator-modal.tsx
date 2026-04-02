"use client"

import { useState, useMemo } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ClipboardCopy, FileText, Sparkles } from "lucide-react"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { toast } from "sonner"

function buildPrompt(product: any): string {
    // Attempt to extract a sale price from platformPricing JSON
    let price = "N/A"
    if (product.platformPricing) {
        try {
            const pp = JSON.parse(product.platformPricing)
            // Try ML first, then any platform with a finalPrice
            const mlPrice = pp?.mercadolibre?.finalPrice ?? pp?.mercadolibre?.salePrice
            if (mlPrice) {
                price = `$${Math.round(mlPrice).toLocaleString("es-CO")} COP`
            } else {
                // Check any platform
                for (const key of Object.keys(pp)) {
                    const fp = pp[key]?.finalPrice ?? pp[key]?.salePrice
                    if (fp) {
                        price = `$${Math.round(fp).toLocaleString("es-CO")} COP`
                        break
                    }
                }
            }
        } catch {
            // ignore parse errors
        }
    }

    return `Actúas como un especialista en comunicación visual de productos para ventas en marketplaces, especialmente Mercado Libre. Te adjunto una imagen clara y REAL de mi producto.

Aquí tienes la información del artículo:
1. Nombre del producto: ${product.name || "N/A"}
2. Categoría o uso principal: ${product.category || "N/A"}
3. Precio de Venta: ${price}
4. Público objetivo: Profesionales, gamers y entusiastas de la tecnología.
5. Estilo de marca deseado: Tecnológico, moderno, minimalista y profesional.
6. Tamaño en píxeles deseado: 1080x1080

Tu tarea es generar 5 imágenes distintas de ambientación comercial a partir de la ÚNICA imagen base que te proporciono. REGLA ESTRICTA: MANTÉN LA FORMA Y PÍXELES DEL PRODUCTO 100% INTACTOS. No alucines un producto distinto.

Generá las siguientes 5 imágenes en 1080x1080:
1. Ambientación real con humanos: El producto en su uso natural, en contexto real (ej. setup gamer o de oficina).
2. Imagen de poder o protagonismo: Fondo limpio, iluminación publicitaria de estudio, el producto como única estrella.
3. Imagen con detalles destacados: El producto con gráficos o destellos estéticos señalando sus componentes premium.
4. Imagen en contexto exigente: El producto destacando su máximo rendimiento tecnológico.
5. Imagen compuesta de 3 vistas: Una composición tipo banner comercial que incluya la vista frontal y detalle en uso.`
}

export function PromptGeneratorModal({
    product,
    open,
    onOpenChange,
}: {
    product: any
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const [copied, setCopied] = useState(false)

    const promptText = useMemo(() => {
        if (!product) return ""
        return buildPrompt(product)
    }, [product])

    const handleCopy = async () => {
        try {
            await copyToClipboard(promptText)
            setCopied(true)
            toast.success("Prompt copiado. Pégalo en Gemini junto con tu foto real.")
            setTimeout(() => setCopied(false), 2500)
        } catch {
            toast.error("No se pudo copiar al portapapeles.")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        Generador de Prompt IA
                    </DialogTitle>
                    <DialogDescription>
                        Copia este prompt y pégalo en Gemini, ChatGPT o tu herramienta favorita junto con la foto real del producto.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0 py-4 space-y-4">
                    {/* Product Info Banner */}
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 border">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{product?.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {product?.category || "Sin categoría"} · SKU: {product?.sku || "N/A"}
                            </p>
                        </div>
                    </div>

                    {/* Prompt Textarea */}
                    <textarea
                        readOnly
                        value={promptText}
                        className="w-full h-[340px] rounded-lg border bg-muted/30 p-4 text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 selection:bg-amber-500/30"
                    />
                </div>

                <DialogFooter className="border-t pt-4 flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cerrar
                    </Button>
                    <Button
                        onClick={handleCopy}
                        className="bg-amber-600 hover:bg-amber-700 text-white gap-2 min-w-[200px]"
                    >
                        <ClipboardCopy className="h-4 w-4" />
                        {copied ? "✅ ¡Copiado!" : "📋 Copiar Prompt"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
