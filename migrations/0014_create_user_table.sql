-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Producto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cantidad" INTEGER,
    "title" TEXT,
    "description" TEXT,
    "productId" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT '2025-07-14 02:46:36.459 +00:00',
    "identificador" TEXT NOT NULL,
    "docena" BOOLEAN,
    CONSTRAINT "Producto_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Producto" ("cantidad", "categoryId", "description", "docena", "id", "identificador", "productId", "title") SELECT "cantidad", "categoryId", "description", "docena", "id", "identificador", "productId", "title" FROM "Producto";
DROP TABLE "Producto";
ALTER TABLE "new_Producto" RENAME TO "Producto";
CREATE UNIQUE INDEX "Producto_identificador_key" ON "Producto"("identificador");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
