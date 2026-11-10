import type {
  BooleanFieldConfig,
  ColorFieldConfig,
  DateFieldConfig,
  DateTimeFieldConfig,
  DocNumberFieldConfig,
  DocRefFieldConfig,
  DocumentLinkFieldConfig,
  MoneyFieldConfig,
  NumberFieldConfig,
  ReferenceFieldConfig,
  StringFieldConfig,
  TextFieldConfig,
} from './types';

export const field = {
  string: (cfg: Omit<StringFieldConfig, 'type'>): StringFieldConfig => ({ ...cfg, type: 'string' }),
  text: (cfg: Omit<TextFieldConfig, 'type'>): TextFieldConfig => ({ ...cfg, type: 'text' }),
  number: (cfg: Omit<NumberFieldConfig, 'type'>): NumberFieldConfig => ({ ...cfg, type: 'number' }),
  money: (cfg: Omit<MoneyFieldConfig, 'type'>): MoneyFieldConfig => ({ ...cfg, type: 'money' }),
  boolean: (cfg: Omit<BooleanFieldConfig, 'type'>): BooleanFieldConfig => ({
    ...cfg,
    type: 'boolean',
  }),
  date: (cfg: Omit<DateFieldConfig, 'type'>): DateFieldConfig => ({ ...cfg, type: 'date' }),
  datetime: (cfg: Omit<DateTimeFieldConfig, 'type'>): DateTimeFieldConfig => ({
    ...cfg,
    type: 'datetime',
  }),
  reference: (cfg: Omit<ReferenceFieldConfig, 'type'>): ReferenceFieldConfig => ({
    ...cfg,
    type: 'reference',
  }),
  docNumber: (cfg: Omit<DocNumberFieldConfig, 'type'>): DocNumberFieldConfig => ({
    ...cfg,
    type: 'docNumber',
    autoIncrement: true,
  }),
  docRef: (cfg: Omit<DocRefFieldConfig, 'type'>): DocRefFieldConfig => ({
    ...cfg,
    type: 'docRef',
  }),
  documentLink: (cfg: Omit<DocumentLinkFieldConfig, 'type'>): DocumentLinkFieldConfig => ({
    ...cfg,
    type: 'documentLink',
  }),
  color: (cfg: Omit<ColorFieldConfig, 'type'>): ColorFieldConfig => ({ ...cfg, type: 'color' }),
};
