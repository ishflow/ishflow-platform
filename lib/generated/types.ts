// GENERATED FILE — do not edit by hand. Run `pnpm generate`.

export interface AssetsFixedAsset {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  inventoryNumber: string | null;
  category: string | null;
  manufacturer: string | null;
  serialNumber: string | null;
  acquisitionDate: Date | null;
  acquisitionCost: string | null;
  usefulLifeMonths: number | null;
  depreciationMethod: string | null;
  status: string | null;
  location: string | null;
  responsibleId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
export interface InventoryProduct {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  categoryId: string | null;
  groupId: string | null;
  barcode: string | null;
  externalId: string | null;
  unit: string | null;
  costPrice: string | null;
  listPrice: string | null;
  minStock: number | null;
  maxStock: number | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
export interface InventoryProductCategory {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
export interface InventoryProductGroup {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
export interface InventoryWarehouse {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
export interface PurchasesSupplier {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  externalId: string | null;
  assignedBuyerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
export interface SalesCustomer {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  defaultPriceType: string | null;
  assignedRepId: string | null;
  externalId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
export interface SalesPriceAgreement {
  id: string;
  tenantId: string;
  code: string;
  counterparty: string;
  product: string;
  fixedPrice: string;
  validFrom: Date;
  validTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
export interface SalesPriceType {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  kind: string;
  description: string | null;
  basePriceType: string | null;
  markupPct: number | null;
  isDefault: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
export interface TreasuryBankAccount {
  id: string;
  tenantId: string;
  name: string;
  bankName: string | null;
  accountNo: string;
  bic: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
export interface TreasuryCashRegister {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  openingBalance: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}