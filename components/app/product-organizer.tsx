'use client';

import {
  assignProductsToCategory,
  assignProductsToGroup,
  createCategory,
  createGroup,
  removeProductsFromCategory,
  removeProductsFromGroup,
} from '@/app/[locale]/(app)/catalogs/inventory.product/actions';
import { TabOpenLink } from '@/components/app/tabs/tab-open-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ArrowRight, Folder, Package, Plus, Search, Settings, Tags, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

interface Product {
  id: string;
  name: string;
  categoryId: string | null;
  groupId: string | null;
}

interface Category {
  id: string;
  name: string;
  productCount: number;
}

interface Group {
  id: string;
  name: string;
  productCount: number;
}

interface ProductOrganizerProps {
  locale: string;
  products: Product[];
  categories: Category[];
  groups: Group[];
}

type AssignmentType = 'category' | 'group';

export function ProductOrganizer({ locale, products, categories, groups }: ProductOrganizerProps) {
  const t = useTranslations('productOrganizer');
  const [search, setSearch] = useState('');

  type FilterType = 'category' | 'group' | null;

  const [activeFilter, setActiveFilter] = useState<{
    type: FilterType;
    id: string | null;
  }>({ type: null, id: null });

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter.type === 'category' && activeFilter.id) {
      return p.categoryId === activeFilter.id;
    }
    if (activeFilter.type === 'group' && activeFilter.id) {
      return p.groupId === activeFilter.id;
    }

    return true;
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<AssignmentType>('category');
  const [selectedEntity, setSelectedEntity] = useState<Category | Group | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [dialogSearch, setDialogSearch] = useState('');
  const [isPending, startTransition] = useTransition();

  const openDialog = (type: AssignmentType, entity: Category | Group) => {
    setDialogType(type);
    setSelectedEntity(entity);
    setSelectedProductIds(new Set());
    setDialogSearch('');
    setDialogOpen(true);
  };

  const handleCategoryClick = (categoryId: string) => {
    setActiveFilter((prev) =>
      prev.type === 'category' && prev.id === categoryId
        ? { type: null, id: null }
        : { type: 'category', id: categoryId },
    );
  };

  const handleGroupClick = (groupId: string) => {
    setActiveFilter((prev) =>
      prev.type === 'group' && prev.id === groupId
        ? { type: null, id: null }
        : { type: 'group', id: groupId },
    );
  };

  const clearFilter = () => {
    setActiveFilter({ type: null, id: null });
  };

  const getAssignedProductIds = (): Set<string> => {
    if (!selectedEntity) return new Set();
    if (dialogType === 'category') {
      return new Set(products.filter((p) => p.categoryId === selectedEntity.id).map((p) => p.id));
    }
    return new Set(products.filter((p) => p.groupId === selectedEntity.id).map((p) => p.id));
  };

  const assignedProductIds = getAssignedProductIds();

  const dialogAvailableProducts = products.filter((p) => {
    if (assignedProductIds.has(p.id)) return false;
    if (dialogType === 'category' && p.categoryId) return false;
    if (dialogType === 'group' && p.groupId) return false;
    return p.name.toLowerCase().includes(dialogSearch.toLowerCase());
  });

  const dialogAssignedProducts = products.filter((p) => assignedProductIds.has(p.id));

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleAssign = () => {
    if (!selectedEntity || selectedProductIds.size === 0) return;

    startTransition(async () => {
      const productIds = Array.from(selectedProductIds);
      if (dialogType === 'category') {
        await assignProductsToCategory(locale, selectedEntity.id, productIds);
      } else {
        await assignProductsToGroup(locale, selectedEntity.id, productIds);
      }
      window.location.reload();
    });
  };

  const handleRemove = (productId: string) => {
    startTransition(async () => {
      if (dialogType === 'category') {
        await removeProductsFromCategory(locale, [productId]);
      } else {
        await removeProductsFromGroup(locale, [productId]);
      }
      window.location.reload();
    });
  };

  const handleCreateCategory = () => {
    const name = prompt('Kategori adı:');
    if (!name?.trim()) return;

    startTransition(async () => {
      const result = await createCategory(locale, name.trim());
      if (result.ok) {
        window.location.reload();
      } else {
        alert(`Hata: ${result.error}`);
      }
    });
  };

  const handleCreateGroup = () => {
    const name = prompt('Grup adı:');
    if (!name?.trim()) return;

    startTransition(async () => {
      const result = await createGroup(locale, name.trim());
      if (result.ok) {
        window.location.reload();
      } else {
        alert(`Hata: ${result.error}`);
      }
    });
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)]">
      {/* Left Panel - Products */}
      <div className="w-[40%] flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Package className="size-5 text-muted-foreground" />
          <h2 className="font-heading text-lg font-medium">{t('products')}</h2>
          <Badge variant="secondary">{filteredProducts.length}</Badge>
          {activeFilter.type && (
            <>
              <span className="text-muted-foreground">/</span>
              <Badge variant="outline" className="gap-1">
                {activeFilter.type === 'category'
                  ? categories.find((c) => c.id === activeFilter.id)?.name
                  : groups.find((g) => g.id === activeFilter.id)?.name}
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="h-3 w-3 p-0 hover:bg-transparent"
                  onClick={clearFilter}
                >
                  <X className="size-3" />
                </Button>
              </Badge>
            </>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchProducts')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {activeFilter.type && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={clearFilter}
          >
            <X className="size-4 mr-2" />
            {t('allProducts')}
          </Button>
        )}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead className="w-20 text-center">Kategori</TableHead>
                <TableHead className="w-20 text-center">Grup</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <TabOpenLink
                      href={`/${locale}/catalogs/inventory.product/${product.id}`}
                      className="text-foreground hover:text-primary hover:underline"
                      tabTitle={product.name}
                    >
                      {product.name}
                    </TabOpenLink>
                  </TableCell>
                  <TableCell className="text-center">
                    {product.categoryId ? (
                      <Badge variant="outline" className="text-xs">
                        {categories.find((c) => c.id === product.categoryId)?.name ?? '?'}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {product.groupId ? (
                      <Badge variant="outline" className="text-xs">
                        {groups.find((g) => g.id === product.groupId)?.name ?? '?'}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    {activeFilter.type ? t('noProductsMatchFilter') : t('noProductsFound')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Right Panel - Categories & Groups */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Categories */}
        <div className="flex-1 flex flex-col gap-3 rounded-xl border bg-card p-4 min-h-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tags className="size-5 text-muted-foreground" />
              <h2 className="font-heading text-lg font-medium">{t('categories')}</h2>
            </div>
            <Button size="sm" variant="outline" onClick={handleCreateCategory}>
              <Plus className="size-4" />
              Yeni
            </Button>
          </div>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('categories')}</TableHead>
                  <TableHead className="w-24 text-right">{t('productCount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow
                    key={category.id}
                    className={cn(
                      'cursor-pointer group',
                      activeFilter.type === 'category' && activeFilter.id === category.id
                        ? 'bg-primary/10 hover:bg-primary/20'
                        : 'hover:bg-muted/50',
                    )}
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    <TableCell>
                      <div className="flex items-center justify-between">
                        <span>{category.name}</span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDialog('category', category);
                          }}
                        >
                          <Settings className="size-3 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={category.productCount > 0 ? 'default' : 'secondary'}>
                        {category.productCount}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {categories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                      Kategori bulunamadı
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Groups */}
        <div className="flex-1 flex flex-col gap-3 rounded-xl border bg-card p-4 min-h-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="size-5 text-muted-foreground" />
              <h2 className="font-heading text-lg font-medium">{t('groups')}</h2>
            </div>
            <Button size="sm" variant="outline" onClick={handleCreateGroup}>
              <Plus className="size-4" />
              Yeni
            </Button>
          </div>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('groups')}</TableHead>
                  <TableHead className="w-24 text-right">{t('productCount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow
                    key={group.id}
                    className={cn(
                      'cursor-pointer group',
                      activeFilter.type === 'group' && activeFilter.id === group.id
                        ? 'bg-primary/10 hover:bg-primary/20'
                        : 'hover:bg-muted/50',
                    )}
                    onClick={() => handleGroupClick(group.id)}
                  >
                    <TableCell>
                      <div className="flex items-center justify-between">
                        <span>{group.name}</span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDialog('group', group);
                          }}
                        >
                          <Settings className="size-3 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={group.productCount > 0 ? 'default' : 'secondary'}>
                        {group.productCount}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {groups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                      Grup bulunamadı
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'category' ? t('categories') : t('groups')}: {selectedEntity?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-4 flex-1 min-h-0">
            {/* Available Products */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('searchProducts')}
                  value={dialogSearch}
                  onChange={(e) => setDialogSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex-1 overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>{t('allProducts')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dialogAvailableProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedProductIds.has(product.id)}
                            onCheckedChange={() => toggleProductSelection(product.id)}
                          />
                        </TableCell>
                        <TableCell>{product.name}</TableCell>
                      </TableRow>
                    ))}
                    {dialogAvailableProducts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                          Atanabilecek ürün yok
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex flex-col justify-center gap-2">
              <Button
                size="sm"
                onClick={handleAssign}
                disabled={selectedProductIds.size === 0 || isPending}
                className="whitespace-nowrap"
              >
                <ArrowRight className="size-4" />
                Ekle ({selectedProductIds.size})
              </Button>
            </div>

            {/* Assigned Products */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <div className="text-sm font-medium text-muted-foreground px-1">
                {dialogType === 'category' ? 'Kategorideki' : 'Gruptaki'} Ürünler
              </div>
              <div className="flex-1 overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ad</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dialogAssignedProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => handleRemove(product.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="size-3 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {dialogAssignedProducts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                          Henüz ürün yok
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
