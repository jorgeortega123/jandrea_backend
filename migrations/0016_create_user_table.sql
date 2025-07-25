-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seoTitle" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "img" TEXT NOT NULL,
    "imagenPrefijo" TEXT NOT NULL,
    "title" TEXT NOT NULL
);

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
    "identificador" TEXT NOT NULL,
    "docena" BOOLEAN,
    CONSTRAINT "Producto_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Producto" ("cantidad", "categoryId", "description", "docena", "id", "identificador", "productId", "title") SELECT "cantidad", "categoryId", "description", "docena", "id", "identificador", "productId", "title" FROM "Producto";
DROP TABLE "Producto";
ALTER TABLE "new_Producto" RENAME TO "Producto";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_categoryId_key" ON "Categoria"("categoryId");
