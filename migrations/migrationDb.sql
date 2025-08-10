-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT
);

-- CreateTable
CREATE TABLE "FacturaSinInva" (
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

-- CreateTable
CREATE TABLE "ProductSchema" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "quantity" INTEGER NOT NULL,
    "facturaSinInvaId" TEXT NOT NULL,
    CONSTRAINT "ProductSchema_facturaSinInvaId_fkey" FOREIGN KEY ("facturaSinInvaId") REFERENCES "FacturaSinInva" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscountSchema" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "amount" REAL,
    "cupon" BOOLEAN,
    "isValid" BOOLEAN,
    "facturaSinInvaId" TEXT NOT NULL,
    CONSTRAINT "DiscountSchema_facturaSinInvaId_fkey" FOREIGN KEY ("facturaSinInvaId") REFERENCES "FacturaSinInva" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seoTitle" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "img" TEXT NOT NULL,
    "imagenPrefijo" TEXT NOT NULL,
    "title" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Producto" (
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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_categoryId_key" ON "Categoria"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_identificador_key" ON "Producto"("identificador");
