import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { getTenantUsers } from '@/platform/super-admin/tenant-detail';

export const dynamic = 'force-dynamic';

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function fullName(firstName: string | null, lastName: string | null, dash: string): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : dash;
}

function initialsFor(email: string, firstName: string | null, lastName: string | null): string {
  const first = firstName?.charAt(0) ?? '';
  const last = lastName?.charAt(0) ?? '';
  const initials = `${first}${last}`.toUpperCase().trim();
  if (initials) return initials;
  return email.charAt(0).toUpperCase();
}

export default async function TenantUsersPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const [users, dict] = await Promise.all([getTenantUsers(tenantId), getSuperAdminDict()]);
  const u = dict.tenantDetail.users;
  const dash = dict.common.dash;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{u.title.replace('{count}', String(users.length))}</h2>

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{u.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{u.columns.user}</TableHead>
                <TableHead>{u.columns.roles}</TableHead>
                <TableHead>{u.columns.joined}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.membershipId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        <AvatarFallback>
                          {initialsFor(user.email, user.firstName, user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {fullName(user.firstName, user.lastName, dash)}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.roles.length === 0 ? (
                      <span className="text-muted-foreground">{dash}</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge key={role} variant="secondary">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.joinedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
