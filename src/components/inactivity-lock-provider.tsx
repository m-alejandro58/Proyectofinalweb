"use client"

import { useEffect, useState } from "react"
import { useInactivityLock } from "@/hooks/use-inactivity-lock"
import { InactivityLockScreen } from "@/components/inactivity-lock-screen"
import { getCurrentUserName } from "@/app/actions/auth"

export function InactivityLockProvider({ children }: { children: React.ReactNode }) {
    const { isLocked, unlock } = useInactivityLock()
    const [userName, setUserName] = useState<string | null>(null)

    useEffect(() => {
        getCurrentUserName().then(setUserName)
    }, [])

    return (
        <>
            {isLocked && (
                <InactivityLockScreen
                    userName={userName}
                    onUnlock={unlock}
                />
            )}
            {children}
        </>
    )
}
