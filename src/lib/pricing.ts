// ──────────────────────────────────────────────────────────
//  Pricing utilities – Publication price calculator
// ──────────────────────────────────────────────────────────

/**
 * Configuración de una plataforma de venta.
 */
export interface PlatformSettings {
    /** Identificador interno (slug) */
    id: string
    /** Nombre visible de la plataforma */
    name: string
    /** Porcentaje de comisión que cobra la plataforma (ej. 15.5 = 15.5%) */
    commissionPercent: number
    /** ¿La plataforma cobra 19% de IVA sobre el valor de la comisión? */
    chargesIvaOnCommission: boolean
    /** Costo fijo de envío en COP */
    fixedShippingCost: number
    /** Porcentaje de impuesto bancario / 4×1000 (ej. 0.4 = 0.4%) */
    bankTaxPercent: number
    /** Cobros fijos adicionales como Impuestos G (en COP) */
    extraTaxes: number
}

/**
 * Resultado del cálculo de precio de publicación con desglose.
 */
export interface PricingResult {
    /** Precio de publicación sugerido (redondeado hacia arriba) */
    publishPrice: number
    /** Ganancia neta deseada (basada en margen) */
    netProfit: number
    /** Desglose detallado de deducciones */
    breakdown: {
        /** Comisión base (sin IVA) en COP */
        commissionAmount: number
        /** IVA sobre la comisión (0 si no aplica) */
        ivaOnCommission: number
        /** Costo de envío usado */
        shippingCost: number
        /** Impuestos extra (Imp. G) */
        extraTaxesAmount: number
        /** Impuesto bancario (4×1000) en COP */
        bankTaxAmount: number
        /** Ganancia real verificada = precio − todas las deducciones − costo */
        realNetProfit: number
    }
}

/** Opciones de comisión disponibles para el selector */
export const COMMISSION_OPTIONS = [12.5, 15.5, 18.5, 19, 20, 21] as const

/**
 * Configuración inicial de las 5 plataformas con los datos reales del negocio.
 * Se puede editar directamente o hacer editable desde la UI en el futuro.
 */
export const DEFAULT_PLATFORMS: PlatformSettings[] = [
    {
        id: "mercadolibre",
        name: "MercadoLibre",
        commissionPercent: 15.5,
        chargesIvaOnCommission: false,
        fixedShippingCost: 7600,
        bankTaxPercent: 0.4,
        extraTaxes: 3045,
    },
    {
        id: "luegopago",
        name: "LuegoPago",
        commissionPercent: 20,
        chargesIvaOnCommission: true,
        fixedShippingCost: 0,
        bankTaxPercent: 0.4,
        extraTaxes: 0,
    },
    {
        id: "rappi",
        name: "Rappi",
        commissionPercent: 20,
        chargesIvaOnCommission: true,
        fixedShippingCost: 0,
        bankTaxPercent: 0.4,
        extraTaxes: 0,
    },
    {
        id: "web",
        name: "Página Web",
        commissionPercent: 5,
        chargesIvaOnCommission: false,
        fixedShippingCost: 10_000,
        bankTaxPercent: 0.4,
        extraTaxes: 0,
    },
    {
        id: "facebook",
        name: "Facebook",
        commissionPercent: 0,
        chargesIvaOnCommission: false,
        fixedShippingCost: 0,
        bankTaxPercent: 0.4,
        extraTaxes: 0,
    },
]

/**
 * Calcula el precio de publicación sugerido usando la fórmula de
 * "Margen de Utilidad sobre Venta" (Opción B del Excel).
 *
 * Incluye un desglose detallado de todas las deducciones para
 * verificación matemática.
 */
export function calculatePublishPrice(
    costPrice: number,
    desiredMarginPercent: number,
    platform: PlatformSettings,
): PricingResult {
    // Convertir porcentajes a decimales
    const marginDecimal = desiredMarginPercent / 100

    // 1. Calcular la ganancia neta deseada usando la fórmula de margen del Excel
    const baseTargetPrice = costPrice / (1 - marginDecimal)
    const desiredNetProfit = baseTargetPrice - costPrice

    // 2. Calcular deducciones porcentuales de la plataforma
    const commissionDecimal = platform.commissionPercent / 100
    const effectiveCommissionPercent = platform.chargesIvaOnCommission
        ? commissionDecimal * 1.19
        : commissionDecimal
    const bankTaxPercentDecimal = platform.bankTaxPercent / 100
    const totalDeductionPercent = effectiveCommissionPercent + bankTaxPercentDecimal

    // 3. Calcular Precio Publicado Final (Cálculo Inverso)
    const rawPublishPrice = (baseTargetPrice + platform.fixedShippingCost + platform.extraTaxes) / (1 - totalDeductionPercent)
    const publishPrice = Math.ceil(rawPublishPrice)

    // 4. Desglose de deducciones sobre el precio final redondeado
    const commissionAmount = Math.round(publishPrice * commissionDecimal)
    const ivaOnCommission = platform.chargesIvaOnCommission
        ? Math.round(commissionAmount * 0.19)
        : 0
    const bankTaxAmount = Math.round(publishPrice * bankTaxPercentDecimal)
    const realNetProfit = publishPrice
        - commissionAmount
        - ivaOnCommission
        - platform.fixedShippingCost
        - platform.extraTaxes
        - bankTaxAmount
        - costPrice

    return {
        publishPrice,
        netProfit: Math.round(desiredNetProfit),
        breakdown: {
            commissionAmount,
            ivaOnCommission,
            shippingCost: platform.fixedShippingCost,
            extraTaxesAmount: platform.extraTaxes,
            bankTaxAmount,
            realNetProfit: Math.round(realNetProfit),
        },
    }
}
