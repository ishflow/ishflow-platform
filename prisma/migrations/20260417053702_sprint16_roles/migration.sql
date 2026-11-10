-- CreateEnum
CREATE TYPE "ScopeOperator" AS ENUM ('equals', 'in_', 'contextEquals');

-- CreateTable
CREATE TABLE "role" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_scope" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "entity_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "operator" "ScopeOperator" NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_scope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MembershipRoles" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE INDEX "role_tenant_id_idx" ON "role"("tenant_id");

-- CreateIndex
CREATE INDEX "role_permissions_idx" ON "role" USING GIN ("permissions");

-- CreateIndex
CREATE UNIQUE INDEX "role_tenant_id_name_key" ON "role"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "role_scope_role_id_idx" ON "role_scope"("role_id");

-- CreateIndex
CREATE INDEX "role_scope_entity_id_idx" ON "role_scope"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "_MembershipRoles_AB_unique" ON "_MembershipRoles"("A", "B");

-- CreateIndex
CREATE INDEX "_MembershipRoles_B_index" ON "_MembershipRoles"("B");

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_scope" ADD CONSTRAINT "role_scope_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MembershipRoles" ADD CONSTRAINT "_MembershipRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MembershipRoles" ADD CONSTRAINT "_MembershipRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
