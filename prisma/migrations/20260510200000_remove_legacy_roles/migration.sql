-- Remove deprecated 'manager' and 'user' roles superseded by the 9-role 1C catalog
-- (chief_accountant + cashier + buyer + bookkeeper instead).

-- 1. Drop join rows so the Role rows can be deleted.
DELETE FROM "_MembershipRoles"
  WHERE "B" IN (SELECT id FROM "role" WHERE name IN ('manager', 'user'));

-- 2. Drop scope rows (FK restrict on role_scope.role_id).
DELETE FROM "role_scope"
  WHERE role_id IN (SELECT id FROM "role" WHERE name IN ('manager', 'user'));

-- 3. Finally drop the Role rows themselves.
DELETE FROM "role" WHERE name IN ('manager', 'user');
