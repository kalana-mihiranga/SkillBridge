-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MENTEE', 'MENTOR');

-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('SENIOR', 'STAFF', 'PRINCIPAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "seniority" "Seniority",
    "rate" INTEGER,
    "currency" TEXT,
    "timezone" TEXT,
    "bio" TEXT,
    "domains" TEXT[],
    "badges" TEXT[],
    "packages" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
