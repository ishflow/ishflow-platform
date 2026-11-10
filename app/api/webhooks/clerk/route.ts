import {
  handleOrganizationCreated,
  handleOrganizationDeleted,
  handleOrganizationMembershipCreated,
  handleOrganizationMembershipDeleted,
  handleOrganizationMembershipUpdated,
  handleOrganizationUpdated,
  handleUserCreated,
  handleUserDeleted,
  handleUserUpdated,
  membershipPayloadSchema,
  orgDeletedPayloadSchema,
  orgPayloadSchema,
  userDeletedPayloadSchema,
  userPayloadSchema,
} from '@/platform/auth/clerk-sync';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'webhook_secret_missing' }, { status: 500 });
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'missing_svix_headers' }, { status: 400 });
  }

  const body = await req.text();
  let evt: { type: string; data: unknown };
  try {
    evt = new Webhook(secret).verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as { type: string; data: unknown };
  } catch {
    return NextResponse.json({ error: 'signature_verification_failed' }, { status: 400 });
  }

  try {
    switch (evt.type) {
      case 'user.created':
        await handleUserCreated(userPayloadSchema.parse(evt.data));
        break;
      case 'user.updated':
        await handleUserUpdated(userPayloadSchema.parse(evt.data));
        break;
      case 'user.deleted':
        await handleUserDeleted(userDeletedPayloadSchema.parse(evt.data));
        break;
      case 'organization.created':
        await handleOrganizationCreated(orgPayloadSchema.parse(evt.data));
        break;
      case 'organization.updated':
        await handleOrganizationUpdated(orgPayloadSchema.parse(evt.data));
        break;
      case 'organization.deleted':
        await handleOrganizationDeleted(orgDeletedPayloadSchema.parse(evt.data));
        break;
      case 'organizationMembership.created':
        await handleOrganizationMembershipCreated(membershipPayloadSchema.parse(evt.data));
        break;
      case 'organizationMembership.updated':
        await handleOrganizationMembershipUpdated(membershipPayloadSchema.parse(evt.data));
        break;
      case 'organizationMembership.deleted':
        await handleOrganizationMembershipDeleted(membershipPayloadSchema.parse(evt.data));
        break;
      default:
        return NextResponse.json({ ok: true, skipped: evt.type });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Don't echo raw error text to the caller (Prisma/internal leak); log it
    // server-side instead. Finding H7.
    console.error('[clerk webhook] handler failed', error);
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 });
  }
}
