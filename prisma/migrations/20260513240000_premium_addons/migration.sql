-- CreateTable: TenantAddon (per-tenant premium-addon entitlement)
CREATE TABLE "tenant_addon" (
    "tenant_id" UUID NOT NULL,
    "addon_key" TEXT NOT NULL,
    "enabled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled_by" UUID NOT NULL,
    "expires_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "tenant_addon_pkey" PRIMARY KEY ("tenant_id", "addon_key")
);

-- CreateIndex
CREATE INDEX "tenant_addon_tenant_id_idx" ON "tenant_addon"("tenant_id");

-- AddForeignKey
ALTER TABLE "tenant_addon"
  ADD CONSTRAINT "tenant_addon_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: tenant_addon
ALTER TABLE tenant_addon ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_addon FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_addon_tenant_isolation ON tenant_addon
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY tenant_addon_superuser_bypass ON tenant_addon
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
