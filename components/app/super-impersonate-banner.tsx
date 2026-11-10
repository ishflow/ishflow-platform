'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function SuperImpersonateBanner({
  tenantName,
  tenantId,
}: {
  tenantName: string;
  tenantId: string;
}) {
  return (
    <Alert variant="destructive" className="fixed bottom-4 right-4 z-50 max-w-md shadow-lg">
      <AlertTitle>Impersonating tenant</AlertTitle>
      <AlertDescription>
        <span className="font-mono text-sm">{tenantName}</span>
      </AlertDescription>
      <form
        method="POST"
        action={`/super-admin/tenants/${tenantId}/impersonate/end`}
        className="mt-2"
      >
        <Button type="submit" variant="outline" size="sm">
          End session
        </Button>
      </form>
    </Alert>
  );
}
