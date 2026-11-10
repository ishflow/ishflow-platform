-- role
ALTER TABLE role ENABLE ROW LEVEL SECURITY;
ALTER TABLE role FORCE  ROW LEVEL SECURITY;

CREATE POLICY role_tenant_isolation ON role
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY role_superuser_bypass ON role
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

-- role_scope (inherits tenant through role)
ALTER TABLE role_scope ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_scope FORCE  ROW LEVEL SECURITY;

CREATE POLICY role_scope_tenant_isolation ON role_scope
  USING (EXISTS (
    SELECT 1 FROM role r
    WHERE r.id = role_scope.role_id
      AND r.tenant_id = app_current_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM role r
    WHERE r.id = role_scope.role_id
      AND r.tenant_id = app_current_tenant_id()
  ));

CREATE POLICY role_scope_superuser_bypass ON role_scope
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

-- Prisma implicit m:n join table for Membership<->Role
ALTER TABLE "_MembershipRoles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_MembershipRoles" FORCE  ROW LEVEL SECURITY;

CREATE POLICY membership_roles_tenant_isolation ON "_MembershipRoles"
  USING (EXISTS (
    SELECT 1 FROM membership m
    WHERE m.id = "_MembershipRoles"."A"
      AND m.tenant_id = app_current_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM membership m
    WHERE m.id = "_MembershipRoles"."A"
      AND m.tenant_id = app_current_tenant_id()
  ));

CREATE POLICY membership_roles_superuser_bypass ON "_MembershipRoles"
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
