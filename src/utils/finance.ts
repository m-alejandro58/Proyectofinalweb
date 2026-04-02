/**
 * Módulo Core Financiero - Hardsoft Technology
 * Todas las entradas de porcentajes deben enviarse como decimales (ej. 0.30 para 30%).
 */

// ==========================================
// 1. MÉTRICAS DE NEGOCIO (GANANCIAS)
// ==========================================

export const calculateGrossProfit = (totalSales: number, cogs: number): number => {
  return totalSales - cogs;
};

export const calculateOperatingProfit = (grossProfit: number, operatingExpenses: number): number => {
  return grossProfit - operatingExpenses;
};

export const calculateNetProfit = (operatingProfit: number, taxes: number, financialExpenses: number): number => {
  return operatingProfit - (taxes + financialExpenses);
};

// ==========================================
// 2. CÁLCULOS DE RENTABILIDAD POR ARTÍCULO
// ==========================================

/**
 * Calcula el Markup (remarcación sobre el costo).
 * Ejemplo: Compras a $100, vendes a $120. Markup = 20%.
 */
export const calculateMarkupPercentage = (cost: number, sellingPrice: number): number => {
  if (cost === 0) throw new Error("El costo no puede ser cero para calcular el markup.");
  return ((sellingPrice - cost) / cost) * 100;
};

/**
 * Calcula el Margen de Utilidad (ganancia sobre la venta final).
 * Ejemplo: Compras a $80, vendes a $100. Margen = 20%.
 */
export const calculateMarginPercentage = (cost: number, sellingPrice: number): number => {
  if (sellingPrice === 0) return 0; // Evita división por cero si aún no hay precio fijado
  return ((sellingPrice - cost) / sellingPrice) * 100;
};

// ==========================================
// 3. FIJACIÓN DE PRECIOS (PRICING)
// ==========================================

/**
 * Fija el precio basado en Markup (se le suma un % al costo).
 * Uso común: Mayoristas o negocios de bajo valor.
 */
export const calculatePriceFromMarkup = (cost: number, markupDecimal: number): number => {
  return cost * (1 + markupDecimal);
};

/**
 * Fija el precio basado en Margen (El modelo RECOMENDADO para retail/Mercado Libre).
 * Garantiza que al final de la venta, el % deseado quede libre.
 */
export const calculatePriceFromMargin = (cost: number, marginDecimal: number): number => {
  if (marginDecimal >= 1.0) {
    throw new Error("Lógica inválida: Es matemáticamente imposible tener un margen sobre la venta del 100% o superior si existe un costo de adquisición.");
  }
  return cost / (1 - marginDecimal);
};
