"use client"

import { useState } from "react"
import { Check, ListFilter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"

// ── Platform options with colors ────────────────────────
export const PLATFORM_OPTIONS = [
    {
        value: "isPublishedML",
        label: "MercadoLibre",
        short: "ML",
        dotClass: "bg-yellow-400",
        badgeActive: "bg-yellow-400 text-yellow-950 hover:bg-yellow-500 border-transparent",
    },
    {
        value: "isPublishedLP",
        label: "LuegoPago",
        short: "LP",
        dotClass: "bg-purple-400",
        badgeActive: "bg-purple-400 text-white hover:bg-purple-500 border-transparent",
    },
    {
        value: "isPublishedRappi",
        label: "Rappi",
        short: "RA",
        dotClass: "bg-orange-500",
        badgeActive: "bg-orange-500 text-white hover:bg-orange-600 border-transparent",
    },
    {
        value: "isPublishedWeb",
        label: "Página Web",
        short: "WB",
        dotClass: "bg-sky-400",
        badgeActive: "bg-sky-400 text-sky-950 hover:bg-sky-500 border-transparent",
    },
    {
        value: "isPublishedFB",
        label: "Facebook",
        short: "FB",
        dotClass: "bg-blue-600",
        badgeActive: "bg-blue-600 text-white hover:bg-blue-700 border-transparent",
    },
] as const

export type PlatformField = (typeof PLATFORM_OPTIONS)[number]["value"]

interface PublicationFilterProps {
    title: string
    /** Campos seleccionados (ej. ["isPublishedML", "isPublishedRappi"]) */
    selected: Set<PlatformField>
    onChange: (selected: Set<PlatformField>) => void
}

export function PublicationFilter({ title, selected, onChange }: PublicationFilterProps) {
    const [open, setOpen] = useState(false)

    const toggle = (value: PlatformField) => {
        const next = new Set(selected)
        if (next.has(value)) {
            next.delete(value)
        } else {
            next.add(value)
        }
        onChange(next)
    }

    const clear = () => {
        onChange(new Set())
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-dashed gap-1"
                >
                    <ListFilter className="h-3.5 w-3.5" />
                    {title}
                    {selected.size > 0 && (
                        <>
                            <span className="mx-1 h-4 w-px bg-border" />
                            <div className="flex gap-0.5">
                                {PLATFORM_OPTIONS.filter((p) => selected.has(p.value)).map(
                                    (p) => (
                                        <Badge
                                            key={p.value}
                                            className={`px-1 py-0 text-[10px] font-semibold leading-4 rounded ${p.badgeActive}`}
                                        >
                                            {p.short}
                                        </Badge>
                                    ),
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandList>
                        <CommandEmpty>Sin opciones.</CommandEmpty>
                        <CommandGroup>
                            {PLATFORM_OPTIONS.map((platform) => {
                                const isActive = selected.has(platform.value)
                                return (
                                    <CommandItem
                                        key={platform.value}
                                        onSelect={() => toggle(platform.value)}
                                        className="gap-2"
                                    >
                                        <div
                                            className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${isActive
                                                    ? "bg-primary border-primary text-primary-foreground"
                                                    : "border-muted-foreground/30"
                                                }`}
                                        >
                                            {isActive && <Check className="h-3 w-3" />}
                                        </div>
                                        <span
                                            className={`h-2.5 w-2.5 rounded-full ${platform.dotClass}`}
                                        />
                                        <span className="text-sm">{platform.label}</span>
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                        {selected.size > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={clear}
                                        className="justify-center text-center text-xs text-muted-foreground"
                                    >
                                        <X className="mr-1 h-3 w-3" />
                                        Limpiar filtro
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
