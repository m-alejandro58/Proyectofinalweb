"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Copy, Check, Download, Sparkles, RefreshCw, ImageIcon, Loader2 } from "lucide-react"
import { generatePlatformCopy, type PlatformCopy } from "@/app/actions/copywriting"
import { generateImagePrompt } from "@/app/actions/generate-image-prompt"
import { toast } from "sonner"

// ── Platform tab config with colors ──────────────────────────
const PLATFORM_TABS = [
    { key: "mercadolibre", label: "Mercado Libre", emoji: "🟡", bgActive: "data-[state=active]:bg-yellow-500/15 data-[state=active]:text-yellow-700 dark:data-[state=active]:text-yellow-400" },
    { key: "facebook", label: "Facebook", emoji: "🔵", bgActive: "data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400" },
    { key: "luegopago", label: "LuegoPago", emoji: "🟣", bgActive: "data-[state=active]:bg-purple-500/15 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-400" },
    { key: "web", label: "Web", emoji: "🟢", bgActive: "data-[state=active]:bg-green-500/15 data-[state=active]:text-green-700 dark:data-[state=active]:text-green-400" },
    { key: "rappi", label: "Rappi", emoji: "🟠", bgActive: "data-[state=active]:bg-orange-500/15 data-[state=active]:text-orange-700 dark:data-[state=active]:text-orange-400" },
]

// ═══════════════════════════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════════════════════════

function CopyButton({ text, label }: { text: string; label: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await copyToClipboard(text)
            setCopied(true)
            toast.success(`${label} copiado al portapapeles`)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            toast.error("Error al copiar al portapapeles")
        }
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="absolute top-2 right-2 h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
            {copied ? (
                <>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    Copiado
                </>
            ) : (
                <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                </>
            )}
        </Button>
    )
}

function CopyBlock({ label, content }: { label: string; content: string }) {
    if (!content) return null
    return (
        <div className="relative group">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {label}
            </div>
            <div className="relative bg-muted/50 border rounded-lg p-3 pr-20 text-sm whitespace-pre-wrap leading-relaxed min-h-[60px]">
                {content}
                <CopyButton text={content} label={label} />
            </div>
        </div>
    )
}

function PlatformResult({ copy }: { copy: PlatformCopy }) {
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CopyBlock label="📌 Título" content={copy.title} />
            <CopyBlock label="📝 Descripción" content={copy.description} />
            {copy.tags && <CopyBlock label="🏷️ Tags / Palabras clave" content={copy.tags} />}
            {copy.extras && Object.entries(copy.extras).map(([key, value]) => (
                <CopyBlock
                    key={key}
                    label={key === "metaDescription" ? "📎 Meta Descripción" : key === "features" ? "📋 Características" : key}
                    content={value}
                />
            ))}
        </div>
    )
}

function LoadingSkeleton() {
    return (
        <div className="space-y-6 py-4">
            <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                <p className="text-sm text-muted-foreground animate-pulse">
                    El Asistente de IA está analizando y escribiendo los 5 copys. Esto puede tomar ~15 segundos...
                </p>
            </div>
            <div className="space-y-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-14 w-full rounded-lg" />
            </div>
        </div>
    )
}

function IdleState({ onGenerate, productName }: { onGenerate: () => void; productName: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="rounded-full bg-yellow-500/10 p-4">
                <Sparkles className="h-8 w-8 text-yellow-500" />
            </div>
            <div>
                <p className="font-medium mb-1">Asistente de Marketing IA</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                    Genera títulos y descripciones optimizados para <strong>{productName}</strong> en 5 plataformas con un solo clic.
                </p>
            </div>
            <Button onClick={onGenerate} size="lg" className="gap-2 mt-2">
                <Sparkles className="h-4 w-4" />
                Generar Textos Ahora
            </Button>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// Image Prompt Builder
// ═══════════════════════════════════════════════════════════════


function ImagePromptTab({ product }: { product: any }) {
    const [promptText, setPromptText] = useState<string>("")
    const [generating, setGenerating] = useState(false)

    const handleGenerate = async () => {
        if (!product?.id) return
        setGenerating(true)
        setPromptText("")
        try {
            const res = await generateImagePrompt(product.id)
            if (res.success && res.prompt) {
                setPromptText(res.prompt)
                toast.success("Prompt generado con contexto técnico real.")
            } else {
                toast.error(res.error || "Error al generar el prompt.")
            }
        } catch {
            toast.error("Error inesperado al contactar la IA.")
        } finally {
            setGenerating(false)
        }
    }

    const handleDownload = () => {
        if (!promptText) return
        const fileName = `prompt-imagen_${(product?.name || "producto").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40)}.txt`
        const blob = new Blob([promptText], { type: "text/plain;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success(`Prompt descargado como "${fileName}"`)
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header info */}
            <div className="flex items-center gap-2 px-1">
                <ImageIcon className="h-4 w-4 text-amber-500" />
                <p className="text-xs text-muted-foreground">
                    La IA analiza la descripción del producto para rellenar el prompt con datos técnicos reales. Luego pégalo en <strong>Gemini</strong> o <strong>ChatGPT</strong> junto con la foto.
                </p>
            </div>

            {/* Idle state */}
            {!generating && !promptText && (
                <div className="flex flex-col items-center justify-center gap-4 py-10 text-center border-2 border-dashed rounded-lg border-amber-500/30 bg-amber-500/5">
                    <div className="rounded-full bg-amber-500/10 p-4">
                        <ImageIcon className="h-8 w-8 text-amber-500" />
                    </div>
                    <div>
                        <p className="font-medium mb-1">Prompt de Imágenes IA</p>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            El modelo leerá las características de <strong>{product?.name}</strong> y rellenará automáticamente todos los datos técnicos.
                        </p>
                    </div>
                    <Button
                        onClick={handleGenerate}
                        className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                        size="lg"
                    >
                        <Sparkles className="h-4 w-4" />
                        ✨ Generar Prompt Estructurado con IA
                    </Button>
                </div>
            )}

            {/* Loading state */}
            {generating && (
                <div className="space-y-3 px-1">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                        <p className="text-sm text-muted-foreground animate-pulse">Analizando producto y generando prompt técnico...</p>
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-[200px] w-full rounded-lg" />
                </div>
            )}

            {/* Result state */}
            {!generating && promptText && (
                <>
                    <textarea
                        readOnly
                        value={promptText}
                        className="w-full h-[290px] rounded-lg border bg-muted/30 p-4 text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 selection:bg-amber-500/30"
                    />
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleGenerate}
                            className="gap-1.5 flex-shrink-0"
                            size="sm"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Regenerar
                        </Button>
                        <Button
                            onClick={handleDownload}
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white gap-2"
                        >
                            <Download className="h-4 w-4" />
                            📄 Descargar Prompt .txt
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// Main Dialog: Hub de Asistencia IA
// ═══════════════════════════════════════════════════════════════

export function CopywritingDialog({
    open,
    onOpenChange,
    productId,
    productName,
    product,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    productId: string
    productName: string
    product?: any
}) {
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<PlatformCopy[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("mercadolibre")
    const [topTab, setTopTab] = useState("copy")
    const isGenerating = useRef(false)

    const generate = useCallback(async () => {
        if (isGenerating.current) return
        isGenerating.current = true
        setLoading(true)
        setError(null)
        setResults(null)

        try {
            const result = await generatePlatformCopy(productId)
            if (result.success && result.data) {
                setResults(result.data)
                toast.success("¡Contenido generado exitosamente para 5 plataformas!")
            } else {
                setError(result.error || "Error desconocido")
                toast.error(result.error || "Error al generar contenido")
            }
        } catch {
            setError("Error inesperado al contactar la IA")
            toast.error("Error inesperado al generar contenido")
        } finally {
            setLoading(false)
            isGenerating.current = false
        }
    }, [productId])

    // Auto-generate ONCE when dialog opens
    useEffect(() => {
        if (open && productId && !results && !loading && !isGenerating.current) {
            generate()
        }
        if (!open) {
            setResults(null)
            setError(null)
            setLoading(false)
            isGenerating.current = false
            setTopTab("copy")
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, productId])

    // ── Download all as TXT ─────────────────────────────────
    const handleDownload = () => {
        if (!results) return

        const separator = "═".repeat(60)
        const content = results.map((copy) => {
            let block = `${separator}\n${copy.emoji} ${copy.platform}\n${separator}\n\n`
            block += `📌 TÍTULO:\n${copy.title}\n\n`
            block += `📝 DESCRIPCIÓN:\n${copy.description}\n\n`
            if (copy.tags) {
                block += `🏷️ TAGS:\n${copy.tags}\n\n`
            }
            if (copy.extras) {
                Object.entries(copy.extras).forEach(([key, value]) => {
                    const label = key === "metaDescription" ? "META DESCRIPCIÓN" : key === "features" ? "CARACTERÍSTICAS" : key.toUpperCase()
                    block += `📎 ${label}:\n${value}\n\n`
                })
            }
            return block
        }).join("\n")

        const header = `✨ CONTENIDO DE MARKETING - HARDSOFT TECHNOLOGY\n📦 Producto: ${productName}\n📅 Generado: ${new Date().toLocaleString("es-CO")}\n\n`
        const fullContent = header + content

        const blob = new Blob([fullContent], { type: "text/plain;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `copy_${productName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40)}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast.success("Archivo TXT descargado")
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-yellow-500" />
                        Hub de Asistencia IA
                    </DialogTitle>
                    <DialogDescription>
                        Generador multicanal para <strong>{productName}</strong>
                    </DialogDescription>
                </DialogHeader>

                {/* ── Top-level Hub Tabs ─────────────────────── */}
                <Tabs value={topTab} onValueChange={setTopTab} className="flex-1 flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-2 mb-3">
                        <TabsTrigger value="copy" className="gap-1.5 data-[state=active]:bg-yellow-500/15 data-[state=active]:text-yellow-700 dark:data-[state=active]:text-yellow-400">
                            <Sparkles className="h-3.5 w-3.5" />
                            ✍️ Copy Marketing
                        </TabsTrigger>
                        <TabsTrigger value="image-prompt" className="gap-1.5 data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-400">
                            <ImageIcon className="h-3.5 w-3.5" />
                            📸 Prompt Imágenes
                        </TabsTrigger>
                    </TabsList>

                    {/* ── TAB 1: Copy Marketing ────────────────── */}
                    <TabsContent value="copy" className="flex-1 overflow-y-auto min-h-0 mt-0 focus-visible:outline-none focus-visible:ring-0">
                        {/* Loading state */}
                        {loading && <LoadingSkeleton />}

                        {/* Error state */}
                        {!loading && error && (
                            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                                <p className="text-sm text-destructive">{error}</p>
                                <Button variant="outline" size="sm" onClick={generate}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Reintentar
                                </Button>
                            </div>
                        )}

                        {/* Idle state */}
                        {!loading && !error && !results && (
                            <IdleState onGenerate={generate} productName={productName} />
                        )}

                        {/* Results with platform Tabs */}
                        {!loading && results && results.length > 0 && (
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-5 mb-4">
                                    {PLATFORM_TABS.map((tab) => (
                                        <TabsTrigger
                                            key={tab.key}
                                            value={tab.key}
                                            className={`text-xs gap-1 ${tab.bgActive}`}
                                        >
                                            <span>{tab.emoji}</span>
                                            <span className="hidden sm:inline">{tab.label}</span>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                {results.map((copy, index) => {
                                    const tabKey = PLATFORM_TABS[index]?.key || `platform-${index}`
                                    return (
                                        <TabsContent key={tabKey} value={tabKey} className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                                            <div className="space-y-1 mb-4">
                                                <h3 className="text-sm font-semibold">
                                                    {copy.emoji} {copy.platform}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    Contenido optimizado para esta plataforma
                                                </p>
                                            </div>
                                            <PlatformResult copy={copy} />
                                        </TabsContent>
                                    )
                                })}
                            </Tabs>
                        )}
                    </TabsContent>

                    {/* ── TAB 2: Image Prompt Generator ────────── */}
                    <TabsContent value="image-prompt" className="flex-1 overflow-y-auto min-h-0 mt-0 focus-visible:outline-none focus-visible:ring-0">
                        <ImagePromptTab product={product} />
                    </TabsContent>
                </Tabs>

                <DialogFooter className="flex-shrink-0 gap-2 sm:gap-2 border-t pt-3">
                    {topTab === "copy" && results && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={generate}
                                disabled={loading}
                                className="gap-1.5"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                                Regenerar
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleDownload}
                                className="gap-1.5"
                            >
                                <Download className="h-4 w-4" />
                                Descargar .txt
                            </Button>
                        </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
