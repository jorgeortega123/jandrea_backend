-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UsuarioClub" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "cedula" TEXT,
    "nivel" INTEGER DEFAULT 1,
    "avance" INTEGER DEFAULT 2,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_UsuarioClub" ("avance", "cedula", "createdAt", "email", "id", "nivel", "nombre", "telefono") SELECT "avance", "cedula", "createdAt", "email", "id", "nivel", "nombre", "telefono" FROM "UsuarioClub";
DROP TABLE "UsuarioClub";
ALTER TABLE "new_UsuarioClub" RENAME TO "UsuarioClub";
CREATE UNIQUE INDEX "UsuarioClub_email_key" ON "UsuarioClub"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
