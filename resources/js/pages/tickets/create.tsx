import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useMemo, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';

type Option = {
  id: number;
  name: string;
  bar_code?: string | null;
  article_code?: string | null;
  department_id?: number;
  ticket_main_category_id?: number;
  ticket_sub_category_id?: number;
  child_category_id?: number;
};

type Product = {
  id: number;
  product_name: string;
  product_code: string;
  child_category_id: number;
};

type SparePartItem = {
  id: number;
  name: string;
  article_code?: string | null;
  description?: string | null;
  spare_part_category_id: number;
};

type SparePartCat = {
  id: number;
  name: string;
  spare_part_category_id: number;
};

type PageProps = {
  departments: Option[];
  mainCategories: (Option & { ticket_main_category_id?: number })[];
  subCategories: Option[];
  assets: Option[];
  severities: string[];
  products: Product[];
  purchaseRequestCatId: number;
  purchaseDeptId: number;
  flash: { message?: string };
  // Spare part request props
  isSparePartRequest?: boolean;
  parentTicketId?: number | null;
  sparePartCategories?: SparePartCat[];
  spareParts?: SparePartItem[];
};

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Tickets', href: '/tickets' },
  { title: 'Create', href: '/tickets/create' },
];

export default function TicketCreate({ departments, mainCategories, subCategories, assets, severities, products, purchaseRequestCatId, purchaseDeptId, flash, isSparePartRequest, parentTicketId, sparePartCategories, spareParts }: PageProps) {
  const { data, setData, post, processing, errors, transform } = useForm({
    department_id: isSparePartRequest ? String(purchaseDeptId) : '',
    ticket_main_category_id: isSparePartRequest ? String(purchaseRequestCatId) : '',
    ticket_sub_category_id: '',
    ticket_asset_id: 'none',
    description: '',
    severity: severities[0] ?? '',
    preferred_deadline: '',
    products: [] as { product_id: string; quantity: string; uom: string; product_name?: string; product_code?: string }[],
    parent_ticket_id: parentTicketId ? String(parentTicketId) : '',
    is_spare_part_request: isSparePartRequest ?? false,
  });
  const [assetOpen, setAssetOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    transform((data) => ({
      ...data,
      ticket_asset_id: data.ticket_asset_id === 'none' ? null : data.ticket_asset_id,
    }));
  }, [transform]);

  useEffect(() => {
    if (flash?.message) toast.success(flash.message);
  }, [flash?.message]);

  const filteredMain = useMemo(
    () => mainCategories.filter((m) => String(m.department_id) === String(data.department_id)),
    [mainCategories, data.department_id]
  );

  const filteredSub = useMemo(
    () => subCategories.filter((s) => String(s.ticket_main_category_id) === String(data.ticket_main_category_id)),
    [subCategories, data.ticket_main_category_id]
  );

  const filteredAssets = useMemo(
    () =>
      assets.filter(
        (a) =>
          (!a.ticket_sub_category_id || String(a.ticket_sub_category_id) === String(data.ticket_sub_category_id)) &&
          String(a.department_id) === String(data.department_id)
      ),
    [assets, data.ticket_sub_category_id, data.department_id]
  );

  const selectedSub = useMemo(
    () => subCategories.find((s) => String(s.id) === String(data.ticket_sub_category_id)),
    [subCategories, data.ticket_sub_category_id]
  );

  // In spare part mode, use the pre-synchronized sub-categories from backend
  const effectiveFilteredSub = useMemo(() => {
    if (isSparePartRequest && sparePartCategories?.length) {
      return sparePartCategories;
    }
    return filteredSub;
  }, [isSparePartRequest, sparePartCategories, filteredSub]);

  const selectedEffectiveSub = useMemo(
    () => effectiveFilteredSub.find((s) => String(s.id) === String(data.ticket_sub_category_id)),
    [effectiveFilteredSub, data.ticket_sub_category_id]
  );

  // In spare part mode, filter spare parts by their category instead of products
  const filteredProducts = useMemo(
    () => {
      if (isSparePartRequest && spareParts?.length) {
        const subCatId = data.ticket_sub_category_id;
        const subCat = sparePartCategories?.find(s => String(s.id) === String(subCatId));
        const sparePartCatId = subCat?.spare_part_category_id;

        const base = sparePartCatId
          ? spareParts.filter(sp => String(sp.spare_part_category_id) === String(sparePartCatId))
          : [];
        // Map spare parts to product-like shape for the modal
        const mapped = base.map(sp => ({
          id: sp.id,
          product_name: sp.name,
          product_code: sp.article_code || '',
          child_category_id: sp.spare_part_category_id,
        }));
        if (!productSearch) return mapped;
        const s = productSearch.toLowerCase();
        return mapped.filter(p => p.product_name.toLowerCase().includes(s) || p.product_code.toLowerCase().includes(s));
      }
      const base = selectedSub?.child_category_id
        ? products.filter((p) => String(p.child_category_id) === String(selectedSub.child_category_id))
        : [];
      if (!productSearch) return base;
      const s = productSearch.toLowerCase();
      return base.filter(p => p.product_name.toLowerCase().includes(s) || p.product_code.toLowerCase().includes(s));
    },
    [isSparePartRequest, spareParts, products, selectedSub, productSearch, data.ticket_sub_category_id]
  );

  const removeProduct = (index: number) => {
    const newProducts = [...data.products];
    newProducts.splice(index, 1);
    setData('products', newProducts);
  };

  const updateProductQuantity = (productId: string, quantity: string, productName: string, productCode: string) => {
    const newProducts = [...data.products];
    const index = newProducts.findIndex(p => String(p.product_id) === String(productId));

    if (quantity && parseFloat(quantity) > 0) {
      if (index > -1) {
        newProducts[index] = { ...newProducts[index], quantity };
      } else {
        newProducts.push({
          product_id: String(productId),
          quantity,
          uom: '',
          product_name: productName,
          product_code: productCode
        });
      }
    } else if (index > -1) {
      newProducts.splice(index, 1);
    }

    setData('products', newProducts);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('tickets.store'));
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Create Ticket" />
      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Create Ticket</CardTitle>
            <Button asChild variant="outline">
              <Link href={route('tickets.index')}>Back to list</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Department" error={errors.department_id}>
                  <Select value={data.department_id} onValueChange={(v) => setData('department_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Main Category" error={errors.ticket_main_category_id}>
                  <Select value={data.ticket_main_category_id} onValueChange={(v) => setData('ticket_main_category_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select main category" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredMain.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Sub Category" error={errors.ticket_sub_category_id}>
                  <Select value={data.ticket_sub_category_id} onValueChange={(v) => setData('ticket_sub_category_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub category" />
                    </SelectTrigger>
                    <SelectContent>
                      {effectiveFilteredSub.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {['127', '13706'].includes(String(data.department_id)) && (
                  <Field label="Asset (optional)" error={errors.ticket_asset_id}>
                    <Popover open={assetOpen} onOpenChange={setAssetOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={assetOpen}
                          className="w-full justify-between font-normal"
                        >
                          {data.ticket_asset_id && data.ticket_asset_id !== 'none'
                            ? (() => { const a = filteredAssets.find(a => String(a.id) === data.ticket_asset_id); return a ? `${a.name}${a.bar_code ? ` (${a.bar_code})` : a.article_code ? ` (${a.article_code})` : ''}` : 'Select asset'; })()
                            : 'None (optional)'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command filter={(value, search) => {
                          if (value.toLowerCase().includes(search.toLowerCase())) return 1
                          return 0
                        }}>
                          <CommandInput placeholder="Search asset..." />
                          <CommandList>
                            <CommandEmpty>No asset found.</CommandEmpty>
                            <CommandGroup>
                              <div className="flex items-center px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
                                <div className="mr-6 w-4"></div>
                                <div className="grid grid-cols-6 gap-2 w-full">
                                  <span className="col-span-3">Name</span>
                                  <span className="col-span-1.5">Article</span>
                                  <span className="col-span-1.5 text-right">Barcode</span>
                                </div>
                              </div>
                              <CommandItem
                                value="none"
                                onSelect={() => { setData('ticket_asset_id', 'none'); setAssetOpen(false); }}
                              >
                                <Check className={cn('mr-2 h-4 w-4 shrink-0', data.ticket_asset_id === 'none' ? 'opacity-100' : 'opacity-0')} />
                                <div className="grid grid-cols-6 gap-2 w-full text-xs">
                                  <span className="col-span-full italic text-muted-foreground">None (optional)</span>
                                </div>
                              </CommandItem>
                              {filteredAssets.map((a) => (
                                <CommandItem
                                  key={a.id}
                                  value={`${a.name} ${a.bar_code ?? ''} ${a.article_code ?? ''}`}
                                  onSelect={() => { setData('ticket_asset_id', String(a.id)); setAssetOpen(false); }}
                                  className="flex items-center"
                                >
                                  <Check className={cn('mr-2 h-4 w-4 shrink-0', String(a.id) === data.ticket_asset_id ? 'opacity-100' : 'opacity-0')} />
                                  <div className="grid grid-cols-6 gap-2 w-full text-xs">
                                    <span className="col-span-3 font-medium truncate">{a.name}</span>
                                    <span className="col-span-1.5 text-muted-foreground tabular-nums truncate">
                                      {a.article_code || '—'}
                                    </span>
                                    <span className="col-span-1.5 text-muted-foreground tabular-nums truncate text-right">
                                      {a.bar_code || '—'}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </Field>
                )}
              </div>

              {String(data.ticket_main_category_id) !== String(purchaseRequestCatId) && (
                <Field label="Description" error={errors.description}>
                  <Textarea
                    rows={4}
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                  />
                </Field>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={`Severity ${String(data.ticket_main_category_id) === String(purchaseRequestCatId) ? '(optional)' : ''}`} error={errors.severity}>
                  <Select value={data.severity} onValueChange={(v) => setData('severity', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      {severities.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Preferred Deadline" error={errors.preferred_deadline}>
                  <Input type="date" value={data.preferred_deadline} onChange={(e) => setData('preferred_deadline', e.target.value)} />
                </Field>
              </div>

              {String(data.ticket_main_category_id) === String(purchaseRequestCatId) && (selectedEffectiveSub || selectedSub) && (
                <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      {isSparePartRequest ? 'Requested Spare Parts' : 'Requested Products'} ({(selectedEffectiveSub || selectedSub)?.name})
                    </h3>
                    <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          <Plus className="mr-2 h-4 w-4" /> {isSparePartRequest ? 'Select Spare Parts' : 'Select Products'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0">
                        <DialogHeader className="p-6 pb-2">
                          <DialogTitle>{isSparePartRequest ? 'Select Spare Parts' : 'Select Products'} - {(selectedEffectiveSub || selectedSub)?.name}</DialogTitle>
                          <div className="pt-4">
                            <Input
                              placeholder="Search products..."
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                            />
                          </div>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto p-6 pt-2">
                          {filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {filteredProducts.map((p) => {
                                const selected = data.products.find(sp => String(sp.product_id) === String(p.id));
                                return (
                                  <div key={p.id} className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border bg-background transition-colors",
                                    selected ? "border-primary ring-1 ring-primary/20" : "hover:border-primary/50"
                                  )}>
                                    <div className="flex-1 min-w-0 pr-4">
                                      <div className="font-medium truncate">{p.product_name}</div>
                                      <div className="text-[10px] text-muted-foreground truncate">{p.product_code}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="h-8 w-20 text-right font-mono"
                                        value={selected?.quantity || ''}
                                        placeholder="0"
                                        onChange={(e) => updateProductQuantity(String(p.id), e.target.value, p.product_name, p.product_code)}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="py-12 text-center text-muted-foreground italic">
                              No products found.
                            </div>
                          )}
                        </div>
                        <DialogFooter className="p-6 pt-2 bg-muted/30">
                          <div className="flex items-center justify-between w-full">
                            <div className="text-sm font-medium">
                              {data.products.length} {isSparePartRequest ? 'spare parts' : 'products'} selected
                            </div>
                            <Button type="button" onClick={() => setProductModalOpen(false)}>
                              Done
                            </Button>
                          </div>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {data.products.length > 0 ? (
                    <div className="border rounded-md overflow-hidden bg-background">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Product</th>
                            <th className="px-3 py-2 text-center font-semibold w-24">Quantity</th>
                            <th className="px-3 py-2 text-right font-semibold w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {data.products.map((p, idx) => (
                            <tr key={idx} className="hover:bg-muted/10 transition-colors">
                              <td className="px-3 py-2">
                                <div className="font-medium">{p.product_name}</div>
                                <div className="text-[10px] text-muted-foreground">{p.product_code}</div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="h-8 text-right font-mono w-24 ml-auto"
                                  value={p.quantity}
                                  onChange={(e) => updateProductQuantity(p.product_id, e.target.value, p.product_name || '', p.product_code || '')}
                                  required
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  onClick={() => removeProduct(idx)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="border border-dashed rounded-md p-8 text-center bg-background/50">
                      <p className="text-xs text-muted-foreground italic">
                        No products selected yet. Click "Select Products" to begin.
                      </p>
                    </div>
                  )}
                  {errors.products && <p className="text-sm text-red-600">{errors.products}</p>}
                  {(errors as any)['products.*.quantity'] && <p className="text-sm text-red-600">Please provide a valid quantity for all products.</p>}
                </div>
              )}

              <CardFooter className="px-0">
                <Button type="submit" disabled={processing}>
                  Submit Ticket
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
