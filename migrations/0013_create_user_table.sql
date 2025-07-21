-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cantidad" INTEGER,
    "title" TEXT,
    "description" TEXT,
    "productId" TEXT,
    "categoryId" TEXT NOT NULL,
    "identificador" TEXT NOT NULL,
    "docena" BOOLEAN
);

-- CreateTable
CREATE TABLE "TopicTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tag" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    CONSTRAINT "TopicTag_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Variants_producto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT,
    "sizes_x" REAL,
    "sizes_y" REAL,
    "sizes_z" REAL,
    "precioDocena" REAL,
    "price" REAL NOT NULL,
    "priceWithoutOff" REAL NOT NULL,
    "productoId" TEXT NOT NULL,
    CONSTRAINT "Variants_producto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Imagenes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isVideo" BOOLEAN,
    "needContrast" BOOLEAN,
    "src" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    CONSTRAINT "Imagenes_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variants_producto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Colors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "color" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    CONSTRAINT "Colors_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variants_producto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FacturaSinInva" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facturaId" REAL NOT NULL DEFAULT 0,
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
