-- Extend ApiKeyScope enum with platform_admin (required for MCP super-admin tools).
ALTER TYPE "api_key_scope" ADD VALUE 'platform_admin';

-- Audit log source column (web | mobile | api_v1 | mcp). Nullable for back-compat.
ALTER TABLE "audit_log" ADD COLUMN "source" VARCHAR(16);
ALTER TABLE "platform_audit_log" ADD COLUMN "source" VARCHAR(16);
