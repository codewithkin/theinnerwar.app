-- AlterTable
ALTER TABLE "issue" ADD COLUMN     "lastTestAt" TIMESTAMP(3),
ADD COLUMN     "lastTestTo" TEXT;
