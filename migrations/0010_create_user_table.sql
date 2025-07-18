-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FacturaSinInva" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facturaId" INTEGER NOT NULL DEFAULT 0,
    "code" TEXT,
    "valueCupon" INTEGER,
    "expireCupon" DATETIME DEFAULT '2025-07-14 02:46:36.459 +00:00',
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" INTEGER,
    "isPrinted" BOOLEAN NOT NULL DEFAULT true,
    "datePrint" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT '2025-07-14 02:46:36.459 +00:00',
    "address" TEXT NOT NULL,
    "dni" INTEGER,
    "subTotal" INTEGER NOT NULL,
    "total" INTEGER NOT NULL
);
INSERT INTO "new_FacturaSinInva" ("address", "code", "createdAt", "datePrint", "dni", "email", "expireCupon", "facturaId", "id", "isPrinted", "name", "phone", "subTotal", "total", "updatedAt", "valueCupon") SELECT "address", "code", "createdAt", "datePrint", "dni", "email", "expireCupon", "facturaId", "id", "isPrinted", "name", "phone", "subTotal", "total", "updatedAt", "valueCupon" FROM "FacturaSinInva";
DROP TABLE "FacturaSinInva";
ALTER TABLE "new_FacturaSinInva" RENAME TO "FacturaSinInva";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
