"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Sparkles, Image as ImageIcon, Download, AlertTriangle, Loader2 } from "lucide-react"
import { generateStudioImages, type GeneratedImage } from "@/app/actions/generate-images"
import { toast } from "sonner"

export function ImageStudioDialog({
    product,
    open,
    onOpenChange,
}: {
    product: any
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const [loading, setLoading] = useState(false)
    const [images, setImages] = useState<GeneratedImage[]>([])

    // Validate if the product has a seed image
    const hasSeedImage = Boolean(product?.imageUrl)

    const handleGenerate = async () => {
        if (!hasSeedImage) return

        setLoading(true)
        setImages([])
        
        try {
            const res = await generateStudioImages(product.id, product.imageUrl)
            if (res.success && res.images) {
                setImages(res.images)
                toast.success("¡Galería generada con éxito!")
            } else {
                toast.error(res.error || "Error al generar imágenes")
            }
        } catch (error) {
            toast.error("Error inesperado en el estudio fotográfico")
        } finally {
            setLoading(false)
        }
    }

    const handleDownload = (img: GeneratedImage, index: number) => {
        // Create an anchor element and trigger download of Base64
        const a = document.createElement("a")
        a.href = img.url
        a.download = `${product.sku || "producto"}-estudio-ia-${index + 1}.jpg`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    // Reset state on close
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen && !loading) {
            setImages([])
        }
        if (!loading) {
            onOpenChange(isOpen)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-purple-500" />
                        Estudio Fotográfico IA
                    </DialogTitle>
                    <DialogDescription>
                        Generación de galería comercial optimizada para Mercado Libre.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 min-h-0 space-y-4">
                    {!hasSeedImage ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center gap-3">
                            <AlertTriangle className="h-8 w-8 text-amber-500" />
                            <p className="text-amber-700 dark:text-amber-400 font-medium">
                                ⚠️ Sube primero la URL de la imagen principal en "Editar Producto" para usarla como semilla.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center space-y-6">
                            {/* Current Seed Image Preview */}
                            {images.length === 0 && !loading && (
                                <div className="flex flex-col items-center gap-3">
                                    <p className="text-sm text-muted-foreground">Imagen Semilla Actual:</p>
                                    <div className="w-32 h-32 rounded-lg border overflow-hidden bg-muted">
                                        <img 
                                            src={product.imageUrl} 
                                            alt={product.name}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Loading State */}
                            {loading && (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
                                    <p className="text-lg font-medium animate-pulse text-purple-600 dark:text-purple-400">
                                        Creando magia visual...
                                    </p>
                                    <p className="text-sm text-muted-foreground w-3/4 text-center">
                                        El modelo Imagen 4 está procesando la semilla y generando 5 estilos en alta calidad (1080x1080). Esto puede tomar unos segundos.
                                    </p>
                                </div>
                            )}

                            {/* Results Grid */}
                            {!loading && images.length > 0 && (
                                <div className="w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {images.map((img, i) => (
                                            <div key={i} className="group flex flex-col gap-2 p-2 border rounded-xl bg-muted/20">
                                                <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted">
                                                    <img 
                                                        src={img.url} 
                                                        alt={`Variación ${i+1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                        <Button 
                                                            variant="secondary" 
                                                            size="sm" 
                                                            className="gap-2"
                                                            onClick={() => handleDownload(img, i)}
                                                        >
                                                            <Download className="h-4 w-4" />
                                                            Descargar
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="p-1">
                                                    <span className="text-xs font-semibold uppercase text-purple-600 dark:text-purple-400">Variación {i+1}</span>
                                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1" title={img.style}>
                                                        {img.style}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
                        Cerrar
                    </Button>
                    <Button 
                        onClick={handleGenerate} 
                        disabled={!hasSeedImage || loading}
                        className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="h-4 w-4" />
                        )}
                        ✨ Generar Galería IA (5 Fotos - 1080x1080)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
