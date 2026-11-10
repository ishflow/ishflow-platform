import { prisma } from '../platform/db';
import { withBypass } from '../platform/db/tenant-context';

const PRESERVED = new Set(['tenant', 'membership', 'role', 'role_scope']);

async function main() {
  const tenants: Array<{ id: string; name: string }> = await withBypass(async (tx) =>
    tx.$queryRawUnsafe(`SELECT id::text, name FROM tenant LIMIT 5`),
  );
  console.log('Tenants:', tenants);
  const target = tenants[0];
  if (!target) return;
  console.log(`\nWiping tenant ${target.id} (${target.name})…`);

  const tables = await withBypass(async (tx) =>
    tx.$queryRawUnsafe<Array<{ table_name: string }>>(`
      SELECT DISTINCT table_name FROM information_schema.columns
      WHERE table_schema='public' AND column_name='tenant_id'
    `),
  );
  let pending = tables.map((t) => t.table_name).filter((n) => !PRESERVED.has(n));
  let total = 0;
  for (let pass = 0; pass < 10 && pending.length > 0; pass++) {
    const next: string[] = [];
    for (const t of pending) {
      try {
        const n = await withBypass(async (tx) =>
          tx.$executeRawUnsafe(`DELETE FROM "${t}" WHERE tenant_id = $1::uuid`, target.id),
        );
        if (Number(n) > 0) console.log(`  pass ${pass + 1}: ${t} -${n}`);
        total += Number(n);
      } catch (e: any) {
        console.log(`  pass ${pass + 1}: ${t} BLOCKED (${e.message.split('\n')[0].slice(0, 80)})`);
        next.push(t);
      }
    }
    if (next.length === pending.length) {
      console.log('  (no progress, stopping)');
      break;
    }
    pending = next;
  }
  console.log(`\nTotal deleted: ${total}, remaining: ${JSON.stringify(pending)}`);
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
