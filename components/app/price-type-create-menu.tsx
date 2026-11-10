'use client';

import { useTabsOptional } from '@/components/app/tabs/use-tabs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

type Props = {
  locale: string;
  entity: string;
  newLabel: string;
};

/**
 * "Создать" split button for `sales.price_type` list page. Two options —
 * Static (Статический) and Dynamic (Динамический) — route to the entity's
 * /new page with `?kind=static|dynamic`, which locks the form's kind field.
 *
 * When the tab system is active, routes open in a new tab via `useTabsOptional`;
 * otherwise falls through to regular navigation.
 */
export function PriceTypeCreateMenu({ locale, entity, newLabel }: Props) {
  const tPriceType = useTranslations('priceType');
  const tabs = useTabsOptional();
  const router = useRouter();

  function open(kind: 'static' | 'dynamic') {
    const href = `/${locale}/catalogs/${entity}/new?kind=${kind}`;
    const title = kind === 'static' ? tPriceType('createStatic') : tPriceType('createDynamic');
    if (tabs) {
      const originHref =
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : undefined;
      tabs.openOrFocus(href, { title, originHref });
    } else {
      router.push(href);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button>
            {newLabel}
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => open('static')}>
          {tPriceType('kind.static')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => open('dynamic')}>
          {tPriceType('kind.dynamic')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
