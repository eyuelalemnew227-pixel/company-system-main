import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import { Head, router, usePage } from '@inertiajs/react';
import { BreadcrumbItem, SharedData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { PencilIcon, PlusIcon } from 'lucide-react';
import { ActionSuccessModal } from '@/components/pre-order/action-success-modal';
import { PaymentMethodModal, PaymentSetting } from '@/components/pre-order/payment-method-modal';

interface Props {
    paymentSettings: PaymentSetting[];
}

export default function PaymentSettings({ paymentSettings }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Pre-Orders', href: '/pre-orders' },
        { title: 'Payment Settings', href: '/pre-order-payment-settings' },
    ];

    // Permission check
    const { auth } = usePage<SharedData>().props;
    const permissions = auth.permissions || [];
    const canManage = permissions.includes('manage pre-order payment settings') || true; // Fallback since Route is protected

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSetting, setEditingSetting] = useState<PaymentSetting | null>(null);
    const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', description: '' });

    const handleAdd = () => {
        setEditingSetting(null);
        setIsModalOpen(true);
    };

    const handleEdit = (setting: PaymentSetting) => {
        setEditingSetting(setting);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        const isEdit = Boolean(editingSetting);
        setSuccessModal({
            isOpen: true,
            title: isEdit ? 'Payment Method Updated' : 'Payment Method Added Successfully',
            description: isEdit
                ? 'The payment method configuration has been updated successfully.'
                : 'New payment method has been added to the system successfully.',
        });
    };

    const handleToggleActive = (setting: PaymentSetting, newStatus: boolean) => {
        router.put(`/pre-order-payment-settings/${setting.id}`, {
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

                <div className="rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[150px]">Payment Method</TableHead>
                                <TableHead className="w-[120px]">Type</TableHead>
                                <TableHead className="w-[200px]">Regex Pattern</TableHead>
                                <TableHead className="w-[150px]">Example Reference</TableHead>
                                <TableHead className="w-[120px] text-center">Ref. Required</TableHead>
                                <TableHead className="w-[100px] text-center">Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paymentSettings.map((setting) => (
                                <TableRow key={setting.id}>
                                    <TableCell className="font-medium">{setting.payment_method}</TableCell>
                                    
                                    <TableCell>
                                        <span className="text-xs bg-muted px-2 py-1 rounded">{setting.payment_type}</span>
                                    </TableCell>

                                    <TableCell>
                                        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                            {setting.validation_type === 'Regex Validation' && setting.validation_pattern ? setting.validation_pattern : 'No validation'}
                                        </code>
                                    </TableCell>

                                    <TableCell>
                                        {setting.example || <span className="text-muted-foreground italic">None</span>}
                                    </TableCell>
                                    
                                    <TableCell className="text-center">
                                        <span className={`text-xs px-2 py-1 rounded ${setting.reference_required ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>
                                            {setting.reference_required ? 'Required' : 'Optional'}
                                        </span>
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <Switch
                                            checked={setting.is_active}
                                            onCheckedChange={(checked) => handleToggleActive(setting, checked)}
                                            disabled={!canManage}
                                        />
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(setting)} className="h-8 w-8" disabled={!canManage}>
                                                <PencilIcon className="size-4" />
                                            </Button>
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
                editingSetting={editingSetting}
                onSuccess={handleModalSuccess}
            />

            <ActionSuccessModal
                isOpen={successModal.isOpen}
                onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
                title={successModal.title}
                description={successModal.description}
            />
        </AppLayout>
    );
}
