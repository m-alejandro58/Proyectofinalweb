"use client"

import { useState, useTransition } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
import {
    Building2,
    Plus,
    Pencil,
    Trash2,
    Package,
    Car,
    Sofa,
    Cpu,
    TrendingDown,
    Search,
    AlertTriangle,
    Loader2,
} from "lucide-react"
import { createAsset, updateAsset, deleteAsset } from "@/app/actions/assets"
import { toast } from "sonner"
import type { AssetCategory, AssetStatus } from "@/app/actions/assets"

// ── Constants ───────────────────────────────────────────────
const CATEGORIES: { value: AssetCategory; label: string; icon: any; color: string }[] = [
    { value: "EQUIPOS", label: "Equipos", icon: Cpu, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    { value: "MUEBLES", label: "Muebles", icon: Sofa, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    { value: "VEHICULOS", label: "Vehículos", icon: Car, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    { value: "OTROS", label: "Otros", icon: Package, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" },
]

const STATUSES: { value: AssetStatus; label: string; badge: string }[] = [
    { value: "ACTIVO", label: "Activo", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    { value: "DEPRECIADO", label: "Depreciado", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
    { value: "VENDIDO", label: "Vendido", badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
]

const formatCOP = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

function getCategoryInfo(value: string) {
    return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[3]
}
function getStatusInfo(value: string) {
    return STATUSES.find((s) => s.value === value) ?? STATUSES[0]
}

// ── Add/Edit Asset Dialog ───────────────────────────────────
interface AssetFormDialogProps {
    open: boolean
    onOpenChange: (v: boolean) => void
    asset?: any // editing mode if provided
    onDone: () => void
}

function AssetFormDialog({ open, onOpenChange, asset, onDone }: AssetFormDialogProps) {
    const isEdit = !!asset
    const [name, setName] = useState(asset?.name ?? "")
    const [category, setCategory] = useState<string>(asset?.category ?? "")
    const [purchaseValue, setPurchaseValue] = useState(asset?.purchaseValue?.toString() ?? "")
    const [currentValue, setCurrentValue] = useState(asset?.currentValue?.toString() ?? "")
    const [status, setStatus] = useState<string>(asset?.status ?? "ACTIVO")
    const [notes, setNotes] = useState(asset?.notes ?? "")
    const [isPending, startTransition] = useTransition()

    const isValid =
        name.trim().length > 0 &&
        category.length > 0 &&
        parseFloat(purchaseValue) > 0 &&
        (isEdit ? parseFloat(currentValue) >= 0 : true)

    const handleSubmit = () => {
        if (!isValid) return
        startTransition(async () => {
            let res
            if (isEdit) {
                res = await updateAsset(asset.id, {
                    name: name.trim(),
                    category: category as AssetCategory,
                    currentValue: parseFloat(currentValue),
                    status: status as AssetStatus,
                    notes: notes.trim() || undefined,
                })
            } else {
                res = await createAsset({
                    name: name.trim(),
                    category: category as AssetCategory,
                    purchaseValue: parseFloat(purchaseValue),
                    currentValue: parseFloat(currentValue) || parseFloat(purchaseValue),
                    notes: notes.trim() || undefined,
                })
            }

            if (res.success) {
                toast.success(isEdit ? "Activo actualizado ✓" : "Activo creado ✓")
                onDone()
                onOpenChange(false)
            } else {
                toast.error(res.error ?? "Error al guardar")
            }
        })
    }

    const depreciation = asset
        ? ((1 - parseFloat(currentValue || "0") / (asset.purchaseValue || 1)) * 100).toFixed(1)
        : null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2.5">
                        <Building2 className="h-5 w-5 text-amber-500" />
                        {isEdit ? "Editar Activo Fijo" : "Nuevo Activo Fijo"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? "Actualiza el valor actual del activo para reflejar la depreciación."
                            : "Registra manualmente un activo que no pasó por el inventario de ventas."}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="asset-name">Nombre *</Label>
                        <Input
                            id="asset-name"
                            placeholder="Ej: Escritorio Ejecutivo, MacBook Pro 14..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Categoría *</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Categoría..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map((c) => (
                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Estado</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="asset-purchase-val">
                                {isEdit ? "Valor de Compra (histórico)" : "Valor de Compra *"}
                            </Label>
                            <Input
                                id="asset-purchase-val"
                                type="number"
                                min={0}
                                placeholder="0"
                                value={purchaseValue}
                                onChange={(e) => setPurchaseValue(e.target.value)}
                                disabled={isEdit}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="asset-current-val">
                                Valor Actual {isEdit && <span className="text-xs text-muted-foreground">(editable)</span>}
                            </Label>
                            <Input
                                id="asset-current-val"
                                type="number"
                                min={0}
                                placeholder={purchaseValue || "0"}
                                value={currentValue}
                                onChange={(e) => setCurrentValue(e.target.value)}
                            />
                        </div>
                    </div>

                    {isEdit && depreciation && parseFloat(currentValue) < asset.purchaseValue && (
                        <div className="flex items-center gap-2 rounded-md bg-orange-50 border border-orange-200 p-2.5 dark:bg-orange-900/20 dark:border-orange-800">
                            <TrendingDown className="h-4 w-4 text-orange-600 flex-shrink-0" />
                            <span className="text-xs text-orange-700 dark:text-orange-300">
                                Depreciación acumulada: <strong>{depreciation}%</strong>
                                {" · "}Pérdida de valor: {formatCOP(asset.purchaseValue - parseFloat(currentValue || "0"))}
                            </span>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="asset-notes">Notas</Label>
                        <Textarea
                            id="asset-notes"
                            placeholder="Descripción, ubicación, número de serie..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className="resize-none"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isValid || isPending}
                        className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {isEdit ? "Guardar Cambios" : "Crear Activo"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ── Main Assets Table Component ─────────────────────────────
export function AssetsTable({ initialAssets }: { initialAssets: any[] }) {
    const [assets, setAssets] = useState<any[]>(initialAssets)
    const [search, setSearch] = useState("")
    const [catFilter, setCatFilter] = useState("ALL")
    const [statusFilter, setStatusFilter] = useState("ACTIVO")
    const [showCreate, setShowCreate] = useState(false)
    const [editingAsset, setEditingAsset] = useState<any>(null)
    const [deletingAsset, setDeletingAsset] = useState<any>(null)
    const [isPending, startTransition] = useTransition()

    const filtered = assets.filter((a) => {
        const matchSearch =
            a.name.toLowerCase().includes(search.toLowerCase()) ||
            (a.originProductName ?? "").toLowerCase().includes(search.toLowerCase())
        const matchCat = catFilter === "ALL" || a.category === catFilter
        const matchStatus = statusFilter === "ALL" || a.status === statusFilter
        return matchSearch && matchCat && matchStatus
    })

    // Summary KPIs
    const totalCurrentValue = assets
        .filter((a) => a.status === "ACTIVO")
        .reduce((s, a) => s + a.currentValue, 0)
    const totalPurchaseValue = assets
        .filter((a) => a.status === "ACTIVO")
        .reduce((s, a) => s + a.purchaseValue, 0)
    const totalDepreciation = totalPurchaseValue - totalCurrentValue

    const handleDelete = () => {
        if (!deletingAsset) return
        startTransition(async () => {
            const res = await deleteAsset(deletingAsset.id)
            if (res.success) {
                setAssets((prev) => prev.filter((a) => a.id !== deletingAsset.id))
                toast.success("Activo eliminado")
            } else {
                toast.error(res.error ?? "Error al eliminar")
            }
            setDeletingAsset(null)
        })
    }

    const refreshFromServer = () => {
        // Trigger revalidation — Next.js will re-render the page with fresh data
        window.location.reload()
    }

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="bg-gradient-to-br from-amber-500 to-amber-700 text-white border-0">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-amber-100">Valor Actual PP&E</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCOP(totalCurrentValue)}</div>
                        <p className="text-xs text-amber-200 mt-0.5">{assets.filter(a => a.status === "ACTIVO").length} activos en servicio</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-slate-600 to-slate-800 text-white border-0">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Costo Histórico Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCOP(totalPurchaseValue)}</div>
                        <p className="text-xs text-slate-400 mt-0.5">Valor de adquisición original</p>
                    </CardContent>
                </Card>
                <Card className="border-orange-200 dark:border-orange-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                            <TrendingDown className="h-4 w-4 text-orange-500" /> Depreciación Acumulada
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {formatCOP(totalDepreciation)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {totalPurchaseValue > 0
                                ? `${((totalDepreciation / totalPurchaseValue) * 100).toFixed(1)}% del valor histórico`
                                : "—"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex flex-wrap gap-2 flex-1">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar activo..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={catFilter} onValueChange={setCatFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todas</SelectItem>
                            {CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos los estados</SelectItem>
                            {STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    onClick={() => setShowCreate(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shrink-0"
                >
                    <Plus className="h-4 w-4" /> Nuevo Activo
                </Button>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Activo</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead className="text-right">Costo Original</TableHead>
                            <TableHead className="text-right">Valor Actual</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                            <TableHead className="text-xs text-muted-foreground">Origen</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((asset) => {
                            const cat = getCategoryInfo(asset.category)
                            const status = getStatusInfo(asset.status)
                            const CatIcon = cat.icon
                            const deprPct =
                                asset.purchaseValue > 0
                                    ? ((1 - asset.currentValue / asset.purchaseValue) * 100).toFixed(0)
                                    : "0"
                            return (
                                <TableRow key={asset.id}>
                                    <TableCell>
                                        <div className="font-medium">{asset.name}</div>
                                        {asset.notes && (
                                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                {asset.notes}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${cat.color}`}>
                                            <CatIcon className="h-3 w-3" />
                                            {cat.label}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm">
                                        {formatCOP(asset.purchaseValue)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="font-mono text-sm font-semibold">{formatCOP(asset.currentValue)}</div>
                                        {parseFloat(deprPct) > 0 && (
                                            <div className="text-xs text-orange-500 text-right">-{deprPct}%</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${status.badge}`}>
                                            {status.label}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                                        {asset.originProductName ? (
                                            <span title={`Del inventario: ${asset.originProductName}`}>
                                                📦 {asset.originProductName}
                                            </span>
                                        ) : (
                                            <span className="opacity-50">Manual</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => setEditingAsset(asset)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => setDeletingAsset(asset)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No se encontraron activos fijos.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Dialogs */}
            <AssetFormDialog
                open={showCreate}
                onOpenChange={setShowCreate}
                onDone={refreshFromServer}
            />

            {editingAsset && (
                <AssetFormDialog
                    key={editingAsset.id}
                    open={!!editingAsset}
                    onOpenChange={(v) => !v && setEditingAsset(null)}
                    asset={editingAsset}
                    onDone={refreshFromServer}
                />
            )}

            <AlertDialog open={!!deletingAsset} onOpenChange={(v) => !v && setDeletingAsset(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" /> ¿Eliminar activo?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Se eliminará permanentemente <strong>{deletingAsset?.name}</strong>. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isPending}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
