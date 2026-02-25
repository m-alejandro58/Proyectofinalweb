"use client"

import {
    Calendar,
    Home,
    Inbox,
    Search,
    Settings,
    Wallet,
    ShoppingCart,
    TrendingUp,
    Package,
    Users,
    BarChart3,
    Receipt,
    CreditCard,
    Truck,
    RotateCcw,
    ClipboardList,
    ShieldAlert,
    Warehouse
} from "lucide-react"

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

// Menu items.
const items = [
    {
        title: "Dashboard",
        url: "/",
        icon: Home,
    },
    {
        title: "Cuentas Financieras",
        url: "/accounts",
        icon: Wallet,
    },
    {
        title: "Ventas",
        url: "/sales",
        icon: TrendingUp,
    },
    {
        title: "Devoluciones",
        url: "/returns",
        icon: RotateCcw,
    },
    {
        title: "Reclamaciones",
        url: "/claims",
        icon: ShieldAlert,
    },
    {
        title: "MercadoLibre FULL",
        url: "/full",
        icon: Warehouse,
    },
    {
        title: "Compras & Proveedores",
        url: "/purchases",
        icon: ShoppingCart,
    },
    {
        title: "Inventario",
        url: "/inventory",
        icon: Package,
    },
    {
        title: "Gastos Operativos",
        url: "/expenses",
        icon: Receipt,
    },
    {
        title: "Contactos (CRM)",
        url: "/contacts",
        icon: Users,
    },
    {
        title: "Pedidos / Apartados",
        url: "/orders",
        icon: ClipboardList,
    },
    {
        title: "Reportes",
        url: "/reports",
        icon: BarChart3,
    },
]

export function AppSidebar() {
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
            </SidebarContent>
            <SidebarFooter className="p-4 border-t">
                <div className="text-xs text-center text-muted-foreground">
                    &copy; 2026 Hardsoft Inc.
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}
