/**
 * Token budget for the MCP `tools/list` response.
 *
 * MCP clients spend prompt tokens on the tool catalog before any user input,
 * so the full payload has to leave headroom for the actual conversation. The
 * spec's target is < 30k tokens for `tools/list` and < 1k tokens per
 * individual tool description. 4 chars/token is the standard
 * OpenAI/Anthropic rule of thumb (close enough for budgeting).
 *
 * This test is leaf-only — no DB, no env, no engine boot — so it runs in the
 * default package vitest pass without any setup.
 */
import { describe, expect, it } from 'vitest';
import { listTools } from '../server';

function tokens(s: string): number {
  return Math.ceil(s.length / 4);
}

describe('tool description token budget', () => {
  it('total tools/list payload stays under 30,000 tokens', () => {
    const payload = JSON.stringify(listTools());
    const total = tokens(payload);
    // Surfaced via console.log so the actual size lands in CI output — useful
    // when a tool description grows and we want to see how close to the cap
    // we are without waiting for the assertion to fire.
    // eslint-disable-next-line no-console
    console.log(`tools/list payload: ${payload.length} chars, ~${total} tokens`);
    expect(total).toBeLessThan(30_000);
  });

  it('individual tool descriptions stay under 1,000 tokens each', () => {
    const tools = listTools();
    for (const t of tools) {
      const desc = t.description ?? '';
      const tk = tokens(desc);
      if (tk > 1000) {
        throw new Error(`Tool ${t.name} description is ${tk} tokens — over 1000 budget`);
      }
    }
  });
});
