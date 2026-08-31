import { type BreadcrumbItem } from '@/types';
import { type CollectionDay, type OrderType, type PreOrderProduct } from '@/types/pre-order';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SharedData } from '@/types';
import { ActionSuccessModal } from '@/components/pre-order/action-success-modal';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'Pre-Orders', href: '/pre-orders' },
	{ title: 'New Pre-Order', href: '/pre-orders/create' },
];

type Props = {
	branches: Array<{ id: number; name: string }>;
	collectionDays: CollectionDay[];
	orderTypes: OrderType[];
	products: PreOrderProduct[];
	userPermissions: {
		create_all: boolean;
		create_walkin: boolean;
		create_regular: boolean;
		mark_late_payment: boolean;
	};
	paymentSettings: Array<{ 
        payment_method: string; 
        payment_type: string;
        validation_type: string;
        validation_pattern: string | null;
        example: string | null;
        reference_prefix: string | null;
        auto_fill_prefix: boolean;
        reference_length: number | null;
        reference_required: boolean;
        is_active: boolean;
    }>;
};

type OrderItem = {
	product_id: number;
	quantity: number;
};

export default function Create({ branches, collectionDays, orderTypes, products, userPermissions, paymentSettings }: Props) {
	const { data, setData, post, processing, errors } = useForm<{
		client_name?: string; // kept for backward compat if needed
		first_name: string;
		father_name: string;
		surname: string;
		phone_number: string;
		order_type_id: string;
		collection_day_id: string;
		collection_branch_id: string;
		voucher_code?: string;
		transaction_reference?: string;
		items: OrderItem[];
		duplicate?: string;
		late_payment: boolean;
		payment_method: string;
	}>({
		first_name: '',
		father_name: '',
		surname: '',
		phone_number: '',
		order_type_id: '',
		collection_day_id: '',
		collection_branch_id: '',
		voucher_code: '',
		transaction_reference: '',
		items: [],
		late_payment: false,
		payment_method: '',
	});

	const [successModal, setSuccessModal] = useState({
		isOpen: false,
		title: '',
		description: '',
	});
	
	const [transactionRefError, setTransactionRefError] = useState<string>('');

	// Handle initial order type based on permissions
	useMemo(() => {
		if (!userPermissions.create_all) {
			if (userPermissions.create_walkin && !userPermissions.create_regular) {
				const walkinType = orderTypes.find((t) => t.name === 'Walkin Customer');
				if (walkinType && data.order_type_id !== walkinType.id.toString()) {
					setData('order_type_id', walkinType.id.toString());
				}
			}
		}
	}, [userPermissions, orderTypes]);

	const filteredOrderTypes = useMemo(() => {
		if (userPermissions.create_all) return orderTypes;
		if (userPermissions.create_walkin && !userPermissions.create_regular) {
			return orderTypes.filter((t) => t.name === 'Walkin Customer');
		}
		if (userPermissions.create_regular && !userPermissions.create_walkin) {
			return orderTypes.filter((t) => t.name !== 'Walkin Customer');
		}
		return orderTypes;
	}, [orderTypes, userPermissions]);

	const isOrderTypeDisabled = !userPermissions.create_all && userPermissions.create_walkin && !userPermissions.create_regular;

	// Initialize items with all products
	const productQuantities = useMemo(() => {
		const quantities: Record<number, number> = {};
		products.forEach((product) => {
			quantities[product.id] = 0;
		});
		// Load existing quantities from form data
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
				quantity: product.id === productId ? newQuantity : productQuantities[product.id] || 0,
			}))
			.filter((item) => item.quantity > 0);

		setData('items', newItems);
	};

	// Check if current order type is Walkin Customer
	const isWalkinCustomer = useMemo(() => {
		const orderType = orderTypes.find((type) => type.id.toString() === data.order_type_id);
		return orderType?.name === 'Walkin Customer';
	}, [data.order_type_id, orderTypes]);

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

	const { flash } = usePage<SharedData>().props;

	useEffect(() => {
		if (data.payment_method) {
            const setting = paymentSettings.find(s => s.payment_method === data.payment_method);
			if (setting?.auto_fill_prefix && setting.reference_prefix) {
                if (!data.transaction_reference?.startsWith(setting.reference_prefix)) {
                    setData('transaction_reference', setting.reference_prefix);
                }
            }
		}
	}, [data.payment_method]);

	const validateTransactionReference = (method: string, value: string): string => {
        const setting = paymentSettings.find(s => s.payment_method === method);
        if (!setting) return '';

        if (setting.reference_required && !value) {
            return 'format_error';
        }

		return '';
	};

	useEffect(() => {
		if ((isWalkinCustomer || data.payment_method) && data.payment_method !== 'RTGS (Bank to Other Bank)') {
			if (data.transaction_reference) {
				setTransactionRefError(validateTransactionReference(data.payment_method, data.transaction_reference));
			} else {
				setTransactionRefError('');
			}
		} else {
			setTransactionRefError('');
		}
	}, [data.transaction_reference, data.payment_method, isWalkinCustomer]);

	useEffect(() => {
		if (flash.success) {
			toast.success(flash.success, { duration: 4000 });
		}
		if (flash.error) {
			toast.error(flash.error);
		}
	}, [flash.success, flash.error]);

	const handleSubmit: FormEventHandler = (e) => {
		// Always prevent the default page reload first, then use reportValidity()
		// to trigger the browser's native "Please fill out this field." tooltip.
		e.preventDefault();
		if (!(e.currentTarget as HTMLFormElement).reportValidity()) {
			return;
		}
		
		const isPaid = isWalkinCustomer; // In store, Walkin Customer is implicitly Paid
		const method = data.payment_method;
        const setting = paymentSettings.find(s => s.payment_method === method);
		if (isPaid && setting?.reference_required) {
			const error = validateTransactionReference(method, data.transaction_reference || '');
			if (error) {
				setTransactionRefError(error);
				toast.error('Please fix the transaction reference errors before submitting.');
				return;
			}
		}
		
		post(route('pre-orders.store'), {
			onSuccess: () => {
				// Flash success handled by global listener or this page if it redirects back
			},
			onError: () => {
				toast.error('Unable to create the order. Please review the information and try again.');
			},
		});
	};

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="New Pre-Order" />

			<div className="container mx-auto space-y-6 p-6">
				<Heading title="New Pre-Order" description="Register a new customer pre-order" />

				{errors.duplicate && (
					<div className="rounded-lg border border-destructive bg-destructive/10 p-4">
						<p className="text-sm font-medium text-destructive">{errors.duplicate}</p>
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-8">
					{/* Customer Information Section */}
					<div className="space-y-4 rounded-lg border p-6">
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
								<Label htmlFor="father_name">
									Father Name <span className="text-black">*</span>
								</Label>
								<Input
									id="father_name"
									value={data.father_name}
									onChange={(e) => setData('father_name', e.target.value)}
									required
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

						<div className="grid gap-4 md:grid-cols-2">
							<div className="grid gap-2">
								<Label htmlFor="phone_number">Phone Number *</Label>
								<div className="flex">
									<div className="flex items-center rounded-l-md border border-r-0 border-input bg-muted/50 px-3 text-sm font-medium">
										+251
									</div>
									<Input
										id="phone_number"
										value={data.phone_number}
										onChange={(e) => {
											// Only allow digits, up to 9 characters
											const value = e.target.value.replace(/\D/g, '');
											if (value.length <= 9) {
												setData('phone_number', value);
											}
										}}
										className="rounded-l-none"
										maxLength={9}
										required
										placeholder="912345678"
									/>
								</div>
								<InputError message={errors.phone_number} />
							</div>
						</div>
					</div>

					{/* Order Details Section */}
					<div className="space-y-4 rounded-lg border p-6">
						<h3 className="text-lg font-semibold">Order Details</h3>

						{/* Order Type + Voucher Code (walkin only) row */}
						<div className={`grid gap-4 ${isWalkinCustomer ? 'md:grid-cols-2' : 'md:grid-cols-1 md:max-w-sm'}`}>
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

							{/* Voucher Code — walkin only */}
							{isWalkinCustomer && (
								<div className="grid gap-2">
									<Label htmlFor="voucher_code">Voucher Code *</Label>
									<Input
										id="voucher_code"
										value={data.voucher_code}
										onChange={(e) => setData('voucher_code', e.target.value)}
										placeholder="Enter voucher code"
										required
									/>
									<InputError message={errors.voucher_code} />
								</div>
							)}
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

						<div className="grid gap-4 md:grid-cols-2">
							<div className="grid gap-2">
								<Label htmlFor="collection_day_id">Collection Day *</Label>
								<Select value={data.collection_day_id} onValueChange={(value) => setData('collection_day_id', value)}>
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
								<Select value={data.collection_branch_id} onValueChange={(value) => setData('collection_branch_id', value)}>
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
					</div>

					{/* Products Section */}
					<div className="space-y-4 rounded-lg border p-6">
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
														onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 0)}
														className="w-full"
													/>
												</TableCell>
												<TableCell className="text-right font-medium">ETB {item.subtotal.toFixed(2)}</TableCell>
											</TableRow>
										))
									)}
									{products.length > 0 && (
										<TableRow className="bg-muted/50">
											<TableCell colSpan={3} className="text-right font-bold">
												Total Amount:
											</TableCell>
											<TableCell className="text-right text-lg font-bold">ETB {calculations.totalAmount.toFixed(2)}</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>
						<InputError message={errors.items} />
					</div>

					{/* Action Buttons */}
					<div className="flex justify-end gap-4">
						<Button type="button" variant="outline" onClick={() => window.history.back()}>
							Cancel
						</Button>
						<Button type="submit" disabled={processing || data.items.length === 0 || !!transactionRefError}>
							Create Pre-Order
						</Button>
					</div>
				</form>

				<ActionSuccessModal
					isOpen={successModal.isOpen}
					onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
					title={successModal.title}
					description={successModal.description}
				/>
			</div >
		</AppLayout >
	);
}
