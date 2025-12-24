import { type BreadcrumbItem } from '@/types';
import { type CollectionDay, type OrderType, type PreOrderProduct } from '@/types/pre-order';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useMemo } from 'react';

import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
	};
};

type OrderItem = {
	product_id: number;
	quantity: number;
};

export default function Create({ branches, collectionDays, orderTypes, products, userPermissions }: Props) {
	const { data, setData, post, processing, errors } = useForm<{
		client_name: string;
		phone_number: string;
		order_type_id: string;
		collection_day_id: string;
		collection_branch_id: string;
		voucher_code?: string;
		transaction_reference?: string;
		items: OrderItem[];
	}>({
		client_name: '',
		phone_number: '',
		order_type_id: '',
		collection_day_id: '',
		collection_branch_id: '',
		voucher_code: '',
		transaction_reference: '',
		items: [],
	});

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

	// Calculate totals in real-time
	const calculations = useMemo(() => {
		let totalAmount = 0;
		const itemDetails = products.map((product) => {
			const quantity = productQuantities[product.id] || 0;
			const unitPrice = parseFloat(product.unit_price);
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
	}, [products, productQuantities]);

	// Check if current order type is Walkin Customer
	const isWalkinCustomer = useMemo(() => {
		const orderType = orderTypes.find((type) => type.id.toString() === data.order_type_id);
		return orderType?.name === 'Walkin Customer';
	}, [data.order_type_id, orderTypes]);

	const handleSubmit: FormEventHandler = (e) => {
		e.preventDefault();
		post(route('pre-orders.store'));
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

						<div className="grid gap-4 md:grid-cols-2">
							<div className="grid gap-2">
								<Label htmlFor="client_name">Client Full Name *</Label>
								<Input
									id="client_name"
									value={data.client_name}
									onChange={(e) => setData('client_name', e.target.value)}
									required
									placeholder="Enter client full name"
								/>
								<InputError message={errors.client_name} />
							</div>

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
											// Only allow digits and limit to 9 characters starting with 9 or 7
											const value = e.target.value.replace(/\D/g, '');
											if (value === '' || ((value.startsWith('9') || value.startsWith('7')) && value.length <= 9)) {
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
							) : (
								<div className="grid gap-2">
									<Label htmlFor="transaction_reference">Transaction Reference</Label>
									<Input
										id="transaction_reference"
										value={data.transaction_reference}
										onChange={(e) => setData('transaction_reference', e.target.value)}
										placeholder="Enter transaction reference"
									/>
									<InputError message={errors.transaction_reference} />
								</div>
							)}
						</div>

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
						<p className="text-sm text-muted-foreground">Enter quantity for each product the customer wants to order</p>

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
												<TableCell>${item.unitPrice.toFixed(2)}</TableCell>
												<TableCell>
													<Input
														type="number"
														min="0"
														value={item.quantity}
														onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 0)}
														className="w-full"
													/>
												</TableCell>
												<TableCell className="text-right font-medium">${item.subtotal.toFixed(2)}</TableCell>
											</TableRow>
										))
									)}
									{products.length > 0 && (
										<TableRow className="bg-muted/50">
											<TableCell colSpan={3} className="text-right font-bold">
												Total Amount:
											</TableCell>
											<TableCell className="text-right text-lg font-bold">${calculations.totalAmount.toFixed(2)}</TableCell>
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
						<Button type="submit" disabled={processing || data.items.length === 0}>
							Create Pre-Order
						</Button>
					</div>
				</form>
			</div>
		</AppLayout>
	);
}
