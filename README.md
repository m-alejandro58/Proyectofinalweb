# Proyecto Final Programación Web

## Extensión proyecto Hardsoft con Módulo de Auditoría

Aplicación web desarrollada bajo arquitectura de 3 capas para la gestión de inventario, productos, ventas y auditoría de acciones dentro del sistema.

El proyecto permite administrar productos, controlar inventario, registrar movimientos y mantener trazabilidad completa mediante un módulo de auditoría integrado.

---

# Integrantes

| Nombre | Rol |
| Manuel Alejandro Alvarez Meneses | Desarrollo módulo de auditoría |
---

# Tecnologías Utilizadas

## Frontend
- React
- Next.js
- TypeScript
- TailwindCSS

## Backend
- Next.js
- Server Actions
- Prisma ORM

## Base de Datos
- SQLite

---

# Arquitectura

La aplicación está dividida en 3 capas:

1. Frontend
2. Backend
3. Base de Datos

# Funcionalidades Principales

- Gestión de productos
- Control de inventario
- Gestión de stock
- Registro de ventas
- Sistema de auditoría
- Validaciones de formularios
- Persistencia de datos
- CRUD completo

# Módulo de Auditoría

El sistema registra automáticamente:

- Creación de productos
- Actualización de productos
- Eliminación de productos
- Ajustes de inventario

Cada acción almacena:

- Usuario
- Fecha
- Acción realizada
- Datos anteriores
- Datos nuevos
- Entidad afectada


# Instalación del Proyecto

## 1. Clonar repositorio

```bash
git clone https://github.com/m-alejandro58/Proyectofinalweb.git
```

## 2. Entrar al proyecto

```bash
cd Proyectofinalweb
```

## 3. Instalar dependencias

```bash
npm install
```

## 4. Configurar variables de entorno

Crear archivo:

```bash
.env
```

Ejemplo:

```env
DATABASE_URL="file:./dev.db"
```

---

# Ejecutar Proyecto

## Ejecutar aplicación

```bash
npm run dev
```

## Ejecutar Prisma Studio

```bash
npx prisma studio
```

---

# Estructura del Proyecto

```bash
src/
 ├── app/
 ├── components/
 ├── lib/
 ├── hooks/
 ├── utils/

prisma/
 ├── schema.prisma
 ├── dev.db
```

# Requisitos Implementados

## Frontend
- Navegación entre vistas
- Formularios
- Validaciones
- Manejo de estados
- Diseño responsive

## Backend
- CRUD completo
- API funcional
- Manejo de errores
- Variables de entorno

## Base de Datos
- Relaciones entre tablas
- Persistencia real
- Modelo relacional
- Auditoría

---

# Estado del Proyecto

Proyecto funcional ejecutándose localmente con integración completa entre frontend, backend y base de datos.

