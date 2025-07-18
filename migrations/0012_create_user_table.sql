-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FacturaSinInva" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facturaId" INTEGER NOT NULL DEFAULT 0,
    "code" TEXT,
    "valueCupon" REAL,
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
    "subTotal" REAL NOT NULL,
    "total" REAL NOT NULL
);
INSERT INTO "new_FacturaSinInva" ("address", "code", "createdAt", "datePrint", "dni", "email", "expireCupon", "facturaId", "id", "isPrinted", "name", "phone", "subTotal", "total", "updatedAt", "valueCupon") SELECT "address", "code", "createdAt", "datePrint", "dni", "email", "expireCupon", "facturaId", "id", "isPrinted", "name", "phone", "subTotal", "total", "updatedAt", "valueCupon" FROM "FacturaSinInva";
DROP TABLE "FacturaSinInva";
ALTER TABLE "new_FacturaSinInva" RENAME TO "FacturaSinInva";
CREATE TABLE "new_ProductSchema" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "quantity" INTEGER NOT NULL,
    "facturaSinInvaId" TEXT NOT NULL,
    CONSTRAINT "ProductSchema_facturaSinInvaId_fkey" FOREIGN KEY ("facturaSinInvaId") REFERENCES "FacturaSinInva" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProductSchema" ("facturaSinInvaId", "id", "price", "productId", "quantity", "title") SELECT "facturaSinInvaId", "id", "price", "productId", "quantity", "title" FROM "ProductSchema";
DROP TABLE "ProductSchema";
ALTER TABLE "new_ProductSchema" RENAME TO "ProductSchema";
CREATE TABLE "new_DiscountSchema" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "amount" REAL,
    "cupon" BOOLEAN,
    "isValid" BOOLEAN,
    "facturaSinInvaId" TEXT NOT NULL,
    CONSTRAINT "DiscountSchema_facturaSinInvaId_fkey" FOREIGN KEY ("facturaSinInvaId") REFERENCES "FacturaSinInva" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DiscountSchema" ("amount", "cupon", "facturaSinInvaId", "id", "isValid", "title") SELECT "amount", "cupon", "facturaSinInvaId", "id", "isValid", "title" FROM "DiscountSchema";
DROP TABLE "DiscountSchema";
ALTER TABLE "new_DiscountSchema" RENAME TO "DiscountSchema";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
