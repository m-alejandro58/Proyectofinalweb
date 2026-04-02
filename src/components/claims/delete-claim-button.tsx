"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"
import { deleteProviderClaim } from "@/app/actions/provider-claims"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function DeleteClaimButton({ claim }: { claim: any }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Only show for claims still in INITIATED status
    if (claim.status !== "INITIATED") return null

    const handleDelete = async () => {
        setLoading(true)
        try {
            const result = await deleteProviderClaim(claim.id)
            if (result.success) {
                toast.success(result.message ?? "Reclamación eliminada correctamente")
                router.refresh()
            } else {
                toast.error(result.error ?? "Error al eliminar reclamación")
            }
        } catch {
            toast.error("Error inesperado al eliminar la reclamación")
        } finally {
            setLoading(false)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    disabled={loading}
                    title="Eliminar reclamación"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar esta reclamación?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                        <span className="block">
                            Estás a punto de eliminar la reclamación de{" "}
                            <strong>{claim.productName}</strong> con{" "}
                            <strong>{claim.provider?.name}</strong>.
                        </span>
                        <span className="block text-destructive font-medium">
                            Esta acción no se puede deshacer.
                        </span>
                        {claim.productId && (
                            <span className="block text-sm text-muted-foreground">
                                📦 El stock del producto será restaurado automáticamente ({claim.quantity} unidad
                                {claim.quantity > 1 ? "es" : ""}).
                            </span>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {loading ? "Eliminando..." : "Sí, eliminar"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
