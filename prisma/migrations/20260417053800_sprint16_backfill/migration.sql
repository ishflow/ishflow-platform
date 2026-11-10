-- Seed system roles for every active tenant
WITH defs(name, description, permissions) AS (
  VALUES
    ('owner',   'Full access. Auto-assigned to the Clerk organization owner.', ARRAY['*:*']),
    ('admin',   'Full access. Clerk organization admins receive this role.',   ARRAY['*:*']),
    ('manager', 'Read, write, post, unpost everything except admin pages.',    ARRAY['*:read','*:write','*:post','*:unpost']),
    ('user',    'Read everything; post sales invoices and payments.',
      ARRAY['*:read',
            'sales.invoice:write','sales.invoice:post','sales.invoice:unpost',
            'sales.payment_received:write','sales.payment_received:post','sales.payment_received:unpost',
            'purchases.payment_sent:write','purchases.payment_sent:post','purchases.payment_sent:unpost']),
    ('viewer',  'Read-only access to everything.',                              ARRAY['*:read'])
)
INSERT INTO role (id, tenant_id, name, description, is_system, permissions, created_at, updated_at)
SELECT gen_random_uuid(), t.id, d.name, d.description, TRUE, d.permissions, NOW(), NOW()
FROM tenant t CROSS JOIN defs d
WHERE t.deleted_at IS NULL
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Translate existing Membership.roles (enum array) into _MembershipRoles rows
INSERT INTO "_MembershipRoles" ("A", "B")
SELECT m.id, r.id
FROM membership m
JOIN role r
  ON r.tenant_id = m.tenant_id
 AND r.name = ANY(m.roles::text[])
ON CONFLICT DO NOTHING;
