import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Budget', href: '/budget/banks' },
    { title: 'Bank Balance', href: '/budget/bank-branches' },
    { title: 'Manage Bank Branches', href: '/budget/bank-branches' },
];

export default function BankBranches({ bankBranches, banks }: { bankBranches: any[], banks: any[] }) {
    const { flash } = usePage<{ flash: { message?: string } }>().props;
    const { can } = usePermission();
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<any>(null);

    const { data, setData, post, put, reset, clearErrors, errors } = useForm({
        bank_id: '',
        name: '',
        status: true as boolean,
    });

    useEffect(() => {
        if (flash?.message) {
            toast.success(flash.message);
        }
    }, [flash?.message]);

    const filteredBranches = bankBranches.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        (b.bank?.name && b.bank.name.toLowerCase().includes(search.toLowerCase()))
    );

    function handleOpenModal(branch: any = null) {
        clearErrors();
        if (branch) {
            setEditingBranch(branch);
            setData({
                bank_id: branch.bank_id.toString(),
                name: branch.name,
                status: branch.status,
            });
        } else {
            setEditingBranch(null);
            reset();
        }
        setIsOpen(true);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (editingBranch) {
            put(route('bank-branches.update', editingBranch.id), {
                onSuccess: () => setIsOpen(false),
            });
        } else {
            post(route('bank-branches.store'), {
                onSuccess: () => setIsOpen(false),
            });
        }
    }

    function handleDelete(id: number) {
        if (confirm('Are you sure you want to delete this bank branch?')) {
            router.delete(route('bank-branches.destroy', id));
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Bank Branches" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle>Manage Bank Branches</CardTitle>
                        <div className="flex gap-2 items-center">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search branches..."
                                className="w-64"
                            />
                            {can('manage bank branches') && (
                                <Button onClick={() => handleOpenModal()} variant="default">Add Branch</Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="bg-slate-500 dark:bg-slate-700">
                                <TableRow>
                                    <TableHead className="font-bold text-white">#</TableHead>
                                    <TableHead className="font-bold text-white">Bank</TableHead>
                                    <TableHead className="font-bold text-white">Branch Name</TableHead>
                                    <TableHead className="font-bold text-white">Status</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBranches.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center">No branches found.</TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBranches.map((branch, index) => (
                                        <TableRow key={branch.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{branch.bank?.name}</TableCell>
                                            <TableCell>{branch.name}</TableCell>
                                            <TableCell>
                                                {branch.status ? (
                                                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Active</span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Inactive</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {can('manage bank branches') && (
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" size="sm" onClick={() => handleOpenModal(branch)}>Edit</Button>
                                                        <Button variant="destructive" size="sm" onClick={() => handleDelete(branch.id)}>Delete</Button>
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
                            <DialogTitle>{editingBranch ? 'Edit Bank Branch' : 'Add Bank Branch'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="bank_id">Bank</Label>
                                <Select value={data.bank_id} onValueChange={(val) => setData('bank_id', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a bank" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {banks.map((b) => (
                                            <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.bank_id && <p className="text-red-500 text-sm">{errors.bank_id}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Branch Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g. Arat Kilo Branch"
                                    required
                                />
                                {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
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
