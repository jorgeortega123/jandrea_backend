-- Seguimiento real del aviso por correo, por destinatario (panel /leads).
-- Aplicar ANTES de desplegar el backend:
--   npx wrangler d1 execute jandrea --remote --file=migrations/migrationDb47new.sql

ALTER TABLE "Lead" ADD COLUMN "emailEntregas" TEXT;

-- "ENVIADO" solo significaba que Cloudflare aceptó la llamada, no que se entregó.
UPDATE "Lead" SET "emailStatus" = 'EN_COLA' WHERE "emailStatus" = 'ENVIADO';
