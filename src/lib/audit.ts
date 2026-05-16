import { prisma } from "@/lib/db"

// ---------------------------------------------------------
// SERVICIO DE AUDITORÍA
// ---------------------------------------------------------

interface AuditLogParams {
  // Información del usuario
  userId?: string
  userIp?: string
  userAgent?: string

  // Información de la acción
  action: string     // Ej: CREATE_PRODUCT, UPDATE_ORDER
  entity: string     // Ej: Product, Sale, Contact
  entityId: string   // ID de la entidad afectada

  // Valores opcionales para rastrear cambios
  oldValues?: unknown
  newValues?: unknown

  // Información adicional
  metadata?: unknown
}

// ---------------------------------------------------------
// CREAR REGISTRO DE AUDITORÍA
// ---------------------------------------------------------

export async function createAuditLog({
  userId,
  userIp,
  userAgent,

  action,
  entity,
  entityId,

  oldValues,
  newValues,

  metadata,
}: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        // Información del usuario
        userId,
        userIp,
        userAgent,

        // Información de la acción
        action,
        entity,
        entityId,

        // Convertir objetos JSON a texto
        oldValues: oldValues
          ? JSON.stringify(oldValues)
          : null,

        newValues: newValues
          ? JSON.stringify(newValues)
          : null,

        metadata: metadata
          ? JSON.stringify(metadata)
          : null,
      },
    })
  } catch (error) {
    console.error("Error al registrar auditoría:", error)
  }
}