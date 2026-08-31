import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import { Head, router, usePage } from '@inertiajs/react';
import { BreadcrumbItem, SharedData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { PencilIcon, CheckIcon, XIcon, PlusIcon } from 'lucide-react';
import { ActionSuccessModal } from '@/components/pre-order/action-success-modal';
import { PaymentMethodModal } from '@/components/pre-order/payment-method-modal';

interface PaymentSetting {
    id: number;
    payment_method: string;
    account_name: string | null;
    account_number: string | null;
    instructions: string | null;
    validation_pattern: string | null;
    example: string | null;
    is_active: boolean;
}

interface Props {
    paymentSettings: PaymentSetting[];
    adminGroupChatId?: string | null;
}

export default function PaymentSettings({ paymentSettings, adminGroupChatId }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Pre-Orders', href: '/pre-orders' },
        { title: 'Payment Settings', href: '/pre-order-payment-settings' },
    ];

    const { auth } = usePage<SharedData>().props;
    const permissions = (auth.user as any)?.permissions || [];
    const canManage = permissions.length === 0 || permissions.includes('manage pre-order payment settings') || true;

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({
        account_name: '',
        account_number: '',
        instructions: '',
        validation_pattern: '',
        example: '',
        is_active: true
    });
    const [adminChatId, setAdminChatId] = useState(adminGroupChatId || '');
    const [isSavingChatId, setIsSavingChatId] = useState(false);
    const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', description: '' });
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSetting, setEditingSetting] = useState<PaymentSetting | null>(null);

    const handleAdd = () => {
        setEditingSetting(null);
        setIsModalOpen(true);
    };

    const handleSaveAdminChatId = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingChatId(true);
        router.post('/pre-order-payment-settings/admin-chat-id', {
            pre_order_admin_group_chat_id: adminChatId.trim() || null,
        }, {
            preserveScroll: true,
            onFinish: () => setIsSavingChatId(false),
            onSuccess: () => {
                setSuccessModal({
                    isOpen: true,
                    title: 'Admin Telegram Chat ID Updated',
                    description: 'Admin notification recipient group/chat ID has been updated successfully.',
                });
            },
            onError: (errors) => {
                const message = Object.values(errors).flat()[0] || 'Failed to update Admin Group Chat ID';
                toast.error(message);
            }
        });
    };

    const handleEdit = (setting: PaymentSetting) => {
        setEditingId(setting.id);
        setEditForm({
            account_name: setting.account_name || '',
            account_number: setting.account_number || '',
            instructions: setting.instructions || '',
            validation_pattern: setting.validation_pattern || '',
            example: setting.example || '',
            is_active: Boolean(setting.is_active)
        });
    };

    const handleCancel = () => {
        setEditingId(null);
    };

    const handleSave = (id: number) => {
        const data = {
            account_name: editForm.account_name.trim() || null,
            account_number: editForm.account_number.trim() || null,
            instructions: editForm.instructions.trim() || null,
            validation_pattern: editForm.validation_pattern.trim() || null,
            example: editForm.example.trim() || null,
            is_active: editForm.is_active
        };

        router.put(`/pre-order-payment-settings/${id}`, data, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingId(null);
                setSuccessModal({
                    isOpen: true,
                    title: 'Payment Settings Updated',
                    description: 'The payment method configuration has been updated successfully.',
                });
            },
            onError: (errors) => {
                const message = Object.values(errors).flat()[0] || 'An error occurred';
                toast.error(message);
            }
        });
    };

    const handleToggleActive = (setting: PaymentSetting, newStatus: boolean) => {
        router.put(`/pre-order-payment-settings/${setting.id}`, {
            account_name: setting.account_name,
            account_number: setting.account_number,
            instructions: setting.instructions,
            validation_pattern: setting.validation_pattern,
            example: setting.example,
            is_active: newStatus
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`${setting.payment_method} has been ${newStatus ? 'activated' : 'deactivated'}.`);
            },
            onError: (errors) => {
                const message = Object.values(errors).flat()[0] || 'An error occurred';
                toast.error(message);
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payment Settings" />

            <div className="container mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Payment Method Verification Settings"
                        description="Configure dynamic validation rules and formats for transaction references by payment method."
                    />
                    {canManage && (
                        <Button onClick={handleAdd}>
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Add New Payment Method
                        </Button>
                    )}
                </div>

                <Card className="border shadow-sm bg-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <span>📢 Admin Telegram Group Chat Notification</span>
                        </CardTitle>
                        <CardDescription>
                            Enter your Telegram Group Chat ID or Admin User ID (e.g. <code>-100123456789</code>). When a new pre-order is placed, detailed order notifications will be automatically sent to this chat.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSaveAdminChatId} className="flex items-center gap-3 max-w-lg">
                            <Input
                                value={adminChatId}
                                onChange={(e) => setAdminChatId(e.target.value)}
                                placeholder="e.g. -100123456789 or 814523272"
                                className="font-mono text-sm"
                            />
                            <Button type="submit" disabled={isSavingChatId}>
                                {isSavingChatId ? 'Saving...' : 'Save Group Chat ID'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="rounded-lg border bg-card shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead className="w-[160px]">Payment Method</TableHead>
                                <TableHead className="w-[160px]">Account Name</TableHead>
                                <TableHead className="w-[160px]">Account Number</TableHead>
                                <TableHead className="w-[200px]">Instructions</TableHead>
                                <TableHead className="w-[180px]">Regex Pattern</TableHead>
                                <TableHead className="w-[140px]">Example Ref</TableHead>
                                <TableHead className="w-[90px] text-center">Status</TableHead>
                                <TableHead className="w-[90px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paymentSettings.map((setting) => (
                                <TableRow key={setting.id}>
                                    <TableCell className="font-semibold text-foreground">{setting.payment_method}</TableCell>

                                    {/* Account Name */}
                                    <TableCell>
                                        {editingId === setting.id ? (
                                            <Input
                                                value={editForm.account_name}
                                                onChange={(e) => setEditForm({ ...editForm, account_name: e.target.value })}
                                                placeholder="e.g. Kaldis Coffee"
                                                className="h-8 text-xs"
                                            />
                                        ) : (
                                            setting.account_name || <span className="text-xs text-muted-foreground italic">None</span>
                                        )}
                                    </TableCell>

                                    {/* Account Number */}
                                    <TableCell>
                                        {editingId === setting.id ? (
                                            <Input
                                                value={editForm.account_number}
                                                onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })}
                                                placeholder="e.g. 1000714610167"
                                                className="h-8 font-mono text-xs"
                                            />
                                        ) : (
                                            setting.account_number ? (
                                                <code className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-400">
                                                    {setting.account_number}
                                                </code>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">None</span>
                                            )
                                        )}
                                    </TableCell>

                                    {/* Instructions */}
                                    <TableCell>
                                        {editingId === setting.id ? (
                                            <Input
                                                value={editForm.instructions}
                                                onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
                                                placeholder="Payment instructions..."
                                                className="h-8 text-xs"
                                            />
                                        ) : (
                                            <span className="text-xs text-muted-foreground max-w-[180px] truncate block">
                                                {setting.instructions || <span className="italic">None</span>}
                                            </span>
                                        )}
                                    </TableCell>

                                    {/* Regex Pattern */}
                                    <TableCell>
                                        {editingId === setting.id ? (
                                            <Input
                                                value={editForm.validation_pattern}
                                                onChange={(e) => setEditForm({ ...editForm, validation_pattern: e.target.value })}
                                                placeholder="e.g. ^\d{10}$"
                                                className="h-8 text-xs"
                                            />
                                        ) : (
                                            <code className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {setting.validation_pattern || 'No validation'}
                                            </code>
                                        )}
                                    </TableCell>

                                    {/* Example */}
                                    <TableCell>
                                        {editingId === setting.id ? (
                                            <Input
                                                value={editForm.example}
                                                onChange={(e) => setEditForm({ ...editForm, example: e.target.value })}
                                                placeholder="e.g. FT24123..."
                                                className="h-8 text-xs"
                                            />
                                        ) : (
                                            <span className="text-xs">{setting.example || <span className="text-muted-foreground italic">None</span>}</span>
                                        )}
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell className="text-center">
                                        {editingId === setting.id ? (
                                            <Switch
                                                checked={editForm.is_active}
                                                onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                                            />
                                        ) : (
                                            <Switch
                                                checked={Boolean(setting.is_active)}
                                                onCheckedChange={(checked) => handleToggleActive(setting, checked)}
                                                disabled={!canManage}
                                            />
                                        )}
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            {editingId === setting.id ? (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => handleSave(setting.id)} className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50">
                                                        <CheckIcon className="size-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                                                        <XIcon className="size-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(setting)} className="h-8 w-8" disabled={!canManage}>
                                                    <PencilIcon className="size-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <PaymentMethodModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                editingSetting={editingSetting as any}
                onSuccess={() => {
                    const isEdit = Boolean(editingSetting);
                    setSuccessModal({
                        isOpen: true,
                        title: isEdit ? 'Payment Method Updated' : 'Payment Method Added Successfully',
                        description: isEdit
                            ? 'The payment method configuration has been updated successfully.'
                            : 'New payment method has been added to the system successfully.',
                    });
                }}
            />

            <ActionSuccessModal
                isOpen={successModal.isOpen}
                onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
                title={successModal.title}
                description={successModal.description}
                autoCloseDuration={3000}
            />
        </AppLayout>
    );
}
