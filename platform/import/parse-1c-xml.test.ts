import { describe, expect, it } from 'vitest';
import { parse1cEnterpriseData } from './parse-1c-xml';

// Representative EnterpriseData export: element-typed objects
// (<Справочник.Номенклатура>) AND attribute-typed objects
// (<Объект ИмяТипа="...">), Cyrillic + Latin field names, a no-name
// object, and an unhandled catalog (Валюты).
const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<Message xmlns="http://v8.1c.ru/edi/edi_stnd/EnterpriseData/1.0">
  <Body>
    <Справочник.Номенклатура>
      <Ссылка>11111111-1111-1111-1111-111111111111</Ссылка>
      <Наименование>Помада «Алый»</Наименование>
      <Штрихкод>4600000000017</Штрихкод>
    </Справочник.Номенклатура>
    <Справочник.Номенклатура>
      <Ссылка>22222222-2222-2222-2222-222222222222</Ссылка>
      <Наименование>Тушь для ресниц</Наименование>
    </Справочник.Номенклатура>
    <Справочник.Контрагенты>
      <Ссылка>33333333-3333-3333-3333-333333333333</Ссылка>
      <Наименование>ООО «Ромашка»</Наименование>
      <ЭлектроннаяПочта>info@romashka.ru</ЭлектроннаяПочта>
      <Телефон>+7 495 123-45-67</Телефон>
    </Справочник.Контрагенты>
    <Объект ИмяТипа="Справочник.Контрагенты">
      <Ид>44444444-4444-4444-4444-444444444444</Ид>
      <Name>Beta Cosmetics LLC</Name>
    </Объект>
    <Справочник.Номенклатура>
      <Ссылка>55555555-5555-5555-5555-555555555555</Ссылка>
    </Справочник.Номенклатура>
    <Справочник.Валюты>
      <Ссылка>66666666</Ссылка>
      <Наименование>Доллар США</Наименование>
    </Справочник.Валюты>
  </Body>
</Message>`;

describe('parse1cEnterpriseData', () => {
  it('maps Номенклатура → product rows with externalId + barcode', () => {
    const r = parse1cEnterpriseData(SAMPLE);
    expect(r.products).toHaveLength(2);
    expect(r.products[0]).toEqual({
      name: 'Помада «Алый»',
      externalId: '11111111-1111-1111-1111-111111111111',
      barcode: '4600000000017',
    });
    expect(r.products[1]).toEqual({
      name: 'Тушь для ресниц',
      externalId: '22222222-2222-2222-2222-222222222222',
    });
  });

  it('maps Контрагенты → counterparty rows incl. attribute-typed objects', () => {
    const r = parse1cEnterpriseData(SAMPLE);
    expect(r.counterparties).toHaveLength(2);
    expect(r.counterparties[0]).toMatchObject({
      name: 'ООО «Ромашка»',
      email: 'info@romashka.ru',
      phone: '+7 495 123-45-67',
    });
    const beta = r.counterparties.find((c) => c.name === 'Beta Cosmetics LLC');
    expect(beta?.externalId).toBe('44444444-4444-4444-4444-444444444444');
  });

  it('warns on no-name objects and unhandled catalogs, never throws on them', () => {
    const r = parse1cEnterpriseData(SAMPLE);
    // the 3rd Номенклатура (no Наименование) + Справочник.Валюты
    expect(r.warnings.length).toBe(2);
    expect(r.products.some((p) => !p.name)).toBe(false);
  });

  it('throws a clear error on malformed XML', () => {
    expect(() => parse1cEnterpriseData('<a><b></a>')).toThrow(/1C XML parse failed/i);
  });

  it('returns empty buckets for an empty message', () => {
    const r = parse1cEnterpriseData('<Message><Body></Body></Message>');
    expect(r).toEqual({ products: [], counterparties: [], warnings: [] });
  });

  // --- robustness (review fixes) ---

  it('drops an invalid email so the row still imports (no all-or-nothing abort)', () => {
    const xml = `<Message><Body>
      <Справочник.Контрагенты>
        <Ссылка>g1</Ссылка>
        <Наименование>Грязные данные</Наименование>
        <ЭлектроннаяПочта>+7 495 нет почты</ЭлектроннаяПочта>
      </Справочник.Контрагенты>
    </Body></Message>`;
    const r = parse1cEnterpriseData(xml);
    expect(r.counterparties).toHaveLength(1);
    expect(r.counterparties[0]).toEqual({ name: 'Грязные данные', externalId: 'g1' });
    expect(r.counterparties[0]?.email).toBeUndefined();
  });

  it('keeps a valid email', () => {
    const xml = `<Message><Body>
      <Справочник.Контрагенты><Наименование>OK</Наименование>
        <ЭлектроннаяПочта>ok@x.ru</ЭлектроннаяПочта></Справочник.Контрагенты>
    </Body></Message>`;
    expect(parse1cEnterpriseData(xml).counterparties[0]?.email).toBe('ok@x.ru');
  });

  it('caps a name longer than 200 chars (engine schema max) instead of failing it', () => {
    const long = 'Я'.repeat(250);
    const xml = `<Message><Body>
      <Справочник.Номенклатура><Наименование>${long}</Наименование></Справочник.Номенклатура>
    </Body></Message>`;
    expect(parse1cEnterpriseData(xml).products[0]?.name).toHaveLength(200);
  });

  it('prefers Ссылка (GUID) over Код as externalId, regardless of element order', () => {
    const xml = `<Message><Body>
      <Справочник.Номенклатура>
        <Код>CODE1</Код>
        <Ссылка>REF-GUID</Ссылка>
        <Наименование>Товар</Наименование>
      </Справочник.Номенклатура>
    </Body></Message>`;
    expect(parse1cEnterpriseData(xml).products[0]?.externalId).toBe('REF-GUID');
  });

  it('falls back to Код when no Ссылка/Ид is present', () => {
    const xml = `<Message><Body>
      <Справочник.Номенклатура><Код>ONLY-CODE</Код>
        <Наименование>Товар</Наименование></Справочник.Номенклатура>
    </Body></Message>`;
    expect(parse1cEnterpriseData(xml).products[0]?.externalId).toBe('ONLY-CODE');
  });

  it('finds objects nested under a wrapper tag instead of silently dropping them', () => {
    const xml = `<Message><Body>
      <Справочник>
        <Справочник.Номенклатура><Ссылка>n1</Ссылка>
          <Наименование>Вложенный товар</Наименование></Справочник.Номенклатура>
      </Справочник>
    </Body></Message>`;
    const r = parse1cEnterpriseData(xml);
    expect(r.products).toHaveLength(1);
    expect(r.products[0]?.name).toBe('Вложенный товар');
  });
});
