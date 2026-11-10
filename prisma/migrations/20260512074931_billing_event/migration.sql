-- CreateTable
CREATE TABLE "billing_event" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "stripe_event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3),
    "processing_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_limit_override" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "plan_limit_override_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_event_stripe_event_id_key" ON "billing_event"("stripe_event_id");

-- CreateIndex
CREATE INDEX "billing_event_tenant_id_created_at_idx" ON "billing_event"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "billing_event_type_created_at_idx" ON "billing_event"("type", "created_at");

-- CreateIndex
CREATE INDEX "plan_limit_override_tenant_id_idx" ON "plan_limit_override"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_limit_override_tenant_id_key_key" ON "plan_limit_override"("tenant_id", "key");

-- AddForeignKey
ALTER TABLE "billing_event" ADD CONSTRAINT "billing_event_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_limit_override" ADD CONSTRAINT "plan_limit_override_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: billing_event
-- USING requires tenant match; null tenant_id is invisible to tenant-scoped sessions
-- (Stripe webhook inserts via withBypass before correlating to a tenant).
ALTER TABLE billing_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_event FORCE ROW LEVEL SECURITY;

CREATE POLICY billing_event_tenant_isolation ON billing_event
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (
    tenant_id IS NULL
    OR tenant_id = app_current_tenant_id()
  );

CREATE POLICY billing_event_superuser_bypass ON billing_event
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

-- RLS: plan_limit_override
ALTER TABLE plan_limit_override ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limit_override FORCE ROW LEVEL SECURITY;

CREATE POLICY plan_limit_override_tenant_isolation ON plan_limit_override
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY plan_limit_override_superuser_bypass ON plan_limit_override
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
