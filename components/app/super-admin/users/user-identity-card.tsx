import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import type { SuperAdminProDict } from '@/platform/super-admin/pro-messages';
import type { UserDetail } from '@/platform/super-admin/user-detail/load-user-detail';

function initials(email: string, firstName: string | null, lastName: string | null): string {
  if (firstName || lastName) {
    return [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  }
  return email.slice(0, 1).toUpperCase();
}

function formatTimestamp(date: Date): string {
  return new Date(date).toISOString();
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell className="w-40 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </TableCell>
      <TableCell className="text-sm text-foreground">{children}</TableCell>
    </TableRow>
  );
}

interface UserIdentityCardProps {
  user: UserDetail;
  dict: SuperAdminProDict['users']['detail'];
  dash: string;
}

export function UserIdentityCard({ user, dict, dash }: UserIdentityCardProps) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.identityCard.title}</CardTitle>
        <CardDescription>{dict.identityCard.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Avatar className="size-16">
            {user.imageUrl ? <AvatarImage src={user.imageUrl} alt={user.email} /> : null}
            <AvatarFallback className="text-lg">
              {initials(user.email, user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-foreground">
                {fullName ?? user.email}
              </span>
              {user.deletedAt ? (
                <Badge variant="outline" className="text-xs">
                  {dict.deletedBadge}
                </Badge>
              ) : null}
            </div>
            <Table>
              <TableBody>
                <Row label={dict.identityRows.email}>
                  <span className="text-sm text-foreground">{user.email}</span>
                </Row>
                <Row label={dict.identityRows.name}>
                  {fullName ? (
                    <span className="text-sm text-foreground">{fullName}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">{dash}</span>
                  )}
                </Row>
                <Row label={dict.identityRows.clerkId}>
                  <span className="font-mono text-xs text-muted-foreground">{user.clerkId}</span>
                </Row>
                <Row label={dict.identityRows.userId}>
                  <span className="font-mono text-xs text-muted-foreground">{user.id}</span>
                </Row>
                <Row label={dict.identityRows.createdAt}>
                  <span className="font-mono text-xs tabular-nums">
                    {formatTimestamp(user.createdAt)}
                  </span>
                </Row>
                <Row label={dict.identityRows.deletedAt}>
                  {user.deletedAt ? (
                    <span className="font-mono text-xs tabular-nums">
                      {formatTimestamp(user.deletedAt)}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">{dash}</span>
                  )}
                </Row>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
