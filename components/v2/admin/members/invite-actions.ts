'use server';

import { inviteMemberAction } from '@/app/[locale]/(app)/admin/members/actions';

export type InviteState = { ok: true } | { ok: false; error: string } | null;

export async function inviteMemberV2Action(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  return inviteMemberAction(formData);
}
