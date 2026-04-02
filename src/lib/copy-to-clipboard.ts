/**
 * copyToClipboard — Copia texto al portapapeles de forma segura.
 *
 * navigator.clipboard.writeText() solo funciona en HTTPS o localhost.
 * Cuando el usuario accede por IP (http://192.168.x.x), se usa
 * execCommand como fallback. IMPORTANTE: el textarea debe ser
 * "visible" en el viewport (aunque transparente) o Chrome/Firefox
 * lo ignorarán silenciosamente.
 */
export async function copyToClipboard(text: string): Promise<void> {
    // Intento 1: API moderna — solo disponible en HTTPS/localhost
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        return
    }

    // Fallback: textarea tranparente pero DENTRO del viewport (requerido por los browsers)
    const textarea = document.createElement("textarea")
    textarea.value = text

    // Visible en posición fija dentro del viewport, pero invisible visualmente
    textarea.style.cssText = [
        "position: fixed",
        "left: 0",
        "top: 0",
        "width: 2px",
        "height: 2px",
        "padding: 0",
        "border: none",
        "outline: none",
        "box-shadow: none",
        "background: transparent",
        "color: transparent",
        "font-size: 1px",
        "z-index: -1",
    ].join("; ")

    document.body.appendChild(textarea)

    // Guardar foco actual y restaurarlo después
    const previousFocus = document.activeElement as HTMLElement | null

    try {
        textarea.focus({ preventScroll: true })
        textarea.select()
        // setSelectionRange para mayor compatibilidad (iOS, Firefox, etc.)
        textarea.setSelectionRange(0, text.length)

        const success = document.execCommand("copy")
        if (!success) {
            throw new Error("execCommand('copy') fue bloqueado por el browser")
        }
    } finally {
        document.body.removeChild(textarea)
        previousFocus?.focus({ preventScroll: true })
    }
}
