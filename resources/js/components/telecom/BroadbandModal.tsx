import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from '@inertiajs/react';
import { Loader2, Wifi } from 'lucide-react';
import React, { useEffect } from 'react';
import { OptionItem } from './PhoneNumberModal';

export interface BroadbandRecord {
    id?: number;
    connection_name: string;
    account_number?: string;
    telecom_provider_id?: number | string;
    connection_type: string;
    speed_mbps?: number | string;
    monthly_cost: number | string;
    branch_id?: number | string;
    status: string;
    ip_address?: string;
    equipment_details?: string;
    contract_start_date?: string;
    contract_expiry_date?: string;
    notes?: string;
}

interface BroadbandModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: BroadbandRecord | null;
    providers: OptionItem[];
    branches: OptionItem[];
    onSuccessCallback?: () => void;
}

export default function BroadbandModal({
    open,
    onOpenChange,
    initialData,
    providers,
    branches,
    onSuccessCallback,
}: BroadbandModalProps) {
    const isEdit = !!initialData?.id;

    const { data, setData, post, put, processing, errors, reset } = useForm({
        connection_name: '',
        account_number: '',
        telecom_provider_id: '',
        connection_type: 'WTTx 4G/5G',
        speed_mbps: '',
        monthly_cost: 0,
        branch_id: '',
        status: 'Active',
        ip_address: '',
        equipment_details: '',
        contract_start_date: '',
        contract_expiry_date: '',
        notes: '',
    });

    useEffect(() => {
        if (initialData) {
            setData({
                connection_name: initialData.connection_name || '',
                account_number: initialData.account_number || '',
                telecom_provider_id: String(initialData.telecom_provider_id || ''),
                connection_type: initialData.connection_type || 'WTTx 4G/5G',
                speed_mbps: String(initialData.speed_mbps || ''),
                monthly_cost: Number(initialData.monthly_cost) || 0,
                branch_id: String(initialData.branch_id || ''),
                status: initialData.status || 'Active',
                ip_address: initialData.ip_address || '',
                equipment_details: initialData.equipment_details || '',
                contract_start_date: initialData.contract_start_date || '',
                contract_expiry_date: initialData.contract_expiry_date || '',
                notes: initialData.notes || '',
            } as any);
        } else {
            reset();
        }
    }, [initialData, open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                onOpenChange(false);
                reset();
                if (onSuccessCallback) onSuccessCallback();
            },
        };

        if (isEdit && initialData?.id) {
            put(`/telecom/broadbands/${initialData.id}`, options);
        } else {
            post('/telecom/broadbands', options);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-2xl max-h-[90vh] overflow-y-auto"
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Wifi className="h-5 w-5 text-purple-600" />
                        {isEdit ? 'Edit Broadband / WTTx Connection' : 'Add Broadband / WTTx Connection'}
                    </DialogTitle>
                </DialogHeader>
                <hr />

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="connection_name">Connection Name / Identifier <span className="text-destructive">*</span></Label>
                            <Input
                                id="connection_name"
                                placeholder="e.g. Bole HQ Primary Fiber WTTx"
                                value={data.connection_name}
                                onChange={(e) => setData('connection_name', e.target.value)}
                                className="mt-1"
                            />
                            <InputError message={errors.connection_name} />
                        </div>

                        <div>
                            <Label htmlFor="telecom_provider_id">Telecom Provider</Label>
                            <select
                                id="telecom_provider_id"
                                value={data.telecom_provider_id}
                                onChange={(e) => setData('telecom_provider_id', e.target.value)}
                                className="mt-1 w-full rounded-md border border-input bg-white p-2 text-sm dark:bg-slate-950"
                            >
                                <option value="">Select Provider...</option>
                                {providers.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.telecom_provider_id} />
                        </div>

                        <div>
                            <Label htmlFor="connection_type">Connection Type <span className="text-destructive">*</span></Label>
                            <select
                                id="connection_type"
                                value={data.connection_type}
                                onChange={(e) => setData('connection_type', e.target.value)}
                                className="mt-1 w-full rounded-md border border-input bg-white p-2 text-sm dark:bg-slate-950"
                            >
                                <option value="WTTx 4G/5G">WTTx (Fixed Wireless)</option>
                                <option value="Fiber Broadband">Fiber Broadband (FTTH/FTTB)</option>
                                <option value="ADSL Copper">ADSL / Copper Broadband</option>
                                <option value="Leased Line">Dedicated Leased Line</option>
                                <option value="VSAT Satellite">VSAT Satellite</option>
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="account_number">Account / Circuit No.</Label>
                            <Input
                                id="account_number"
                                placeholder="e.g. CKT-99120"
                                value={data.account_number}
                                onChange={(e) => setData('account_number', e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="branch_id">Branch / Location</Label>
                            <select
                                id="branch_id"
                                value={data.branch_id}
                                onChange={(e) => setData('branch_id', e.target.value)}
                                className="mt-1 w-full rounded-md border border-input bg-white p-2 text-sm dark:bg-slate-950"
                            >
                                <option value="">Select Branch...</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="speed_mbps">Speed (Mbps)</Label>
                            <Input
                                id="speed_mbps"
                                type="number"
                                placeholder="e.g. 50"
                                value={data.speed_mbps}
                                onChange={(e) => setData('speed_mbps', e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="monthly_cost">Monthly Cost (ETB) <span className="text-destructive">*</span></Label>
                            <Input
                                id="monthly_cost"
                                type="number"
                                step="0.01"
                                value={data.monthly_cost}
                                onChange={(e) => setData('monthly_cost', parseFloat(e.target.value) || 0)}
                                className="mt-1 font-mono"
                            />
                            <InputError message={errors.monthly_cost} />
                        </div>

                        <div>
                            <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
                            <select
                                id="status"
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value)}
                                className="mt-1 w-full rounded-md border border-input bg-white p-2 text-sm dark:bg-slate-950"
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Suspended">Suspended</option>
                                <option value="Under Installation">Under Installation</option>
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="ip_address">Static IP Address (if applicable)</Label>
                            <Input
                                id="ip_address"
                                placeholder="e.g. 197.156.xx.xx"
                                value={data.ip_address}
                                onChange={(e) => setData('ip_address', e.target.value)}
                                className="mt-1 font-mono text-xs"
                            />
                        </div>

                        <div>
                            <Label htmlFor="contract_expiry_date">Contract Expiry Date</Label>
                            <Input
                                id="contract_expiry_date"
                                type="date"
                                value={data.contract_expiry_date}
                                onChange={(e) => setData('contract_expiry_date', e.target.value)}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={processing} className="gap-1.5 bg-purple-600 hover:bg-purple-700">
                            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                            <span>{isEdit ? 'Save Changes' : 'Add Broadband Connection'}</span>
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
