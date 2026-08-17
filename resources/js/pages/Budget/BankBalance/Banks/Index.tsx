import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Budget', href: '/budget/banks' },
    { title: 'Bank Balance', href: '/budget/banks' },
    { title: 'Manage Banks', href: '/budget/banks' },
];

export default function Banks({ banks }: { banks: any[] }) {
    const { flash } = usePage<{ flash: { message?: string } }>().props;
    const { can } = usePermission();
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [editingBank, setEditingBank] = useState<any>(null);

    const { data, setData, post, put, reset, clearErrors, errors } = useForm({
        name: '',
        currency: 'ETB',
        status: true as boolean,
    });

    useEffect(() => {
        if (flash?.message) {
            toast.success(flash.message);
        }
    }, [flash?.message]);

    const filteredBanks = banks.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase())
    );

    function handleOpenModal(bank: any = null) {
        clearErrors();
        if (bank) {
            setEditingBank(bank);
            setData({
                name: bank.name,
                currency: bank.currency || 'ETB',
                status: bank.status,
            });
        } else {
            setEditingBank(null);
            reset();
        }
        setIsOpen(true);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (editingBank) {
            put(route('banks.update', editingBank.id), {
                onSuccess: () => setIsOpen(false),
            });
        } else {
            post(route('banks.store'), {
                onSuccess: () => setIsOpen(false),
            });
        }
    }

    function handleDelete(id: number) {
        if (confirm('Are you sure you want to delete this bank?')) {
            router.delete(route('banks.destroy', id));
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Banks" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle>Manage Banks</CardTitle>
                        <div className="flex gap-2 items-center">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search banks..."
                                className="w-64"
                            />
                            {can('manage banks') && (
                                <Button onClick={() => handleOpenModal()} variant="default">Add Bank</Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="bg-slate-500 dark:bg-slate-700">
                                <TableRow>
                                    <TableHead className="font-bold text-white">#</TableHead>
                                    <TableHead className="font-bold text-white">Name</TableHead>
                                    <TableHead className="font-bold text-white">Currency</TableHead>
                                    <TableHead className="font-bold text-white">Status</TableHead>
                                    <TableHead className="font-bold text-white">Created By</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBanks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center">No banks found.</TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBanks.map((bank, index) => (
                                        <TableRow key={bank.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{bank.name}</TableCell>
                                            <TableCell className="font-semibold text-slate-700">{bank.currency || 'ETB'}</TableCell>
                                            <TableCell>
                                                {bank.status ? (
                                                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Active</span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Inactive</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{bank.creator?.name}</TableCell>
                                            <TableCell>
                                                {can('manage banks') && (
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" size="sm" onClick={() => handleOpenModal(bank)}>Edit</Button>
                                                        <Button variant="destructive" size="sm" onClick={() => handleDelete(bank.id)}>Delete</Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingBank ? 'Edit Bank' : 'Add Bank'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Bank Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g. Commercial Bank of Ethiopia"
                                    required
                                />
                                {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <select
                                    id="currency"
                                    value={data.currency}
                                    onChange={(e) => setData('currency', e.target.value)}
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                >
                                    <option value="ETB">ETB</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                </select>
                                {errors.currency && <p className="text-red-500 text-sm">{errors.currency}</p>}
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="status"
                                    checked={data.status}
                                    onChange={(e) => setData('status', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                />
                                <Label htmlFor="status">Active</Label>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                                <Button type="submit">Save</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
