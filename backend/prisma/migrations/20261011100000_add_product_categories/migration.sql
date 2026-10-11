CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

INSERT INTO "categories" ("id", "name", "slug", "updatedAt") VALUES
    ('00000000-0000-4000-8000-000000000001', 'Electronics', 'electronics', CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000002', 'Clothing', 'clothing', CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000003', 'Home & Living', 'home-living', CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000004', 'Accessories', 'accessories', CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000005', 'Uncategorized', 'uncategorized', CURRENT_TIMESTAMP);

CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

ALTER TABLE "products" ADD COLUMN "categoryId" UUID;
UPDATE "products"
SET "categoryId" = '00000000-0000-4000-8000-000000000005'
WHERE "categoryId" IS NULL;
ALTER TABLE "products" ALTER COLUMN "categoryId" SET NOT NULL;

CREATE INDEX "products_categoryId_isActive_idx" ON "products"("categoryId", "isActive");
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;