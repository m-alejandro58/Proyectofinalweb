"use client"

import { useState, useMemo, useEffect, useTransition } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PublicationFilter, PLATFORM_OPTIONS, type PlatformField } from "./publication-filter"
import {
    Package, Search, MoreHorizontal, Pencil, Trash2, AlertTriangle,
    Calculator, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    CheckCircle2, XCircle, Layers,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { EditProductDialog } from "./edit-product-dialog"
import { deleteProduct, bulkUpdatePublishStatus } from "@/app/actions/inventory"
import { PricingCalculatorDialog } from "./pricing-calculator-dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const ITEMS_PER_PAGE = 25

// ── Platform badge config ───────────────────────────────
const PLATFORM_BADGES = [
    {
        id: "mercadolibre",
        label: "ML",
        field: "isPublishedML",
        activeClass: "bg-yellow-400 text-yellow-950 hover:bg-yellow-500",
    },
    {
        id: "luegopago",
        label: "LP",
        field: "isPublishedLP",
        activeClass: "bg-purple-400 text-white hover:bg-purple-500",
    },
    {
        id: "rappi",
        label: "RA",
        field: "isPublishedRappi",
        activeClass: "bg-orange-500 text-white hover:bg-orange-600",
    },
    {
        id: "web",
        label: "WB",
        field: "isPublishedWeb",
        activeClass: "bg-sky-400 text-sky-950 hover:bg-sky-500",
    },
    {
        id: "facebook",
        label: "FB",
        field: "isPublishedFB",
        activeClass: "bg-blue-600 text-white hover:bg-blue-700",
    },
] as const

// ── Stock filter options ────────────────────────────────
const STOCK_FILTERS = [
    { value: "ALL", label: "Todo Stock" },
    { value: "OUT", label: "🔴 Agotado (0)" },
    { value: "LOW", label: "🟡 Bajo Stock (1–5)" },
    { value: "GOOD", label: "🟢 Buen Stock (> 5)" },
]

function matchStockFilter(stockTotal: number, filter: string): boolean {
    switch (filter) {
        case "ALL": return true
        case "OUT": return stockTotal === 0
        case "LOW": return stockTotal >= 1 && stockTotal <= 5
        case "GOOD": return stockTotal > 5
        default: return true
    }
}

export function ProductTable({ products }: { products: any[] }) {
    const [search, setSearch] = useState("")
    const [brandFilter, setBrandFilter] = useState("ALL")
    const [stockFilter, setStockFilter] = useState("ALL")
    const [publishedIn, setPublishedIn] = useState<Set<PlatformField>>(new Set())
    const [missingIn, setMissingIn] = useState<Set<PlatformField>>(new Set())
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [editingProduct, setEditingProduct] = useState<any>(null)
    const [deletingProduct, setDeletingProduct] = useState<any>(null)
    const [pricingProduct, setPricingProduct] = useState<any>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [isPending, startTransition] = useTransition()

    // Extract unique brands for filter
    const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)))

    const filteredProducts = useMemo(() => {
        return products.filter(prod => {
            const matchesSearch = (
                prod.name.toLowerCase().includes(search.toLowerCase()) ||
                prod.sku?.toLowerCase().includes(search.toLowerCase()) ||
                prod.brand?.toLowerCase().includes(search.toLowerCase()) ||
                prod.description?.toLowerCase().includes(search.toLowerCase())
            )
            const matchesBrand = brandFilter === "ALL" || prod.brand === brandFilter
            const matchesStock = matchStockFilter(prod.stockTotal, stockFilter)

            // Cross-filter: all selected in A must be true, all selected in B must be false
            let matchesPubIn = true
            for (const field of publishedIn) {
                if (prod[field] !== true) { matchesPubIn = false; break }
            }
            let matchesMissing = true
            for (const field of missingIn) {
                if (prod[field] !== false) { matchesMissing = false; break }
            }

            return matchesSearch && matchesBrand && matchesStock && matchesPubIn && matchesMissing
        })
    }, [products, search, brandFilter, stockFilter, publishedIn, missingIn])

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [search, brandFilter, stockFilter, publishedIn, missingIn])

    // Clear selection when data changes (e.g. after bulk update revalidation)
    useEffect(() => {
        setSelectedIds(new Set())
    }, [products])

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredProducts.length)
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

    // ── Selection helpers ────────────────────────────────
    const pageIds = paginatedProducts.map((p: any) => p.id)
    const allPageSelected = pageIds.length > 0 && pageIds.every((id: string) => selectedIds.has(id))
    const somePageSelected = pageIds.some((id: string) => selectedIds.has(id))

    const toggleSelectAll = () => {
        const next = new Set(selectedIds)
        if (allPageSelected) {
            pageIds.forEach((id: string) => next.delete(id))
        } else {
            pageIds.forEach((id: string) => next.add(id))
        }
        setSelectedIds(next)
    }

    const toggleSelectRow = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) {
            next.delete(id)
        } else {
            next.add(id)
        }
        setSelectedIds(next)
    }

    const handleDelete = async () => {
        if (!deletingProduct) return
        const res = await deleteProduct(deletingProduct.id)
        if (!res.success) {
            alert(res.error)
        }
        setDeletingProduct(null)
    }

    const handleBulkPublish = (platformId: string, isPublished: boolean) => {
        const ids = Array.from(selectedIds)
        startTransition(async () => {
            const res = await bulkUpdatePublishStatus(ids, platformId, isPublished)
            if (!res.success) {
                alert(res.error)
            }
            setSelectedIds(new Set())
        })
    }

    return (
        <div className="space-y-4">
            {/* ── Filter toolbar ─────────────────────────── */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, SKU, marca..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={brandFilter} onValueChange={setBrandFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Marca" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todas las Marcas</SelectItem>
                            {brands.map((b: any) => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={stockFilter} onValueChange={setStockFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Stock" />
                        </SelectTrigger>
                        <SelectContent>
                            {STOCK_FILTERS.map((sf) => (
                                <SelectItem key={sf.value} value={sf.value}>{sf.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <PublicationFilter
                        title="Publicado en"
                        selected={publishedIn}
                        onChange={setPublishedIn}
                    />
                    <PublicationFilter
                        title="Falta en"
                        selected={missingIn}
                        onChange={setMissingIn}
                    />

                    {/* ── Bulk actions bar ─────────────────── */}
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 ml-auto px-3 py-1.5 rounded-md bg-muted/50 border border-dashed animate-in fade-in slide-in-from-right-2 duration-200">
                            <span className="text-sm font-medium">
                                {selectedIds.size} fila(s)
                            </span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={isPending} className="gap-1.5">
                                        <Layers className="h-3.5 w-3.5" />
                                        {isPending ? "Aplicando…" : "Acciones en masa"}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>Publicación en masa</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {PLATFORM_OPTIONS.map((p) => (
                                        <DropdownMenuSub key={p.value}>
                                            <DropdownMenuSubTrigger>
                                                <span className={`inline-block h-2.5 w-2.5 rounded-full mr-2 ${p.dotClass}`} />
                                                {p.label}
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        // Map field name to platform ID
                                                        const platformIdMap: Record<string, string> = {
                                                            isPublishedML: "mercadolibre",
                                                            isPublishedLP: "luegopago",
                                                            isPublishedRappi: "rappi",
                                                            isPublishedWeb: "web",
                                                            isPublishedFB: "facebook",
                                                        }
                                                        handleBulkPublish(platformIdMap[p.value], true)
                                                    }}
                                                >
                                                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                                                    Marcar como Publicado
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        const platformIdMap: Record<string, string> = {
                                                            isPublishedML: "mercadolibre",
                                                            isPublishedLP: "luegopago",
                                                            isPublishedRappi: "rappi",
                                                            isPublishedWeb: "web",
                                                            isPublishedFB: "facebook",
                                                        }
                                                        handleBulkPublish(platformIdMap[p.value], false)
                                                    }}
                                                >
                                                    <XCircle className="mr-2 h-4 w-4 text-red-400" />
                                                    Marcar como Faltante
                                                </DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedIds(new Set())}
                                className="text-xs text-muted-foreground"
                            >
                                Limpiar
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Table ──────────────────────────────────── */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]">
                                <Checkbox
                                    checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                                    onCheckedChange={toggleSelectAll}
                                    aria-label="Seleccionar todo"
                                />
                            </TableHead>
                            <TableHead>SKU / ID</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Marca</TableHead>
                            <TableHead className="text-center">Stock Total</TableHead>
                            <TableHead className="text-center">Publicaciones</TableHead>
                            <TableHead className="text-right">Lotes</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedProducts.map((prod: any) => {
                            const isSelected = selectedIds.has(prod.id)
                            return (
                                <TableRow key={prod.id} data-state={isSelected ? "selected" : undefined}>
                                    <TableCell>
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleSelectRow(prod.id)}
                                            aria-label={`Seleccionar ${prod.name}`}
                                        />
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {prod.sku || "N/A"}
                                    </TableCell>
                                    <TableCell className="font-medium max-w-[150px] truncate" title={prod.name}>
                                        <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-muted-foreground" />
                                            {prod.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {prod.brand ? <Badge variant="secondary" className="text-xs">{prod.brand}</Badge> : "-"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={prod.stockTotal > prod.minStock ? "outline" : "destructive"}>
                                            {prod.stockTotal}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-1">
                                            {PLATFORM_BADGES.map((pb) => {
                                                const isActive = prod[pb.field] === true
                                                return (
                                                    <span
                                                        key={pb.id}
                                                        className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none transition-colors ${isActive
                                                            ? pb.activeClass
                                                            : "bg-muted text-muted-foreground opacity-40"
                                                            }`}
                                                        title={`${pb.label}: ${isActive ? "Publicado" : "No publicado"}`}
                                                    >
                                                        {pb.label}
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground text-xs">
                                        {prod.batches.length} compras
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => setEditingProduct(prod)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setPricingProduct(prod)}>
                                                    <Calculator className="mr-2 h-4 w-4" /> Calculadora de Precios
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletingProduct(prod)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {paginatedProducts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    No se encontraron productos.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Mostrando {filteredProducts.length > 0 ? startIndex + 1 : 0}–{endIndex} de {filteredProducts.length} producto(s)
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm px-3 py-1 min-w-[80px] text-center">
                            Pág. {currentPage} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            {editingProduct && (
                <EditProductDialog
                    product={editingProduct}
                    open={!!editingProduct}
                    onOpenChange={(open) => !open && setEditingProduct(null)}
                />
            )}

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            ¿Eliminar producto?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente <strong>{deletingProduct?.name}</strong>.
                            <br /><br />
                            Nota: No podrás eliminarlo si tiene historial de compras o stock.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Sí, Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Pricing Calculator Dialog */}
            <PricingCalculatorDialog
                open={!!pricingProduct}
                onOpenChange={(open) => !open && setPricingProduct(null)}
                initialCostPrice={
                    pricingProduct?.batches?.length > 0
                        ? pricingProduct.batches
                            .sort((a: any, b: any) => new Date(b.arrivalDate).getTime() - new Date(a.arrivalDate).getTime())
                        [0]?.unitCost
                        : undefined
                }
                productId={pricingProduct?.id}
                publishStatus={pricingProduct ? {
                    isPublishedML: pricingProduct.isPublishedML ?? false,
                    isPublishedLP: pricingProduct.isPublishedLP ?? false,
                    isPublishedRappi: pricingProduct.isPublishedRappi ?? false,
                    isPublishedWeb: pricingProduct.isPublishedWeb ?? false,
                    isPublishedFB: pricingProduct.isPublishedFB ?? false,
                } : undefined}
            />
        </div>
    )
}
