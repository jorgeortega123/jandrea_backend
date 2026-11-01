-- Solicitudes de cotización (carrito → "Mi cotización", panel /leads).
-- Aplicar: npx wrangler d1 execute jandrea --remote --file=migrations/migrationDb46new.sql

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL DEFAULT 'BASICA',
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT NOT NULL,
    "cedulaRuc" TEXT,
    "direccion" TEXT,
    "notas" TEXT,
    "items" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'NUEVO',
    "emailStatus" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "emailError" TEXT,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Lead_estado_idx" ON "Lead"("estado");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_ip_createdAt_idx" ON "Lead"("ip", "createdAt");

