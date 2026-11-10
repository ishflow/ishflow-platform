'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

type BaseProps = {
  pending: boolean;
  onClose: () => void;
};

type CatalogProps = BaseProps & {
  kind: 'catalog';
  onSaveAndClose: () => void;
  onSave: () => void;
};

type DocumentEditProps = BaseProps & {
  kind: 'document';
  mode?: 'edit';
  onPostAndClose: () => void;
  onSave: () => void;
};

type DocumentPostedProps = BaseProps & {
  kind: 'document';
  mode: 'posted';
  onPostAndClose: () => void;
  onSave: () => void;
};

type DocumentProps = DocumentEditProps | DocumentPostedProps;

export function EntityCoverActions(props: CatalogProps | DocumentProps) {
  const t = useTranslations('cover');
  if (props.kind === 'catalog') {
    return (
      <div className="flex items-center gap-2">
        <Button onClick={props.onSaveAndClose} disabled={props.pending}>
          {t('saveAndClose')}
        </Button>
        <Button
          onClick={props.onSave}
          disabled={props.pending}
          className="bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80"
        >
          {t('save')}
        </Button>
        <Button variant="ghost" onClick={props.onClose} disabled={props.pending}>
          {t('close')}
        </Button>
      </div>
    );
  }
  if (props.kind === 'document') {
    return (
      <div className="flex items-center gap-2">
        <Button onClick={props.onPostAndClose} disabled={props.pending}>
          {t('postAndClose')}
        </Button>
        <Button
          onClick={props.onSave}
          disabled={props.pending}
          className="bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80"
        >
          {t('save')}
        </Button>
        <Button variant="ghost" onClick={props.onClose} disabled={props.pending}>
          {t('close')}
        </Button>
      </div>
    );
  }
  return null;
}
