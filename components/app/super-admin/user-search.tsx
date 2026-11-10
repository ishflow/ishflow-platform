import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SuperAdminDict } from '@/platform/super-admin/dict';
import type { UserSearchResult } from '@/platform/super-admin/search-users';
import Link from 'next/link';

interface UserSearchProps {
  q: string;
  results: UserSearchResult[];
  dict: SuperAdminDict;
}

function initials(email: string, firstName: string | null, lastName: string | null): string {
  if (firstName || lastName) {
    return [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  }
  return email.slice(0, 1).toUpperCase();
}

function truncate(value: string, max = 18): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

export function UserSearch({ q, results, dict }: UserSearchProps) {
  const trimmed = q.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < 2;
  const hasQuery = trimmed.length >= 2;
  const u = dict.users;
  const dash = dict.common.dash;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{u.title}</h1>
        <p className="text-sm text-muted-foreground">{u.subtitle}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{u.searchTitle}</CardTitle>
          <CardDescription>{u.searchDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            method="GET"
            action="/super-admin/users"
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="user-search-q">{u.queryLabel}</Label>
              <Input
                id="user-search-q"
                type="search"
                name="q"
                defaultValue={q}
                placeholder={u.queryPlaceholder}
                autoComplete="off"
                minLength={2}
              />
            </div>
            <Button type="submit">{u.apply}</Button>
          </form>
        </CardContent>
      </Card>

      {tooShort ? (
        <Card>
          <CardHeader>
            <CardTitle>{u.states.tooShortTitle}</CardTitle>
            <CardDescription>{u.states.tooShortDescription}</CardDescription>
          </CardHeader>
        </Card>
      ) : !hasQuery ? (
        <Card>
          <CardHeader>
            <CardTitle>{u.states.noQueryTitle}</CardTitle>
            <CardDescription>
              {u.states.noQueryDescriptionPrefix}
              <strong>{u.states.noQueryDescriptionAction}</strong>.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{u.states.noMatchesTitle}</CardTitle>
            <CardDescription>
              {u.states.noMatchesDescriptionPrefix} <span className="font-mono">{trimmed}</span>.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{u.columns.user}</TableHead>
                <TableHead className="w-[18%]">{u.columns.memberships}</TableHead>
                <TableHead className="w-[24%]">{u.columns.firstTenant}</TableHead>
                <TableHead className="w-[22%]">{u.columns.clerkId}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((user) => {
                const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
                const firstMembership = user.memberships[0] ?? null;
                return (
                  <TableRow key={user.id} className={user.deletedAt ? 'opacity-60' : undefined}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {initials(user.email, user.firstName, user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/super-admin/users/${user.id}`}
                              className="truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
                            >
                              {user.email}
                            </Link>
                            {user.deletedAt ? (
                              <Badge variant="outline" className="text-xs">
                                {u.deletedBadge}
                              </Badge>
                            ) : null}
                          </div>
                          {fullName ? (
                            <span className="truncate text-xs text-muted-foreground">
                              {fullName}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.memberships.length === 0 ? (
                        <span className="text-xs text-muted-foreground">{u.noneText}</span>
                      ) : (
                        <Badge variant="secondary">{user.memberships.length}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {firstMembership ? (
                        <Link
                          href={`/super-admin/tenants/${firstMembership.tenantId}`}
                          className="text-sm text-foreground underline-offset-4 hover:underline"
                        >
                          {firstMembership.tenantName}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">{dash}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className="font-mono text-xs text-muted-foreground"
                        title={user.clerkId}
                      >
                        {truncate(user.clerkId, 22)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
