'use client';
import { assignRoleAction } from '@/app/[locale]/(app)/admin/members/actions';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

type RoleOption = { id: string; name: string; isSystem: boolean };

type RoleComboboxProps = {
  membershipId: string;
  options: RoleOption[];
  assignedIds: Set<string>;
  label: string;
};

export function RoleCombobox({ membershipId, options, assignedIds, label }: RoleComboboxProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('roleLabels');

  function assign(roleId: string) {
    startTransition(() => {
      void assignRoleAction(membershipId, roleId);
    });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" disabled={isPending}>
            <Plus className="mr-1 h-3 w-3" />
            {label}
          </Button>
        }
      />
      <PopoverContent className="p-0" align="start">
        <Command>
          <CommandInput placeholder="Search roles..." />
          <CommandList>
            <CommandEmpty>No roles</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const assigned = assignedIds.has(o.id);
                return (
                  <CommandItem key={o.id} value={o.name} onSelect={() => !assigned && assign(o.id)}>
                    <Check className={`mr-2 h-4 w-4 ${assigned ? 'opacity-100' : 'opacity-0'}`} />
                    {t(o.name as Parameters<typeof t>[0]) ?? o.name}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
