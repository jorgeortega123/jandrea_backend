-- CreateTable
CREATE TABLE "imageFromGallery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isVideo" BOOLEAN,
    "src" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT
);
