import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useMemo, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Option = {
  id: number;
  name: string;
  bar_code?: string | null;
  article_code?: string | null;
  department_id?: number;
  ticket_main_category_id?: number;
  ticket_sub_category_id?: number;
};

type PageProps = {
  departments: Option[];
  mainCategories: (Option & { ticket_main_category_id?: number })[];
  subCategories: Option[];
  assets: Option[];
  severities: string[];
  flash: { message?: string };
};

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Tickets', href: '/tickets' },
  { title: 'Create', href: '/tickets/create' },
];

export default function TicketCreate({ departments, mainCategories, subCategories, assets, severities, flash }: PageProps) {
  const { data, setData, post, processing, errors, transform } = useForm({
    department_id: '',
    ticket_main_category_id: '',
    ticket_sub_category_id: '',
    ticket_asset_id: 'none',
    description: '',
    severity: severities[0] ?? '',
    preferred_deadline: '',
  });
  const [assetOpen, setAssetOpen] = useState(false);

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
                      {filteredSub.map((c) => (
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

              <Field label="Description" error={errors.description}>
                <Textarea rows={4} value={data.description} onChange={(e) => setData('description', e.target.value)} required />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Severity" error={errors.severity}>
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

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
