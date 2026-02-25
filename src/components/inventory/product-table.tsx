"use client"

import { useState, useMemo, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package, Search, MoreHorizontal, Pencil, Trash2, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { EditProductDialog } from "./edit-product-dialog"
import { deleteProduct } from "@/app/actions/inventory"
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

export function ProductTable({ products }: { products: any[] }) {
    const [search, setSearch] = useState("")
    const [brandFilter, setBrandFilter] = useState("ALL")
    const [editingProduct, setEditingProduct] = useState<any>(null)
    const [deletingProduct, setDeletingProduct] = useState<any>(null)
    const [currentPage, setCurrentPage] = useState(1)

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

            return matchesSearch && matchesBrand
        })
    }, [products, search, brandFilter])

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [search, brandFilter])

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredProducts.length)
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

    const handleDelete = async () => {
        if (!deletingProduct) return
        const res = await deleteProduct(deletingProduct.id)
        if (!res.success) {
            alert(res.error)
        }
        setDeletingProduct(null)
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
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
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>SKU / ID</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Marca</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-center">Stock Total</TableHead>
                            <TableHead className="text-right">Lotes</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedProducts.map((prod: any) => (
                            <TableRow key={prod.id}>
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
                                <TableCell className="max-w-[200px] truncate text-muted-foreground" title={prod.description || ""}>
                                    {prod.description}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={prod.stockTotal > prod.minStock ? "outline" : "destructive"}>
                                        {prod.stockTotal}
                                    </Badge>
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
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletingProduct(prod)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {paginatedProducts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
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
        </div>
    )
}
