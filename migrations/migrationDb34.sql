-- CreateTable
CREATE TABLE "UsuarioClub" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "cedula" TEXT,
    "nivel" INTEGER,
    "avance" INTEGER DEFAULT 2,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioClub_email_key" ON "UsuarioClub"("email");
