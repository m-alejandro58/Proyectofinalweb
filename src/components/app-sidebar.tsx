"use client"

import {
    Home,
    Wallet,
    ShoppingCart,
    TrendingUp,
    Package,
    Users,
    BarChart3,
    Receipt,
    RotateCcw,
    ClipboardList,
    ShieldAlert,
    Warehouse,
    Settings,
    Building2,
    ScrollText
} from "lucide-react"
import { useEffect, useState } from "react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarFooter,
    SidebarHeader
} from "@/components/ui/sidebar"
import { getCurrentUser } from "@/app/actions/auth"

type UserPerms = {
    role: string
    canSell: boolean
    canManageInventory: boolean
    canManageFinances: boolean
    canManageContacts: boolean
    canManageOrders: boolean
    canManageClaims: boolean
}

// Each item declares which permission it needs
const allItems = [
    { title: "Dashboard", url: "/", icon: Home, perm: "canManageFinances" },
    { title: "Cuentas Financieras", url: "/accounts", icon: Wallet, perm: "canManageFinances" },
    { title: "Ventas", url: "/sales", icon: TrendingUp, perm: "canSell" },
    { title: "Devoluciones", url: "/returns", icon: RotateCcw, perm: "canSell" },
    { title: "Reclamaciones", url: "/claims", icon: ShieldAlert, perm: "canManageClaims" },
    { title: "MercadoLibre FULL", url: "/full", icon: Warehouse, perm: "canManageOrders" },
    { title: "Compras & Proveedores", url: "/purchases", icon: ShoppingCart, perm: "canManageInventory" },
    { title: "Inventario", url: "/inventory", icon: Package, perm: "canManageInventory" },
    { title: "Activos Fijos (PP&E)", url: "/assets", icon: Building2, perm: "canManageFinances" },
    { title: "Gastos Operativos", url: "/expenses", icon: Receipt, perm: "canManageFinances" },
    { title: "Contactos (CRM)", url: "/contacts", icon: Users, perm: "canManageContacts" },
    { title: "Pedidos / Apartados", url: "/orders", icon: ClipboardList, perm: "canManageOrders" },
    { title: "Reportes", url: "/reports", icon: BarChart3, perm: "canManageFinances" },
]

function getVisibleItems(user: UserPerms) {
    if (user.role === "ADMIN") return allItems
    return allItems.filter(item => {
        const key = item.perm as keyof UserPerms
        return user[key] === true
    })
}

export function AppSidebar() {
    const [items, setItems] = useState<typeof allItems>([])
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        getCurrentUser().then(user => {
            if (user) {
                setItems(getVisibleItems(user as UserPerms))
                setIsAdmin(user.role === "ADMIN")
            }
        })
    }, [])

    return (
        <Sidebar>
            <SidebarHeader className="p-4 border-b">
                <h2 className="text-xl font-bold tracking-tight text-primary">HARDSOFT</h2>
                <span className="text-xs text-muted-foreground">Gestión 2026</span>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <a href={item.url} className="flex items-center gap-3 py-3">
                                            <item.icon className="h-5 w-5" />
                                            <span className="text-base">{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {isAdmin && (
                    <SidebarGroup>
                        <SidebarGroupLabel>Administración</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <a href="/admin" className="flex items-center gap-3 py-3">
                                            <Settings className="h-5 w-5" />
                                            <span className="text-base">Gestión de Usuarios</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <a href="/audit" className="flex items-center gap-3 py-3">
                                            <ScrollText className="h-5 w-5" />
                                            <span className="text-base">Auditoría</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>
            <SidebarFooter className="p-4 border-t">
                <div className="text-xs text-center text-muted-foreground">
                    &copy; 2026 Hardsoft Inc.
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}
