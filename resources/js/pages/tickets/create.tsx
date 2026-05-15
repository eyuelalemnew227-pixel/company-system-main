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
import { Plus, Trash2, ChevronDown, ChevronUp, Layers, Package, ShoppingCart, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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
  // Beneficiary selection
  branches?: { id: number; name: string }[];
  allDepartments?: { id: number; name: string }[];
};

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Tickets', href: '/tickets' },
  { title: 'Create', href: '/tickets/create' },
];

export default function TicketCreate({ departments, mainCategories, subCategories, assets, severities, products, purchaseRequestCatId, purchaseDeptId, flash, isSparePartRequest, parentTicketId, sparePartCategories, spareParts, branches = [], allDepartments = [] }: PageProps) {
  const PURCHASE_REQUEST_CAT_ID = 26;
  const SPARE_PART_PURCHASE_REQUEST_CAT_ID = 27;

  const { data, setData, post, processing, errors, transform } = useForm({
    department_id: isSparePartRequest ? String(purchaseDeptId) : '',
    ticket_main_category_id: isSparePartRequest ? String(purchaseRequestCatId) : '',
    ticket_sub_category_id: '',
    ticket_asset_id: 'none',
    description: '',
    severity: severities[0] ?? '',
    preferred_deadline: '',
    products: [] as { product_id: string; quantity: string; uom: string; product_name?: string; product_code?: string; sub_category_id: string; sub_category_name: string }[],
    parent_ticket_id: parentTicketId ? String(parentTicketId) : '',
    is_spare_part_request: isSparePartRequest ?? false,
    beneficiary_branch_id: '',
    beneficiary_department_id: '',
  });

  const isSparePartMode = useMemo(() =>
    String(data.ticket_main_category_id) === String(SPARE_PART_PURCHASE_REQUEST_CAT_ID),
    [data.ticket_main_category_id]
  );

  const isPurchaseMode = useMemo(() =>
    String(data.ticket_main_category_id) === String(PURCHASE_REQUEST_CAT_ID),
    [data.ticket_main_category_id]
  );

  const isAnyPurchaseMode = isPurchaseMode || isSparePartMode;

  const [assetOpen, setAssetOpen] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    setData('is_spare_part_request', isSparePartMode);
  }, [isSparePartMode]);

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

  // Filter sub-categories based on mode.
  // For spare parts, use the backend-synced sparePartCategories which carries spare_part_category_id.
  // For products, keep using filteredSub (which has child_category_id from the DB).
  const effectiveFilteredSub = useMemo(() => {
    if (isSparePartMode && sparePartCategories?.length) {
      return sparePartCategories;
    }
    if (isPurchaseMode) {
      return filteredSub.filter(s => !!(s as any).child_category_id);
    }
    return filteredSub;
  }, [isSparePartMode, isPurchaseMode, filteredSub, sparePartCategories]);

  const selectedEffectiveSub = useMemo(
    () => effectiveFilteredSub.find((s) => String(s.id) === String(data.ticket_sub_category_id)),
    [effectiveFilteredSub, data.ticket_sub_category_id]
  );

  const groupedAddedProducts = useMemo(() => {
    return data.products.reduce((acc, p) => {
      if (!acc[p.sub_category_id]) acc[p.sub_category_id] = { name: p.sub_category_name, items: [] };
      acc[p.sub_category_id].items.push(p);
      return acc;
    }, {} as Record<string, { name: string; items: typeof data.products }>);
  }, [data.products]);

  const toggleCategory = (catId: string) => {
    const newSet = new Set(expandedCats);
    if (newSet.has(catId)) newSet.delete(catId);
    else newSet.add(catId);
    setExpandedCats(newSet);
  };

  // Switch between products and spare parts based on mode.
  // For spare parts: use sparePartCategories prop directly (has spare_part_category_id from backend sync).
  // For products: use the raw subCategories array (has child_category_id from DB).
  const filteredProducts = useMemo(
    () => {
      if (isSparePartMode && spareParts?.length) {
        const subCatId = data.ticket_sub_category_id;
        // Use sparePartCategories (authoritative source with spare_part_category_id)
        const sparePartCat = sparePartCategories?.find(s => String(s.id) === String(subCatId));
        const sparePartCatId = sparePartCat?.spare_part_category_id;

        const base = sparePartCatId
          ? spareParts.filter(sp => String(sp.spare_part_category_id) === String(sparePartCatId))
          : [];
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

      // For products: look up child_category_id from raw subCategories (all columns from DB)
      const subCatId = data.ticket_sub_category_id;
      const subCat = subCategories.find(s => String(s.id) === String(subCatId));
      const childCategoryId = (subCat as any)?.child_category_id;

      const base = childCategoryId
        ? products.filter((p) => String(p.child_category_id) === String(childCategoryId))
        : [];
      if (!productSearch) return base;
      const s = productSearch.toLowerCase();
      return base.filter(p => p.product_name.toLowerCase().includes(s) || p.product_code.toLowerCase().includes(s));
    },
    [isSparePartMode, spareParts, sparePartCategories, products, subCategories, productSearch, data.ticket_sub_category_id]
  );

  const removeProduct = (productId: string) => {
    const newProducts = data.products.filter(p => String(p.product_id) !== String(productId));
    setData('products', newProducts);
  };

  const updateProductQuantity = (productId: string, quantity: string, productName: string, productCode: string) => {
    const newProducts = [...data.products];
    const index = newProducts.findIndex(p => String(p.product_id) === String(productId));
    const subId = String(data.ticket_sub_category_id);
    const subName = selectedEffectiveSub?.name || selectedSub?.name || 'Unknown Category';

    if (quantity && parseFloat(quantity) > 0) {
      if (index > -1) {
        newProducts[index] = { ...newProducts[index], quantity };
      } else {
        newProducts.push({
          product_id: String(productId),
          quantity,
          uom: '',
          product_name: productName,
          product_code: productCode,
          sub_category_id: subId,
          sub_category_name: subName
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

              {isSparePartMode && (
                <Field label="Requested For Branch" error={(errors as any).beneficiary_branch_id}>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={data.beneficiary_branch_id}
                    onChange={(e) => setData('beneficiary_branch_id', e.target.value)}
                    required
                  >
                    <option value="">Select branch</option>
                    {(branches ?? []).map((b) => (
                      <option key={b.id} value={String(b.id)}>{b.name}</option>
                    ))}
                  </select>
                </Field>
              )}

              {isSparePartMode && (
                <Field label="Requested For Department (optional)" error={(errors as any).beneficiary_department_id}>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={data.beneficiary_department_id}
                    onChange={(e) => setData('beneficiary_department_id', e.target.value)}
                  >
                    <option value="">— None (optional) —</option>
                    {(allDepartments ?? []).map((d) => (
                      <option key={d.id} value={String(d.id)}>{d.name}</option>
                    ))}
                  </select>
                </Field>
              )}

              {!isAnyPurchaseMode && (
                <Field label="Description" error={errors.description}>
                  <Textarea
                    rows={4}
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                  />
                </Field>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={`Severity ${isAnyPurchaseMode ? '(optional)' : ''}`} error={errors.severity}>
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

              {isAnyPurchaseMode && (
                <div className="space-y-6">
                  {/* Added Items (Collapsed by Category) */}
                  {Object.keys(groupedAddedProducts).length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-primary font-bold px-1">
                        <ShoppingCart className="h-4 w-4" />
                        <h3>Added Items</h3>
                      </div>
                      <div className="grid gap-3">
                        {Object.entries(groupedAddedProducts).map(([catId, { name, items }]) => (
                          <Card key={catId} className="border-primary/20 shadow-sm overflow-hidden">
                            <Collapsible
                              open={expandedCats.has(catId)}
                              onOpenChange={() => toggleCategory(catId)}
                            >
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between p-3 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                      <Layers className="h-3.5 w-3.5" />
                                    </div>
                                    <div>
                                      <span className="text-sm font-bold">{name}</span>
                                      <Badge variant="secondary" className="ml-2 bg-background text-[10px] h-5 px-1.5">
                                        {items.length} {items.length === 1 ? 'item' : 'items'}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newProducts = data.products.filter(p => String(p.sub_category_id) !== String(catId));
                                        setData('products', newProducts);
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                    {expandedCats.has(catId) ? (
                                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="p-0 border-t bg-background">
                                  <Table>
                                    <TableHeader className="bg-muted/30">
                                      <TableRow className="hover:bg-transparent h-8">
                                        <TableHead className="h-8 text-[10px] font-bold uppercase tracking-wider pl-4">Product</TableHead>
                                        <TableHead className="h-8 text-[10px] font-bold uppercase tracking-wider text-right pr-4">Quantity</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {items.map((item, idx) => (
                                        <TableRow key={idx} className="h-10 hover:bg-muted/5">
                                          <TableCell className="py-2 pl-4">
                                            <div className="font-medium text-xs">{item.product_name}</div>
                                            <div className="text-[9px] text-muted-foreground font-mono">{item.product_code}</div>
                                          </TableCell>
                                          <TableCell className="py-2 text-right font-mono text-xs pr-4 font-bold text-primary flex items-center justify-end gap-2">
                                            {item.quantity}
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                              onClick={() => removeProduct(item.product_id)}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Current Selection Area */}
                  {(selectedEffectiveSub || selectedSub) && (
                    <div className="space-y-4 rounded-xl border p-5 bg-card shadow-sm border-primary/10">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                            <Plus className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold leading-none">
                              {isSparePartMode ? 'Select Spare Parts' : 'Select Products'}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {(selectedEffectiveSub || selectedSub)?.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Search in this category..."
                            className="h-9 text-xs w-full sm:w-64"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-4">Product Name & Code</TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-center w-[120px]">Quantity</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredProducts.length > 0 ? (
                              filteredProducts.map((p) => {
                                const selected = data.products.find(sp => String(sp.product_id) === String(p.id));
                                return (
                                  <TableRow key={p.id} className={cn(
                                    "transition-colors group",
                                    selected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/5"
                                  )}>
                                    <TableCell className="py-3 pl-4">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-bold text-xs group-hover:text-primary transition-colors">
                                          {p.product_name}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                          {p.product_code}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-2 text-center group-hover:bg-background/50 transition-colors">
                                      <div className="flex justify-center">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          className={cn(
                                            "h-8 w-24 text-right font-mono text-xs transition-all",
                                            selected ? "border-primary ring-1 ring-primary/20 bg-background" : "border-muted-foreground/20"
                                          )}
                                          value={selected?.quantity || ''}
                                          placeholder="0.00"
                                          onChange={(e) => updateProductQuantity(String(p.id), e.target.value, p.product_name, p.product_code)}
                                        />
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="h-32 text-center text-muted-foreground italic">
                                  No items found matching your search.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {errors.products && <p className="text-xs font-bold text-destructive">{errors.products}</p>}
                      {(errors as any)['products.*.quantity'] && <p className="text-xs font-bold text-destructive">Please ensure all quantities are valid numbers.</p>}
                    </div>
                  )}
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
