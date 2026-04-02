import { getContacts } from "@/app/actions/contacts"
import { CreateContactDialog } from "@/components/contacts/create-contact-dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { User, Truck } from "lucide-react"
import { ExportButton } from "@/components/export-buttons"
import { ContactsSearch } from "@/components/contacts/contacts-search"

export default async function ContactsPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string }>
}) {
    const { query: queryRaw } = await searchParams
    const query = queryRaw || ""
    const { data: contacts } = await getContacts(undefined, query)

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Contactos (CRM)</h1>
                    <p className="text-muted-foreground">Base de datos de Clientes y Proveedores.</p>
                </div>
                <div className="flex flex-col sm:flex-row w-full md:w-auto items-center gap-2">
                    <ContactsSearch />
                    <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <ExportButton table="clients" label="Clientes CSV" />
                        <ExportButton table="providers" label="Proveedores CSV" />
                        <CreateContactDialog />
                    </div>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Identificación</TableHead>
                                <TableHead>Contacto</TableHead>
                                <TableHead>Ubicación</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contacts?.map((contact: any) => (
                                <TableRow key={contact.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {contact.type === 'CLIENT' ? <User className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                                            {contact.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={contact.type === 'CLIENT' ? "outline" : "secondary"}>
                                            {contact.type === 'CLIENT' ? 'Cliente' : 'Proveedor'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {contact.govId || "-"}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {contact.phone} <br /> {contact.email}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {contact.city}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!contacts || contacts.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        {query ? `No se encontraron contactos que coincidan con '${query}'.` : "No hay contactos registrados."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
