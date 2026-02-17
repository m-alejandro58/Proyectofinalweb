"use client"

import { useState, useEffect, useRef, useCallback } from "react"

const INACTIVITY_TIMEOUT = 10 * 60 * 1000 // 10 minutes in milliseconds

const ACTIVITY_EVENTS = [
    "mousemove",
    "mousedown",
    "keydown",
    "scroll",
    "touchstart",
    "click",
] as const

export function useInactivityLock() {
    const [isLocked, setIsLocked] = useState(false)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const lastActivityRef = useRef<number>(Date.now())

    const resetTimer = useCallback(() => {
        lastActivityRef.current = Date.now()

        if (timerRef.current) {
            clearTimeout(timerRef.current)
        }

        timerRef.current = setTimeout(() => {
            setIsLocked(true)
        }, INACTIVITY_TIMEOUT)
    }, [])

    const unlock = useCallback(() => {
        setIsLocked(false)
        resetTimer()
    }, [resetTimer])

    useEffect(() => {
        // Throttle activity events to avoid excessive timer resets
        let throttleTimeout: NodeJS.Timeout | null = null
        const THROTTLE_MS = 1000 // Only process one event per second

        const handleActivity = () => {
            if (throttleTimeout) return

            throttleTimeout = setTimeout(() => {
                throttleTimeout = null
            }, THROTTLE_MS)

            resetTimer()
        }

        // Start the initial timer
        resetTimer()

        // Listen for activity events
        ACTIVITY_EVENTS.forEach((event) => {
            window.addEventListener(event, handleActivity, { passive: true })
        })

        // Also listen for visibility changes (user switches tabs)
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                // Check if we should have locked while tab was hidden
                const elapsed = Date.now() - lastActivityRef.current
                if (elapsed >= INACTIVITY_TIMEOUT) {
                    setIsLocked(true)
                } else {
                    resetTimer()
                }
            }
        }
        document.addEventListener("visibilitychange", handleVisibilityChange)

        return () => {
            ACTIVITY_EVENTS.forEach((event) => {
                window.removeEventListener(event, handleActivity)
            })
            document.removeEventListener("visibilitychange", handleVisibilityChange)

            if (timerRef.current) {
                clearTimeout(timerRef.current)
            }
            if (throttleTimeout) {
                clearTimeout(throttleTimeout)
            }
        }
    }, [resetTimer])

    return { isLocked, unlock }
}
