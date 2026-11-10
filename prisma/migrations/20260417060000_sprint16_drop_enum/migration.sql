-- Sprint 16 final cut: drop the legacy MembershipRole enum + column.
-- All reads now flow through Membership.roles (Role[] relation via
-- _MembershipRoles join table seeded by the prior backfill migration).
--
-- WARNING FOR PROD DEPLOY:
-- Ship this migration AFTER the prior three migrations (sprint16_roles,
-- sprint16_rls_roles, sprint16_backfill) have been live long enough to
-- confirm the backfill translated every tenant's memberships correctly.
-- Once this migration runs the enum type and the legacy array column are
-- gone — rollback requires a point-in-time restore.

ALTER TABLE "membership" DROP COLUMN "roles";
DROP TYPE "MembershipRole";
