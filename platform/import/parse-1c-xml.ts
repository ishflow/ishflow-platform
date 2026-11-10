import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { z } from 'zod';

/** Mirrors the import-engine schema cap so a 1C row never aborts the batch. */
const NAME_MAX = 200;
/** Same check the customer/supplier Zod schema applies; keeps rows importable. */
const EMAIL_OK = z.string().email();

/** One catalog object mapped into the import engine's row vocabulary. */
export type Imported1cRow = {
  name: string;
  /** 1C Ссылка/GUID — the dedup key carried into `externalId`. */
  externalId?: string;
  barcode?: string;
  email?: string;
  phone?: string;
};

export type Parsed1c = {
  products: Imported1cRow[];
  counterparties: Imported1cRow[];
  /** Human-readable notes about objects we skipped (no name / unhandled type). */
  warnings: string[];
};

type Kind = 'product' | 'counterparty';

// Field-name synonyms (normalized: lowercased, punctuation stripped).
const NAME_SYNS = ['наименование', 'наименованиеполное', 'имя', 'description', 'name'];
// Globally-unique 1C reference (GUID) — preferred dedup key, tried first.
const ID_PRIMARY_SYNS = ['ссылка', 'ид', 'ref', 'id', 'guid'];
// Per-database code — only unique within one company; used when no GUID exists.
const ID_FALLBACK_SYNS = ['код', 'code'];
const BARCODE_SYNS = ['штрихкод', 'barcode'];
const EMAIL_SYNS = ['электроннаяпочта', 'адресэп', 'почта', 'email', 'eposta'];
const PHONE_SYNS = ['телефон', 'тел', 'phone', 'telefon'];
// Attribute names that carry an object's 1C type (e.g. <Объект ИмяТипа="…">).
const TYPE_ATTRS = ['имятипа', 'тип', 'type', 'классификаторид', 'видсправочника'];

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '');
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Coerce a fast-xml-parser leaf (string, number, or { '#text': … }) to a trimmed string. */
function leaf(v: unknown): string | undefined {
  if (typeof v === 'string') return v.trim() || undefined;
  if (typeof v === 'number') return String(v);
  if (isObj(v) && '#text' in v) return leaf(v['#text']);
  return undefined;
}

function classifyType(typeStr: string): Kind | null {
  const n = norm(typeStr);
  if (n.includes('номенклатур') || n.includes('nomenklatur') || n.includes('product'))
    return 'product';
  if (n.includes('контрагент') || n.includes('kontragent') || n.includes('counterpart')) {
    return 'counterparty';
  }
  return null;
}

/** A node looks like a 1C catalog/document object if its tag or a type attr says so. */
function looksLike1cObject(tag: string, item: unknown): boolean {
  if (/^(справочник|документ|объект)/i.test(tag)) return true;
  if (isObj(item)) {
    for (const k of Object.keys(item)) {
      if (k.startsWith('@_') && TYPE_ATTRS.includes(norm(k.slice(2)))) return true;
    }
  }
  return false;
}

function classifyNode(tag: string, item: unknown): Kind | null {
  const fromTag = classifyType(tag);
  if (fromTag) return fromTag;
  if (isObj(item)) {
    for (const [k, v] of Object.entries(item)) {
      if (k.startsWith('@_') && TYPE_ATTRS.includes(norm(k.slice(2)))) {
        const kind = classifyType(leaf(v) ?? '');
        if (kind) return kind;
      }
    }
  }
  return null;
}

/** First child element or attribute whose normalized name matches a synonym. */
function fieldFrom(node: Record<string, unknown>, syns: string[]): string | undefined {
  for (const [k, v] of Object.entries(node)) {
    const name = k.startsWith('@_') ? k.slice(2) : k;
    if (name === '#text') continue;
    if (syns.includes(norm(name))) {
      const s = leaf(v);
      if (s) return s;
    }
  }
  return undefined;
}

function extractRow(item: unknown, kind: Kind): Imported1cRow | null {
  if (!isObj(item)) return null;
  const name = fieldFrom(item, NAME_SYNS);
  if (!name) return null;
  // Cap to the engine's schema max so an over-long 1C name degrades to a
  // truncated value instead of failing Zod and aborting the whole batch.
  const row: Imported1cRow = { name: name.slice(0, NAME_MAX) };
  // Prefer the globally-unique Ссылка/GUID over the per-database Код.
  const externalId = fieldFrom(item, ID_PRIMARY_SYNS) ?? fieldFrom(item, ID_FALLBACK_SYNS);
  if (externalId) row.externalId = externalId;
  if (kind === 'product') {
    const barcode = fieldFrom(item, BARCODE_SYNS);
    if (barcode) row.barcode = barcode;
  } else {
    // Drop a malformed email (common in 1C Контрагенты) so the row still
    // imports; the engine's email() check would otherwise reject the batch.
    const email = fieldFrom(item, EMAIL_SYNS);
    if (email && EMAIL_OK.safeParse(email).success) row.email = email;
    const phone = fieldFrom(item, PHONE_SYNS);
    if (phone) row.phone = phone;
  }
  return row;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
});

export function parse1cEnterpriseData(xml: string): Parsed1c {
  const valid = XMLValidator.validate(xml);
  if (valid !== true) {
    throw new Error(`1C XML parse failed: ${valid.err.msg}`);
  }
  let root: unknown;
  try {
    root = parser.parse(xml);
  } catch (err) {
    throw new Error(`1C XML parse failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const products: Imported1cRow[] = [];
  const counterparties: Imported1cRow[] = [];
  const warnings: string[] = [];

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const it of node) visit(it);
      return;
    }
    if (!isObj(node)) return;
    for (const [key, val] of Object.entries(node)) {
      if (key.startsWith('@_') || key === '#text' || key === '?xml') continue;
      const items = Array.isArray(val) ? val : [val];
      for (const item of items) {
        const kind = classifyNode(key, item);
        if (kind) {
          const row = extractRow(item, kind);
          if (row) (kind === 'product' ? products : counterparties).push(row);
          else warnings.push(`${key}: skipped — object has no name`);
        } else if (isObj(item)) {
          // Unclassified: could be a container (Message/Body) or a wrapper
          // around catalog objects. Recurse first so nested objects aren't
          // lost; only warn when a 1C-looking node yields nothing (e.g. an
          // unhandled catalog such as Справочник.Валюты).
          const before = products.length + counterparties.length;
          visit(item);
          const foundNothing = products.length + counterparties.length === before;
          if (foundNothing && looksLike1cObject(key, item)) {
            warnings.push(`unhandled 1C object type: ${key}`);
          }
        }
      }
    }
  };

  visit(root);
  return { products, counterparties, warnings };
}
