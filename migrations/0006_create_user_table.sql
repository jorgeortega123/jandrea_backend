-- CreateTable
CREATE TABLE "FacturaSinInva" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT,
    "valueCupon" INTEGER,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" INTEGER,
    "address" TEXT NOT NULL,
    "dni" INTEGER,
    "subTotal" INTEGER NOT NULL,
    "total" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "ProductSchema" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "facturaSinInvaId" INTEGER NOT NULL,
    CONSTRAINT "ProductSchema_facturaSinInvaId_fkey" FOREIGN KEY ("facturaSinInvaId") REFERENCES "FacturaSinInva" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscountSchema" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "amount" INTEGER,
    "cupon" BOOLEAN,
    "isValid" BOOLEAN,
    "facturaSinInvaId" INTEGER NOT NULL,
    CONSTRAINT "DiscountSchema_facturaSinInvaId_fkey" FOREIGN KEY ("facturaSinInvaId") REFERENCES "FacturaSinInva" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
