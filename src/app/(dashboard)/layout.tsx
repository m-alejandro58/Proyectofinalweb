import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { InactivityLockProvider } from "@/components/inactivity-lock-provider";

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <InactivityLockProvider>
            <SidebarProvider>
                <AppSidebar />
                <main className="w-full min-h-screen bg-background text-foreground transition-all duration-300">
                    <div className="p-4 flex items-center gap-2 border-b bg-card/50 backdrop-blur sticky top-0 z-10">
                        <SidebarTrigger />
                        <h1 className="font-semibold text-lg">Hardsoft ERP</h1>
                    </div>
                    <div className="p-6">
                        {children}
                    </div>
                </main>
            </SidebarProvider>
        </InactivityLockProvider>
    );
}
