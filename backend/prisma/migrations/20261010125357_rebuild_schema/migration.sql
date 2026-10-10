-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "deliveryCity" TEXT,
ADD COLUMN     "deliveryCounty" TEXT,
ADD COLUMN     "deliveryInstructions" TEXT,
ADD COLUMN     "deliveryPhone" TEXT,
ADD COLUMN     "recipientName" TEXT;

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "checkoutRequestId" TEXT NOT NULL,
    "merchantRequestId" TEXT,
    "phone" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "mpesaReceiptNumber" TEXT,
    "resultCode" INTEGER,
    "resultDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_checkoutRequestId_key" ON "payments"("checkoutRequestId");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
