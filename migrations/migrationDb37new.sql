-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Categoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seoTitle" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "img" TEXT NOT NULL,
    "imagenPrefijo" TEXT NOT NULL,
    "title" TEXT NOT NULL
);
INSERT INTO "new_Categoria" ("categoryId", "id", "imagenPrefijo", "img", "seoTitle", "title") SELECT "categoryId", "id", "imagenPrefijo", "img", "seoTitle", "title" FROM "Categoria";
DROP TABLE "Categoria";
ALTER TABLE "new_Categoria" RENAME TO "Categoria";
CREATE UNIQUE INDEX "Categoria_categoryId_key" ON "Categoria"("categoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
