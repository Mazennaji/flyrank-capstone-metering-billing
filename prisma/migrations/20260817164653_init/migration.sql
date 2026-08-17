-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "stripe_customer_id" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "api_key" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "api_call_limit" INTEGER NOT NULL,
    "ai_token_limit" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" BIGINT NOT NULL,
    "token_breakdown" TEXT,
    "cost_cents" INTEGER NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "current_period_end" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "processed_webhook_events" (
    "stripe_event_id" TEXT NOT NULL PRIMARY KEY,
    "processed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_stripe_customer_id_key" ON "tenants"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_api_key_key" ON "tenants"("api_key");

-- CreateIndex
CREATE INDEX "usage_events_tenant_id_created_at_idx" ON "usage_events"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "usage_events_tenant_id_type_created_at_idx" ON "usage_events"("tenant_id", "type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "usage_events_tenant_id_idempotency_key_key" ON "usage_events"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_tenant_id_idx" ON "subscriptions"("tenant_id");
