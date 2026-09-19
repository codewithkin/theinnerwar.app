-- AlterEnum
ALTER TYPE "DeliveryStatus" ADD VALUE 'SENDING';

-- AlterTable
ALTER TABLE "delivery" ADD COLUMN     "claimedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "newsletter_settings" ADD COLUMN     "dkimSelector" TEXT;
