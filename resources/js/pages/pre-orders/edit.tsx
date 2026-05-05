import { type BreadcrumbItem } from '@/types';
import { type PreOrder, type PreOrderProduct, type OrderType, type CollectionDay } from '@/types/pre-order';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useMemo, useState, useEffect } from 'react';
import { StatusConfirmationDialog } from '@/components/pre-order/status-confirmation-dialog';
import { ActionSuccessModal } from '@/components/pre-order/action-success-modal';
import { toast } from 'sonner';

import { SharedData } from '@/types';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Pre-Orders', href: '/pre-orders' },
    { title: 'Edit Order', href: '#' },
];

type Props = {
    preOrder: PreOrder;
    branches: Array<{ id: number; name: string }>;
    collectionDays: CollectionDay[];
    orderTypes: OrderType[];
    products: PreOrderProduct[];
    isRegisteringUser: boolean;
    userPermissions: {
        update_all: boolean;
        update_walkin: boolean;
        update_regular: boolean;
        update_all_status: boolean;
        mark_paid: boolean;
        can_cancel: boolean;
        mark_late_payment: boolean;
    };
    paymentSettings: Array<{ payment_method: string; example: string | null }>;
};

type OrderItem = {
    product_id: number;
    quantity: number;
};

export default function Edit({ preOrder, branches, collectionDays, orderTypes, products, isRegisteringUser, userPermissions, paymentSettings }: Props) {
    const { data, setData, put, processing, errors } = useForm<{
        first_name: string;
        father_name: string;
        surname: string;
        phone_number: string;
        order_type_id: string;
        collection_day_id: string;
        collection_branch_id: string;
        voucher_code?: string;
        transaction_reference?: string;
        status: string;
        late_payment: boolean;
        payment_method: string;
        items: OrderItem[];
    }>({
        first_name: preOrder.first_name,
        father_name: preOrder.father_name || '',
        surname: preOrder.surname || '',
        phone_number: preOrder.phone_number.startsWith('+251')
            ? preOrder.phone_number.substring(4) // Remove +251 prefix
            : preOrder.phone_number,
        order_type_id: preOrder.order_type_id.toString(),
        collection_day_id: preOrder.collection_day_id.toString(),
        collection_branch_id: preOrder.collection_branch_id.toString(),
        voucher_code: preOrder.voucher_code || '',
        transaction_reference: preOrder.transaction_reference || '',
        status: preOrder.status,

        late_payment: preOrder.late_payment || false,
        payment_method: preOrder.payment_method || '',
        items: preOrder.items?.map((item) => ({
            product_id: item.pre_order_product_id,
            quantity: item.quantity,
        })) || [],
    });

    const [successModal, setSuccessModal] = useState({
        isOpen: false,
        title: '',
        description: '',
    });

    const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

    // Initialize quantities from existing order items
    const productQuantities = useMemo(() => {
        const quantities: Record<number, number> = {};
        products.forEach((product) => {
            quantities[product.id] = 0;
        });
        // Load existing quantities from order items
        data.items.forEach((item) => {
            quantities[item.product_id] = item.quantity;
        });
        return quantities;
    }, [products, data.items]);

    const updateQuantity = (productId: number, quantity: number) => {
        const newQuantity = Math.max(0, quantity);
        const newItems = products
            .map((product) => ({
                product_id: product.id,
                quantity: product.id === productId ? newQuantity : (productQuantities[product.id] || 0),
            }))
            .filter((item) => item.quantity > 0);

        setData('items', newItems);
    };

    // Check if current order type is Walkin Customer
    const isWalkinCustomer = useMemo(() => {
        // First check the current form data
        const orderType = orderTypes.find(type => type.id.toString() === data.order_type_id);
        if (orderType) return orderType.name === 'Walkin Customer';

        // Fallback to the pre-order's original type if form data not ready
        return preOrder.order_type?.name === 'Walkin Customer';
    }, [data.order_type_id, orderTypes, preOrder.order_type]);

    // Calculate totals in real-time
    const calculations = useMemo(() => {
        let totalAmount = 0;
        const itemDetails = products.map((product) => {
            const quantity = productQuantities[product.id] || 0;

            // Use walkin_price if order type is walkin, otherwise use unit_price
            const price = isWalkinCustomer ? product.walkin_price : product.unit_price;
            const unitPrice = parseFloat(price);

            const subtotal = quantity * unitPrice;
            totalAmount += subtotal;

            return {
                productId: product.id,
                productName: product.product_name,
                unitPrice,
                quantity,
                subtotal,
            };
        });

        return { itemDetails, totalAmount };
    }, [products, productQuantities, isWalkinCustomer]);

    const filteredOrderTypes = useMemo(() => {
        if (userPermissions.update_all) return orderTypes;

        // Start with the current order type so it's always visible/selectable
        const currentType = orderTypes.find((t) => t.id.toString() === preOrder.order_type_id.toString());
        const result = currentType ? [currentType] : [];

        // Add Walkin types if permitted
        if (userPermissions.update_walkin) {
            orderTypes.filter((t) => t.name === 'Walkin Customer').forEach((t) => {
                if (!result.find((r) => r.id === t.id)) result.push(t);
            });
        }

        // Add Regular types if permitted
        if (userPermissions.update_regular) {
            orderTypes.filter((t) => t.name !== 'Walkin Customer').forEach((t) => {
                if (!result.find((r) => r.id === t.id)) result.push(t);
            });
        }

        return result;
    }, [orderTypes, userPermissions, preOrder.order_type_id]);

    const isOrderTypeDisabled = !userPermissions.update_all && !userPermissions.update_walkin && !userPermissions.update_regular;

    const availableStatuses = [
        { value: 'Pending', label: 'Pending' },
        { value: 'Paid', label: 'Paid' },
        { value: 'Collected', label: 'Collected' },
        { value: 'Cancelled', label: 'Cancelled' },
    ];

    const filteredStatuses = availableStatuses.filter(status => {
        // If they can change to any status, show all
        if (userPermissions.update_all_status) return true;

        // Always show the current status
        if (status.value === preOrder.status) return true;

        // "Mark Paid" permission: only allowed if current is Pending and target is Paid
        if (status.value === 'Paid' && userPermissions.mark_paid && preOrder.status === 'Pending') {
            return true;
        }

        // "Cancel" permission: allowed if target is Cancelled
        if (status.value === 'Cancelled' && userPermissions.can_cancel) {
            return true;
        }

        return false;
    });
    const { flash } = usePage<SharedData>().props;

    useEffect(() => {
        if (flash.success) {
            setSuccessModal({
                isOpen: true,
                title: 'Success',
                description: flash.success,
            });
        }
        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.success, flash.error]);

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        // If status is changed to Cancelled, show confirmation dialog
        if (data.status === 'Cancelled' && preOrder.status !== 'Cancelled') {
            setShowCancelConfirmation(true);
            return;
        }

        submitForm();
    };

    const submitForm = () => {
        put(route('pre-orders.update', preOrder.id), {
            onSuccess: () => {
                // Success
            },
            onError: (err) => {
                const message = Object.values(err).flat().join(', ');
                toast.error(message || 'Failed to update pre-order');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Order ${preOrder.order_number}`} />

            <div className="container mx-auto p-6 space-y-6">
                <Heading
                    title={`Edit Order ${preOrder.order_number}`}
                    description="Update pre-order details"
                />

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Customer Information Section */}
                    <div className="rounded-lg border p-6 space-y-4">
                        <h3 className="text-lg font-semibold">Customer Information</h3>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="grid gap-2">
                                <Label htmlFor="first_name">First Name *</Label>
                                <Input
                                    id="first_name"
                                    value={data.first_name}
                                    onChange={(e) => setData('first_name', e.target.value)}
                                    required
                                    placeholder="First name"
                                />
                                <InputError message={errors.first_name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="father_name">Father Name</Label>
                                <Input
                                    id="father_name"
                                    value={data.father_name}
                                    onChange={(e) => setData('father_name', e.target.value)}
                                    placeholder="Father's name"
                                />
                                <InputError message={errors.father_name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="surname">Surname</Label>
                                <Input
                                    id="surname"
                                    value={data.surname}
                                    onChange={(e) => setData('surname', e.target.value)}
                                    placeholder="Surname"
                                />
                                <InputError message={errors.surname} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="phone_number">Phone Number *</Label>
                            <div className="flex">
                                <div className="flex items-center px-3 border border-r-0 border-input rounded-l-md bg-muted/50 text-sm font-medium">
                                    +251
                                </div>
                                <Input
                                    id="phone_number"
                                    value={data.phone_number}
                                    onChange={(e) => {
                                        // Only allow digits and limit to 9 characters starting with 9 or 7
                                        const value = e.target.value.replace(/\D/g, '');
                                        if (value === '' || ((value.startsWith('9') || value.startsWith('7')) && value.length <= 9)) {
                                            setData('phone_number', value);
                                        }
                                    }}
                                    className="rounded-l-none"
                                    maxLength={9}
                                    required
                                    placeholder="912345678 or 712345678"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Enter phone number starting with 9 or 7 (e.g., 912345678 or 712345678)
                            </p>
                            <InputError message={errors.phone_number} />
                        </div>
                    </div>
            </div>

            {/* Order Status Section */}
            <div className="rounded-lg border p-6 space-y-4">
                <h3 className="text-lg font-semibold">Order Status</h3>

                <div className="grid gap-2">
                    <Label htmlFor="status">Status *</Label>
                    {preOrder.order_type?.name === 'Walkin Customer' ? (
                        <div>
                            <Input
                                id="status"
                                value={data.status}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Status cannot be changed for Walkin Customer orders (already paid)
                            </p>
                        </div>
                    ) : (
                        <Select
                            value={data.status}
                            onValueChange={(value) => setData('status', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredStatuses.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>
                                        {status.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <InputError message={errors.status} />
                </div>



                {userPermissions.mark_late_payment && (
                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                            id="late_payment"
                            checked={data.late_payment}
                            onCheckedChange={(checked) => setData('late_payment', checked as boolean)}
                        />
                        <Label htmlFor="late_payment" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Mark as Late Payment
                        </Label>
                    </div>
                )}
            </div>

            {/* Order Details Section */}
            <div className="rounded-lg border p-6 space-y-4">
                <h3 className="text-lg font-semibold">Order Details</h3>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="order_type_id">Order Type *</Label>
                        <Select
                            value={data.order_type_id}
                            onValueChange={(value) => setData('order_type_id', value)}
                            disabled={isOrderTypeDisabled}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select order type" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredOrderTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.id.toString()}>
                                        {type.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.order_type_id} />
                    </div>

                    {isWalkinCustomer ? (
                        <div className="grid gap-2">
                            <Label htmlFor="voucher_code">
                                Voucher Code
                            </Label>
                            <Input
                                id="voucher_code"
                                value={data.voucher_code}
                                onChange={(e) => setData('voucher_code', e.target.value)}
                                placeholder="Enter voucher code"
                            />
                            <InputError message={errors.voucher_code} />
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            <Label htmlFor="transaction_reference">Transaction Reference</Label>
                            <Input
                                id="transaction_reference"
                                value={data.transaction_reference}
                                onChange={(e) => setData('transaction_reference', e.target.value)}
                                placeholder={paymentSettings.find(s => s.payment_method === data.payment_method)?.example
                                    ? `e.g. ${paymentSettings.find(s => s.payment_method === data.payment_method)?.example}`
                                    : 'Enter transaction reference'}
                            />
                            {data.payment_method && paymentSettings.find(s => s.payment_method === data.payment_method)?.example && (
                                <p className="text-xs text-muted-foreground">
                                    Expected format example: <code className="bg-muted px-1 rounded">{paymentSettings.find(s => s.payment_method === data.payment_method)?.example}</code>
                                </p>
                            )}
                            <InputError message={errors.transaction_reference} />
                        </div>
                    )}


                    {!isWalkinCustomer && (
                        <div className="grid gap-2">
                            <Label htmlFor="payment_method">Payment Method *</Label>
                            <Select value={data.payment_method} onValueChange={(value) => setData('payment_method', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select payment method" />
                                </SelectTrigger>
                                <SelectContent>
                                    {paymentSettings.map((s) => (
                                        <SelectItem key={s.payment_method} value={s.payment_method}>{s.payment_method}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.payment_method} />
                        </div>
                    )}


                    <div className="grid gap-2">
                        <Label htmlFor="collection_day_id">Collection Day *</Label>
                        <Select
                            value={data.collection_day_id}
                            onValueChange={(value) => setData('collection_day_id', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select collection day" />
                            </SelectTrigger>
                            <SelectContent>
                                {collectionDays.map((day) => (
                                    <SelectItem key={day.id} value={day.id.toString()}>
                                        {day.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.collection_day_id} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="collection_branch_id">Collection Branch *</Label>
                        <Select
                            value={data.collection_branch_id}
                            onValueChange={(value) => setData('collection_branch_id', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map((branch) => (
                                    <SelectItem key={branch.id} value={branch.id.toString()}>
                                        {branch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.collection_branch_id} />
                    </div>
                </div>

                {preOrder.registering_branch && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <Label className="text-sm font-medium">Registering Branch</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                            {preOrder.registering_branch.name}
                        </p>
                    </div>
                )}
            </div>

            {/* Products Section */}
            <div className="rounded-lg border p-6 space-y-4">
                <h3 className="text-lg font-semibold">Products *</h3>
                <p className="text-sm text-muted-foreground">
                    {isWalkinCustomer
                        ? 'Walk-in prices applied. Enter quantity for each product.'
                        : 'Regular prices applied. Enter quantity for each product.'}
                </p>

                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product Name</TableHead>
                                <TableHead>Unit Price</TableHead>
                                <TableHead className="w-[150px]">Quantity</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                        No products available. Please add products in settings first.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                calculations.itemDetails.map((item) => (
                                    <TableRow key={item.productId}>
                                        <TableCell className="font-medium">{item.productName}</TableCell>
                                        <TableCell>ETB {item.unitPrice.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    updateQuantity(item.productId, parseInt(e.target.value) || 0)
                                                }
                                                className="w-full"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            ETB {item.subtotal.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                            {products.length > 0 && (
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={3} className="text-right font-bold">
                                        Total Amount:
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-lg">
                                        ETB {calculations.totalAmount.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <InputError message={errors.items} />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.history.back()}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={processing || data.items.length === 0}>
                    Update Pre-Order
                </Button>
            </div>
        </form>
            </div >

            <StatusConfirmationDialog
                isOpen={showCancelConfirmation}
                onClose={() => setShowCancelConfirmation(false)}
                onConfirm={submitForm}
                title="Confirm Order Cancellation"
                description={`Are you sure you want to CANCEL order ${preOrder.order_number}? An automatic SMS notification will be sent to ${preOrder.client_name} (${preOrder.phone_number}) informing them of the cancellation.`}
                confirmText="Yes, Cancel Order & Send SMS"
                cancelText="Keep Order"
                variant="destructive"
            />

            <ActionSuccessModal
                isOpen={successModal.isOpen}
                onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
                title={successModal.title}
                description={successModal.description}
            />
        </AppLayout >
    );
}
