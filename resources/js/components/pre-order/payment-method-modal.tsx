import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';

export type PaymentSetting = {
    id?: number;
    payment_method: string;
    account_name?: string | null;
    account_number?: string | null;
    instructions?: string | null;
    payment_type: string;
    validation_type: string;
    validation_pattern: string | null;
    example: string | null;
    reference_prefix: string | null;
    auto_fill_prefix: boolean;
    reference_length: number | null;
    reference_required: boolean;
    is_active: boolean;
};

interface PaymentMethodModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingSetting: PaymentSetting | null;
    onSuccess: () => void;
}

export function PaymentMethodModal({ isOpen, onClose, editingSetting, onSuccess }: PaymentMethodModalProps) {
    const isEdit = !!editingSetting;

    const { data, setData, post, put, processing, errors, reset, clearErrors, transform } = useForm<PaymentSetting>({
        payment_method: '',
        account_name: '',
        account_number: '',
        instructions: '',
        payment_type: 'Bank',
        validation_type: 'Regex Validation',
        validation_pattern: '',
        example: '',
        reference_prefix: '',
        auto_fill_prefix: false,
        reference_length: null,
        reference_required: true,
        is_active: true,
    });

    useEffect(() => {
        if (isOpen) {
            clearErrors();
            if (editingSetting) {
                setData({
                    ...editingSetting,
                    account_name: editingSetting.account_name || '',
                    account_number: editingSetting.account_number || '',
                    instructions: editingSetting.instructions || '',
                    validation_pattern: editingSetting.validation_pattern || '',
                    example: editingSetting.example || '',
                    reference_prefix: editingSetting.reference_prefix || '',
                });
            } else {
                reset();
            }
        }
    }, [isOpen, editingSetting]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        transform((data) => ({
            ...data,
            validation_pattern:
                data.validation_type === 'No Validation' || !data.validation_pattern?.trim()
                    ? null
                    : data.validation_pattern,
            example: !data.example?.trim() ? null : data.example,
            reference_prefix: !data.reference_prefix?.trim() ? null : data.reference_prefix,
        }));

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                onSuccess();
                onClose();
            },
            onError: (err: any) => {
                const message = Object.values(err).flat()[0] || 'An error occurred';
                toast.error(message as string);
            },
        };

        if (isEdit && editingSetting?.id) {
            put(`/pre-order-payment-settings/${editingSetting.id}`, options);
        } else {
            post('/pre-order-payment-settings', options);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Payment Method' : 'Add New Payment Method'}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? 'Update the configurations for this payment method.' : 'Configure a new dynamic payment method for the system.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="payment_method">Payment Method Name *</Label>
                            <Input
                                id="payment_method"
                                value={data.payment_method}
                                onChange={(e) => setData('payment_method', e.target.value)}
                                placeholder="e.g. Awash Bank"
                                required
                            />
                            <InputError message={errors.payment_method} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="payment_type">Payment Type *</Label>
                            <Select value={data.payment_type} onValueChange={(value) => setData('payment_type', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Bank">Bank</SelectItem>
                                    <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                                    <SelectItem value="RTGS">RTGS</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={errors.payment_type} />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="account_name">Account Name</Label>
                            <Input
                                id="account_name"
                                value={data.account_name || ''}
                                onChange={(e) => setData('account_name', e.target.value)}
                                placeholder="e.g. Kaldis Coffee"
                            />
                            <InputError message={errors.account_name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="account_number">Account Number</Label>
                            <Input
                                id="account_number"
                                value={data.account_number || ''}
                                onChange={(e) => setData('account_number', e.target.value)}
                                placeholder="e.g. 1000714610167"
                            />
                            <InputError message={errors.account_number} />
                        </div>
                    </div>
                    
                    <div className="grid gap-2">
                        <Label htmlFor="instructions">Payment Instructions</Label>
                        <Input
                            id="instructions"
                            value={data.instructions || ''}
                            onChange={(e) => setData('instructions', e.target.value)}
                            placeholder="e.g. Please transfer the amount to this account and use FT for reference."
                        />
                        <InputError message={errors.instructions} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="validation_type">Validation Type *</Label>
                            <Select value={data.validation_type} onValueChange={(value) => setData('validation_type', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select validation type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Regex Validation">Regex Validation</SelectItem>
                                    <SelectItem value="No Validation">No Validation</SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={errors.validation_type} />
                        </div>

                        {data.validation_type === 'Regex Validation' && (
                            <div className="grid gap-2">
                                <Label htmlFor="validation_pattern">Regex Pattern</Label>
                                <Input
                                    id="validation_pattern"
                                    value={data.validation_pattern || ''}
                                    onChange={(e) => setData('validation_pattern', e.target.value)}
                                    placeholder="e.g. ^FT26[A-Za-z0-9]{8}$"
                                />
                                <InputError message={errors.validation_pattern} />
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="example">Example Reference</Label>
                            <Input
                                id="example"
                                value={data.example || ''}
                                onChange={(e) => setData('example', e.target.value)}
                                placeholder="e.g. FT26XXXXXXXX"
                            />
                            <InputError message={errors.example} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="reference_prefix">Reference Prefix</Label>
                            <Input
                                id="reference_prefix"
                                value={data.reference_prefix || ''}
                                onChange={(e) => setData('reference_prefix', e.target.value)}
                                placeholder="e.g. FT26"
                            />
                            <InputError message={errors.reference_prefix} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="reference_length">Reference Length</Label>
                            <Input
                                id="reference_length"
                                type="number"
                                value={data.reference_length || ''}
                                onChange={(e) => setData('reference_length', e.target.value ? parseInt(e.target.value) : null as any)}
                                placeholder="e.g. 12"
                                min="1"
                            />
                            <InputError message={errors.reference_length} />
                        </div>

                        <div className="flex items-center space-x-2 pt-8">
                            <Switch
                                id="auto_fill_prefix"
                                checked={data.auto_fill_prefix}
                                onCheckedChange={(checked) => setData('auto_fill_prefix', checked)}
                            />
                            <Label htmlFor="auto_fill_prefix">Auto-fill Prefix</Label>
                        </div>

                        <div className="flex items-center space-x-2 pt-8">
                            <Switch
                                id="reference_required"
                                checked={data.reference_required}
                                onCheckedChange={(checked) => setData('reference_required', checked)}
                            />
                            <Label htmlFor="reference_required">Transaction Reference Required</Label>
                        </div>

                        <div className="flex items-center space-x-2 pt-8">
                            <Switch
                                id="is_active"
                                checked={data.is_active}
                                onCheckedChange={(checked) => setData('is_active', checked)}
                            />
                            <Label htmlFor="is_active">Status (Active/Inactive)</Label>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={processing}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Saving...' : 'Save Payment Method'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
