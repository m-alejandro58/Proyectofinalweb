"use client"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"

export function ContactsSearch() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const initialQuery = searchParams.get('query') || ''
    const [searchTerm, setSearchTerm] = useState(initialQuery)

    // Debounce mechanism
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString())
            if (searchTerm) {
                params.set('query', searchTerm)
            } else {
                params.delete('query')
            }
            router.replace(`${pathname}?${params.toString()}`, { scroll: false })
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [searchTerm, pathname, router, searchParams])

    return (
        <div className="relative w-full md:max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Buscar por nombre, correo, cédula/NIT o teléfono..."
                className="pl-9 bg-background w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
    )
}
