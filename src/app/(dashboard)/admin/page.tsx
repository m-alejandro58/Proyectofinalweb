import { getUsers } from "@/app/actions/auth"
import { requireAdmin } from "@/lib/auth-guard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { CreateUserDialog } from "@/components/admin/create-user-dialog"
import { EditUserDialog } from "@/components/admin/edit-user-dialog"
import { ChangePasswordDialog } from "@/components/admin/change-password-dialog"
import { Check, X, Shield, User, Database, FileDown } from "lucide-react"
import { BackupButton, ExportButton } from "@/components/export-buttons"

export default async function AdminPage() {
    await requireAdmin()
    const { data: users } = await getUsers()

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
                    <p className="text-muted-foreground">Administre usuarios, roles y permisos del sistema.</p>
                </div>
                <CreateUserDialog />
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-center">Ventas</TableHead>
                                <TableHead className="text-center">Inventario</TableHead>
                                <TableHead className="text-center">Finanzas</TableHead>
                                <TableHead className="text-center">CRM</TableHead>
                                <TableHead className="text-center">Pedidos</TableHead>
                                <TableHead className="text-center">Reclamos</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users?.map((u: any) => (
                                <TableRow key={u.id} className={!u.isActive ? "opacity-50" : ""}>
                                    <TableCell className="font-mono font-medium">{u.username}</TableCell>
                                    <TableCell>{u.name || "—"}</TableCell>
                                    <TableCell>
                                        {u.role === "ADMIN" ? (
                                            <Badge className="bg-amber-600 text-white gap-1">
                                                <Shield className="h-3 w-3" /> Admin
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="gap-1">
                                                <User className="h-3 w-3" /> Estándar
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {u.isActive ? (
                                            <Badge className="bg-green-600 text-white">Activo</Badge>
                                        ) : (
                                            <Badge variant="destructive">Inactivo</Badge>
                                        )}
                                    </TableCell>
                                    <PermCell ok={u.role === "ADMIN" || u.canSell} />
                                    <PermCell ok={u.role === "ADMIN" || u.canManageInventory} />
                                    <PermCell ok={u.role === "ADMIN" || u.canManageFinances} />
                                    <PermCell ok={u.role === "ADMIN" || u.canManageContacts} />
                                    <PermCell ok={u.role === "ADMIN" || u.canManageOrders} />
                                    <PermCell ok={u.role === "ADMIN" || u.canManageClaims} />
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <EditUserDialog user={u} />
                                            <ChangePasswordDialog userId={u.id} username={u.username} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* BACKUP & DATA EXPORT */}
            <div className="mt-4">
                <h2 className="text-2xl font-bold tracking-tight mb-2 flex items-center gap-2">
                    <Database className="h-6 w-6" /> Copias de Seguridad & Exportación
                </h2>
                <p className="text-muted-foreground mb-4">Descargue respaldos de su base de datos y exporte datos en CSV.</p>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Database className="h-5 w-5" /> Respaldo Completo
                            </CardTitle>
                            <CardDescription>Descarga una copia completa de tu base de datos SQLite. Incluye todos los datos del sistema.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <BackupButton />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileDown className="h-5 w-5" /> Exportar Tablas (CSV)
                            </CardTitle>
                            <CardDescription>Descargue cada tabla por separado en formato compatible con Excel.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            <ExportButton table="clients" label="Clientes" />
                            <ExportButton table="providers" label="Proveedores" />
                            <ExportButton table="inventory" label="Inventario" />
                            <ExportButton table="sales" label="Ventas" />
                            <ExportButton table="returns" label="Devoluciones" />
                            <ExportButton table="transactions" label="Reporte Financiero" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function PermCell({ ok }: { ok: boolean }) {
    return (
        <TableCell className="text-center">
            {ok ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
        </TableCell>
    )
}
