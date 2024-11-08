-- CreateTable
CREATE TABLE "Publication" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "titles" TEXT[],

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Publication_uid_key" ON "Publication"("uid");
